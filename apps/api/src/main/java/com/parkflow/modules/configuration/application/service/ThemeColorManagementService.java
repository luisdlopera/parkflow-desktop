package com.parkflow.modules.configuration.application.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.audit.domain.AuditAction;
import com.parkflow.modules.audit.application.service.AuditService;
import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.configuration.domain.ThemeConfiguration;
import com.parkflow.modules.configuration.domain.repository.ThemeConfigurationPort;
import com.parkflow.modules.configuration.dto.ThemeConfigurationRequest;
import com.parkflow.modules.configuration.dto.ThemeConfigurationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Theme Color Management - handles color configuration updates.
 * Manages theme color settings for company branding.
 */
@Service
@RequiredArgsConstructor
public class ThemeColorManagementService {

  private final ThemeConfigurationPort themeConfigurationRepository;
  private final AuditService auditService;
  private final ObjectMapper objectMapper;

  @Transactional
  public ThemeConfigurationResponse createOrUpdate(UUID companyId, ThemeConfigurationRequest req) {
    UUID resolvedCompanyId = resolveCompanyId(companyId);

    ThemeConfiguration entity = themeConfigurationRepository.findByCompanyId(resolvedCompanyId)
        .orElse(new ThemeConfiguration());

    String previousJson = toJson(entity.getCompanyId() != null ? entity : null);

    entity.setCompanyId(resolvedCompanyId);
    entity.setPrimaryColor(req.primaryColor());
    entity.setSecondaryColor(req.secondaryColor());
    entity.setSuccessColor(req.successColor());
    entity.setWarningColor(req.warningColor());
    entity.setDangerColor(req.dangerColor());
    entity.setThemeMode(req.themeMode());

    if (entity.getCreatedAt() == null) {
      entity.setCreatedAt(OffsetDateTime.now());
    }
    entity.setUpdatedAt(OffsetDateTime.now());

    ThemeConfiguration saved = themeConfigurationRepository.save(entity);
    auditService.record(AuditAction.CAMBIAR_CONFIGURACION, resolvedCompanyId, null, previousJson, toJson(saved), "theme_configuration");
    return toResponse(saved);
  }

  // ─── helpers ───────────────────────────────────────────────────────────────

  private UUID resolveCompanyId(UUID requestCompanyId) {
    UUID fromContext = TenantContext.getTenantId();
    UUID resolved = fromContext != null ? fromContext : requestCompanyId;
    if (resolved == null) {
      throw new OperationException(HttpStatus.UNAUTHORIZED, "Contexto de compañía no identificado");
    }
    return resolved;
  }

  private String toJson(Object obj) {
    if (obj == null) return null;
    try {
      return objectMapper.writeValueAsString(obj);
    } catch (JsonProcessingException e) {
      return obj.toString();
    }
  }

  private ThemeConfigurationResponse toResponse(ThemeConfiguration e) {
    return new ThemeConfigurationResponse(
        e.getId(),
        e.getCompanyId(),
        e.getPrimaryColor(),
        e.getSecondaryColor(),
        e.getSuccessColor(),
        e.getWarningColor(),
        e.getDangerColor(),
        e.getThemeMode(),
        e.getLogoUrl(),
        e.getFaviconUrl(),
        e.getCreatedAt(),
        e.getUpdatedAt()
    );
  }
}
