package com.parkflow.modules.billing.application.service;

import com.parkflow.modules.billing.application.port.InvoiceProviderPort;
import com.parkflow.modules.billing.domain.Invoice;
import com.parkflow.modules.billing.domain.InvoiceProviderConfig;
import com.parkflow.modules.billing.domain.enums.InvoiceStatus;
import com.parkflow.modules.billing.domain.repository.InvoicePort;
import com.parkflow.modules.billing.dto.InvoiceDashboardResponse;
import com.parkflow.modules.billing.dto.InvoiceResponse;
import com.parkflow.modules.common.dto.PageResponse;
import com.parkflow.modules.billing.infrastructure.security.EncryptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

/**
 * Handles invoice query operations: list, get, dashboard, PDF download.
 * Max 3 methods (read-only queries) + 1 special (PDF download).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class InvoiceQueryService {

  private final InvoicePort invoicePort;
  private final InvoiceProviderResolver providerResolver;
  private final EncryptionService encryptionService;

  @Transactional(readOnly = true)
  public PageResponse<InvoiceResponse> listInvoices(UUID companyId, InvoiceStatus status, String clientName, Pageable pageable) {
    return PageResponse.of(invoicePort.search(companyId, status, clientName, pageable).map(this::toResponse));
  }

  @Transactional(readOnly = true)
  public InvoiceResponse getInvoice(UUID id, UUID companyId) {
    Invoice invoice = invoicePort.findByIdAndCompanyId(id, companyId)
        .orElseThrow(() -> new InvoiceNotFoundException(id));
    return toResponse(invoice);
  }

  @Transactional(readOnly = true)
  public InvoiceDashboardResponse getDashboard(UUID companyId) {
    long issued = invoicePort.countByCompanyIdAndStatus(companyId, InvoiceStatus.SENT)
        + invoicePort.countByCompanyIdAndStatus(companyId, InvoiceStatus.ACCEPTED)
        + invoicePort.countByCompanyIdAndStatus(companyId, InvoiceStatus.PAID);
    long pending = invoicePort.countByCompanyIdAndStatus(companyId, InvoiceStatus.PENDING);
    long rejected = invoicePort.countByCompanyIdAndStatus(companyId, InvoiceStatus.REJECTED);
    long cancelled = invoicePort.countByCompanyIdAndStatus(companyId, InvoiceStatus.CANCELLED);

    return InvoiceDashboardResponse.builder()
        .totalIssued(issued)
        .pendingDian(pending)
        .rejected(rejected)
        .cancelled(cancelled)
        .totalAmountMonth(BigDecimal.ZERO)
        .currency("COP")
        .build();
  }

  @Transactional(readOnly = true)
  public byte[] getInvoicePdf(UUID invoiceId, UUID companyId) {
    Invoice invoice = invoicePort.findByIdAndCompanyId(invoiceId, companyId)
        .orElseThrow(() -> new InvoiceNotFoundException(invoiceId));

    if (invoice.getExternalId() == null) {
      throw new IllegalStateException("Invoice has no external ID — not sent to provider yet");
    }

    InvoiceProviderConfig config = providerResolver.resolveConfigFor(companyId);
    InvoiceProviderPort provider = providerResolver.resolveFor(companyId);
    InvoiceProviderConfig decryptedConfig = decryptConfig(config);

    try {
      return provider.getInvoicePdf(invoice.getExternalId(), decryptedConfig);
    } catch (Exception e) {
      throw new RuntimeException("Failed to download PDF for invoice " + invoiceId + ": " + e.getMessage(), e);
    }
  }

  private InvoiceProviderConfig decryptConfig(InvoiceProviderConfig config) {
    InvoiceProviderConfig decrypted = new InvoiceProviderConfig();
    decrypted.setId(config.getId());
    decrypted.setCompanyId(config.getCompanyId());
    decrypted.setProviderType(config.getProviderType());
    decrypted.setCountryCode(config.getCountryCode());
    decrypted.setCurrency(config.getCurrency());
    decrypted.setResolutionNumber(config.getResolutionNumber());
    decrypted.setResolutionPrefix(config.getResolutionPrefix());

    Map<String, String> decryptedCreds = new java.util.HashMap<>();
    config.getEncryptedCredentials().forEach((key, encValue) ->
        decryptedCreds.put(key, encryptionService.decrypt(encValue))
    );
    decrypted.setEncryptedCredentials(decryptedCreds);

    return decrypted;
  }

  private InvoiceResponse toResponse(Invoice i) {
    return InvoiceResponse.builder()
        .id(i.getId())
        .companyId(i.getCompanyId())
        .number(i.getNumber())
        .externalId(i.getExternalId())
        .externalNumber(i.getExternalNumber())
        .cufe(i.getCufe())
        .status(i.getStatus())
        .providerType(i.getProviderType())
        .clientId(i.getClientId())
        .subtotal(i.getSubtotal())
        .taxAmount(i.getTaxAmount())
        .total(i.getTotal())
        .currency(i.getCurrency())
        .countryCode(i.getCountryCode())
        .sourceType(i.getSourceType())
        .sourceId(i.getSourceId())
        .dueDate(i.getDueDate())
        .issuedAt(i.getIssuedAt())
        .paidAt(i.getPaidAt())
        .cancelledAt(i.getCancelledAt())
        .createdAt(i.getCreatedAt())
        .updatedAt(i.getUpdatedAt())
        .build();
  }

  public static class InvoiceNotFoundException extends RuntimeException {
    public InvoiceNotFoundException(UUID id) {
      super("Invoice not found: " + id);
    }
  }
}
