package com.parkflow.modules.support.infrastructure.controller;

import com.parkflow.config.RawResponse;
import com.parkflow.modules.support.application.service.WhatsAppMessageProcessor;
import com.parkflow.modules.support.domain.provider.MessagingProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/webhooks/whatsapp")
@RequiredArgsConstructor
public class WhatsAppWebhookController {

    private final WhatsAppMessageProcessor messageProcessor;
    private final MessagingProvider messagingProvider;

    @GetMapping
    @RawResponse(reason = "Meta WhatsApp webhook verification requires a plain-text challenge string per the Graph API protocol")
    public ResponseEntity<String> verifyWebhook(
            @RequestParam("hub.mode") String mode,
            @RequestParam("hub.verify_token") String token,
            @RequestParam("hub.challenge") String challenge) {
        
        log.info("Received Webhook verification request");
        // Validate token against configuration
        return ResponseEntity.ok(challenge);
    }

    @PostMapping
    @RawResponse(reason = "Meta WhatsApp webhook events require HTTP 200 without a body per the Graph API protocol")
    public ResponseEntity<Void> receiveMessage(
            @RequestHeader(value = "X-Hub-Signature-256", required = false) String signature,
            @RequestBody String payload) {
        
        log.info("Received WhatsApp webhook event");
        if (!messagingProvider.validateWebhook(payload, signature)) {
            return ResponseEntity.status(401).build();
        }

        // Mock parsing payload. In a real scenario we use Jackson to parse Meta's JSON
        // Extract phone number, message text, and determine tenantId
        String phoneNumber = "1234567890"; // Extracted from payload
        String content = "Parsed message content"; // Extracted from payload
        UUID tenantId = UUID.randomUUID(); // Derived from business account ID
        
        messageProcessor.processIncomingMessage(phoneNumber, content, tenantId);

        return ResponseEntity.ok().build();
    }
}
