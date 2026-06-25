package com.parkflow.modules.billing.application.service;

import com.parkflow.modules.billing.application.port.InvoiceProviderPort;
import com.parkflow.modules.billing.domain.Invoice;
import com.parkflow.modules.billing.domain.InvoiceItem;
import com.parkflow.modules.billing.domain.InvoiceProviderConfig;
import com.parkflow.modules.billing.domain.InvoiceSyncLog;
import com.parkflow.modules.billing.domain.enums.InvoiceSourceType;
import com.parkflow.modules.billing.domain.enums.InvoiceStatus;
import com.parkflow.modules.billing.domain.repository.InvoicePort;
import com.parkflow.modules.billing.domain.repository.InvoiceSyncLogPort;
import com.parkflow.modules.billing.dto.CreateInvoiceRequest;
import com.parkflow.modules.billing.dto.ExternalInvoiceResult;
import com.parkflow.modules.billing.dto.InvoiceDashboardResponse;
import com.parkflow.modules.billing.dto.InvoiceResponse;
import com.parkflow.modules.billing.infrastructure.security.EncryptionService;
import com.parkflow.modules.audit.application.CentralizedAuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Core billing service. This class NEVER references a specific provider (Alegra, Siigo, etc.)
 * All provider interactions are delegated via InvoiceProviderPort through InvoiceProviderResolver.
 */
@SuppressWarnings({"serial", "rawtypes", "deprecation", "unchecked", "removal"})
@Slf4j
@Service
@RequiredArgsConstructor
public class InvoiceService {

  private final InvoicePort invoicePort;
  private final InvoiceSyncLogPort syncLogPort;
  private final InvoiceProviderResolver providerResolver;
  private final CentralizedAuditService auditService;
  private final EncryptionService encryptionService;

  @Transactional
  public InvoiceResponse createManualInvoice(UUID companyId, CreateInvoiceRequest request) {
    InvoiceProviderConfig config = providerResolver.resolveConfigFor(companyId);
    InvoiceProviderPort provider = providerResolver.resolveFor(companyId);

    Invoice invoice = buildInvoice(companyId, request, config);
    invoice.setSourceType(InvoiceSourceType.MANUAL);
    invoice = invoicePort.save(invoice);

    sendToProvider(invoice, config, provider);

    auditService.logCriticalEvent(null, "INVOICE_CREATED",
        "Manual invoice " + invoice.getNumber() + " for company " + companyId);

    return toResponse(invoicePort.save(invoice));
  }

  @Async(value = "billingExecutor")
  @Transactional
  public void requestInvoiceFromPayment(UUID companyId, UUID sessionId, BigDecimal amount, UUID clientId) {
    try {
      InvoiceProviderConfig config = providerResolver.resolveConfigFor(companyId);
      InvoiceProviderPort provider = providerResolver.resolveFor(companyId);

      Invoice invoice = new Invoice();
      invoice.setCompanyId(companyId);
      invoice.setNumber(generateNumber(companyId));
      invoice.setClientId(clientId);
      invoice.setSourceType(InvoiceSourceType.PARKING_SESSION);
      invoice.setSourceId(sessionId);
      invoice.setProviderType(config.getProviderType());
      invoice.setCountryCode(config.getCountryCode());
      invoice.setCurrency(config.getCurrency());
      invoice.setSubtotal(amount);
      invoice.setTaxAmount(BigDecimal.ZERO);
      invoice.setTotal(amount);
      invoice.setStatus(InvoiceStatus.PENDING);

      InvoiceItem item = new InvoiceItem();
      item.setInvoice(invoice);
      item.setCompanyId(companyId);
      item.setDescription("Servicio de parqueo");
      item.setQuantity(BigDecimal.ONE);
      item.setUnitPrice(amount);
      item.setTotal(amount);
      invoice.getItems().add(item);

      invoice = invoicePort.save(invoice);
      sendToProvider(invoice, config, provider);
      invoicePort.save(invoice);

      log.info("[Billing] Async invoice created for session {} company {}", sessionId, companyId);
    } catch (Exception e) {
      log.error("[Billing] Failed async invoice for session {} company {}: {}", sessionId, companyId, e.getMessage());
    }
  }

