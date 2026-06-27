package com.parkflow.modules.configuration.infrastructure.controller;

import com.parkflow.modules.configuration.application.port.in.ThemeConfigurationUseCase;
import com.parkflow.modules.configuration.dto.ThemeConfigurationRequest;
import com.parkflow.modules.configuration.dto.ThemeConfigurationResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import com.parkflow.modules.auth.security.TenantContext;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/configuration/theme")
@RequiredArgsConstructor
public class ThemeConfigurationController {

  private final ThemeConfigurationUseCase themeConfigurationUseCase;

  @GetMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR','CAJERO')")
  public ResponseEntity<ThemeConfigurationResponse> get() {
    UUID companyId = TenantContext.getTenantId();
    if (companyId == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Company context required");
    }
    return ResponseEntity.ok(themeConfigurationUseCase.getByCompany(companyId));
  }

  @PutMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<ThemeConfigurationResponse> upsert(
      @Valid @RequestBody ThemeConfigurationRequest req) {
    UUID companyId = TenantContext.getTenantId();
    if (companyId == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Company context required");
    }
    return ResponseEntity.ok(themeConfigurationUseCase.createOrUpdate(companyId, req));
  }

  @PostMapping("/logo")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<ThemeConfigurationResponse> uploadLogo(
      @RequestParam("file") MultipartFile file) {
    UUID companyId = TenantContext.getTenantId();
    if (companyId == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Company context required");
    }
    return ResponseEntity.ok(themeConfigurationUseCase.updateLogo(companyId, file));
  }

  @DeleteMapping("/logo")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<ThemeConfigurationResponse> removeLogo() {
    UUID companyId = TenantContext.getTenantId();
    if (companyId == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Company context required");
    }
    return ResponseEntity.ok(themeConfigurationUseCase.removeLogo(companyId));
  }

  @PostMapping("/favicon")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<ThemeConfigurationResponse> uploadFavicon(
      @RequestParam("file") MultipartFile file) {
    UUID companyId = TenantContext.getTenantId();
    if (companyId == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Company context required");
    }
    return ResponseEntity.ok(themeConfigurationUseCase.updateFavicon(companyId, file));
  }

  @DeleteMapping("/favicon")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<ThemeConfigurationResponse> removeFavicon() {
    UUID companyId = TenantContext.getTenantId();
    if (companyId == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Company context required");
    }
    return ResponseEntity.ok(themeConfigurationUseCase.removeFavicon(companyId));
  }
}
