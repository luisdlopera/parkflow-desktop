package com.parkflow.modules.licensing.application.service;

import com.parkflow.modules.licensing.application.port.in.HeartbeatUseCase;
import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.LicensedDevice;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import com.parkflow.modules.licensing.domain.repository.LicensedDevicePort;
import com.parkflow.modules.licensing.dto.HeartbeatRequest;
import com.parkflow.modules.licensing.dto.HeartbeatResponse;
import com.parkflow.modules.licensing.enums.CompanyStatus;
import com.parkflow.modules.licensing.enums.LicenseStatus;
import com.parkflow.modules.licensing.enums.PlanType;
import com.parkflow.modules.licensing.enums.RemoteCommand;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class LicenseHeartbeatService implements HeartbeatUseCase {

    private final CompanyPort companyRepository;
    private final LicensedDevicePort deviceRepository;
    private final LicenseAuditService auditService;
    private final LicenseRemoteCommandPolicy remoteCommandPolicy;
    private final LicenseModuleProvisioner moduleProvisioner;

    @Override
    @Transactional
    public HeartbeatResponse processHeartbeat(HeartbeatRequest request, String clientIp) {
        Optional<Company> companyOpt = companyRepository.findById(request.getCompanyId());
        if (companyOpt.isEmpty()) {
            return HeartbeatResponse.builder()
                    .allowOperations(false)
                    .message("Empresa no encontrada")
                    .build();
        }

        Company company = companyOpt.get();

        Optional<LicensedDevice> deviceOpt = deviceRepository
                .findByCompanyIdAndDeviceFingerprint(company.getId(), request.getDeviceFingerprint());

        LicensedDevice device = deviceOpt.orElseGet(() -> {
            if (company.getPlan() != PlanType.LOCAL) {
                LicensedDevice newDevice = new LicensedDevice();
                newDevice.setCompany(company);
                newDevice.setDeviceFingerprint(request.getDeviceFingerprint());
                newDevice.setStatus(LicenseStatus.ACTIVE);
                return newDevice;
            }
            return null;
        });

        if (device == null) {
            return HeartbeatResponse.builder()
                    .allowOperations(false)
                    .message("Dispositivo no licenciado. Plan LOCAL requiere licencia offline.")
                    .build();
        }

        device.recordHeartbeat();
        device.setLastIpAddress(clientIp);
        device.setAppVersion(request.getAppVersion());

        if (request.getPendingSyncCount() != null) {
            device.setPendingSyncEvents(request.getPendingSyncCount());
        }
        if (request.getSyncedCount() != null) {
            device.setSyncedEvents(request.getSyncedCount());
        }
        if (request.getFailedSyncCount() != null) {
            device.setFailedSyncEvents(request.getFailedSyncCount());
        }
        if (request.getErrorReport() != null) {
            device.setLastErrorReport(request.getErrorReport());
        }

        if (Boolean.TRUE.equals(request.getCommandAcknowledged()) && request.getAcknowledgedCommand() != null) {
            device.clearCommand();
        }

        device = deviceRepository.save(device);

        boolean shouldBeBlocked = !company.allowsWriteOperations();
        boolean isBlocked = device.getStatus() == LicenseStatus.BLOCKED;

        if (shouldBeBlocked && !isBlocked) {
            Map<String, Object> diagnostics = Map.of(
                    "companyStatus", company.getStatus().name(),
                    "graceUntil", company.getGraceUntil() != null ? company.getGraceUntil() : "N/A",
                    "expiresAt", company.getExpiresAt() != null ? company.getExpiresAt() : "N/A"
            );

            String reasonCode = company.getStatus() == CompanyStatus.EXPIRED ? "LICENSE_EXPIRED" :
                               company.getStatus() == CompanyStatus.BLOCKED ? "COMPANY_BLOCKED" :
                               "GRACE_PERIOD_ENDED";

            String reasonDesc = company.getStatus() == CompanyStatus.EXPIRED ? "Licencia expirada" :
                               company.getStatus() == CompanyStatus.BLOCKED ? "Empresa bloqueada administrativamente" :
                               "Período de gracia finalizado";

            auditService.recordAutoBlock(
                    company.getId(),
                    device.getDeviceFingerprint(),
                    reasonCode,
                    reasonDesc,
                    diagnostics
            );

            device.setStatus(LicenseStatus.BLOCKED);
            deviceRepository.save(device);
        }

        RemoteCommand command = remoteCommandPolicy.determine(company, device);
        String commandPayload = remoteCommandPolicy.payloadFor(command, company);

        if (command != null) {
            device.queueCommand(command.name(), null);
            deviceRepository.save(device);
        }

        List<String> enabledModules = moduleProvisioner.enabledModuleNames(company.getId());

        return HeartbeatResponse.builder()
                .companyId(company.getId())
                .status(company.getStatus())
                .plan(company.getPlan())
                .expiresAt(company.getExpiresAt())
                .graceUntil(company.getGraceUntil())
                .enabledModules(enabledModules)
                .command(command)
                .commandPayload(commandPayload)
                .message(company.getCustomerMessage())
                .allowOperations(company.allowsWriteOperations())
                .allowSync(company.getPlan() != PlanType.LOCAL && company.isLicenseActive())
                .nextHeartbeatMinutes(30)
                .build();
    }
}
