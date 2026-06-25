package com.parkflow.modules.configuration.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.audit.domain.AuditAction;
import com.parkflow.modules.audit.application.service.AuditService;
import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.configuration.application.port.in.ThemeConfigurationUseCase;
import com.parkflow.modules.configuration.domain.ThemeConfiguration;
import com.parkflow.modules.configuration.domain.repository.ThemeConfigurationPort;
import com.parkflow.modules.configuration.dto.ThemeConfigurationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.OffsetDateTime;
import java.util.Set;
import java.util.UUID;

/**
 * Theme Asset Management - handles logo and favicon uploads/removals.
 * Manages theme asset files (images) for company branding.
 */
@Service
@RequiredArgsConstructor
public class ThemeAssetManagementService implements ThemeConfigurationUseCase {

  private static final Set<String> ALLOWED_IMAGE_TYPES =
      Set.of("image/png", "image/jpeg", "image/svg+xml");
  private static final Set<String> ALLOWED_FAVICON_TYPES =
      Set.of("image/x-icon", "image/png", "image/svg+xml");
  private static final long MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB

  private final ThemeConfigurationPort themeConfigurationRepository;
  private final AuditService auditService;
  private final ObjectMapper objectMapper;

  @Value("${app.uploads.dir:uploads}")
  private String uploadsDir;

  @Value("${app.uploads.base-url:/uploads}")
  private String uploadsBaseUrl;

  @Override
  @Transactional(readOnly = true)
  public ThemeConfigurationResponse getByCompany(UUID companyId) {
    return themeConfigurationRepository.findByCompanyId(companyId)
        .map(this::toResponse)
        .orElseGet(() -> defaultResponse(companyId));
  }

  @Override
  @Transactional
  public ThemeConfigurationResponse updateLogo(UUID companyId, MultipartFile file) {
    validateImageFile(file, ALLOWED_IMAGE_TYPES, "logo");
    UUID resolvedCompanyId = resolveCompanyId(companyId);

    ThemeConfiguration entity = getOrCreateEntity(resolvedCompanyId);
    String previousUrl = entity.getLogoUrl();
    String url = storeFile(file, resolvedCompanyId, "logo");
    entity.setLogoUrl(url);
    entity.setUpdatedAt(OffsetDateTime.now());

    ThemeConfiguration saved = themeConfigurationRepository.save(entity);
    auditService.record(AuditAction.CAMBIAR_CONFIGURACION, resolvedCompanyId, null,
        "{\"logoUrl\":\"" + previousUrl + "\"}", "{\"logoUrl\":\"" + url + "\"}", "theme_logo");
    return toResponse(saved);
  }

  @Override
  @Transactional
  public ThemeConfigurationResponse updateFavicon(UUID companyId, MultipartFile file) {
    validateImageFile(file, ALLOWED_FAVICON_TYPES, "favicon");
    UUID resolvedCompanyId = resolveCompanyId(companyId);

    ThemeConfiguration entity = getOrCreateEntity(resolvedCompanyId);
    String previousUrl = entity.getFaviconUrl();
    String url = storeFile(file, resolvedCompanyId, "favicon");
    entity.setFaviconUrl(url);
    entity.setUpdatedAt(OffsetDateTime.now());

    ThemeConfiguration saved = themeConfigurationRepository.save(entity);
    auditService.record(AuditAction.CAMBIAR_CONFIGURACION, resolvedCompanyId, null,
        "{\"faviconUrl\":\"" + previousUrl + "\"}", "{\"faviconUrl\":\"" + url + "\"}", "theme_favicon");
    return toResponse(saved);
  }

  @Override
  @Transactional
  public ThemeConfigurationResponse removeLogo(UUID companyId) {
    UUID resolvedCompanyId = resolveCompanyId(companyId);
    ThemeConfiguration entity = getOrCreateEntity(resolvedCompanyId);
    deleteFile(resolvedCompanyId, "logo");
    entity.setLogoUrl(null);
    entity.setUpdatedAt(OffsetDateTime.now());
    ThemeConfiguration saved = themeConfigurationRepository.save(entity);
    auditService.record(AuditAction.CAMBIAR_CONFIGURACION, resolvedCompanyId, null, null, null, "theme_logo_removed");
    return toResponse(saved);
  }

