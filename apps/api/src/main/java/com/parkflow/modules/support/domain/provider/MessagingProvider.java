package com.parkflow.modules.support.domain.provider;

import java.util.Map;

public interface MessagingProvider {

    void sendMessage(String to, String content);

    void sendTemplate(String to, String templateName, Map<String, String> parameters);

    void sendMedia(String to, String mediaUrl, String caption);

    boolean validateWebhook(String payload, String signature);

}
