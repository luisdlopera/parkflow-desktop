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
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication", description = "Authentication and authorization endpoints")
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
  @Operation(summary = "Check if initial setup is required", description = "Returns true if no users exist yet")
  @ApiResponse(responseCode = "200", description = "Setup status retrieved")
  public SetupRequiredResponse setupRequired() {
    boolean required = appUserRepository.count() == 0;
    return new SetupRequiredResponse(required);
  }

  @PostMapping("/login")
  @ResponseStatus(HttpStatus.OK)
  @Operation(summary = "Authenticate user with credentials", description = "Login with email and password, returns session token")
  @ApiResponse(responseCode = "200", description = "Login successful")
  @ApiResponse(responseCode = "401", description = "Invalid credentials")
  @ApiResponse(responseCode = "429", description = "Too many login attempts")
  public LoginResponse login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
    LoginResult result = loginUseCase.login(request);
    boolean rememberMe = request.rememberMe() != null && request.rememberMe();
    authCookieFactory.setAuthCookies(response, result.accessToken(), result.refreshToken(), rememberMe);
    return result.response();
  }

  @PostMapping("/refresh")
  @Operation(summary = "Refresh access token using refresh token", description = "Extends session using refresh token from request body")
  @ApiResponse(responseCode = "200", description = "Token refreshed")
  @ApiResponse(responseCode = "401", description = "Invalid or expired refresh token")
  public LoginResponse refresh(@Valid @RequestBody RefreshRequest request, HttpServletRequest httpRequest, HttpServletResponse response) {
    String refreshToken = authCookieFactory.extractRefreshToken(httpRequest);
    if (refreshToken == null) {
      throw new com.parkflow.modules.common.exception.OperationException(
          org.springframework.http.HttpStatus.UNAUTHORIZED,
          "AUTH_UNAUTHORIZED",
          "Tu sesion expiro. Inicia sesion nuevamente.");
    }
    LoginResult result = tokenRefreshUseCase.refresh(request, refreshToken);
    authCookieFactory.setAuthCookies(response, result.accessToken(), result.refreshToken(), true);
    return result.response();
  }

  @PostMapping("/restore-session")
  @Operation(summary = "Restore session from refresh token", description = "Restores session from httpOnly cookie (used on app startup)")
  @ApiResponse(responseCode = "200", description = "Session restored")
  @ApiResponse(responseCode = "401", description = "No valid refresh token found")
  public LoginResponse restoreSession(HttpServletRequest request, HttpServletResponse response) {
    String refreshToken = authCookieFactory.extractRefreshToken(request);
    if (refreshToken == null) {
      throw new com.parkflow.modules.common.exception.OperationException(
          org.springframework.http.HttpStatus.UNAUTHORIZED,
          "AUTH_UNAUTHORIZED",
          "Tu sesion expiro. Inicia sesion nuevamente.");
    }
    LoginResult result = tokenRefreshUseCase.refreshFromCookie(refreshToken);
    authCookieFactory.setAuthCookies(response, result.accessToken(), result.refreshToken(), true);
    return result.response();
  }

  @PostMapping("/refresh-token")
  @ResponseStatus(HttpStatus.OK)
  @Operation(summary = "Keep-alive endpoint to extend session", description = "Used for session keep-alive - silently extends session while user is active")
  @ApiResponse(responseCode = "200", description = "Session extended")
  @ApiResponse(responseCode = "401", description = "No valid refresh token found")
  public RefreshTokenResponse refreshToken(HttpServletRequest request, HttpServletResponse response) {
    // Used for session keep-alive - silently extends session while user is active
    String refreshToken = authCookieFactory.extractRefreshToken(request);
    if (refreshToken == null) {
      throw new com.parkflow.modules.common.exception.OperationException(
          org.springframework.http.HttpStatus.UNAUTHORIZED,
          "AUTH_UNAUTHORIZED",
          "Tu sesion expiro. Inicia sesion nuevamente.");
    }
    LoginResult result = tokenRefreshUseCase.refreshFromCookie(refreshToken);
    authCookieFactory.setAuthCookies(response, result.accessToken(), result.refreshToken(), true);
    // Return minimal response for keep-alive
    return new RefreshTokenResponse(result.accessToken(), 3600, 300);
  }

  @PostMapping("/logout")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @PreAuthorize("isAuthenticated()")
  @Operation(summary = "Logout current device", description = "Invalidates session token for current device")
  @ApiResponse(responseCode = "204", description = "Logged out successfully")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  public void logout(@Valid @RequestBody LogoutRequest request, HttpServletResponse response) {
    logoutUseCase.logout(request);
    authCookieFactory.clearAuthCookies(response);
  }

  @PostMapping("/logout/all")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @PreAuthorize("isAuthenticated()")
  @Operation(summary = "Logout all devices", description = "Invalidates session tokens for all devices of the user")
  @ApiResponse(responseCode = "204", description = "Logged out from all devices")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  public void logoutAll(HttpServletResponse response) {
    logoutUseCase.logoutAll();
    authCookieFactory.clearAuthCookies(response);
  }

  @PostMapping("/logout/device/{deviceId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @PreAuthorize("isAuthenticated()")
  @Operation(summary = "Logout specific device", description = "Invalidates session token for a specific device")
  @ApiResponse(responseCode = "204", description = "Device logged out")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  public void logoutDevice(@PathVariable String deviceId, HttpServletResponse response) {
    logoutUseCase.logoutDevice(deviceId);
    authCookieFactory.clearAuthCookies(response);
  }

  @PostMapping("/validate")
  @ResponseStatus(HttpStatus.OK)
  @PreAuthorize("isAuthenticated()")
  @Operation(summary = "Validate current session", description = "Checks if current session token is valid")
  @ApiResponse(responseCode = "200", description = "Session is valid")
  @ApiResponse(responseCode = "401", description = "Session expired or invalid")
  public SessionValidationResponse validateSession() {
    return new SessionValidationResponse(true);
  }

  @GetMapping("/me")
  @PreAuthorize("isAuthenticated()")
  @Operation(summary = "Get current authenticated user", description = "Returns info about the currently logged in user")
  @ApiResponse(responseCode = "200", description = "User info retrieved")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  public AuthUserResponse me() {
    return profileManagementUseCase.me();
  }

  @GetMapping("/profile")
  @PreAuthorize("isAuthenticated()")
  @Operation(summary = "Get user profile", description = "Retrieves detailed profile information for authenticated user")
  @ApiResponse(responseCode = "200", description = "Profile retrieved")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  public ProfileResponse profile() {
    return profileManagementUseCase.getProfile();
  }

  @PatchMapping("/profile")
  @PreAuthorize("isAuthenticated()")
  @Operation(summary = "Update user profile", description = "Updates name, email, or other profile fields")
  @ApiResponse(responseCode = "200", description = "Profile updated")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @ApiResponse(responseCode = "409", description = "Email already in use")
  public ProfileResponse updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
    return profileManagementUseCase.updateProfile(request);
  }

  @PostMapping("/change-password")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @PreAuthorize("isAuthenticated()")
  @Operation(summary = "Change password", description = "Updates password for authenticated user (requires current password)")
  @ApiResponse(responseCode = "204", description = "Password changed")
  @ApiResponse(responseCode = "401", description = "Unauthorized or incorrect current password")
  public void changePassword(@Valid @RequestBody ChangePasswordRequest request) {
    profileManagementUseCase.changePassword(request);
  }

  @GetMapping("/devices")
  @PreAuthorize("hasAuthority('devices:autorizar')")
  @Operation(summary = "List authorized devices", description = "Returns all devices authorized for current user")
  @ApiResponse(responseCode = "200", description = "Device list retrieved")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  public List<DeviceInfoResponse> devices() {
    return deviceManagementUseCase.listDevices();
  }

  @PostMapping("/devices/revoke")
  @PreAuthorize("hasAuthority('devices:revocar')")
  @Operation(summary = "Revoke device authorization", description = "Removes device from authorized list")
  @ApiResponse(responseCode = "200", description = "Device revoked")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @ApiResponse(responseCode = "404", description = "Device not found")
  public DeviceInfoResponse revoke(@Valid @RequestBody DeviceDecisionRequest request) {
    return deviceManagementUseCase.revokeDevice(request);
  }

  @PostMapping("/devices/authorize")
  @PreAuthorize("hasAuthority('devices:autorizar')")
  @Operation(summary = "Authorize device", description = "Adds device to authorized list")
  @ApiResponse(responseCode = "200", description = "Device authorized")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @ApiResponse(responseCode = "404", description = "Device not found")
  public DeviceInfoResponse authorize(@Valid @RequestBody DeviceDecisionRequest request) {
    return deviceManagementUseCase.authorizeDevice(request);
  }

  @PostMapping("/password-reset/request")
  @ResponseStatus(HttpStatus.OK)
  @Operation(summary = "Request password reset", description = "Sends password reset link to email (always returns 200 to prevent email enumeration)")
  @ApiResponse(responseCode = "200", description = "Reset email sent if account exists")
  public void requestPasswordReset(@Valid @RequestBody PasswordResetRequest request,
                                   HttpServletRequest httpRequest) {
    String ipAddress = SecurityUtils.getClientIp(httpRequest);
    passwordResetUseCase.requestReset(new PasswordResetRequest(
        request.email(), request.deviceId(), ipAddress));
  }

  @PostMapping("/password-reset/confirm")
  @ResponseStatus(HttpStatus.OK)
  @Operation(summary = "Confirm password reset with token", description = "Completes password reset using reset token from email")
  @ApiResponse(responseCode = "200", description = "Password reset confirmed")
  @ApiResponse(responseCode = "400", description = "Invalid or expired reset token")
  public void confirmPasswordReset(@Valid @RequestBody PasswordResetConfirmRequest request) {
    passwordResetUseCase.confirmReset(request);
  }
}
