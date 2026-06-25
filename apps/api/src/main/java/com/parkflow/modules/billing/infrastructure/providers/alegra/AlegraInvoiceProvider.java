package com.parkflow.modules.billing.infrastructure.providers.alegra;

import com.parkflow.modules.billing.application.port.InvoiceProviderPort;
import com.parkflow.modules.billing.domain.Invoice;
import com.parkflow.modules.billing.domain.InvoiceNote;
import com.parkflow.modules.billing.domain.InvoiceProviderConfig;
import com.parkflow.modules.billing.domain.enums.CountryCode;
import com.parkflow.modules.billing.domain.enums.InvoiceProviderType;
import com.parkflow.modules.billing.dto.BillingCustomerDto;
import com.parkflow.modules.billing.dto.ExternalInvoiceResult;
import com.parkflow.modules.billing.dto.ProviderHealthResult;
import com.parkflow.modules.billing.infrastructure.providers.alegra.dto.AlegraInvoiceDto;
import com.parkflow.modules.billing.infrastructure.providers.alegra.dto.AlegraInvoiceResponseDto;
import com.parkflow.modules.customers.domain.port.ClientPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;

/**
 * Alegra implementation of InvoiceProviderPort.
 *
 * This is the only class that knows about Alegra. InvoiceService never imports this class.
 * To add Siigo/Xero: implement InvoiceProviderPort in a new class. This class stays untouched.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AlegraInvoiceProvider implements InvoiceProviderPort {

  private final AlegraClient alegraClient;
  private final AlegraMapper alegraMapper;
  private final ClientPort clientPort;

  @Override
  public InvoiceProviderType getType() {
    return InvoiceProviderType.ALEGRA;
  }

  @Override
  public ProviderHealthResult healthCheck(InvoiceProviderConfig config) {
    boolean ok = alegraClient.healthCheck(config.getEncryptedCredentials());
    return ok
        ? ProviderHealthResult.ok("Alegra connection successful")
        : ProviderHealthResult.fail("Alegra connection failed — check credentials");
  }

  @Override
  public String createCustomer(BillingCustomerDto customer, InvoiceProviderConfig config) {
    var contact = alegraMapper.toAlegraContact(customer);
    return alegraClient.createContact(contact, config.getEncryptedCredentials());
  }

  @Override
  public void updateCustomer(String externalCustomerId, BillingCustomerDto customer, InvoiceProviderConfig config) {
    // Alegra supports contact updates via PUT /contacts/{id}
    // Deferred: implement when customer sync is required
    log.info("[Alegra] updateCustomer {} — not yet implemented", externalCustomerId);
  }

  @Override
  public ExternalInvoiceResult createInvoice(Invoice invoice, InvoiceProviderConfig config) {
    String alegraContactId = resolveAlegraContactId(invoice, config);

    AlegraInvoiceDto request = alegraMapper.toAlegraInvoice(invoice, alegraContactId, config);
    AlegraInvoiceResponseDto response = alegraClient.createInvoice(request, config.getEncryptedCredentials());

    String externalNumber = response.getNumberTemplate() != null
        ? response.getNumberTemplate().getFullNumber()
        : response.getNumber();

    log.info("[Alegra] Invoice created: id={} number={} cufe={}", response.getId(), externalNumber, response.getCufe());

    return ExternalInvoiceResult.of(response.getId(), externalNumber, response.getCufe());
  }

  @Override
  public ExternalInvoiceResult getInvoice(String externalId, InvoiceProviderConfig config) {
    AlegraInvoiceResponseDto response = alegraClient.getInvoice(externalId, config.getEncryptedCredentials());
    String externalNumber = response.getNumberTemplate() != null
        ? response.getNumberTemplate().getFullNumber()
        : response.getNumber();
    return ExternalInvoiceResult.of(response.getId(), externalNumber, response.getCufe());
  }

  @Override
  public void cancelInvoice(String externalId, String reason, InvoiceProviderConfig config) {
    alegraClient.voidInvoice(externalId, config.getEncryptedCredentials());
    log.info("[Alegra] Invoice voided: {}", externalId);
  }

  @Override
  public ExternalInvoiceResult createCreditNote(InvoiceNote note, InvoiceProviderConfig config) {
    // TODO: Implement credit note in Phase 1.5
    // 1. Fetch original Invoice from note.invoiceId
    // 2. Build credit note request (type: CREDIT, reason, amount)
    // 3. POST to /invoices/{externalId}/credit-notes
    // 4. Extract CUFE from response
    log.info("[Alegra] Credit note creation - not yet implemented for invoice {}", note.getInvoiceId());
    throw new UnsupportedOperationException("Credit notes via Alegra coming in Phase 1.5");
  }

  @Override
  public ExternalInvoiceResult createDebitNote(InvoiceNote note, InvoiceProviderConfig config) {
    // TODO: Implement debit note in Phase 1.5
    // 1. Fetch original Invoice from note.invoiceId
    // 2. Build debit note request (type: DEBIT, reason, amount)
    // 3. POST to /invoices/{externalId}/debit-notes
    // 4. Extract CUFE from response
    log.info("[Alegra] Debit note creation - not yet implemented for invoice {}", note.getInvoiceId());
    throw new UnsupportedOperationException("Debit notes via Alegra coming in Phase 1.5");
  }

  @Override
  public boolean supportsCountry(CountryCode country) {
    return Set.of(CountryCode.CO, CountryCode.MX, CountryCode.PE, CountryCode.ES).contains(country);
  }

  @Override
  public Set<String> supportedCurrencies() {
    return Set.of("COP", "USD", "EUR", "MXN", "PEN");
  }

  private String resolveAlegraContactId(Invoice invoice, InvoiceProviderConfig config) {
    // TODO: Implement full client sync:
    // 1. Fetch Client entity by invoice.getClientId()
    // 2. Convert to BillingCustomerDto
    // 3. Call createCustomer(dto, config) to sync with Alegra
    // 4. Cache the mapping (clientId → alegraContactId) in invoice_provider_mappings table
    // 5. Return alegraContactId from step 3 or cache
    //
    // For now, return generic consumer contact for all invoices
    if (invoice.getClientId() == null) {
      return "consumer-final";
    }
    // Phase 1.5: Will sync Client.document (NIT) and Client.name with Alegra
    return "consumer-final";
  }
}
