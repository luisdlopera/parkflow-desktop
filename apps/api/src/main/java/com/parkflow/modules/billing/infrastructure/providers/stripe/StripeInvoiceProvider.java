package com.parkflow.modules.billing.infrastructure.providers.stripe;

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

/** Stripe Invoicing provider stub — Fase 3. */
@Component
public class StripeInvoiceProvider implements InvoiceProviderPort {

  @Override public InvoiceProviderType getType() { return InvoiceProviderType.STRIPE; }

  @Override public ProviderHealthResult healthCheck(InvoiceProviderConfig config) {
    return ProviderHealthResult.fail("Stripe provider not yet implemented (Fase 3)");
  }

  @Override public String createCustomer(BillingCustomerDto c, InvoiceProviderConfig cfg) { throw notImpl(); }
  @Override public void updateCustomer(String id, BillingCustomerDto c, InvoiceProviderConfig cfg) { throw notImpl(); }
  @Override public ExternalInvoiceResult createInvoice(Invoice i, InvoiceProviderConfig cfg) { throw notImpl(); }
  @Override public ExternalInvoiceResult getInvoice(String id, InvoiceProviderConfig cfg) { throw notImpl(); }
  @Override public void cancelInvoice(String id, String r, InvoiceProviderConfig cfg) { throw notImpl(); }
  @Override public ExternalInvoiceResult createCreditNote(InvoiceNote n, InvoiceProviderConfig cfg) { throw notImpl(); }
  @Override public ExternalInvoiceResult createDebitNote(InvoiceNote n, InvoiceProviderConfig cfg) { throw notImpl(); }
  @Override public boolean supportsCountry(CountryCode c) { return true; }
  @Override public Set<String> supportedCurrencies() { return Set.of("USD", "EUR", "COP", "MXN", "CLP"); }

  private UnsupportedOperationException notImpl() {
    return new UnsupportedOperationException("Stripe provider not yet implemented — scheduled for Fase 3");
  }
}
