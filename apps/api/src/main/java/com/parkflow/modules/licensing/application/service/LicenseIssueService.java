package com.parkflow.modules.licensing.application.service;

import com.parkflow.modules.licensing.application.port.in.GenerateLicenseUseCase;
import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.LicenseAuditLog;
import com.parkflow.modules.licensing.domain.LicensedDevice;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import com.parkflow.modules.licensing.domain.repository.LicenseAuditLogPort;
import com.parkflow.modules.licensing.domain.repository.LicensedDevicePort;
import com.parkflow.modules.licensing.dto.GenerateLicenseRequest;
import com.parkflow.modules.licensing.dto.GenerateLicenseResponse;
import com.parkflow.modules.licensing.enums.LicenseStatus;
import com.parkflow.modules.licensing.infrastructure.crypto.LicenseSignatureService;
import java.time.OffsetDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class LicenseIssueService implements GenerateLicenseUseCase {

    private final CompanyPort companyRepository;
    private final LicensedDevicePort deviceRepository;
    private final LicenseAuditLogPort auditLogRepository;
    private final LicenseSignatureService signatureService;

    @Override
    @Transactional
    public GenerateLicenseResponse generateOfflineLicense(GenerateLicenseRequest request, String performedBy) {
        Company company = companyRepository.findById(request.getCompanyId())
                .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada"));

        long activeDevices = deviceRepository.countActiveByCompanyId(company.getId());
        if (activeDevices >= company.getMaxDevices()) {
            throw new IllegalStateException("Límite de dispositivos alcanzado para este plan");
        }

        LicensedDevice device = deviceRepository
                .findByCompanyIdAndDeviceFingerprint(company.getId(), request.getDeviceFingerprint())
                .orElseGet(() -> {
                    LicensedDevice newDevice = new LicensedDevice();
                    newDevice.setCompany(company);
                    newDevice.setDeviceFingerprint(request.getDeviceFingerprint());
                    return newDevice;
                });

        device.setHostname(request.getHostname());
        device.setOperatingSystem(request.getOperatingSystem());
        device.setCpuInfo(request.getCpuInfo());
        device.setMacAddress(request.getMacAddress());
        device.setStatus(LicenseStatus.ACTIVE);

        String licenseKey = signatureService.generateLicenseKey(company.getId(), request.getDeviceFingerprint());
        device.setLicenseKey(licenseKey);

        OffsetDateTime expiresAt = request.getExpiresAt() != null
                ? request.getExpiresAt()
                : company.getExpiresAt();
        device.setExpiresAt(expiresAt);

        String signature =
                signatureService.signLicense(company.getId(), request.getDeviceFingerprint(), licenseKey, expiresAt);
        device.setSignature(signature);

        device = deviceRepository.save(device);

        auditLogRepository.save(LicenseAuditLog.create(company, "LICENSE_GENERATED",
                "Licencia generada para dispositivo: " + request.getDeviceFingerprint(), performedBy));

        return GenerateLicenseResponse.builder()
                .deviceId(device.getId())
                .licenseKey(licenseKey)
                .signature(signature)
                .expiresAt(expiresAt)
                .publicKey(signatureService.publicKey())
                .build();
    }
}
