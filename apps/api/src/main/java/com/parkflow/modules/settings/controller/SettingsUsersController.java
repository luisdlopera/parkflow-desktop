package com.parkflow.modules.settings.controller;

import com.parkflow.modules.settings.dto.ResetPasswordRequest;
import com.parkflow.modules.settings.dto.SettingsPageResponse;
import com.parkflow.modules.settings.dto.UserAdminResponse;
import com.parkflow.modules.settings.dto.UserCreateRequest;
import com.parkflow.modules.settings.dto.UserPatchRequest;
import com.parkflow.modules.settings.dto.UserStatusRequest;
import com.parkflow.modules.settings.service.SettingsUserService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/settings/users")
public class SettingsUsersController {
  private final SettingsUserService settingsUserService;

  public SettingsUsersController(SettingsUserService settingsUserService) {
    this.settingsUserService = settingsUserService;
  }

  @GetMapping
  @PreAuthorize("hasAuthority('usuarios:leer')")
  public SettingsPageResponse<UserAdminResponse> list(
      @RequestParam(required = false) String q,
      @RequestParam(required = false) Boolean active,
      @PageableDefault(size = 20) Pageable pageable) {
    return settingsUserService.list(q, active, pageable);
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAuthority('usuarios:leer')")
  public UserAdminResponse get(@PathVariable UUID id) {
    return settingsUserService.get(id);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasAuthority('usuarios:editar')")
  public UserAdminResponse create(@Valid @RequestBody UserCreateRequest request) {
    return settingsUserService.create(request);
  }

  @PatchMapping("/{id}")
  @PreAuthorize("hasAuthority('usuarios:editar')")
  public UserAdminResponse patch(@PathVariable UUID id, @Valid @RequestBody UserPatchRequest request) {
    return settingsUserService.patch(id, request);
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("hasAuthority('usuarios:editar')")
  public UserAdminResponse status(@PathVariable UUID id, @Valid @RequestBody UserStatusRequest request) {
    return settingsUserService.patchStatus(id, request);
  }

  @PostMapping("/{id}/reset-password")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @PreAuthorize("hasAuthority('usuarios:editar')")
  public void resetPassword(@PathVariable UUID id, @Valid @RequestBody ResetPasswordRequest request) {
    settingsUserService.resetPassword(id, request);
  }
}
