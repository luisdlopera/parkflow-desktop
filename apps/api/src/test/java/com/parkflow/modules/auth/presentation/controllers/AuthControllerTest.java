package com.parkflow.modules.auth.presentation.controllers;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.auth.application.port.in.*;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.auth.dto.*;
import com.parkflow.modules.parking.operation.repository.AppUserRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    private MockMvc mockMvc;

    @Mock private LoginUseCase loginUseCase;
    @Mock private TokenRefreshUseCase tokenRefreshUseCase;
    @Mock private LogoutUseCase logoutUseCase;
    @Mock private ProfileManagementUseCase profileManagementUseCase;
    @Mock private DeviceManagementUseCase deviceManagementUseCase;
    @Mock private PasswordResetUseCase passwordResetUseCase;
    @Mock private AppUserRepository appUserRepository;

    @InjectMocks private AuthController controller;

    private final ObjectMapper mapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new com.parkflow.modules.common.exception.GlobalExceptionHandler())
                .build();
    }

    @Test
    void setupRequired() throws Exception {
        when(appUserRepository.count()).thenReturn(0L);
        mockMvc.perform(get("/api/v1/auth/setup-required"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.setupRequired").value(true));
    }

    @Test
    void login() throws Exception {
        LoginRequest req = new LoginRequest("admin@test.com", "password", "device", "deviceName", "platform", "fingerprint", null);
        LoginResponse res = new LoginResponse(null, null, null, null);
        LoginResult result = new LoginResult(res, "token", "refresh");
        
        when(loginUseCase.login(any())).thenReturn(result);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(header().exists("Set-Cookie"));
    }

    @Test
    void refresh() throws Exception {
        RefreshRequest req = new RefreshRequest("device");
        LoginResponse res = new LoginResponse(null, null, null, null);
        LoginResult result = new LoginResult(res, "token2", "refresh2");
        
        when(tokenRefreshUseCase.refresh(any(), eq("old_refresh"))).thenReturn(result);

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req))
                        .cookie(new Cookie("parkflow_refresh", "old_refresh")))
                .andExpect(status().isOk())
                .andExpect(header().exists("Set-Cookie"));
    }

    @Test
    void refresh_NoCookie_ThrowsException() throws Exception {
        RefreshRequest req = new RefreshRequest("device");
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void restoreSession() throws Exception {
        LoginResponse res = new LoginResponse(null, null, null, null);
        LoginResult result = new LoginResult(res, "token2", "refresh2");
        
        when(tokenRefreshUseCase.refreshFromCookie(eq("old_refresh"))).thenReturn(result);

        mockMvc.perform(post("/api/v1/auth/restore-session")
                        .cookie(new Cookie("parkflow_refresh", "old_refresh")))
                .andExpect(status().isOk())
                .andExpect(header().exists("Set-Cookie"));
    }

    @Test
    void restoreSession_NoCookie_ThrowsException() throws Exception {
        mockMvc.perform(post("/api/v1/auth/restore-session"))
                .andExpect(status().isUnauthorized());
    }
    
    @Test
    void logout() throws Exception {
        LogoutRequest req = new LogoutRequest("session", null);
        mockMvc.perform(post("/api/v1/auth/logout")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isNoContent())
                .andExpect(header().exists("Set-Cookie"));
        verify(logoutUseCase).logout(any());
    }

    @Test
    void logoutAll() throws Exception {
        mockMvc.perform(post("/api/v1/auth/logout/all"))
                .andExpect(status().isNoContent())
                .andExpect(header().exists("Set-Cookie"));
        verify(logoutUseCase).logoutAll();
    }

    @Test
    void logoutDevice() throws Exception {
        mockMvc.perform(post("/api/v1/auth/logout/device/dev1"))
                .andExpect(status().isNoContent())
                .andExpect(header().exists("Set-Cookie"));
        verify(logoutUseCase).logoutDevice("dev1");
    }

    @Test
    void me() throws Exception {
        AuthUserResponse res = new AuthUserResponse(UUID.randomUUID(), UUID.randomUUID(), "Name", "test@test.com", "Role", List.of(), true, OffsetDateTime.now(), false, false);
        when(profileManagementUseCase.me()).thenReturn(res);
        
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("test@test.com"));
    }

    @Test
    void profile() throws Exception {
        ProfileResponse res = new ProfileResponse(UUID.randomUUID(), "Name", "test@test.com", "DOC", "Phone", UserRole.ADMIN, "site", "term", true, false, OffsetDateTime.now(), OffsetDateTime.now(), OffsetDateTime.now(), OffsetDateTime.now());
        when(profileManagementUseCase.getProfile()).thenReturn(res);
        
        mockMvc.perform(get("/api/v1/auth/profile"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("test@test.com"));
    }

    @Test
    void updateProfile() throws Exception {
        UpdateProfileRequest req = new UpdateProfileRequest("New Name", "test@test.com", "DOC", "Phone", "site", "term");
        ProfileResponse res = new ProfileResponse(UUID.randomUUID(), "New Name", "test@test.com", "DOC", "Phone", UserRole.ADMIN, "site", "term", true, false, OffsetDateTime.now(), OffsetDateTime.now(), OffsetDateTime.now(), OffsetDateTime.now());
        when(profileManagementUseCase.updateProfile(any())).thenReturn(res);
        
        mockMvc.perform(patch("/api/v1/auth/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("New Name"));
    }

    @Test
    void changePassword() throws Exception {
        ChangePasswordRequest req = new ChangePasswordRequest("old", "new");
        mockMvc.perform(post("/api/v1/auth/change-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isNoContent());
        verify(profileManagementUseCase).changePassword(any());
    }

    @Test
    void devices() throws Exception {
        when(deviceManagementUseCase.listDevices()).thenReturn(List.of());
        mockMvc.perform(get("/api/v1/auth/devices"))
                .andExpect(status().isOk());
    }

    @Test
    void revoke() throws Exception {
        DeviceDecisionRequest req = new DeviceDecisionRequest("dev1", "reason");
        mockMvc.perform(post("/api/v1/auth/devices/revoke")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isOk());
        verify(deviceManagementUseCase).revokeDevice(any());
    }

    @Test
    void authorize() throws Exception {
        DeviceDecisionRequest req = new DeviceDecisionRequest("dev1", "reason");
        mockMvc.perform(post("/api/v1/auth/devices/authorize")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isOk());
        verify(deviceManagementUseCase).authorizeDevice(any());
    }

    @Test
    void requestPasswordReset() throws Exception {
        PasswordResetRequest req = new PasswordResetRequest("test@test.com", "dev1", null);
        mockMvc.perform(post("/api/v1/auth/password-reset/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req))
                        .header("X-Forwarded-For", "192.168.1.1, 10.0.0.1"))
                .andExpect(status().isOk());
        verify(passwordResetUseCase).requestReset(any());
    }

    @Test
    void confirmPasswordReset() throws Exception {
        PasswordResetConfirmRequest req = new PasswordResetConfirmRequest("token", "newPass123", "device");
        mockMvc.perform(post("/api/v1/auth/password-reset/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(req)))
                .andExpect(status().isOk());
        verify(passwordResetUseCase).confirmReset(any());
    }
}
