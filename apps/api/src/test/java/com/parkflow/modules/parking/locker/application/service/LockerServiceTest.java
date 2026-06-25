package com.parkflow.modules.parking.locker.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.locker.domain.Locker;
import com.parkflow.modules.parking.locker.domain.LockerStatus;
import com.parkflow.modules.parking.locker.domain.repository.LockerPort;
import com.parkflow.modules.parking.locker.dto.BatchLockerRequest;
import com.parkflow.modules.parking.locker.dto.LockerResponse;
import com.parkflow.modules.parking.locker.dto.PatchLockerRequest;
import com.parkflow.modules.parking.operation.domain.CustodiedItemStatus;
import com.parkflow.modules.parking.operation.repository.CustodiedItemRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class LockerServiceTest {

  @Mock private LockerPort lockerPort;
  @Mock private CustodiedItemRepository custodiedItemRepository;

  private LockerService service;
  private static final UUID COMPANY_ID = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    service = new LockerService(lockerPort, custodiedItemRepository);
  }

  private Locker locker(String code, LockerStatus status) {
    return Locker.builder()
        .id(UUID.randomUUID())
        .companyId(COMPANY_ID)
        .code(code)
        .label("Locker " + code)
        .status(status)
        .isActive(true)
        .build();
  }

  @Test
  void listLockers_mapsAll() {
    when(lockerPort.findByCompanyId(COMPANY_ID))
        .thenReturn(List.of(locker("L-01", LockerStatus.DISPONIBLE)));
    when(custodiedItemRepository.existsByLockerIdAndStatus(any(), eq(CustodiedItemStatus.RECEIVED)))
        .thenReturn(false);
    List<LockerResponse> result = service.listLockers(COMPANY_ID);
    assertThat(result).hasSize(1);
    assertThat(result.get(0).occupied()).isFalse();
  }

  @Test
  void listAvailableLockers_filtersOccupiedAndUnavailable() {
    Locker free = locker("L-01", LockerStatus.DISPONIBLE);
    Locker occupied = locker("L-02", LockerStatus.DISPONIBLE);
    Locker outOfService = locker("L-03", LockerStatus.FUERA_DE_SERVICIO);
    when(lockerPort.findActiveByCompanyId(COMPANY_ID))
        .thenReturn(List.of(free, occupied, outOfService));
    when(custodiedItemRepository.existsByLockerIdAndStatus(free.getId(), CustodiedItemStatus.RECEIVED))
        .thenReturn(false);
    when(custodiedItemRepository.existsByLockerIdAndStatus(occupied.getId(), CustodiedItemStatus.RECEIVED))
        .thenReturn(true);

    List<LockerResponse> result = service.listAvailableLockers(COMPANY_ID);

    assertThat(result).hasSize(1);
    assertThat(result.get(0).code()).isEqualTo("L-01");
  }

  @Test
  void createLocker_succeeds() {
    try (var sec = mockStatic(SecurityUtils.class)) {
      sec.when(SecurityUtils::requireCompanyId).thenReturn(COMPANY_ID);
      when(lockerPort.existsByCompanyIdAndCode(COMPANY_ID, "L-99")).thenReturn(false);
      when(lockerPort.save(any())).thenAnswer(i -> i.getArgument(0));
      lenient().when(custodiedItemRepository.existsByLockerIdAndStatus(any(), any()))
          .thenReturn(false);
      LockerResponse resp = service.createLocker(" L-99 ", " Caja ");
      assertThat(resp.code()).isEqualTo("L-99");
    }
  }

  @Test
  void createLocker_throwsWhenDuplicate() {
    try (var sec = mockStatic(SecurityUtils.class)) {
      sec.when(SecurityUtils::requireCompanyId).thenReturn(COMPANY_ID);
      when(lockerPort.existsByCompanyIdAndCode(COMPANY_ID, "L-1")).thenReturn(true);
      assertThatThrownBy(() -> service.createLocker("L-1", null))
          .isInstanceOf(OperationException.class)
          .hasMessageContaining("Ya existe un locker");
    }
  }

  @Test
  void createBatch_skipsExistingCodes() {
    when(lockerPort.existsByCompanyIdAndCode(eq(COMPANY_ID), any())).thenAnswer(i -> {
      String code = i.getArgument(1);
      return code.equals("B-02");
    });
    when(lockerPort.save(any())).thenAnswer(i -> i.getArgument(0));
    lenient().when(custodiedItemRepository.existsByLockerIdAndStatus(any(), any()))
        .thenReturn(false);

    List<LockerResponse> result = service.createBatch(COMPANY_ID,
        new BatchLockerRequest("B-", 1, 3));

    assertThat(result).hasSize(2); // B-01, B-03 (B-02 skipped)
  }

  @Test
  void patchLocker_updatesAllFields() {
    try (var sec = mockStatic(SecurityUtils.class)) {
      sec.when(SecurityUtils::requireCompanyId).thenReturn(COMPANY_ID);
      Locker l = locker("L-01", LockerStatus.DISPONIBLE);
      when(lockerPort.findByIdAndCompanyId(l.getId(), COMPANY_ID)).thenReturn(Optional.of(l));
      when(lockerPort.existsByCompanyIdAndCode(COMPANY_ID, "L-NEW")).thenReturn(false);
      when(lockerPort.save(any())).thenAnswer(i -> i.getArgument(0));
      lenient().when(custodiedItemRepository.existsByLockerIdAndStatus(any(), any()))
          .thenReturn(false);

      LockerResponse resp = service.patchLocker(l.getId(),
          new PatchLockerRequest("L-NEW", "Nueva", false, LockerStatus.FUERA_DE_SERVICIO));

      assertThat(resp.code()).isEqualTo("L-NEW");
      assertThat(resp.isActive()).isFalse();
      assertThat(resp.status()).isEqualTo(LockerStatus.FUERA_DE_SERVICIO);
    }
  }

  @Test
  void patchLocker_blankLabelBecomesNull() {
    try (var sec = mockStatic(SecurityUtils.class)) {
      sec.when(SecurityUtils::requireCompanyId).thenReturn(COMPANY_ID);
      Locker l = locker("L-01", LockerStatus.DISPONIBLE);
      when(lockerPort.findByIdAndCompanyId(l.getId(), COMPANY_ID)).thenReturn(Optional.of(l));
      when(lockerPort.save(any())).thenAnswer(i -> i.getArgument(0));
      lenient().when(custodiedItemRepository.existsByLockerIdAndStatus(any(), any()))
          .thenReturn(false);

      LockerResponse resp = service.patchLocker(l.getId(),
          new PatchLockerRequest(null, "   ", null, null));

      assertThat(resp.label()).isNull();
    }
  }

  @Test
  void patchLocker_throwsWhenDuplicateCode() {
    try (var sec = mockStatic(SecurityUtils.class)) {
      sec.when(SecurityUtils::requireCompanyId).thenReturn(COMPANY_ID);
      Locker l = locker("L-01", LockerStatus.DISPONIBLE);
      when(lockerPort.findByIdAndCompanyId(l.getId(), COMPANY_ID)).thenReturn(Optional.of(l));
      when(lockerPort.existsByCompanyIdAndCode(COMPANY_ID, "L-02")).thenReturn(true);

      assertThatThrownBy(() -> service.patchLocker(l.getId(),
          new PatchLockerRequest("L-02", null, null, null)))
          .isInstanceOf(OperationException.class)
          .hasMessageContaining("Ya existe otro locker");
    }
  }

  @Test
  void patchLocker_throwsWhenNotFound() {
    try (var sec = mockStatic(SecurityUtils.class)) {
      sec.when(SecurityUtils::requireCompanyId).thenReturn(COMPANY_ID);
      UUID id = UUID.randomUUID();
      when(lockerPort.findByIdAndCompanyId(id, COMPANY_ID)).thenReturn(Optional.empty());
      assertThatThrownBy(() -> service.patchLocker(id, new PatchLockerRequest(null, null, null, null)))
          .isInstanceOf(OperationException.class)
          .hasMessageContaining("Locker no encontrado");
    }
  }

  @Test
  void deleteLocker_succeeds() {
    try (var sec = mockStatic(SecurityUtils.class)) {
      sec.when(SecurityUtils::requireCompanyId).thenReturn(COMPANY_ID);
      Locker l = locker("L-01", LockerStatus.DISPONIBLE);
      when(lockerPort.findByIdAndCompanyId(l.getId(), COMPANY_ID)).thenReturn(Optional.of(l));
      when(custodiedItemRepository.existsByLockerIdAndStatus(l.getId(), CustodiedItemStatus.RECEIVED))
          .thenReturn(false);
      service.deleteLocker(l.getId());
      verify(lockerPort).delete(l);
    }
  }

  @Test
  void deleteLocker_throwsWhenOccupied() {
    try (var sec = mockStatic(SecurityUtils.class)) {
      sec.when(SecurityUtils::requireCompanyId).thenReturn(COMPANY_ID);
      Locker l = locker("L-01", LockerStatus.OCUPADO);
      when(lockerPort.findByIdAndCompanyId(l.getId(), COMPANY_ID)).thenReturn(Optional.of(l));
      when(custodiedItemRepository.existsByLockerIdAndStatus(l.getId(), CustodiedItemStatus.RECEIVED))
          .thenReturn(true);
      assertThatThrownBy(() -> service.deleteLocker(l.getId()))
          .isInstanceOf(OperationException.class)
          .hasMessageContaining("está en uso");
      verify(lockerPort, never()).delete(any());
    }
  }
}
