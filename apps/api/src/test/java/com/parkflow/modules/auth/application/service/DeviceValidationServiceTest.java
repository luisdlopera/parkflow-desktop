package com.parkflow.modules.auth.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.AuthorizedDevice;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.auth.domain.repository.AuthorizedDevicePort;
import com.parkflow.modules.common.exception.OperationException;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class DeviceValidationServiceTest {

    @Mock
    private AuthorizedDevicePort authorizedDeviceRepository;

    @InjectMocks
    private DeviceValidationService deviceValidationService;

    private AppUser mockUser;
    private AuthorizedDevice mockDevice;
    private UUID deviceId;
    private UUID companyId;

    @BeforeEach
    void setUp() {
        deviceId = UUID.randomUUID();
        companyId = UUID.randomUUID();

        mockUser = new AppUser();
        mockUser.setId(UUID.randomUUID());
        mockUser.setEmail("test@example.com");
        mockUser.setCompanyId(companyId);
        mockUser.setRole(UserRole.CAJERO);
        mockUser.setActive(true);

        mockDevice = new AuthorizedDevice();
        mockDevice.setId(deviceId);
        mockDevice.setDeviceId("device-123");
        mockDevice.setAuthorized(true);
        mockDevice.setCompanyId(companyId);
    }

    @Test
    void testValidateDevice_AuthorizedDevice_ReturnsSuccess() {
        // Given: Device is authorized
        when(authorizedDeviceRepository.findById(deviceId))
            .thenReturn(Optional.of(mockDevice));

        // When
        boolean result = deviceValidationService.isDeviceAuthorized(deviceId, companyId);

        // Then
        assertThat(result).isTrue();
    }

    @Test
    void testValidateDevice_RevokedDevice_ReturnsFalse() {
        // Given: Device is revoked
        mockDevice.setAuthorized(false);
        when(authorizedDeviceRepository.findById(deviceId))
            .thenReturn(Optional.of(mockDevice));

        // When
        boolean result = deviceValidationService.isDeviceAuthorized(deviceId, companyId);

        // Then
        assertThat(result).isFalse();
    }

    @Test
    void testValidateDevice_NonexistentDevice_ReturnsFalse() {
        // Given: Device doesn't exist
        when(authorizedDeviceRepository.findById(deviceId))
            .thenReturn(Optional.empty());

        // When
        boolean result = deviceValidationService.isDeviceAuthorized(deviceId, companyId);

        // Then
        assertThat(result).isFalse();
    }

    @Test
    void testValidateDevice_WrongCompany_ReturnsFalse() {
        // Given: Device belongs to different company
        UUID differentCompanyId = UUID.randomUUID();
        mockDevice.setCompanyId(differentCompanyId);
        when(authorizedDeviceRepository.findById(deviceId))
            .thenReturn(Optional.of(mockDevice));

        // When
        boolean result = deviceValidationService.isDeviceAuthorized(deviceId, companyId);

        // Then
        assertThat(result).isFalse();
    }

    @Test
    void testRevokeDevice_AuthorizedDevice_RevokesSuccessfully() {
        // Given
        when(authorizedDeviceRepository.findById(deviceId))
            .thenReturn(Optional.of(mockDevice));

        // When
        deviceValidationService.revokeDevice(deviceId, companyId);

        // Then
        verify(authorizedDeviceRepository).save(any(AuthorizedDevice.class));
        assertThat(mockDevice.isAuthorized()).isFalse();
    }
}