  @Transactional(readOnly = true)
  public Page<InvoiceResponse> listInvoices(UUID companyId, InvoiceStatus status, String clientName, Pageable pageable) {
    return invoicePort.search(companyId, status, clientName, pageable).map(this::toResponse);
  }

  @Transactional(readOnly = true)
  public InvoiceResponse getInvoice(UUID id, UUID companyId) {
    Invoice invoice = invoicePort.findByIdAndCompanyId(id, companyId)
        .orElseThrow(() -> new InvoiceNotFoundException(id));
    return toResponse(invoice);
  }

  @Transactional
  public InvoiceResponse cancelInvoice(UUID id, UUID companyId, String reason) {
    Invoice invoice = invoicePort.findByIdAndCompanyId(id, companyId)
        .orElseThrow(() -> new InvoiceNotFoundException(id));

    if (invoice.getStatus() == InvoiceStatus.CANCELLED) {
      throw new IllegalStateException("Invoice already cancelled: " + id);
    }

    InvoiceProviderConfig config = providerResolver.resolveConfigFor(companyId);
    InvoiceProviderPort provider = providerResolver.resolveFor(companyId);

    if (invoice.getExternalId() != null) {
      long start = System.currentTimeMillis();
      try {
        provider.cancelInvoice(invoice.getExternalId(), reason, config);
        recordSync(invoice, "CANCEL_INVOICE", null, null, 200, null, System.currentTimeMillis() - start);
      } catch (Exception e) {
        recordSync(invoice, "CANCEL_INVOICE", null, null, 500, e.getMessage(), System.currentTimeMillis() - start);
        throw e;
      }
    }

    invoice.setStatus(InvoiceStatus.CANCELLED);
    invoice.setCancelledAt(OffsetDateTime.now());
    auditService.logCriticalEvent(null, "INVOICE_CANCELLED", "Invoice " + invoice.getNumber() + " reason: " + reason);
    return toResponse(invoicePort.save(invoice));
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

  // --- private helpers ---

  private void sendToProvider(Invoice invoice, InvoiceProviderConfig config, InvoiceProviderPort provider) {
    long start = System.currentTimeMillis();
    try {
      // Decrypt credentials before passing to provider
      InvoiceProviderConfig decryptedConfig = decryptConfig(config);

      ExternalInvoiceResult result = provider.createInvoice(invoice, decryptedConfig);
      invoice.setExternalId(result.getExternalId());
      invoice.setExternalNumber(result.getExternalNumber());
      invoice.setCufe(result.getCufe());
      invoice.setStatus(InvoiceStatus.SENT);
      invoice.setIssuedAt(OffsetDateTime.now());
      invoice.setProviderRawResponse(Map.of(
          "externalId", String.valueOf(result.getExternalId()),
          "externalNumber", String.valueOf(result.getExternalNumber())
      ));
      recordSync(invoice, "CREATE_INVOICE", null, null, 200, null, System.currentTimeMillis() - start);
    } catch (Exception e) {
      invoice.setStatus(InvoiceStatus.REJECTED);
      recordSync(invoice, "CREATE_INVOICE", null, null, 500, e.getMessage(), System.currentTimeMillis() - start);
      log.error("[Billing] Provider error for invoice {}: {}", invoice.getNumber(), e.getMessage());
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

    // Decrypt credentials
    Map<String, String> decryptedCreds = new java.util.HashMap<>();
    config.getEncryptedCredentials().forEach((key, encValue) ->
        decryptedCreds.put(key, encryptionService.decrypt(encValue))
    );
    decrypted.setEncryptedCredentials(decryptedCreds);

    return decrypted;
  }

  private Invoice buildInvoice(UUID companyId, CreateInvoiceRequest req, InvoiceProviderConfig config) {
    Invoice invoice = new Invoice();
    invoice.setCompanyId(companyId);
    invoice.setNumber(generateNumber(companyId));
    invoice.setClientId(req.getClientId());
    invoice.setProviderType(config.getProviderType());
    invoice.setCountryCode(req.getCountryCode() != null ? req.getCountryCode() : config.getCountryCode());
    invoice.setCurrency(req.getCurrency() != null ? req.getCurrency() : config.getCurrency());
    invoice.setDueDate(req.getDueDate());
    invoice.setStatus(InvoiceStatus.PENDING);

    List<InvoiceItem> items = new ArrayList<>();
    BigDecimal subtotal = BigDecimal.ZERO;
    BigDecimal taxTotal = BigDecimal.ZERO;

    for (CreateInvoiceRequest.InvoiceItemRequest itemReq : req.getItems()) {
      InvoiceItem item = new InvoiceItem();
      item.setInvoice(invoice);
      item.setCompanyId(companyId);
      item.setDescription(itemReq.getDescription());
      item.setQuantity(itemReq.getQuantity());
      item.setUnitPrice(itemReq.getUnitPrice());
      item.setDiscountPct(itemReq.getDiscountPct());
      item.setTaxPct(itemReq.getTaxPct());
      item.setProductCode(itemReq.getProductCode());
      item.setUnitOfMeasure(itemReq.getUnitOfMeasure());

      BigDecimal lineBase = itemReq.getUnitPrice()
          .multiply(itemReq.getQuantity())
          .multiply(BigDecimal.ONE.subtract(itemReq.getDiscountPct().divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP)));
      BigDecimal lineTax = lineBase.multiply(itemReq.getTaxPct().divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP));
      BigDecimal lineTotal = lineBase.add(lineTax);

      item.setTaxAmount(lineTax.setScale(2, RoundingMode.HALF_UP));
      item.setTotal(lineTotal.setScale(2, RoundingMode.HALF_UP));

      subtotal = subtotal.add(lineBase);
      taxTotal = taxTotal.add(lineTax);
      items.add(item);
    }

    invoice.setItems(items);
    invoice.setSubtotal(subtotal.setScale(2, RoundingMode.HALF_UP));
    invoice.setTaxAmount(taxTotal.setScale(2, RoundingMode.HALF_UP));
    invoice.setTotal(subtotal.add(taxTotal).setScale(2, RoundingMode.HALF_UP));
    return invoice;
  }

