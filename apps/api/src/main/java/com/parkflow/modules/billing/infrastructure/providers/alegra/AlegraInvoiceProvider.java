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
 * This is the only class that knows about Alegra. The billing services never import this class.
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
  public byte[] getInvoicePdf(String externalId, InvoiceProviderConfig config) {
    return alegraClient.getInvoicePdf(externalId, config.getEncryptedCredentials());
  }

  @Override
  public void cancelInvoice(String externalId, String reason, InvoiceProviderConfig config) {
    alegraClient.voidInvoice(externalId, config.getEncryptedCredentials());
    log.info("[Alegra] Invoice voided: {}", externalId);
  }

  @Override
  public ExternalInvoiceResult createCreditNote(InvoiceNote note, InvoiceProviderConfig config) {
    try {
      Map<String, Object> request = new java.util.HashMap<>();
      request.put("type", "CREDIT");
      request.put("reason", note.getReason());
      request.put("amount", note.getAmount());
      var response = alegraClient.createNote(note.getInvoiceId().toString(), request, config.getEncryptedCredentials());
      log.info("[Alegra] Credit note created: invoiceId={} noteId={}", note.getInvoiceId(), response.get("id"));
      return ExternalInvoiceResult.of(
          String.valueOf(response.get("id")),
          String.valueOf(response.get("number")),
          (String) response.get("cufe")
      );
    } catch (Exception e) {
      log.error("[Alegra] Failed to create credit note for invoice {}: {}", note.getInvoiceId(), e.getMessage());
      throw new RuntimeException("Credit note creation failed: " + e.getMessage(), e);
    }
  }

  @Override
  public ExternalInvoiceResult createDebitNote(InvoiceNote note, InvoiceProviderConfig config) {
    try {
      Map<String, Object> request = new java.util.HashMap<>();
      request.put("type", "DEBIT");
      request.put("reason", note.getReason());
      request.put("amount", note.getAmount());
      var response = alegraClient.createNote(note.getInvoiceId().toString(), request, config.getEncryptedCredentials());
      log.info("[Alegra] Debit note created: invoiceId={} noteId={}", note.getInvoiceId(), response.get("id"));
      return ExternalInvoiceResult.of(
          String.valueOf(response.get("id")),
          String.valueOf(response.get("number")),
          (String) response.get("cufe")
      );
    } catch (Exception e) {
      log.error("[Alegra] Failed to create debit note for invoice {}: {}", note.getInvoiceId(), e.getMessage());
      throw new RuntimeException("Debit note creation failed: " + e.getMessage(), e);
    }
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
    if (invoice.getClientId() == null) {
      return "consumer-final";
    }

    var client = clientPort.findById(invoice.getClientId()).orElse(null);
    if (client == null) {
      log.warn("[Alegra] Client {} not found, using generic consumer", invoice.getClientId());
      return "consumer-final";
    }

    try {
      BillingCustomerDto customer = BillingCustomerDto.builder()
          .document(client.getDocument())
          .documentType(client.getDocumentType() != null ? client.getDocumentType() : "CC")
          .name(client.getName())
          .email(client.getEmail())
          .phone(client.getPhone())
          .countryCode(config.getCountryCode().name())
          .build();

      String alegraContactId = createCustomer(customer, config);
      log.info("[Alegra] Client {} synced to Alegra contact {}", client.getId(), alegraContactId);
      return alegraContactId;
    } catch (Exception e) {
      log.warn("[Alegra] Failed to sync client {} to Alegra, falling back to generic", client.getId(), e);
      return "consumer-final";
    }
  }
}
