package com.parkflow.modules.configuration.infrastructure.controller;

import com.parkflow.modules.configuration.application.port.in.ThemeConfigurationUseCase;
import com.parkflow.modules.configuration.dto.ThemeConfigurationRequest;
import com.parkflow.modules.configuration.dto.ThemeConfigurationResponse;
import jakarta.validation.Valid;
import com.parkflow.modules.auth.security.TenantContext;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
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
  public ThemeConfigurationResponse get() {
    UUID companyId = TenantContext.getTenantId();
    if (companyId == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Company context required");
    }
    return themeConfigurationUseCase.getByCompany(companyId);
  }

  @PutMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ThemeConfigurationResponse upsert(
      @Valid @RequestBody ThemeConfigurationRequest req) {
    UUID companyId = TenantContext.getTenantId();
    if (companyId == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Company context required");
    }
    return themeConfigurationUseCase.createOrUpdate(companyId, req);
  }

  @PostMapping("/logo")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ThemeConfigurationResponse uploadLogo(
      @RequestParam("file") MultipartFile file) {
    UUID companyId = TenantContext.getTenantId();
    if (companyId == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Company context required");
    }
    return themeConfigurationUseCase.updateLogo(companyId, file);
  }

  @DeleteMapping("/logo")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ThemeConfigurationResponse removeLogo() {
    UUID companyId = TenantContext.getTenantId();
    if (companyId == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Company context required");
    }
    return themeConfigurationUseCase.removeLogo(companyId);
  }

  @PostMapping("/favicon")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ThemeConfigurationResponse uploadFavicon(
      @RequestParam("file") MultipartFile file) {
    UUID companyId = TenantContext.getTenantId();
    if (companyId == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Company context required");
    }
    return themeConfigurationUseCase.updateFavicon(companyId, file);
  }

  @DeleteMapping("/favicon")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ThemeConfigurationResponse removeFavicon() {
    UUID companyId = TenantContext.getTenantId();
    if (companyId == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Company context required");
    }
    return themeConfigurationUseCase.removeFavicon(companyId);
  }
}
