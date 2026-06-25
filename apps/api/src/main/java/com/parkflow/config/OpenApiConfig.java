package com.parkflow.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * OpenAPI 3.0 / Swagger Configuration for ParkFlow API
 *
 * Provides comprehensive API documentation for:
 * - Authentication endpoints
 * - Parking operations
 * - Cash management
 * - Configuration
 * - Reports
 *
 * Access via: GET /api/v1/docs/openapi.json (machine-readable)
 *             GET /api/v1/docs.html (human-readable)
 */
@Configuration
public class OpenApiConfig {

  @Bean
  public OpenAPI parkflowOpenAPI() {
    return new OpenAPI()
        .info(apiInfo())
        .servers(servers())
        .schemaRequirement("bearerAuth", bearerAuth());
  }

  private Info apiInfo() {
    return new Info()
        .title("ParkFlow API")
        .description("""
            ParkFlow is a hybrid offline-first parking management platform.

            This API provides endpoints for:
            - **Authentication**: JWT-based login and token refresh
            - **Parking Operations**: Entry/exit, session management, rate calculations
            - **Cash Management**: Cash session opening/closing, movement tracking
            - **Configuration**: Company, user, rate, and site management
            - **Reports**: Daily reports, revenue summaries, audit trails

            All endpoints (except /auth/login) require Bearer token authentication.

            ## Features
            - Multi-tenant architecture with company isolation
            - Role-based access control (ADMIN, MANAGER, OPERATOR, VIEWER)
            - Offline-first sync capability for desktop app
            - Real-time cash reconciliation
            - Comprehensive audit logging
            - Webhook support for integrations

            ## Base URL
            Production: `https://api.parkflow.com/api/v1`
            Development: `http://localhost:6011/api/v1`
            """)
        .version("1.0.0")
        .contact(new Contact()
            .name("ParkFlow Support")
            .email("support@parkflow.com")
            .url("https://parkflow.com/support"))
        .license(new License()
            .name("Proprietary License")
            .url("https://parkflow.com/license"));
  }

  private List<Server> servers() {
    return List.of(
        new Server()
            .url("https://api.parkflow.com/api/v1")
            .description("Production Environment"),
        new Server()
            .url("http://localhost:6011/api/v1")
            .description("Local Development"));
  }

  private SecurityScheme bearerAuth() {
    return new SecurityScheme()
        .type(SecurityScheme.Type.HTTP)
        .scheme("bearer")
        .bearerFormat("JWT")
        .description("""
            JWT Bearer token obtained from POST /auth/login

            Format: "Bearer <token>"

            Example:
            ```
            Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
            ```

            Token expires in 15 minutes (configurable).
            Use POST /auth/refresh to obtain a new token.
            """);
  }
}
