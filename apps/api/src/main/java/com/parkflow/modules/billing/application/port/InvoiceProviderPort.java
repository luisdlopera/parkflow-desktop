package com.parkflow.modules.billing.application.port;

import com.parkflow.modules.billing.domain.Invoice;
import com.parkflow.modules.billing.domain.InvoiceNote;
import com.parkflow.modules.billing.domain.InvoiceProviderConfig;
import com.parkflow.modules.billing.domain.enums.CountryCode;
import com.parkflow.modules.billing.domain.enums.InvoiceProviderType;
import com.parkflow.modules.billing.dto.BillingCustomerDto;
import com.parkflow.modules.billing.dto.ExternalInvoiceResult;
import com.parkflow.modules.billing.dto.ProviderHealthResult;

import java.util.Set;

/**
 * Core abstraction for electronic invoice providers.
 *
 * To add a new provider (Siigo, Xero, SAP, etc.) implement this interface
 * and annotate with @Component. Zero changes to the billing services are required.
 */
public interface InvoiceProviderPort {

  InvoiceProviderType getType();

  ProviderHealthResult healthCheck(InvoiceProviderConfig config);

  String createCustomer(BillingCustomerDto customer, InvoiceProviderConfig config);

  void updateCustomer(String externalCustomerId, BillingCustomerDto customer, InvoiceProviderConfig config);

  ExternalInvoiceResult createInvoice(Invoice invoice, InvoiceProviderConfig config);

  ExternalInvoiceResult getInvoice(String externalId, InvoiceProviderConfig config);

  byte[] getInvoicePdf(String externalId, InvoiceProviderConfig config);

  void cancelInvoice(String externalId, String reason, InvoiceProviderConfig config);

  ExternalInvoiceResult createCreditNote(InvoiceNote note, InvoiceProviderConfig config);

  ExternalInvoiceResult createDebitNote(InvoiceNote note, InvoiceProviderConfig config);

  boolean supportsCountry(CountryCode country);

  Set<String> supportedCurrencies();
}
