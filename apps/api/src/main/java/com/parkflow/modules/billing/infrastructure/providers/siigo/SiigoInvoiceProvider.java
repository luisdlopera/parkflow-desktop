package com.parkflow.modules.billing.infrastructure.providers.siigo;

import com.parkflow.modules.billing.application.port.InvoiceProviderPort;
import com.parkflow.modules.billing.domain.Invoice;
import com.parkflow.modules.billing.domain.InvoiceNote;
import com.parkflow.modules.billing.domain.InvoiceProviderConfig;
import com.parkflow.modules.billing.domain.enums.CountryCode;
import com.parkflow.modules.billing.domain.enums.InvoiceProviderType;
import com.parkflow.modules.billing.dto.BillingCustomerDto;
import com.parkflow.modules.billing.dto.ExternalInvoiceResult;
import com.parkflow.modules.billing.dto.ProviderHealthResult;
import org.springframework.stereotype.Component;

import java.util.Set;

/**
 * Siigo provider stub — Fase 2.
 * Implement this class when Siigo integration is required.
 * Zero changes to InvoiceService or any other class needed.
 */
@Component
public class SiigoInvoiceProvider implements InvoiceProviderPort {

  @Override
  public InvoiceProviderType getType() {
    return InvoiceProviderType.SIIGO;
  }

  @Override
  public ProviderHealthResult healthCheck(InvoiceProviderConfig config) {
    return ProviderHealthResult.fail("Siigo provider not yet implemented (Fase 2)");
  }

  @Override
  public String createCustomer(BillingCustomerDto customer, InvoiceProviderConfig config) {
    throw notImplemented();
  }

  @Override
  public void updateCustomer(String id, BillingCustomerDto customer, InvoiceProviderConfig config) {
    throw notImplemented();
  }

  @Override
  public ExternalInvoiceResult createInvoice(Invoice invoice, InvoiceProviderConfig config) {
    throw notImplemented();
  }

  @Override
  public ExternalInvoiceResult getInvoice(String externalId, InvoiceProviderConfig config) {
    throw notImplemented();
  }

  @Override
  public byte[] getInvoicePdf(String externalId, InvoiceProviderConfig config) {
    throw notImplemented();
  }

  @Override
  public void cancelInvoice(String externalId, String reason, InvoiceProviderConfig config) {
    throw notImplemented();
  }

  @Override
  public ExternalInvoiceResult createCreditNote(InvoiceNote note, InvoiceProviderConfig config) {
    throw notImplemented();
  }

  @Override
  public ExternalInvoiceResult createDebitNote(InvoiceNote note, InvoiceProviderConfig config) {
    throw notImplemented();
  }

  @Override
  public boolean supportsCountry(CountryCode country) {
    return country == CountryCode.CO;
  }

  @Override
  public Set<String> supportedCurrencies() {
    return Set.of("COP");
  }

  private UnsupportedOperationException notImplemented() {
    return new UnsupportedOperationException("Siigo provider not yet implemented — scheduled for Fase 2");
  }
}
