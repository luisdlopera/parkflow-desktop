package com.parkflow.modules.billing.infrastructure.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.billing.domain.enums.InvoiceProviderType;
import com.parkflow.modules.billing.infrastructure.providers.alegra.AlegraWebhookHandler;
import com.parkflow.modules.billing.infrastructure.security.WebhookSignatureValidator;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Receives webhook callbacks from invoice providers (Alegra, Siigo, Stripe, etc.)
 * Each provider sends events when invoice status changes, payments are received, etc.
 *
 * Security: HMAC-SHA256 signature validation per provider (implement when adding auth).
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/billing/webhooks")
@RequiredArgsConstructor
@Tag(name = "Billing Webhooks", description = "Receive provider webhook callbacks")
public class InvoiceWebhookController {

  private final AlegraWebhookHandler alegraHandler;
  private final WebhookSignatureValidator signatureValidator;
  private final ObjectMapper objectMapper;

  @PostMapping("/{providerType}")
  @Operation(summary = "Receive webhook event from an invoice provider")
  public ResponseEntity<Map<String, String>> receiveWebhook(
      @PathVariable InvoiceProviderType providerType,
      @RequestHeader(value = "X-Webhook-Signature", required = false) String signature,
      @RequestBody JsonNode payload,
      @RequestHeader(required = false) Map<String, String> headers) {

    log.info("[Billing Webhook] Received event from provider={}", providerType);

    try {
      // Validate signature (optional; can be skipped if no secret is configured)
      String payloadString = objectMapper.writeValueAsString(payload);
      String secret = extractWebhookSecret(providerType, headers);

      if (!signatureValidator.validate(payloadString, signature, secret)) {
        log.warn("[Billing Webhook] Signature validation failed for provider={}", providerType);
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(Map.of("status", "unauthorized", "reason", "Invalid signature"));
      }

      // Process webhook
      switch (providerType) {
        case ALEGRA:
          alegraHandler.handle(payload);
          break;
        // TODO: add handlers for Siigo, Xero, Stripe, etc. in later phases
        default:
          log.warn("[Billing Webhook] No handler for provider: {}", providerType);
      }

      return ResponseEntity.ok(Map.of("status", "processed", "provider", providerType.name()));
    } catch (Exception e) {
      log.error("[Billing Webhook] Error processing webhook: {}", e.getMessage());
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
          .body(Map.of("status", "error", "provider", providerType.name(), "error", e.getMessage()));
    }
  }

  private String extractWebhookSecret(InvoiceProviderType providerType, Map<String, String> headers) {
    // TODO: fetch secret from InvoiceProviderConfig for the company
    // For now, return null (signature validation will be skipped)
    return null;
  }
}
