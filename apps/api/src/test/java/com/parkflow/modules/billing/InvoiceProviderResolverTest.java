package com.parkflow.modules.billing;

import com.parkflow.modules.billing.application.port.InvoiceProviderPort;
import com.parkflow.modules.billing.application.service.InvoiceProviderResolver;
import com.parkflow.modules.billing.domain.InvoiceProviderConfig;
import com.parkflow.modules.billing.domain.enums.InvoiceProviderType;
import com.parkflow.modules.billing.domain.repository.InvoiceProviderConfigPort;
import com.parkflow.modules.billing.dto.BillingCustomerDto;
import com.parkflow.modules.billing.dto.ExternalInvoiceResult;
import com.parkflow.modules.billing.dto.ProviderHealthResult;
import com.parkflow.modules.billing.domain.Invoice;
import com.parkflow.modules.billing.domain.InvoiceNote;
import com.parkflow.modules.billing.domain.enums.CountryCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class InvoiceProviderResolverTest {

  private InvoiceProviderConfigPort configPort;
  private InvoiceProviderResolver resolver;
  private UUID companyId;

  @BeforeEach
  void setUp() {
    companyId = UUID.randomUUID();
    configPort = mock(InvoiceProviderConfigPort.class);

    InvoiceProviderPort alegraProvider = buildStubProvider(InvoiceProviderType.ALEGRA);
    InvoiceProviderPort siigoProvider = buildStubProvider(InvoiceProviderType.SIIGO);

    resolver = new InvoiceProviderResolver(List.of(alegraProvider, siigoProvider), configPort);
  }

  @Test
  void resolveFor_returnsCorrectProvider_whenDefaultIsAlegra() {
    InvoiceProviderConfig config = new InvoiceProviderConfig();
    config.setProviderType(InvoiceProviderType.ALEGRA);
    config.setActive(true);
    config.setDefault(true);
    when(configPort.findDefaultForCompany(companyId)).thenReturn(Optional.of(config));

    InvoiceProviderPort resolved = resolver.resolveFor(companyId);
    assertThat(resolved.getType()).isEqualTo(InvoiceProviderType.ALEGRA);
  }

  @Test
  void resolveFor_returnsCorrectProvider_whenDefaultIsSiigo() {
    InvoiceProviderConfig config = new InvoiceProviderConfig();
    config.setProviderType(InvoiceProviderType.SIIGO);
    config.setActive(true);
    config.setDefault(true);
    when(configPort.findDefaultForCompany(companyId)).thenReturn(Optional.of(config));

    InvoiceProviderPort resolved = resolver.resolveFor(companyId);
    assertThat(resolved.getType()).isEqualTo(InvoiceProviderType.SIIGO);
  }

  @Test
  void resolveFor_throwsException_whenNoProviderConfigured() {
    when(configPort.findDefaultForCompany(companyId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> resolver.resolveFor(companyId))
        .isInstanceOf(InvoiceProviderResolver.InvoiceProviderNotConfiguredException.class)
        .hasMessageContaining(companyId.toString());
  }

  @Test
  void hasProvider_returnsTrue_forRegisteredProviders() {
    assertThat(resolver.hasProvider(InvoiceProviderType.ALEGRA)).isTrue();
    assertThat(resolver.hasProvider(InvoiceProviderType.SIIGO)).isTrue();
    assertThat(resolver.hasProvider(InvoiceProviderType.XERO)).isFalse();
  }

  @Test
  void multipleProviders_areAllRegistered() {
    assertThat(resolver.hasProvider(InvoiceProviderType.ALEGRA)).isTrue();
    assertThat(resolver.hasProvider(InvoiceProviderType.SIIGO)).isTrue();
  }

  private InvoiceProviderPort buildStubProvider(InvoiceProviderType type) {
    return new InvoiceProviderPort() {
      @Override public InvoiceProviderType getType() { return type; }
      @Override public ProviderHealthResult healthCheck(InvoiceProviderConfig c) { return ProviderHealthResult.ok("ok"); }
      @Override public String createCustomer(BillingCustomerDto c, InvoiceProviderConfig cfg) { return "ext-1"; }
      @Override public void updateCustomer(String id, BillingCustomerDto c, InvoiceProviderConfig cfg) {}
      @Override public ExternalInvoiceResult createInvoice(Invoice i, InvoiceProviderConfig c) { return ExternalInvoiceResult.of("1","FE-1",null); }
      @Override public ExternalInvoiceResult getInvoice(String id, InvoiceProviderConfig c) { return ExternalInvoiceResult.of(id,"FE-1",null); }
      @Override public void cancelInvoice(String id, String r, InvoiceProviderConfig c) {}
      @Override public ExternalInvoiceResult createCreditNote(InvoiceNote n, InvoiceProviderConfig c) { return ExternalInvoiceResult.of("cn-1","CN-1",null); }
      @Override public ExternalInvoiceResult createDebitNote(InvoiceNote n, InvoiceProviderConfig c) { return ExternalInvoiceResult.of("dn-1","DN-1",null); }
      @Override public byte[] getInvoicePdf(String id, InvoiceProviderConfig c) { return new byte[0]; }
      @Override public boolean supportsCountry(CountryCode cc) { return true; }
      @Override public Set<String> supportedCurrencies() { return Set.of("COP","USD"); }
    };
  }
}
