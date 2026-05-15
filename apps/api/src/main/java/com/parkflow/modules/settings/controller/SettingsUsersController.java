package com.parkflow.modules.settings.controller;

import com.parkflow.modules.settings.dto.*;
import com.parkflow.modules.settings.application.port.in.UserManagementUseCase;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/settings/users")
@RequiredArgsConstructor
public class SettingsUsersController {
  private final UserManagementUseCase userManagementUseCase;

  @GetMapping
  @PreAuthorize("hasAuthority('usuarios:leer')")
  public SettingsPageResponse<UserAdminResponse> list(
      @RequestParam(required = false) String q,
      @RequestParam(required = false) Boolean active,
      @PageableDefault(size = 20) Pageable pageable) {
    return userManagementUseCase.list(q, active, null, pageable);
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAuthority('usuarios:leer')")
  public UserAdminResponse get(@PathVariable UUID id) {
    return userManagementUseCase.get(id);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasAuthority('usuarios:editar')")
  public UserAdminResponse create(@Valid @RequestBody UserCreateRequest request) {
    return userManagementUseCase.create(request);
  }

  @PatchMapping("/{id}")
  @PreAuthorize("hasAuthority('usuarios:editar')")
  public UserAdminResponse patch(@PathVariable UUID id, @Valid @RequestBody UserPatchRequest request) {
    return userManagementUseCase.patch(id, request);
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("hasAuthority('usuarios:editar')")
  public UserAdminResponse status(@PathVariable UUID id, @Valid @RequestBody UserStatusRequest request) {
    return userManagementUseCase.patchStatus(id, request);
  }

  @PostMapping("/{id}/reset-password")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @PreAuthorize("hasAuthority('usuarios:editar')")
  public void resetPassword(@PathVariable UUID id, @Valid @RequestBody ResetPasswordRequest request) {
    userManagementUseCase.resetPassword(id, request);
  }
}
