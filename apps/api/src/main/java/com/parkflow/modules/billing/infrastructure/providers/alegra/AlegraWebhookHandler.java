package com.parkflow.modules.billing.infrastructure.providers.alegra;

import com.fasterxml.jackson.databind.JsonNode;
import com.parkflow.modules.billing.domain.Invoice;
import com.parkflow.modules.billing.domain.enums.InvoiceStatus;
import com.parkflow.modules.billing.domain.repository.InvoicePort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.Optional;

/**
 * Handles incoming webhooks from Alegra.
 * Alegra sends status updates when invoices are accepted, rejected, or paid.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AlegraWebhookHandler {

  private final InvoicePort invoicePort;

  public void handle(JsonNode payload) {
    try {
      String eventType = payload.path("event").asText();
      String externalId = payload.path("invoice").path("id").asText();

      if (externalId.isBlank()) {
        log.warn("[Alegra Webhook] Missing invoice ID in payload");
        return;
      }

      switch (eventType) {
        case "invoice.accepted":
          handleAccepted(externalId);
          break;
        case "invoice.rejected":
          handleRejected(externalId, payload);
          break;
        case "invoice.paid":
          handlePaid(externalId);
          break;
        default:
          log.debug("[Alegra Webhook] Ignoring event type: {}", eventType);
      }
    } catch (Exception e) {
      log.error("[Alegra Webhook] Failed to process payload: {}", e.getMessage());
    }
  }

  private void handleAccepted(String externalId) {
    findByExternalId(externalId).ifPresent(invoice -> {
      invoice.setStatus(InvoiceStatus.ACCEPTED);
      invoicePort.save(invoice);
      log.info("[Alegra Webhook] Invoice {} marked ACCEPTED", invoice.getNumber());
    });
  }

  private void handleRejected(String externalId, JsonNode payload) {
    findByExternalId(externalId).ifPresent(invoice -> {
      invoice.setStatus(InvoiceStatus.REJECTED);
      String reason = payload.path("reason").asText("Unknown");
      log.warn("[Alegra Webhook] Invoice {} rejected: {}", invoice.getNumber(), reason);
      invoicePort.save(invoice);
    });
  }

  private void handlePaid(String externalId) {
    findByExternalId(externalId).ifPresent(invoice -> {
      invoice.setStatus(InvoiceStatus.PAID);
      invoice.setPaidAt(OffsetDateTime.now());
      invoicePort.save(invoice);
      log.info("[Alegra Webhook] Invoice {} marked PAID", invoice.getNumber());
    });
  }

  private Optional<Invoice> findByExternalId(String externalId) {
    return invoicePort.findByExternalId(externalId);
  }
}
