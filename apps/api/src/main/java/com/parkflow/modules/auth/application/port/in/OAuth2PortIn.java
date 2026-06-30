package com.parkflow.modules.auth.application.port.in;

import jakarta.servlet.http.HttpServletResponse;

public interface OAuth2PortIn {
    String buildAuthorizationUrl(String provider, String redirectBaseUrl);
    void handleCallback(String provider, String code, String state, HttpServletResponse response);
}
