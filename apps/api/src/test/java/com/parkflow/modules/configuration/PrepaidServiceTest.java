package com.parkflow.modules.configuration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.configuration.domain.PrepaidBalance;
import com.parkflow.modules.configuration.domain.PrepaidPackage;
import com.parkflow.modules.configuration.dto.PrepaidBalancePurchaseRequest;
import com.parkflow.modules.configuration.dto.PrepaidBalanceResponse;
import com.parkflow.modules.configuration.dto.PrepaidPackageRequest;
import com.parkflow.modules.configuration.dto.PrepaidPackageResponse;
import com.parkflow.modules.configuration.repository.PrepaidBalanceRepository;
import com.parkflow.modules.configuration.repository.PrepaidPackageRepository;
import com.parkflow.modules.configuration.repository.ParkingSiteRepository;
import com.parkflow.modules.configuration.service.PrepaidService;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PrepaidServiceTest {

    @Mock private PrepaidPackageRepository packageRepo;
    @Mock private PrepaidBalanceRepository balanceRepo;
    @Mock private ParkingSiteRepository siteRepository;
    @Mock private AuditPort globalAuditService;
    @Mock private ObjectMapper objectMapper;

    @InjectMocks
    private PrepaidService service;

    private PrepaidPackage activePackage;

    @BeforeEach
    void setUp() throws Exception {
        activePackage = new PrepaidPackage();
        activePackage.setId(UUID.randomUUID());
        activePackage.setName("Paquete 10h");
        activePackage.setHoursIncluded(10);
        activePackage.setAmount(new BigDecimal("50000"));
        activePackage.setVehicleType("AUTO");
        activePackage.setSite("SEDE1");
        activePackage.setExpiresDays(30);
        activePackage.setActive(true);
        activePackage.setUpdatedAt(OffsetDateTime.now());

        when(objectMapper.writeValueAsString(any())).thenReturn("{}");
    }

    @Nested
    class CreatePackage {

        @Test
        void createsPackageWithDefaultExpiry() {
            PrepaidPackageRequest req = buildPackageRequest("Nuevo Paquete", 5, 25000, 0 /* expiresDays */);
            when(packageRepo.save(any())).thenAnswer(inv -> {
                PrepaidPackage p = inv.getArgument(0);
                p.setId(UUID.randomUUID());
                p.setCreatedAt(OffsetDateTime.now());
                return p;
            });

            PrepaidPackageResponse response = service.createPackage(req);

            assertThat(response).isNotNull();
            assertThat(response.name()).isEqualTo("Nuevo Paquete");
            // expiresDays <= 0 should default to 30
            assertThat(response.expiresDays()).isEqualTo(30);
        }

        @Test
        void createsPackageWithExplicitExpiry() {
            PrepaidPackageRequest req = buildPackageRequest("Paquete 60d", 8, 40000, 60);
            when(packageRepo.save(any())).thenAnswer(inv -> {
                PrepaidPackage p = inv.getArgument(0);
                p.setId(UUID.randomUUID());
                p.setCreatedAt(OffsetDateTime.now());
                return p;
            });

            PrepaidPackageResponse response = service.createPackage(req);

            assertThat(response.expiresDays()).isEqualTo(60);
        }

        @Test
        void recordsAuditOnCreate() throws Exception {
            PrepaidPackageRequest req = buildPackageRequest("Paquete Audit", 5, 25000, 30);
            when(packageRepo.save(any())).thenAnswer(inv -> {
                PrepaidPackage p = inv.getArgument(0);
                p.setId(UUID.randomUUID());
                p.setCreatedAt(OffsetDateTime.now());
                return p;
            });

            service.createPackage(req);

            verify(globalAuditService).record(
                eq(com.parkflow.modules.audit.domain.AuditAction.CREAR),
                isNull(),
                anyString(),
                contains("created"));
        }
    }

    @Nested
    class UpdatePackage {

        @Test
        void updatesExistingPackage() throws Exception {
            when(packageRepo.findById(activePackage.getId())).thenReturn(Optional.of(activePackage));
            when(packageRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

            PrepaidPackageRequest req = buildPackageRequest("Paquete Actualizado", 15, 75000, 45);
            PrepaidPackageResponse response = service.updatePackage(activePackage.getId(), req);

            assertThat(response.name()).isEqualTo("Paquete Actualizado");
            assertThat(response.hoursIncluded()).isEqualTo(15);
        }

        @Test
        void throwsWhenPackageNotFound() {
            UUID fakeId = UUID.randomUUID();
            when(packageRepo.findById(fakeId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.updatePackage(fakeId, buildPackageRequest("X", 1, 1000, 30)))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("Paquete no encontrado");
        }
    }

    @Nested
    class PatchPackageStatus {

        @Test
        void deactivatesActivePackage() {
            when(packageRepo.findById(activePackage.getId())).thenReturn(Optional.of(activePackage));
            when(packageRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

            PrepaidPackageResponse response = service.patchPackageStatus(activePackage.getId(), false);

            assertThat(response.active()).isFalse();
        }

        @Test
        void activatesPreviouslyDeactivatedPackage() {
            activePackage.setActive(false);
            when(packageRepo.findById(activePackage.getId())).thenReturn(Optional.of(activePackage));
            when(packageRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

            PrepaidPackageResponse response = service.patchPackageStatus(activePackage.getId(), true);

            assertThat(response.active()).isTrue();
        }
    }

    @Nested
    class Purchase {

        @Test
        void purchasesBalanceForPlate() {
            PrepaidBalancePurchaseRequest req = new PrepaidBalancePurchaseRequest(
                activePackage.getId(), "abc123", "Carlos Pérez");
            when(packageRepo.findById(activePackage.getId())).thenReturn(Optional.of(activePackage));
            when(balanceRepo.save(any())).thenAnswer(inv -> {
                PrepaidBalance b = inv.getArgument(0);
                b.setId(UUID.randomUUID());
                b.setCreatedAt(OffsetDateTime.now());
                b.setUpdatedAt(OffsetDateTime.now());
                return b;
            });

            PrepaidBalanceResponse response = service.purchase(req);

            assertThat(response).isNotNull();
            assertThat(response.plate()).isEqualTo("ABC123"); // normalized to uppercase
            assertThat(response.remainingMinutes()).isEqualTo(600); // 10h * 60
        }

        @Test
        void normalizesPlateToUpperCase() {
            PrepaidBalancePurchaseRequest req = new PrepaidBalancePurchaseRequest(
                activePackage.getId(), "xyz789", "Cliente");
            when(packageRepo.findById(activePackage.getId())).thenReturn(Optional.of(activePackage));
            when(balanceRepo.save(any())).thenAnswer(inv -> {
                PrepaidBalance b = inv.getArgument(0);
                b.setId(UUID.randomUUID());
                b.setCreatedAt(OffsetDateTime.now());
                b.setUpdatedAt(OffsetDateTime.now());
                return b;
            });

            PrepaidBalanceResponse response = service.purchase(req);

            assertThat(response.plate()).isEqualTo("XYZ789");
        }

        @Test
        void throwsWhenPackageInactive() {
            activePackage.setActive(false);
            PrepaidBalancePurchaseRequest req = new PrepaidBalancePurchaseRequest(
                activePackage.getId(), "ABC123", "Cliente");
            when(packageRepo.findById(activePackage.getId())).thenReturn(Optional.of(activePackage));

            assertThatThrownBy(() -> service.purchase(req))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("no está activo");
        }

        @Test
        void throwsWhenPackageNotFound() {
            UUID fakeId = UUID.randomUUID();
            PrepaidBalancePurchaseRequest req = new PrepaidBalancePurchaseRequest(fakeId, "ABC123", "X");
            when(packageRepo.findById(fakeId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.purchase(req))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("Paquete no encontrado");
        }

        @Test
        void setsExpiryBasedOnPackageDays() {
            PrepaidBalancePurchaseRequest req = new PrepaidBalancePurchaseRequest(
                activePackage.getId(), "ABC123", "Cliente");
            when(packageRepo.findById(activePackage.getId())).thenReturn(Optional.of(activePackage));
            when(balanceRepo.save(any())).thenAnswer(inv -> {
                PrepaidBalance b = inv.getArgument(0);
                b.setId(UUID.randomUUID());
                b.setCreatedAt(OffsetDateTime.now());
                b.setUpdatedAt(OffsetDateTime.now());
                return b;
            });

            PrepaidBalanceResponse response = service.purchase(req);

            assertThat(response.expiresAt()).isAfter(OffsetDateTime.now().plusDays(29));
        }
    }

    @Nested
    class Deduct {

        @Test
        void deductsMinutesFromBalance() {
            PrepaidBalance balance = buildActiveBalance(600); // 10h
            when(balanceRepo.findById(balance.getId())).thenReturn(Optional.of(balance));
            when(balanceRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

            PrepaidBalanceResponse response = service.deduct(balance.getId(), 60);

            assertThat(response.remainingMinutes()).isEqualTo(540);
            assertThat(response.active()).isTrue(); // still has minutes
        }

        @Test
        void deactivatesBalanceWhenMinutesReachZero() {
            PrepaidBalance balance = buildActiveBalance(30);
            when(balanceRepo.findById(balance.getId())).thenReturn(Optional.of(balance));
            when(balanceRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

            PrepaidBalanceResponse response = service.deduct(balance.getId(), 30);

            assertThat(response.remainingMinutes()).isEqualTo(0);
            assertThat(response.active()).isFalse();
        }

        @Test
        void throwsWhenInsufficientMinutes() {
            PrepaidBalance balance = buildActiveBalance(20);
            when(balanceRepo.findById(balance.getId())).thenReturn(Optional.of(balance));

            assertThatThrownBy(() -> service.deduct(balance.getId(), 60))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("Saldo insuficiente")
                .hasMessageContaining("20 min");
        }

        @Test
        void throwsWhenBalanceExpired() {
            PrepaidBalance balance = buildActiveBalance(600);
            balance.setExpiresAt(OffsetDateTime.now().minusDays(1));
            when(balanceRepo.findById(balance.getId())).thenReturn(Optional.of(balance));

            assertThatThrownBy(() -> service.deduct(balance.getId(), 60))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("vencido");
        }

        @Test
        void throwsWhenBalanceInactive() {
            PrepaidBalance balance = buildActiveBalance(600);
            balance.setActive(false);
            when(balanceRepo.findById(balance.getId())).thenReturn(Optional.of(balance));

            assertThatThrownBy(() -> service.deduct(balance.getId(), 60))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("no está activo");
        }

        @Test
        void throwsWhenBalanceNotFound() {
            UUID fakeId = UUID.randomUUID();
            when(balanceRepo.findById(fakeId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.deduct(fakeId, 60))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("Saldo no encontrado");
        }
    }

    @Nested
    class GetBalancesByPlate {

        @Test
        void returnsBalancesNormalizedToUpperCase() {
            PrepaidBalance b = buildActiveBalance(300);
            when(balanceRepo.findAllByPlateOrderByExpiresAtAsc("ABC123")).thenReturn(List.of(b));

            List<PrepaidBalanceResponse> result = service.getBalancesByPlate("abc123");

            assertThat(result).hasSize(1);
            verify(balanceRepo).findAllByPlateOrderByExpiresAtAsc("ABC123");
        }

        @Test
        void returnsEmptyListWhenNoBalances() {
            when(balanceRepo.findAllByPlateOrderByExpiresAtAsc("XYZ999")).thenReturn(List.of());

            List<PrepaidBalanceResponse> result = service.getBalancesByPlate("xyz999");

            assertThat(result).isEmpty();
        }
    }

    // -------------------------------------------------------------------------

    private PrepaidPackageRequest buildPackageRequest(String name, int hours, int amount, int expiresDays) {
        return new PrepaidPackageRequest(name, hours, new BigDecimal(amount), "AUTO", "SEDE1", null, expiresDays, true);
    }

    private PrepaidBalance buildActiveBalance(int remainingMinutes) {
        PrepaidBalance b = new PrepaidBalance();
        b.setId(UUID.randomUUID());
        b.setPrepaidPackage(activePackage);
        b.setPlate("ABC123");
        b.setHolderName("Test Client");
        b.setRemainingMinutes(remainingMinutes);
        b.setPurchasedAt(OffsetDateTime.now().minusDays(1));
        b.setExpiresAt(OffsetDateTime.now().plusDays(29));
        b.setActive(true);
        b.setCreatedAt(OffsetDateTime.now());
        b.setUpdatedAt(OffsetDateTime.now());
        return b;
    }
}
