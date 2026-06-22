package com.parkflow.modules.auth.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.parkflow.modules.auth.domain.AuthorizedDevice;
import com.parkflow.modules.auth.domain.repository.AuthorizedDevicePort;
import com.parkflow.modules.auth.dto.DeviceDecisionRequest;
import com.parkflow.modules.auth.dto.DeviceInfoResponse;
import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.common.exception.OperationException;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DeviceManagementServiceTest {

    @Mock private AuthorizedDevicePort authorizedDeviceRepository;
    @Mock private AuthAuditService authAuditService;

    @InjectMocks
    private DeviceManagementService service;

    private MockedStatic<TenantContext> tenantContextMock;
    private final UUID companyId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        tenantContextMock = mockStatic(TenantContext.class);
        tenantContextMock.when(TenantContext::getTenantId).thenReturn(companyId);
    }

    @AfterEach
    void tearDown() {
        tenantContextMock.close();
    }

    @Nested
    class ListDevices {

        @Test
        void returnsDevicesFilteredByCompany() {
            AuthorizedDevice d1 = buildDevice("DEV-001", true);
            AuthorizedDevice d2 = buildDevice("DEV-002", false);
            when(authorizedDeviceRepository.findAllByCompanyId(companyId)).thenReturn(List.of(d1, d2));

            List<DeviceInfoResponse> result = service.listDevices();

            assertThat(result).hasSize(2);
            assertThat(result.get(0).deviceId()).isEqualTo("DEV-001");
        }

        @Test
        void returnsAllDevicesWhenNoTenantContext() {
            tenantContextMock.when(TenantContext::getTenantId).thenReturn(null);
            when(authorizedDeviceRepository.findAll()).thenReturn(List.of(buildDevice("DEV-001", true)));

            List<DeviceInfoResponse> result = service.listDevices();

            assertThat(result).hasSize(1);
            verify(authorizedDeviceRepository).findAll();
            verify(authorizedDeviceRepository, never()).findAllByCompanyId(any());
        }

        @Test
        void returnsEmptyListWhenNoDevices() {
            when(authorizedDeviceRepository.findAllByCompanyId(companyId)).thenReturn(List.of());

            List<DeviceInfoResponse> result = service.listDevices();

            assertThat(result).isEmpty();
        }
    }

    @Nested
    class RevokeDevice {

        @Test
        void revokesAuthorizedDevice() {
            AuthorizedDevice device = buildDevice("DEV-001", true);
            when(authorizedDeviceRepository.findByDeviceId("DEV-001")).thenReturn(Optional.of(device));
            when(authorizedDeviceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            DeviceInfoResponse response = service.revokeDevice(new DeviceDecisionRequest("DEV-001", "Perdido"));

            assertThat(response.authorized()).isFalse();
            assertThat(response.revokedAt()).isNotNull();
            verify(authorizedDeviceRepository).save(argThat(d -> !d.isAuthorized() && d.getRevokedAt() != null));
        }

        @Test
        void throwsWhenDeviceNotFound() {
            when(authorizedDeviceRepository.findByDeviceId("UNKNOWN")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.revokeDevice(new DeviceDecisionRequest("UNKNOWN", "reason")))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("Equipo no encontrado");
        }

        @Test
        void logsAuditEventAfterRevocation() {
            AuthorizedDevice device = buildDevice("DEV-AUDIT", true);
            when(authorizedDeviceRepository.findByDeviceId("DEV-AUDIT")).thenReturn(Optional.of(device));
            when(authorizedDeviceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            service.revokeDevice(new DeviceDecisionRequest("DEV-AUDIT", "Robado"));

            verify(authAuditService).log(
                eq(com.parkflow.modules.auth.domain.AuthAuditAction.DEVICE_REVOKED),
                isNull(),
                any(AuthorizedDevice.class),
                eq("OK"),
                argThat(m -> m.containsKey("reason")));
        }

        @Test
        void usesDefaultReasonWhenNullProvided() {
            AuthorizedDevice device = buildDevice("DEV-003", true);
            when(authorizedDeviceRepository.findByDeviceId("DEV-003")).thenReturn(Optional.of(device));
            when(authorizedDeviceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            assertThatCode(() -> service.revokeDevice(new DeviceDecisionRequest("DEV-003", null)))
                .doesNotThrowAnyException();

            verify(authAuditService).log(any(), any(), any(), any(),
                argThat(m -> "Revocado por administrador".equals(m.get("reason"))));
        }
    }

    @Nested
    class AuthorizeDevice {

        @Test
        void reauthorizesPreviouslyRevokedDevice() {
            AuthorizedDevice device = buildDevice("DEV-REVOKED", false);
            device.setRevokedAt(OffsetDateTime.now().minusDays(1));
            when(authorizedDeviceRepository.findByDeviceId("DEV-REVOKED")).thenReturn(Optional.of(device));
            when(authorizedDeviceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            DeviceInfoResponse response = service.authorizeDevice(new DeviceDecisionRequest("DEV-REVOKED", ""));

            assertThat(response.authorized()).isTrue();
            assertThat(response.revokedAt()).isNull();
        }

        @Test
        void throwsWhenDeviceNotFoundDuringAuthorization() {
            when(authorizedDeviceRepository.findByDeviceId("GHOST")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.authorizeDevice(new DeviceDecisionRequest("GHOST", "")))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("Equipo no encontrado");
        }
    }

    // -------------------------------------------------------------------------

    private AuthorizedDevice buildDevice(String deviceId, boolean authorized) {
        AuthorizedDevice d = new AuthorizedDevice();
        d.setId(UUID.randomUUID());
        d.setCompanyId(companyId);
        d.setDeviceId(deviceId);
        d.setDisplayName("Terminal " + deviceId);
        d.setPlatform("Windows");
        d.setFingerprint("fp-" + deviceId);
        d.setAuthorized(authorized);
        if (!authorized) d.setRevokedAt(OffsetDateTime.now().minusHours(1));
        return d;
    }
}
