package com.parkflow.modules.billing.application.service;

import com.parkflow.modules.billing.application.port.InvoiceProviderPort;
import com.parkflow.modules.billing.domain.InvoiceProviderConfig;
import com.parkflow.modules.billing.domain.enums.InvoiceProviderType;
import com.parkflow.modules.billing.domain.repository.InvoiceProviderConfigPort;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Resolves which InvoiceProviderPort to use for a given company.
 *
 * Adding a new provider requires only implementing InvoiceProviderPort
 * and annotating it with @Component — this resolver picks it up automatically.
 */
@SuppressWarnings("unchecked")
@Slf4j
@Service
public class InvoiceProviderResolver {

  private final Map<InvoiceProviderType, InvoiceProviderPort> providerMap;
  private final InvoiceProviderConfigPort configPort;

  public InvoiceProviderResolver(List<InvoiceProviderPort> providers, InvoiceProviderConfigPort configPort) {
    this.providerMap = providers.stream()
        .collect(Collectors.toMap(InvoiceProviderPort::getType, Function.identity()));
    this.configPort = configPort;
    log.info("[Billing] Registered invoice providers: {}", providerMap.keySet());
  }

  public InvoiceProviderPort resolveFor(UUID companyId) {
    InvoiceProviderConfig config = configPort.findDefaultForCompany(companyId)
        .orElseThrow(() -> new InvoiceProviderNotConfiguredException(companyId));

    InvoiceProviderPort provider = providerMap.get(config.getProviderType());
    if (provider == null) {
      throw new InvoiceProviderNotAvailableException(config.getProviderType());
    }
    return provider;
  }

  public InvoiceProviderConfig resolveConfigFor(UUID companyId) {
    return configPort.findDefaultForCompany(companyId)
        .orElseThrow(() -> new InvoiceProviderNotConfiguredException(companyId));
  }

  public boolean hasProvider(InvoiceProviderType type) {
    return providerMap.containsKey(type);
  }

  public static class InvoiceProviderNotConfiguredException extends RuntimeException {
    public InvoiceProviderNotConfiguredException(UUID companyId) {
      super("No active invoice provider configured for company: " + companyId);
    }
  }

  public static class InvoiceProviderNotAvailableException extends RuntimeException {
    public InvoiceProviderNotAvailableException(InvoiceProviderType type) {
      super("Invoice provider not available in this deployment: " + type);
    }
  }
}
