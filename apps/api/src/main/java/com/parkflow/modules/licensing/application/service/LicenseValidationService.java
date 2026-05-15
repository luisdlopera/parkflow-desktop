package com.parkflow.modules.licensing.application.service;

import com.parkflow.modules.licensing.application.port.in.ValidateLicenseUseCase;
import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.LicensedDevice;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import com.parkflow.modules.licensing.domain.repository.LicensedDevicePort;
import com.parkflow.modules.licensing.dto.LicenseValidationRequest;
import com.parkflow.modules.licensing.dto.LicenseValidationResponse;
import com.parkflow.modules.licensing.enums.CompanyStatus;
import com.parkflow.modules.licensing.enums.LicenseStatus;
import com.parkflow.modules.licensing.infrastructure.crypto.LicenseSignatureService;

import java.time.OffsetDateTime;
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
public class LicenseValidationService implements ValidateLicenseUseCase {

    private final CompanyPort companyRepository;
    private final LicensedDevicePort deviceRepository;
    private final LicenseSignatureService signatureService;
    private final LicenseAuditService auditService;
    private final LicenseModuleProvisioner moduleProvisioner;

    @Override
    @Transactional(readOnly = true)
    public LicenseValidationResponse validateLicense(LicenseValidationRequest request) {
        Optional<Company> companyOpt = companyRepository.findById(request.getCompanyId());
        if (companyOpt.isEmpty()) {
            return LicenseValidationResponse.builder()
                    .valid(false)
                    .errorCode("COMPANY_NOT_FOUND")
                    .message("Empresa no encontrada")
                    .build();
        }

        Company company = companyOpt.get();

        Optional<LicensedDevice> deviceOpt = deviceRepository
                .findByCompanyIdAndDeviceFingerprint(company.getId(), request.getDeviceFingerprint());

        if (deviceOpt.isEmpty()) {
            auditService.recordFailedValidation(
                    request.getCompanyId(),
                    request.getDeviceFingerprint(),
                    "DEVICE_NOT_REGISTERED",
                    "Dispositivo no registrado",
                    Map.of("companyStatus", company.getStatus().name())
            );

            return LicenseValidationResponse.builder()
                    .valid(false)
                    .errorCode("DEVICE_NOT_REGISTERED")
                    .message("Dispositivo no registrado")
                    .build();
        }

        LicensedDevice device = deviceOpt.get();

        boolean signatureValid = signatureService.verifySignature(
                request.getCompanyId(),
                request.getDeviceFingerprint(),
                request.getLicenseKey(),
                device.getExpiresAt(),
                request.getSignature()
        );

        if (!signatureValid) {
            Map<String, Object> diagnostics = Map.of(
                    "signatureValid", false,
                    "expectedFingerprint", device.getDeviceFingerprint(),
                    "providedFingerprint", request.getDeviceFingerprint()
            );

            auditService.recordAutoBlock(
                    request.getCompanyId(),
                    request.getDeviceFingerprint(),
                    "INVALID_SIGNATURE",
                    "Intento de validación con firma inválida",
                    diagnostics
            );

            device.setStatus(LicenseStatus.BLOCKED);
            deviceRepository.save(device);

            return LicenseValidationResponse.builder()
                    .valid(false)
                    .errorCode("INVALID_SIGNATURE")
                    .message("Firma de licencia inválida - Dispositivo bloqueado por seguridad")
                    .build();
        }

        boolean allowOperations = company.allowsWriteOperations();

        if (company.getStatus() == CompanyStatus.BLOCKED) {
            Map<String, Object> diagnostics = Map.of(
                    "signatureValid", true,
                    "fingerprintValid", true,
                    "companyStatus", company.getStatus().name()
            );

            auditService.recordAutoBlock(
                    request.getCompanyId(),
                    request.getDeviceFingerprint(),
                    "COMPANY_BLOCKED",
                    "Empresa bloqueada administrativamente",
                    diagnostics
            );
        }

        List<String> enabledModules = moduleProvisioner.enabledModuleNames(company.getId());

        return LicenseValidationResponse.builder()
                .valid(allowOperations)
                .companyId(company.getId())
                .companyName(company.getName())
                .status(company.getStatus())
                .plan(company.getPlan())
                .expiresAt(company.getExpiresAt())
                .graceUntil(company.getGraceUntil())
                .enabledModules(enabledModules)
                .allowOperations(allowOperations)
                .serverTime(OffsetDateTime.now().toString())
                .build();
    }
}
