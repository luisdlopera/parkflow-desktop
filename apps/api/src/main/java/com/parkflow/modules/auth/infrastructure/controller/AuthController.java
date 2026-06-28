package com.parkflow.modules.auth.infrastructure.controller;

import com.parkflow.modules.auth.dto.*;
import com.parkflow.modules.auth.application.port.in.LoginUseCase;
import com.parkflow.modules.auth.application.port.in.LogoutUseCase;
import com.parkflow.modules.auth.application.port.in.ProfileManagementUseCase;
import com.parkflow.modules.auth.application.port.in.TokenRefreshUseCase;
import com.parkflow.modules.auth.application.port.in.DeviceManagementUseCase;
import com.parkflow.modules.auth.application.port.in.PasswordResetUseCase;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.auth.domain.repository.AppUserPort;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
  private final LoginUseCase loginUseCase;
  private final TokenRefreshUseCase tokenRefreshUseCase;
  private final LogoutUseCase logoutUseCase;
  private final ProfileManagementUseCase profileManagementUseCase;
  private final DeviceManagementUseCase deviceManagementUseCase;
  private final PasswordResetUseCase passwordResetUseCase;
  private final AppUserPort appUserRepository;
  private final com.parkflow.modules.auth.security.AuthCookieFactory authCookieFactory;

  public AuthController(
      LoginUseCase loginUseCase,
      TokenRefreshUseCase tokenRefreshUseCase,
      LogoutUseCase logoutUseCase,
      ProfileManagementUseCase profileManagementUseCase,
      DeviceManagementUseCase deviceManagementUseCase,
      PasswordResetUseCase passwordResetUseCase,
      AppUserPort appUserRepository,
      com.parkflow.modules.auth.security.AuthCookieFactory authCookieFactory) {
    this.loginUseCase = loginUseCase;
    this.tokenRefreshUseCase = tokenRefreshUseCase;
    this.logoutUseCase = logoutUseCase;
    this.profileManagementUseCase = profileManagementUseCase;
    this.deviceManagementUseCase = deviceManagementUseCase;
    this.passwordResetUseCase = passwordResetUseCase;
    this.appUserRepository = appUserRepository;
    this.authCookieFactory = authCookieFactory;
  }

  @GetMapping("/setup-required")
  public Map<String, Boolean> setupRequired() {
    boolean required = appUserRepository.count() == 0;
    return Map.of("setupRequired", required);
  }

  @PostMapping("/login")
  @ResponseStatus(HttpStatus.OK)
  public LoginResponse login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
    LoginResult result = loginUseCase.login(request);
    authCookieFactory.setAuthCookies(response, result.accessToken(), result.refreshToken());
    return result.response();
  }

  @PostMapping("/refresh")
  public LoginResponse refresh(@Valid @RequestBody RefreshRequest request, HttpServletRequest httpRequest, HttpServletResponse response) {
    String refreshToken = authCookieFactory.extractRefreshToken(httpRequest);
    if (refreshToken == null) {
      throw new com.parkflow.modules.common.exception.OperationException(
          org.springframework.http.HttpStatus.UNAUTHORIZED,
          "AUTH_UNAUTHORIZED",
          "Tu sesion expiro. Inicia sesion nuevamente.");
    }
    LoginResult result = tokenRefreshUseCase.refresh(request, refreshToken);
    authCookieFactory.setAuthCookies(response, result.accessToken(), result.refreshToken());
    return result.response();
  }

  @PostMapping("/restore-session")
  public LoginResponse restoreSession(HttpServletRequest request, HttpServletResponse response) {
    String refreshToken = authCookieFactory.extractRefreshToken(request);
    if (refreshToken == null) {
      throw new com.parkflow.modules.common.exception.OperationException(
          org.springframework.http.HttpStatus.UNAUTHORIZED,
          "AUTH_UNAUTHORIZED",
          "Tu sesion expiro. Inicia sesion nuevamente.");
    }
    LoginResult result = tokenRefreshUseCase.refreshFromCookie(refreshToken);
    authCookieFactory.setAuthCookies(response, result.accessToken(), result.refreshToken());
    return result.response();
  }

  @PostMapping("/logout")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void logout(@Valid @RequestBody LogoutRequest request, HttpServletResponse response) {
    logoutUseCase.logout(request);
    authCookieFactory.clearAuthCookies(response);
  }

  @PostMapping("/logout/all")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void logoutAll(HttpServletResponse response) {
    logoutUseCase.logoutAll();
    authCookieFactory.clearAuthCookies(response);
  }

  @PostMapping("/logout/device/{deviceId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void logoutDevice(@PathVariable String deviceId, HttpServletResponse response) {
    logoutUseCase.logoutDevice(deviceId);
    authCookieFactory.clearAuthCookies(response);
  }

  @PostMapping("/validate")
  @ResponseStatus(HttpStatus.OK)
  public Map<String, Boolean> validateSession() {
    return Map.of("valid", true);
  }

  @GetMapping("/me")
  public AuthUserResponse me() {
    return profileManagementUseCase.me();
  }

  @GetMapping("/profile")
  public ProfileResponse profile() {
    return profileManagementUseCase.getProfile();
  }

  @PatchMapping("/profile")
  public ProfileResponse updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
    return profileManagementUseCase.updateProfile(request);
  }

  @PostMapping("/change-password")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void changePassword(@Valid @RequestBody ChangePasswordRequest request) {
    profileManagementUseCase.changePassword(request);
  }

  @GetMapping("/devices")
  @PreAuthorize("hasAuthority('devices:autorizar')")
  public List<DeviceInfoResponse> devices() {
    return deviceManagementUseCase.listDevices();
  }

  @PostMapping("/devices/revoke")
  @PreAuthorize("hasAuthority('devices:revocar')")
  public DeviceInfoResponse revoke(@Valid @RequestBody DeviceDecisionRequest request) {
    return deviceManagementUseCase.revokeDevice(request);
  }

  @PostMapping("/devices/authorize")
  @PreAuthorize("hasAuthority('devices:autorizar')")
  public DeviceInfoResponse authorize(@Valid @RequestBody DeviceDecisionRequest request) {
    return deviceManagementUseCase.authorizeDevice(request);
  }

  /**
   * Request password reset.
   * SECURITY: Always returns 200 to prevent email enumeration attacks.
   */
  @PostMapping("/password-reset/request")
  @ResponseStatus(HttpStatus.OK)
  public void requestPasswordReset(@Valid @RequestBody PasswordResetRequest request,
                                   HttpServletRequest httpRequest) {
    String ipAddress = SecurityUtils.getClientIp(httpRequest);
    passwordResetUseCase.requestReset(new PasswordResetRequest(
        request.email(), request.deviceId(), ipAddress));
  }

  /**
   * Confirm password reset with token.
   */
  @PostMapping("/password-reset/confirm")
  @ResponseStatus(HttpStatus.OK)
  public void confirmPasswordReset(@Valid @RequestBody PasswordResetConfirmRequest request) {
    passwordResetUseCase.confirmReset(request);
  }
}
