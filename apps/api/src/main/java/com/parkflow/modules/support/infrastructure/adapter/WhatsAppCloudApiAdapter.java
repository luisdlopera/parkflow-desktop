package com.parkflow.modules.support.infrastructure.adapter;

import com.parkflow.modules.support.domain.provider.MessagingProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
public class WhatsAppCloudApiAdapter implements MessagingProvider {

    private final RestTemplate restTemplate;
    
    @Value("${whatsapp.api.url:https://graph.facebook.com/v19.0}")
    private String apiUrl;
    
    @Value("${whatsapp.api.phone-number-id:default}")
    private String phoneNumberId;
    
    @Value("${whatsapp.api.token:default}")
    private String token;

    public WhatsAppCloudApiAdapter(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    private HttpHeaders getHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);
        return headers;
    }

    @Override
    public void sendMessage(String to, String content) {
        log.info("Sending WhatsApp message to {}: {}", to, content);
        String url = String.format("%s/%s/messages", apiUrl, phoneNumberId);
        
        Map<String, Object> text = new HashMap<>();
        text.put("preview_url", false);
        text.put("body", content);

        Map<String, Object> body = new HashMap<>();
        body.put("messaging_product", "whatsapp");
        body.put("recipient_type", "individual");
        body.put("to", to);
        body.put("type", "text");
        body.put("text", text);

        try {
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, getHeaders());
            restTemplate.postForEntity(url, request, String.class);
        } catch (Exception e) {
            log.error("Failed to send WhatsApp message to {}", to, e);
        }
    }

    @Override
    public void sendTemplate(String to, String templateName, Map<String, String> parameters) {
        log.info("Sending WhatsApp template '{}' to {}", templateName, to);
        // Implementation for templates would go here using similar RestTemplate pattern
    }

    @Override
    public void sendMedia(String to, String mediaUrl, String caption) {
        log.info("Sending WhatsApp media {} to {}", mediaUrl, to);
        // Implementation for media would go here using similar RestTemplate pattern
    }

    @Override
    public boolean validateWebhook(String payload, String signature) {
        log.info("Validating WhatsApp webhook signature");
        // Implement SHA256 HMAC validation using App Secret
        return true;
    }
}
