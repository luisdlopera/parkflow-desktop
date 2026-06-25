package com.parkflow.modules.billing;

import com.parkflow.modules.billing.domain.Invoice;
import com.parkflow.modules.billing.domain.InvoiceItem;
import com.parkflow.modules.billing.domain.InvoiceProviderConfig;
import com.parkflow.modules.billing.domain.enums.CountryCode;
import com.parkflow.modules.billing.domain.enums.InvoiceProviderType;
import com.parkflow.modules.billing.dto.ExternalInvoiceResult;
import com.parkflow.modules.billing.dto.ProviderHealthResult;
import com.parkflow.modules.billing.infrastructure.providers.alegra.AlegraClient;
import com.parkflow.modules.billing.infrastructure.providers.alegra.AlegraInvoiceProvider;
import com.parkflow.modules.billing.infrastructure.providers.alegra.AlegraMapper;
import com.parkflow.modules.billing.infrastructure.providers.alegra.dto.AlegraInvoiceResponseDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AlegraInvoiceProviderTest {

  private AlegraClient alegraClient;
  private AlegraInvoiceProvider provider;

  @BeforeEach
  void setUp() {
    alegraClient = mock(AlegraClient.class);
    provider = new AlegraInvoiceProvider(alegraClient, new AlegraMapper());
  }

  @Test
  void getType_returnsAlegra() {
    assertThat(provider.getType()).isEqualTo(InvoiceProviderType.ALEGRA);
  }

  @Test
  void healthCheck_returnsOk_whenClientSucceeds() {
    when(alegraClient.healthCheck(any())).thenReturn(true);
    ProviderHealthResult result = provider.healthCheck(buildConfig());
    assertThat(result.isHealthy()).isTrue();
  }

  @Test
  void healthCheck_returnsFail_whenClientFails() {
    when(alegraClient.healthCheck(any())).thenReturn(false);
    ProviderHealthResult result = provider.healthCheck(buildConfig());
    assertThat(result.isHealthy()).isFalse();
  }

  @Test
  void createInvoice_mapsExternalIdAndNumber() {
    AlegraInvoiceResponseDto mockResp = new AlegraInvoiceResponseDto();
    mockResp.setId("alegra-456");
    mockResp.setNumber("FEV-001");
    mockResp.setCufe("CUFE-XYZ");
    when(alegraClient.createInvoice(any(), any())).thenReturn(mockResp);

    ExternalInvoiceResult result = provider.createInvoice(buildInvoice(), buildConfig());

    assertThat(result.getExternalId()).isEqualTo("alegra-456");
    assertThat(result.getCufe()).isEqualTo("CUFE-XYZ");
  }

  @Test
  void createInvoice_throws_whenClientFails() {
    when(alegraClient.createInvoice(any(), any()))
        .thenThrow(new AlegraClient.AlegraApiException("Network error", new RuntimeException()));

    assertThatThrownBy(() -> provider.createInvoice(buildInvoice(), buildConfig()))
        .isInstanceOf(AlegraClient.AlegraApiException.class);
  }

  @Test
  void supportsCountry_returnsTrueForCO() {
    assertThat(provider.supportsCountry(CountryCode.CO)).isTrue();
    assertThat(provider.supportsCountry(CountryCode.MX)).isTrue();
    assertThat(provider.supportsCountry(CountryCode.AR)).isFalse();
  }

  @Test
  void supportedCurrencies_includesCOP() {
    assertThat(provider.supportedCurrencies()).contains("COP");
  }

  // --- helpers ---

  private Invoice buildInvoice() {
    Invoice invoice = new Invoice();
    invoice.setId(UUID.randomUUID());
    invoice.setCompanyId(UUID.randomUUID());
    invoice.setNumber("PF-001");
    invoice.setProviderType(InvoiceProviderType.ALEGRA);
    invoice.setCountryCode(CountryCode.CO);
    invoice.setCurrency("COP");
    invoice.setSubtotal(new BigDecimal("5000"));
    invoice.setTaxAmount(new BigDecimal("950"));
    invoice.setTotal(new BigDecimal("5950"));
    invoice.setItems(new ArrayList<>());

    InvoiceItem item = new InvoiceItem();
    item.setDescription("Parqueo 1h");
    item.setQuantity(BigDecimal.ONE);
    item.setUnitPrice(new BigDecimal("5000"));
    item.setTotal(new BigDecimal("5000"));
    item.setTaxAmount(new BigDecimal("950"));
    item.setDiscountPct(BigDecimal.ZERO);
    item.setTaxPct(new BigDecimal("19"));
    invoice.getItems().add(item);
    return invoice;
  }

  private InvoiceProviderConfig buildConfig() {
    InvoiceProviderConfig config = new InvoiceProviderConfig();
    config.setId(UUID.randomUUID());
    config.setProviderType(InvoiceProviderType.ALEGRA);
    config.setCountryCode(CountryCode.CO);
    config.setCurrency("COP");
    config.setEncryptedCredentials(Map.of("email", "test@parkflow.co", "token", "secret123"));
    return config;
  }
}
