package com.parkflow.modules.settings.infrastructure.controller;

import com.parkflow.modules.common.dto.*;
import com.parkflow.modules.settings.application.port.in.UserManagementUseCase;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.data.domain.Pageable;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.data.web.PageableDefault;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.http.HttpStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.web.bind.annotation.*;

@RestController
@Tag(name = "SettingsUsers", description = "SettingsUsers endpoints")
@RequestMapping("/api/v1/settings/users")
@Deprecated(since = "2.1.0", forRemoval = false)
@RequiredArgsConstructor
public class SettingsUsersController {
  private final UserManagementUseCase userManagementUseCase;

  @GetMapping
  @Operation(summary = "GET endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAuthority('usuarios:leer')")
  public PageResponse<UserAdminResponse> list(
      @RequestParam(required = false) String q,
      @RequestParam(required = false) Boolean active,
      @PageableDefault(size = 20) Pageable pageable) {
    return userManagementUseCase.list(q, active, null, pageable);
  }

  @GetMapping("/{id}")
  @Operation(summary = "GET endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAuthority('usuarios:leer')")
  public UserAdminResponse get(@PathVariable UUID id) {
    return userManagementUseCase.get(id);
  }

  @PostMapping
  @Operation(summary = "POST endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "201", description = "Created")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasAuthority('usuarios:editar')")
  public UserAdminResponse create(@Valid @RequestBody UserCreateRequest request) {
    return userManagementUseCase.create(request);
  }

  @PatchMapping("/{id}")
  @Operation(summary = "PATCH endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAuthority('usuarios:editar')")
  public UserAdminResponse patch(@PathVariable UUID id, @Valid @RequestBody UserPatchRequest request) {
    return userManagementUseCase.patch(id, request);
  }

  @PatchMapping("/{id}/status")
  @Operation(summary = "PATCH endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAuthority('usuarios:editar')")
  public UserAdminResponse status(@PathVariable UUID id, @Valid @RequestBody UserStatusRequest request) {
    return userManagementUseCase.patchStatus(id, request);
  }

  @PostMapping("/{id}/reset-password")
  @Operation(summary = "POST endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "201", description = "Created")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @PreAuthorize("hasAuthority('usuarios:editar')")
  public void resetPassword(@PathVariable UUID id, @Valid @RequestBody ResetPasswordRequest request) {
    userManagementUseCase.resetPassword(id, request);
  }
}
