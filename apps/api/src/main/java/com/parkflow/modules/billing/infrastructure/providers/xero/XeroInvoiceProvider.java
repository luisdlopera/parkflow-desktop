package com.parkflow.modules.billing.infrastructure.providers.xero;

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

/** Xero provider stub — Fase 3. */
@Component
public class XeroInvoiceProvider implements InvoiceProviderPort {

  @Override public InvoiceProviderType getType() { return InvoiceProviderType.XERO; }

  @Override public ProviderHealthResult healthCheck(InvoiceProviderConfig config) {
    return ProviderHealthResult.fail("Xero provider not yet implemented (Fase 3)");
  }

  @Override public String createCustomer(BillingCustomerDto c, InvoiceProviderConfig cfg) { throw notImpl(); }
  @Override public void updateCustomer(String id, BillingCustomerDto c, InvoiceProviderConfig cfg) { throw notImpl(); }
  @Override public ExternalInvoiceResult createInvoice(Invoice i, InvoiceProviderConfig cfg) { throw notImpl(); }
  @Override public ExternalInvoiceResult getInvoice(String id, InvoiceProviderConfig cfg) { throw notImpl(); }
  @Override public void cancelInvoice(String id, String r, InvoiceProviderConfig cfg) { throw notImpl(); }
  @Override public ExternalInvoiceResult createCreditNote(InvoiceNote n, InvoiceProviderConfig cfg) { throw notImpl(); }
  @Override public ExternalInvoiceResult createDebitNote(InvoiceNote n, InvoiceProviderConfig cfg) { throw notImpl(); }
  @Override public boolean supportsCountry(CountryCode c) { return Set.of(CountryCode.US, CountryCode.ES).contains(c); }
  @Override public Set<String> supportedCurrencies() { return Set.of("USD", "EUR", "GBP"); }

  private UnsupportedOperationException notImpl() {
    return new UnsupportedOperationException("Xero provider not yet implemented — scheduled for Fase 3");
  }
}
