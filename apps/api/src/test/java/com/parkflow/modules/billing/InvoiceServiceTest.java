package com.parkflow.modules.billing;

import com.parkflow.modules.audit.application.CentralizedAuditService;
import com.parkflow.modules.billing.application.port.InvoiceProviderPort;
import com.parkflow.modules.billing.application.service.InvoiceProviderResolver;
import com.parkflow.modules.billing.application.service.InvoiceService;
import com.parkflow.modules.billing.domain.Invoice;
import com.parkflow.modules.billing.domain.InvoiceProviderConfig;
import com.parkflow.modules.billing.domain.enums.CountryCode;
import com.parkflow.modules.billing.domain.enums.InvoiceProviderType;
import com.parkflow.modules.billing.domain.enums.InvoiceStatus;
import com.parkflow.modules.billing.domain.repository.InvoicePort;
import com.parkflow.modules.billing.domain.repository.InvoiceSyncLogPort;
import com.parkflow.modules.billing.dto.*;
import com.parkflow.modules.billing.infrastructure.security.EncryptionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class InvoiceServiceTest {

  private InvoicePort invoicePort;
  private InvoiceSyncLogPort syncLogPort;
  private InvoiceProviderResolver resolver;
  private CentralizedAuditService auditService;
  private EncryptionService encryptionService;
  private InvoiceProviderPort mockProvider;
  private InvoiceService service;

  private final UUID companyId = UUID.randomUUID();
  private final UUID clientId = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    invoicePort = mock(InvoicePort.class);
    syncLogPort = mock(InvoiceSyncLogPort.class);
    resolver = mock(InvoiceProviderResolver.class);
    auditService = mock(CentralizedAuditService.class);
    encryptionService = mock(EncryptionService.class);
    mockProvider = mock(InvoiceProviderPort.class);

    service = new InvoiceService(invoicePort, syncLogPort, resolver, auditService, encryptionService);

    InvoiceProviderConfig config = buildConfig();
    when(resolver.resolveConfigFor(companyId)).thenReturn(config);
    when(resolver.resolveFor(companyId)).thenReturn(mockProvider);
    when(syncLogPort.save(any())).thenAnswer(inv -> inv.getArgument(0));
    when(invoicePort.save(any())).thenAnswer(inv -> {
      Invoice i = inv.getArgument(0);
      if (i.getId() == null) {
        i.setId(UUID.randomUUID());
      }
      return i;
    });
    // Mock encryption to return values unchanged for testing
    when(encryptionService.decrypt(anyString())).thenAnswer(inv -> inv.getArgument(0));
    when(encryptionService.encrypt(anyString())).thenAnswer(inv -> inv.getArgument(0));
  }

  @Test
  void createManualInvoice_setsStatusSent_whenProviderSucceeds() {
    when(mockProvider.createInvoice(any(), any()))
        .thenReturn(ExternalInvoiceResult.of("ext-123", "FE-001", "CUFE-ABC"));

    CreateInvoiceRequest req = buildRequest();
    InvoiceResponse response = service.createManualInvoice(companyId, req);

    assertThat(response.getStatus()).isEqualTo(InvoiceStatus.SENT);
    assertThat(response.getCompanyId()).isEqualTo(companyId);
  }

  @Test
  void createManualInvoice_setsStatusRejected_whenProviderThrows() {
    when(mockProvider.createInvoice(any(), any()))
        .thenThrow(new RuntimeException("Connection timeout"));

    CreateInvoiceRequest req = buildRequest();
    InvoiceResponse response = service.createManualInvoice(companyId, req);

    assertThat(response.getStatus()).isEqualTo(InvoiceStatus.REJECTED);
  }

  @Test
  void createManualInvoice_calculatesTotal_correctly() {
    when(mockProvider.createInvoice(any(), any()))
        .thenReturn(ExternalInvoiceResult.of("1", "FE-1", null));

    CreateInvoiceRequest req = new CreateInvoiceRequest();
    req.setClientId(clientId);
    req.setCurrency("COP");
    req.setCountryCode(CountryCode.CO);

    CreateInvoiceRequest.InvoiceItemRequest item = new CreateInvoiceRequest.InvoiceItemRequest();
    item.setDescription("Parqueo 1h");
    item.setQuantity(new BigDecimal("1"));
    item.setUnitPrice(new BigDecimal("5000.00"));
    item.setDiscountPct(BigDecimal.ZERO);
    item.setTaxPct(new BigDecimal("19"));
    item.setUnitOfMeasure("UND");
    req.setItems(List.of(item));

    InvoiceResponse response = service.createManualInvoice(companyId, req);

    assertThat(response.getSubtotal()).isEqualByComparingTo("5000.00");
    assertThat(response.getTaxAmount()).isEqualByComparingTo("950.00");
    assertThat(response.getTotal()).isEqualByComparingTo("5950.00");
  }

  @Test
  void getInvoice_throwsNotFoundException_whenNotFound() {
    UUID id = UUID.randomUUID();
    when(invoicePort.findByIdAndCompanyId(id, companyId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.getInvoice(id, companyId))
        .isInstanceOf(InvoiceService.InvoiceNotFoundException.class);
  }

  @Test
  void cancelInvoice_callsProvider_andSetsCancelledStatus() {
    UUID invoiceId = UUID.randomUUID();
    Invoice existing = new Invoice();
    existing.setId(invoiceId);
    existing.setCompanyId(companyId);
    existing.setStatus(InvoiceStatus.SENT);
    existing.setExternalId("ext-123");
    existing.setProviderType(InvoiceProviderType.ALEGRA);
    existing.setSubtotal(BigDecimal.TEN);
    existing.setTaxAmount(BigDecimal.ZERO);
    existing.setTotal(BigDecimal.TEN);

    when(invoicePort.findByIdAndCompanyId(invoiceId, companyId)).thenReturn(Optional.of(existing));
    doNothing().when(mockProvider).cancelInvoice(anyString(), anyString(), any());

    InvoiceResponse response = service.cancelInvoice(invoiceId, companyId, "Error en cobro");

    assertThat(response.getStatus()).isEqualTo(InvoiceStatus.CANCELLED);
    verify(mockProvider).cancelInvoice(eq("ext-123"), eq("Error en cobro"), any());
  }

  @Test
  void cancelInvoice_throwsException_whenAlreadyCancelled() {
    UUID invoiceId = UUID.randomUUID();
    Invoice existing = new Invoice();
    existing.setId(invoiceId);
    existing.setCompanyId(companyId);
    existing.setStatus(InvoiceStatus.CANCELLED);
    existing.setSubtotal(BigDecimal.TEN);
    existing.setTaxAmount(BigDecimal.ZERO);
    existing.setTotal(BigDecimal.TEN);

    when(invoicePort.findByIdAndCompanyId(invoiceId, companyId)).thenReturn(Optional.of(existing));

    assertThatThrownBy(() -> service.cancelInvoice(invoiceId, companyId, "reason"))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("already cancelled");
  }

  @Test
  void getDashboard_returnsZeroCounts_whenNoInvoices() {
    when(invoicePort.countByCompanyIdAndStatus(any(), any())).thenReturn(0L);
    InvoiceDashboardResponse dashboard = service.getDashboard(companyId);
    assertThat(dashboard.getTotalIssued()).isZero();
    assertThat(dashboard.getPendingDian()).isZero();
  }

  // --- helpers ---

  private CreateInvoiceRequest buildRequest() {
    CreateInvoiceRequest req = new CreateInvoiceRequest();
    req.setClientId(clientId);
    req.setCurrency("COP");
    req.setCountryCode(CountryCode.CO);

    CreateInvoiceRequest.InvoiceItemRequest item = new CreateInvoiceRequest.InvoiceItemRequest();
    item.setDescription("Parqueo");
    item.setQuantity(BigDecimal.ONE);
    item.setUnitPrice(new BigDecimal("5000"));
    item.setDiscountPct(BigDecimal.ZERO);
    item.setTaxPct(BigDecimal.ZERO);
    item.setUnitOfMeasure("UND");
    req.setItems(List.of(item));
    return req;
  }

  private InvoiceProviderConfig buildConfig() {
    InvoiceProviderConfig config = new InvoiceProviderConfig();
    config.setId(UUID.randomUUID());
    config.setCompanyId(companyId);
    config.setProviderType(InvoiceProviderType.ALEGRA);
    config.setActive(true);
    config.setDefault(true);
    config.setCountryCode(CountryCode.CO);
    config.setCurrency("COP");
    config.setEncryptedCredentials(Map.of("email", "test@co", "token", "tok123"));
    return config;
  }
}
