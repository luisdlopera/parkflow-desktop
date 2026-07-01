package com.parkflow.modules.auth.infrastructure.controller;

import com.parkflow.modules.auth.application.port.in.OAuth2PortIn;
import com.parkflow.modules.auth.domain.OAuth2Exception;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.view.RedirectView;

@RestController
@RequestMapping("/api/v1/auth/oauth2")
@Tag(name = "OAuth2", description = "OAuth2 authentication flows for Google and Microsoft")
public class OAuth2Controller {

    private static final Set<String> SUPPORTED_PROVIDERS = Set.of("google", "microsoft");

    private final OAuth2PortIn oAuth2PortIn;

    @Value("${app.frontend-url:http://localhost:6001}")
    private String frontendUrl;

    @Value("${app.oauth2.redirect-base-url:http://localhost:6011}")
    private String oauth2RedirectBaseUrl;

    public OAuth2Controller(OAuth2PortIn oAuth2PortIn) {
        this.oAuth2PortIn = oAuth2PortIn;
    }

    @GetMapping("/authorization/{provider}")
    @Operation(summary = "Initiate OAuth2 authorization flow", description = "Redirects to OAuth2 provider authorization endpoint")
    @ApiResponse(responseCode = "302", description = "Redirect to OAuth2 provider")
    @ApiResponse(responseCode = "400", description = "Invalid OAuth2 provider")
    public RedirectView authorize(@PathVariable String provider) {
        if (!SUPPORTED_PROVIDERS.contains(provider)) {
            return new RedirectView(frontendUrl + "/login?error=oauth_invalid_provider&provider=" + provider);
        }
        String authUrl = oAuth2PortIn.buildAuthorizationUrl(provider, oauth2RedirectBaseUrl);
        return new RedirectView(authUrl);
    }

    @GetMapping("/callback/{provider}")
    @Operation(summary = "OAuth2 provider callback endpoint", description = "Handles authorization code from OAuth2 provider")
    @ApiResponse(responseCode = "302", description = "Redirect to login or dashboard")
    @ApiResponse(responseCode = "400", description = "Invalid authorization code or state")
    public void callback(
            @PathVariable String provider,
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error,
            @RequestParam(name = "error_description", required = false) String errorDescription,
            HttpServletResponse response) throws IOException {

        if (error != null) {
            String redirectError = switch (error) {
                case "access_denied" -> "oauth_denied";
                case "user_cancelled_login" -> "oauth_cancelled";
                default -> "oauth_provider_error";
            };
            response.sendRedirect(frontendUrl + "/login?error=" + redirectError
                + "&provider=" + provider);
            return;
        }

        try {
            if (code == null || state == null) {
                response.sendRedirect(frontendUrl + "/login?error=oauth_invalid_params"
                    + "&provider=" + provider);
                return;
            }

            oAuth2PortIn.handleCallback(provider, code, state, response);
            response.sendRedirect(frontendUrl + "/login?oauth=success");
        } catch (OAuth2Exception e) {
            String redirectError = switch (e.getErrorCode()) {
                case "invalid_state" -> "oauth_expired";
                case "user_not_found" -> "oauth_unlinked";
                case "user_inactive" -> "oauth_disabled";
                case "user_blocked" -> "oauth_blocked";
                default -> "oauth_error";
            };
            response.sendRedirect(frontendUrl + "/login?error=" + redirectError
                + "&provider=" + provider);
        } catch (Exception e) {
            response.sendRedirect(frontendUrl + "/login?error=oauth_error"
                + "&provider=" + provider);
        }
    }
}