  @Override
  @Transactional
  public ThemeConfigurationResponse removeFavicon(UUID companyId) {
    UUID resolvedCompanyId = resolveCompanyId(companyId);
    ThemeConfiguration entity = getOrCreateEntity(resolvedCompanyId);
    deleteFile(resolvedCompanyId, "favicon");
    entity.setFaviconUrl(null);
    entity.setUpdatedAt(OffsetDateTime.now());
    ThemeConfiguration saved = themeConfigurationRepository.save(entity);
    auditService.record(AuditAction.CAMBIAR_CONFIGURACION, resolvedCompanyId, null, null, null, "theme_favicon_removed");
    return toResponse(saved);
  }

  @Override
  @Transactional
  public ThemeConfigurationResponse createOrUpdate(UUID companyId, com.parkflow.modules.configuration.dto.ThemeConfigurationRequest req) {
    throw new UnsupportedOperationException("Use ThemeColorManagementService for color updates");
  }

  // ─── helpers ───────────────────────────────────────────────────────────────

  private ThemeConfiguration getOrCreateEntity(UUID companyId) {
    ThemeConfiguration entity = themeConfigurationRepository.findByCompanyId(companyId)
        .orElse(new ThemeConfiguration());
    if (entity.getCompanyId() == null) {
      entity.setCompanyId(companyId);
      entity.setCreatedAt(OffsetDateTime.now());
    }
    return entity;
  }

  private UUID resolveCompanyId(UUID requestCompanyId) {
    UUID fromContext = TenantContext.getTenantId();
    UUID resolved = fromContext != null ? fromContext : requestCompanyId;
    if (resolved == null) {
      throw new OperationException(HttpStatus.UNAUTHORIZED, "Contexto de compañía no identificado");
    }
    return resolved;
  }

  private String storeFile(MultipartFile file, UUID companyId, String slot) {
    try {
      String originalFilename = file.getOriginalFilename();
      String ext = originalFilename != null && originalFilename.contains(".")
          ? originalFilename.substring(originalFilename.lastIndexOf('.'))
          : ".bin";

      Path dir = Paths.get(uploadsDir, companyId.toString());
      Files.createDirectories(dir);

      Path dest = dir.resolve(slot + ext);
      Files.copy(file.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);

      return uploadsBaseUrl + "/" + companyId + "/" + slot + ext;
    } catch (IOException e) {
      throw new OperationException(HttpStatus.INTERNAL_SERVER_ERROR,
          "Error al guardar el archivo: " + e.getMessage());
    }
  }

  private void deleteFile(UUID companyId, String slot) {
    try {
      Path dir = Paths.get(uploadsDir, companyId.toString());
      if (!Files.exists(dir)) return;
      Files.list(dir)
          .filter(p -> p.getFileName().toString().startsWith(slot + "."))
          .forEach(p -> {
            try { Files.deleteIfExists(p); } catch (IOException ignored) {}
          });
    } catch (IOException ignored) {}
  }

  private void validateImageFile(MultipartFile file, Set<String> allowed, String slot) {
    if (file == null || file.isEmpty()) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "El archivo de " + slot + " no puede estar vacío");
    }
    if (file.getSize() > MAX_FILE_BYTES) {
      throw new OperationException(HttpStatus.BAD_REQUEST,
          "El archivo de " + slot + " no debe superar 2 MB");
    }
    String contentType = file.getContentType();
    if (contentType == null || !allowed.contains(contentType)) {
      throw new OperationException(HttpStatus.BAD_REQUEST,
          "Formato de " + slot + " no permitido. Use: " + String.join(", ", allowed));
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

  private ThemeConfigurationResponse defaultResponse(UUID companyId) {
    return new ThemeConfigurationResponse(
        null, companyId,
        "#f97316", "#64748b", "#22c55e", "#f59e0b", "#ef4444",
        "auto", null, null,
        null, null
    );
  }
}
