package com.parkflow.modules.configuration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;

import com.parkflow.modules.cash.domain.CashRegister;
import com.parkflow.modules.cash.domain.repository.CashRegisterPort;
import com.parkflow.modules.configuration.dto.CashRegisterRequest;
import com.parkflow.modules.configuration.domain.ParkingSite;
import com.parkflow.modules.configuration.domain.Printer;
import com.parkflow.modules.configuration.domain.repository.ParkingSitePort;
import com.parkflow.modules.configuration.domain.repository.PrinterPort;
import com.parkflow.modules.configuration.application.service.CashRegisterManagementService;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.auth.domain.repository.AppUserPort;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class CashRegisterConfigurationServiceTest {
  @Mock private CashRegisterPort cashRegisterRepository;
  @Mock private ParkingSitePort parkingSiteRepository;
  @Mock private PrinterPort printerRepository;
  @Mock private AppUserPort appUserRepository;

  private CashRegisterManagementService service;

  @BeforeEach
  void setUp() {
    service = new CashRegisterManagementService(cashRegisterRepository, parkingSiteRepository, printerRepository, appUserRepository);
  }

  @Test
  void createFailsWhenSiteRefDoesNotExist() {
    UUID siteId = UUID.randomUUID();
    when(parkingSiteRepository.findById(siteId)).thenReturn(Optional.empty());

    CashRegisterRequest req = new CashRegisterRequest("A", siteId, "c1", "Caja", "term", null, null, null, true);

    assertThatThrownBy(() -> service.create(req))
        .isInstanceOf(OperationException.class)
        .satisfies(ex -> assertThat(((OperationException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
  }

  @Test
  void createFailsOnDuplicateSiteAndTerminal() {
    CashRegister existing = new CashRegister();
    existing.setId(UUID.randomUUID());
    existing.setSite("DEFAULT");
    existing.setTerminal("T1");
    when(cashRegisterRepository.findBySiteAndTerminal("DEFAULT", "T1")).thenReturn(Optional.of(existing));

    CashRegisterRequest req = new CashRegisterRequest("DEFAULT", null, "c1", "Caja", "T1", null, null, null, true);

    assertThatThrownBy(() -> service.create(req))
        .isInstanceOf(OperationException.class)
        .satisfies(ex -> assertThat(((OperationException) ex).getStatus()).isEqualTo(HttpStatus.CONFLICT));
  }

  @Test
  void createNormalizesCodeAndTerminalWithLinkedEntities() {
    UUID siteId = UUID.randomUUID();
    UUID printerId = UUID.randomUUID();
    UUID userId = UUID.randomUUID();

    ParkingSite site = new ParkingSite();
    site.setId(siteId);
    Printer printer = new Printer();
    printer.setId(printerId);
    printer.setName("EPSON");
    AppUser user = new AppUser();
    user.setId(userId);
    user.setName("Admin");

    when(parkingSiteRepository.findById(siteId)).thenReturn(Optional.of(site));
    when(cashRegisterRepository.findBySiteAndTerminal("Main", "term-1")).thenReturn(Optional.empty());
    when(printerRepository.findById(printerId)).thenReturn(Optional.of(printer));
    when(appUserRepository.findById(userId)).thenReturn(Optional.of(user));
    when(cashRegisterRepository.save(any(CashRegister.class))).thenAnswer(invocation -> {
      CashRegister c = invocation.getArgument(0);
      c.setId(UUID.randomUUID());
      return c;
    });

    CashRegisterRequest req = new CashRegisterRequest("Main", siteId, " c1 ", "Caja 1", " term-1 ", "lbl", printerId, userId, true);

    var response = service.create(req);

    assertThat(response.code()).isEqualTo("C1");
    assertThat(response.terminal()).isEqualTo("term-1");
    assertThat(response.printerId()).isEqualTo(printerId);
    assertThat(response.responsibleUserId()).isEqualTo(userId);
  }

  @Test
  void createUsesSiteRefCodeWhenAvailable() {
    UUID siteId = UUID.randomUUID();
    ParkingSite site = new ParkingSite();
    site.setId(siteId);
    site.setCode("HQ");
    when(parkingSiteRepository.findById(siteId)).thenReturn(Optional.of(site));
    when(cashRegisterRepository.findBySiteAndTerminal("HQ", "T1")).thenReturn(Optional.empty());
    when(cashRegisterRepository.save(any(CashRegister.class))).thenAnswer(invocation -> {
      CashRegister entity = invocation.getArgument(0);
      entity.setId(UUID.randomUUID());
      return entity;
    });

    CashRegisterRequest req = new CashRegisterRequest("legacy", siteId, "C1", "Caja", "T1", null, null, null, true);

    var response = service.create(req);

    assertThat(response.site()).isEqualTo("HQ");
    assertThat(response.siteId()).isEqualTo(siteId);
  }

  @Test
  void listUsesSearchFilters() {
    CashRegister entity = new CashRegister();
    entity.setId(UUID.randomUUID());
    entity.setSite("DEFAULT");
    entity.setTerminal("T1");
    entity.setActive(true);
    when(cashRegisterRepository.search(isNull(), eq("T1"), eq(Boolean.TRUE), any()))
        .thenReturn(new PageImpl<>(List.of(entity), PageRequest.of(0, 20), 1));

    var page = service.list(null, " T1 ", true, PageRequest.of(0, 20));

    assertThat(page.content()).hasSize(1);
    assertThat(page.content().get(0).terminal()).isEqualTo("T1");
  }

  @Test
  void updateClearsLinkedEntitiesWhenPayloadOmitsThem() {
    CashRegister entity = new CashRegister();
    entity.setId(UUID.randomUUID());
    entity.setSite("DEFAULT");
    entity.setTerminal("T1");
    entity.setActive(true);
    ParkingSite currentSite = new ParkingSite();
    currentSite.setId(UUID.randomUUID());
    entity.setSiteRef(currentSite);

    when(cashRegisterRepository.findById(entity.getId())).thenReturn(Optional.of(entity));
    when(cashRegisterRepository.findBySiteAndTerminal("DEFAULT", "T2")).thenReturn(Optional.empty());
    when(cashRegisterRepository.save(any(CashRegister.class))).thenAnswer(invocation -> invocation.getArgument(0));

    CashRegisterRequest req = new CashRegisterRequest("DEFAULT", null, "C2", "Caja 2", "T2", null, null, null, false);

    var response = service.update(entity.getId(), req);

    assertThat(response.siteId()).isNull();
    assertThat(response.terminal()).isEqualTo("T2");
    assertThat(response.active()).isFalse();
  }

  @Test
  void updateRejectsDuplicateSiteAndTerminal() {
    CashRegister current = new CashRegister();
    current.setId(UUID.randomUUID());
    current.setSite("DEFAULT");
    current.setTerminal("T1");

    CashRegister duplicate = new CashRegister();
    duplicate.setId(UUID.randomUUID());
    duplicate.setSite("DEFAULT");
    duplicate.setTerminal("T2");

    when(cashRegisterRepository.findById(current.getId())).thenReturn(Optional.of(current));
    when(cashRegisterRepository.findBySiteAndTerminal("DEFAULT", "T2")).thenReturn(Optional.of(duplicate));

    CashRegisterRequest req = new CashRegisterRequest("DEFAULT", null, "C2", "Caja 2", "T2", null, null, null, false);

    assertThatThrownBy(() -> service.update(current.getId(), req))
        .isInstanceOf(OperationException.class)
        .satisfies(ex -> assertThat(((OperationException) ex).getStatus()).isEqualTo(HttpStatus.CONFLICT));
  }

  @Test
  void patchStatusTogglesActiveFlag() {
    CashRegister entity = new CashRegister();
    entity.setId(UUID.randomUUID());
    entity.setSite("DEFAULT");
    entity.setTerminal("T1");
    entity.setActive(true);
    when(cashRegisterRepository.findById(entity.getId())).thenReturn(Optional.of(entity));
    when(cashRegisterRepository.save(any(CashRegister.class))).thenAnswer(invocation -> invocation.getArgument(0));

    var response = service.patchStatus(entity.getId(), false);

    assertThat(response.active()).isFalse();
  }
}
