package com.parkflow.modules.configuration.controller;

import com.parkflow.modules.settings.dto.*;
import com.parkflow.modules.settings.service.SettingsUserService;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/configuration/users")
@RequiredArgsConstructor
public class ConfigurationUserController {

  private final SettingsUserService settingsUserService;

  @GetMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public ResponseEntity<SettingsPageResponse<UserAdminResponse>> list(
      @RequestParam(required = false) String q,
      @RequestParam(required = false) Boolean active,
      Pageable pageable) {
    return ResponseEntity.ok(settingsUserService.list(q, active, pageable));
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
  public ResponseEntity<UserAdminResponse> get(@PathVariable UUID id) {
    return ResponseEntity.ok(settingsUserService.get(id));
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<UserAdminResponse> create(@Valid @RequestBody UserCreateRequest req) {
    return ResponseEntity.status(HttpStatus.CREATED).body(settingsUserService.create(req));
  }

  @PatchMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<UserAdminResponse> patch(
      @PathVariable UUID id,
      @Valid @RequestBody UserPatchRequest req) {
    return ResponseEntity.ok(settingsUserService.patch(id, req));
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<UserAdminResponse> patchStatus(
      @PathVariable UUID id,
      @RequestBody UserStatusRequest req) {
    return ResponseEntity.ok(settingsUserService.patchStatus(id, req));
  }
}
