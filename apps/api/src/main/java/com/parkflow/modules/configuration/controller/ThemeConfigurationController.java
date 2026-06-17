package com.parkflow.modules.configuration.controller;

import com.parkflow.modules.configuration.application.port.in.ThemeConfigurationUseCase;
import com.parkflow.modules.configuration.dto.ThemeConfigurationRequest;
import com.parkflow.modules.configuration.dto.ThemeConfigurationResponse;
import jakarta.validation.Valid;
import java.util.UUID;
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
  public ResponseEntity<ThemeConfigurationResponse> get(@RequestParam UUID companyId) {
    return ResponseEntity.ok(themeConfigurationUseCase.getByCompany(companyId));
  }

  @PutMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<ThemeConfigurationResponse> upsert(
      @RequestParam UUID companyId,
      @Valid @RequestBody ThemeConfigurationRequest req) {
    return ResponseEntity.ok(themeConfigurationUseCase.createOrUpdate(companyId, req));
  }

  @PostMapping("/logo")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<ThemeConfigurationResponse> uploadLogo(
      @RequestParam UUID companyId,
      @RequestParam("file") MultipartFile file) {
    return ResponseEntity.ok(themeConfigurationUseCase.updateLogo(companyId, file));
  }

  @DeleteMapping("/logo")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<ThemeConfigurationResponse> removeLogo(@RequestParam UUID companyId) {
    return ResponseEntity.ok(themeConfigurationUseCase.removeLogo(companyId));
  }

  @PostMapping("/favicon")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<ThemeConfigurationResponse> uploadFavicon(
      @RequestParam UUID companyId,
      @RequestParam("file") MultipartFile file) {
    return ResponseEntity.ok(themeConfigurationUseCase.updateFavicon(companyId, file));
  }

  @DeleteMapping("/favicon")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<ThemeConfigurationResponse> removeFavicon(@RequestParam UUID companyId) {
    return ResponseEntity.ok(themeConfigurationUseCase.removeFavicon(companyId));
  }
}
