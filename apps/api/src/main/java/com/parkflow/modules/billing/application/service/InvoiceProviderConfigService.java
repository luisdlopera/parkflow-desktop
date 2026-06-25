package com.parkflow.modules.billing.application.service;

import com.parkflow.modules.billing.application.port.InvoiceProviderPort;
import com.parkflow.modules.billing.domain.InvoiceProviderConfig;
import com.parkflow.modules.billing.domain.repository.InvoiceProviderConfigPort;
import com.parkflow.modules.billing.dto.InvoiceProviderConfigRequest;
import com.parkflow.modules.billing.dto.InvoiceProviderConfigResponse;
import com.parkflow.modules.billing.dto.ProviderHealthResult;
import com.parkflow.modules.billing.infrastructure.security.EncryptionService;
import com.parkflow.modules.billing.infrastructure.validation.DIANResolutionValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class InvoiceProviderConfigService {

  private final InvoiceProviderConfigPort configPort;
  private final InvoiceProviderResolver providerResolver;
  private final EncryptionService encryptionService;
  private final DIANResolutionValidator dianValidator;

  @Transactional
  public InvoiceProviderConfigResponse createOrUpdate(UUID companyId, InvoiceProviderConfigRequest request) {
    InvoiceProviderConfig config = configPort
        .findByCompanyIdAndProviderType(companyId, request.getProviderType())
        .orElse(new InvoiceProviderConfig());

    config.setCompanyId(companyId);
    config.setProviderType(request.getProviderType());
    config.setDefault(request.isDefault());
    config.setCountryCode(request.getCountryCode());
    config.setCurrency(request.getCurrency());
    config.setResolutionNumber(request.getResolutionNumber());
    config.setResolutionPrefix(request.getResolutionPrefix());
    config.setResolutionFrom(request.getResolutionFrom());
    config.setResolutionTo(request.getResolutionTo());
    config.setResolutionValidFrom(request.getResolutionValidFrom());
    config.setResolutionValidTo(request.getResolutionValidTo());
    config.setTaxRegime(request.getTaxRegime());

    // Validate DIAN resolution for Colombia
    DIANResolutionValidator.ValidationResult validation = dianValidator.validate(config);
    if (!validation.valid) {
      throw new IllegalArgumentException("DIAN validation failed: " + validation.message);
    }
    if (validation.message != null && validation.level == DIANResolutionValidator.ValidationResult.Level.WARNING) {
      log.warn("[Billing] Warning for config {}: {}", companyId, validation.message);
    }

    // Encrypt credentials before persisting
    if (request.getCredentials() != null) {
      Map<String, String> encryptedCreds = new HashMap<>();
      request.getCredentials().forEach((key, value) ->
          encryptedCreds.put(key, encryptionService.encrypt(value))
      );
      config.setEncryptedCredentials(encryptedCreds);
    }

    if (request.isDefault()) {
      configPort.findDefaultForCompany(companyId).ifPresent(existing -> {
        if (!existing.getId().equals(config.getId())) {
          existing.setDefault(false);
          configPort.save(existing);
        }
      });
    }

    config.setActive(true);
    return toResponse(configPort.save(config));
  }

  @Transactional(readOnly = true)
  public List<InvoiceProviderConfigResponse> listForCompany(UUID companyId) {
    return configPort.findByCompanyId(companyId).stream()
        .map(this::toResponse)
        .collect(Collectors.toList());
  }

  @Transactional
  public void deactivate(UUID id, UUID companyId) {
    InvoiceProviderConfig config = configPort.findById(id)
        .filter(c -> c.getCompanyId().equals(companyId))
        .orElseThrow(() -> new RuntimeException("Provider config not found: " + id));
    config.setActive(false);
    config.setDefault(false);
    configPort.save(config);
  }

  public ProviderHealthResult testConnection(UUID id, UUID companyId) {
    InvoiceProviderConfig config = configPort.findById(id)
        .filter(c -> c.getCompanyId().equals(companyId))
        .orElseThrow(() -> new RuntimeException("Provider config not found: " + id));

    if (!providerResolver.hasProvider(config.getProviderType())) {
      return ProviderHealthResult.fail("Provider " + config.getProviderType() + " not available in this deployment");
    }

    // Decrypt credentials for provider
    InvoiceProviderConfig decrypted = new InvoiceProviderConfig();
    decrypted.setEncryptedCredentials(decryptCredentials(config.getEncryptedCredentials()));

    InvoiceProviderPort provider = providerResolver.resolveFor(companyId);
    return provider.healthCheck(decrypted);
  }

  private Map<String, String> decryptCredentials(Map<String, String> encrypted) {
    Map<String, String> decrypted = new HashMap<>();
    encrypted.forEach((key, value) ->
        decrypted.put(key, encryptionService.decrypt(value))
    );
    return decrypted;
  }

  private InvoiceProviderConfigResponse toResponse(InvoiceProviderConfig c) {
    return InvoiceProviderConfigResponse.builder()
        .id(c.getId())
        .providerType(c.getProviderType())
        .isActive(c.isActive())
        .isDefault(c.isDefault())
        .countryCode(c.getCountryCode())
        .currency(c.getCurrency())
        .resolutionNumber(c.getResolutionNumber())
        .resolutionPrefix(c.getResolutionPrefix())
        .resolutionFrom(c.getResolutionFrom())
        .resolutionTo(c.getResolutionTo())
        .resolutionValidFrom(c.getResolutionValidFrom())
        .resolutionValidTo(c.getResolutionValidTo())
        .taxRegime(c.getTaxRegime())
        .hasCredentials(c.getEncryptedCredentials() != null && !c.getEncryptedCredentials().isEmpty())
        .createdAt(c.getCreatedAt())
        .updatedAt(c.getUpdatedAt())
        .build();
  }
}
