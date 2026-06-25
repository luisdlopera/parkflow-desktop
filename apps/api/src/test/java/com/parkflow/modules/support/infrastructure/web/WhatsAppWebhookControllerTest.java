package com.parkflow.modules.support.infrastructure.web;

import com.parkflow.modules.support.application.service.WhatsAppMessageProcessor;
import com.parkflow.modules.support.domain.provider.MessagingProvider;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WhatsAppWebhookControllerTest {

    @Mock
    private WhatsAppMessageProcessor messageProcessor;

    @Mock
    private MessagingProvider messagingProvider;

    @InjectMocks
    private WhatsAppWebhookController controller;

    @Test
    void verifyWebhook_success() {
        ResponseEntity<String> response = controller.verifyWebhook("subscribe", "my_token", "challenge_string");
        assertEquals(200, response.getStatusCode().value());
        assertEquals("challenge_string", response.getBody());
    }

    @Test
    void receiveMessage_invalidSignature_returns401() {
        when(messagingProvider.validateWebhook(any(), any())).thenReturn(false);
        ResponseEntity<Void> response = controller.receiveMessage("invalid_sig", "payload");
        assertEquals(401, response.getStatusCode().value());
        verifyNoInteractions(messageProcessor);
    }

    @Test
    void receiveMessage_validSignature_processesMessage() {
        when(messagingProvider.validateWebhook(any(), any())).thenReturn(true);
        ResponseEntity<Void> response = controller.receiveMessage("valid_sig", "payload");
        assertEquals(200, response.getStatusCode().value());
        verify(messageProcessor).processIncomingMessage(eq("1234567890"), eq("Parsed message content"), any(UUID.class));
    }
}
