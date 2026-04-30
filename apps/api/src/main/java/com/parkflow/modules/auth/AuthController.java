package com.parkflow.modules.auth;

import com.parkflow.modules.auth.dto.*;
import com.parkflow.modules.auth.service.AuthService;
import com.parkflow.modules.auth.service.PasswordResetService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
  private final AuthService authService;
  private final PasswordResetService passwordResetService;

  public AuthController(AuthService authService, PasswordResetService passwordResetService) {
    this.authService = authService;
    this.passwordResetService = passwordResetService;
  }

  @PostMapping("/login")
  @ResponseStatus(HttpStatus.OK)
  public LoginResponse login(@Valid @RequestBody LoginRequest request) {
    return authService.login(request);
  }

  @PostMapping("/refresh")
  public LoginResponse refresh(@Valid @RequestBody RefreshRequest request) {
    return authService.refresh(request);
  }

  @PostMapping("/logout")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void logout(@Valid @RequestBody LogoutRequest request) {
    authService.logout(request);
  }

  @GetMapping("/me")
  public AuthUserResponse me() {
    return authService.me();
  }

  @PostMapping("/change-password")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void changePassword(@Valid @RequestBody ChangePasswordRequest request) {
    authService.changePassword(request);
  }

  @GetMapping("/devices")
  @PreAuthorize("hasAuthority('devices:autorizar')")
  public List<DeviceInfoResponse> devices() {
    return authService.listDevices();
  }

  @PostMapping("/devices/revoke")
  @PreAuthorize("hasAuthority('devices:revocar')")
  public DeviceInfoResponse revoke(@Valid @RequestBody DeviceDecisionRequest request) {
    return authService.revokeDevice(request);
  }

  @PostMapping("/devices/authorize")
  @PreAuthorize("hasAuthority('devices:autorizar')")
  public DeviceInfoResponse authorize(@Valid @RequestBody DeviceDecisionRequest request) {
    return authService.authorizeDevice(request);
  }

  /**
   * Request password reset.
   * SECURITY: Always returns 200 to prevent email enumeration attacks.
   */
  @PostMapping("/password-reset/request")
  @ResponseStatus(HttpStatus.OK)
  public void requestPasswordReset(@Valid @RequestBody PasswordResetRequest request,
                                   HttpServletRequest httpRequest) {
    String ipAddress = getClientIp(httpRequest);
    passwordResetService.requestReset(new PasswordResetRequest(
        request.email(), request.deviceId(), ipAddress));
  }

  /**
   * Confirm password reset with token.
   */
  @PostMapping("/password-reset/confirm")
  @ResponseStatus(HttpStatus.OK)
  public void confirmPasswordReset(@Valid @RequestBody PasswordResetConfirmRequest request) {
    passwordResetService.confirmReset(request);
  }

  private String getClientIp(HttpServletRequest request) {
    String xForwardedFor = request.getHeader("X-Forwarded-For");
    if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
      return xForwardedFor.split(",")[0].trim();
    }
    String xRealIp = request.getHeader("X-Real-IP");
    if (xRealIp != null && !xRealIp.isEmpty()) {
      return xRealIp;
    }
    return request.getRemoteAddr();
  }
}