  private void recordSync(Invoice invoice, String eventType, Object req, Object resp,
      int httpStatus, String error, long durationMs) {
    InvoiceSyncLog log = new InvoiceSyncLog();
    log.setCompanyId(invoice.getCompanyId());
    log.setInvoiceId(invoice.getId());
    log.setProviderType(invoice.getProviderType());
    log.setEventType(eventType);
    log.setHttpStatus(httpStatus);
    log.setErrorMessage(error);
    log.setDurationMs((int) durationMs);
    log.setCorrelationId(UUID.randomUUID().toString());
    syncLogPort.save(log);
  }

  private String generateNumber(UUID companyId) {
    return "PF-" + System.currentTimeMillis();
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

  public byte[] getInvoicePdf(UUID invoiceId, UUID companyId) {
    Invoice invoice = invoicePort.findByIdAndCompanyId(invoiceId, companyId)
        .orElseThrow(() -> new InvoiceNotFoundException(invoiceId));

    if (invoice.getExternalId() == null) {
      throw new IllegalStateException("Invoice has no external ID — not sent to provider yet");
    }

    InvoiceProviderConfig config = providerResolver.resolveConfigFor(companyId);
    InvoiceProviderPort provider = providerResolver.resolveFor(companyId);
    InvoiceProviderConfig decryptedConfig = decryptConfig(config);

    long start = System.currentTimeMillis();
    try {
      byte[] pdf = provider.getInvoicePdf(invoice.getExternalId(), decryptedConfig);
      recordSync(invoice, "GET_PDF", null, null, 200, null, System.currentTimeMillis() - start);
      return pdf;
    } catch (Exception e) {
      recordSync(invoice, "GET_PDF", null, null, 500, e.getMessage(), System.currentTimeMillis() - start);
      throw new RuntimeException("Failed to download PDF for invoice " + invoiceId + ": " + e.getMessage(), e);
    }
  }

  public static class InvoiceNotFoundException extends RuntimeException {
    public InvoiceNotFoundException(UUID id) {
      super("Invoice not found: " + id);
    }
  }
}
