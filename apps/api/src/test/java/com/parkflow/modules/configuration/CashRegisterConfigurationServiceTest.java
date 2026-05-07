package com.parkflow.modules.configuration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.parkflow.modules.cash.domain.CashRegister;
import com.parkflow.modules.cash.repository.CashRegisterRepository;
import com.parkflow.modules.configuration.dto.CashRegisterRequest;
import com.parkflow.modules.configuration.entity.ParkingSite;
import com.parkflow.modules.configuration.entity.Printer;
import com.parkflow.modules.configuration.repository.ParkingSiteRepository;
import com.parkflow.modules.configuration.repository.PrinterRepository;
import com.parkflow.modules.configuration.service.CashRegisterConfigurationService;
import com.parkflow.modules.parking.operation.domain.AppUser;
import com.parkflow.modules.parking.operation.exception.OperationException;
import com.parkflow.modules.parking.operation.repository.AppUserRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class CashRegisterConfigurationServiceTest {
  @Mock private CashRegisterRepository cashRegisterRepository;
  @Mock private ParkingSiteRepository parkingSiteRepository;
  @Mock private PrinterRepository printerRepository;
  @Mock private AppUserRepository appUserRepository;

  private CashRegisterConfigurationService service;

  @BeforeEach
  void setUp() {
    service = new CashRegisterConfigurationService(cashRegisterRepository, parkingSiteRepository, printerRepository, appUserRepository);
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
}
