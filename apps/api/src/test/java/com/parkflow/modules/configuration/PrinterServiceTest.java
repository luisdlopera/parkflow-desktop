package com.parkflow.modules.configuration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.parkflow.modules.configuration.dto.PrinterRequest;
import com.parkflow.modules.configuration.domain.ParkingSite;
import com.parkflow.modules.configuration.domain.Printer;
import com.parkflow.modules.configuration.domain.Printer.PrinterConnection;
import com.parkflow.modules.configuration.domain.Printer.PrinterType;
import com.parkflow.modules.configuration.domain.repository.ParkingSitePort;
import com.parkflow.modules.configuration.domain.repository.PrinterPort;
import com.parkflow.modules.configuration.application.service.PrinterManagementService;
import com.parkflow.modules.parking.operation.exception.OperationException;
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
class PrinterServiceTest {
  @Mock private PrinterPort printerRepository;
  @Mock private ParkingSitePort parkingSiteRepository;

  private PrinterManagementService service;

  @BeforeEach
  void setUp() {
    service = new PrinterManagementService(printerRepository, parkingSiteRepository);
  }

  @Test
  void createFailsWhenSiteDoesNotExist() {
    UUID siteId = UUID.randomUUID();
    when(parkingSiteRepository.findById(siteId)).thenReturn(Optional.empty());

    PrinterRequest req = new PrinterRequest("P1", PrinterType.THERMAL, PrinterConnection.USB, 80, null, true, true);

    assertThatThrownBy(() -> service.create(siteId, req))
        .isInstanceOf(OperationException.class)
        .satisfies(ex -> assertThat(((OperationException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
  }

  @Test
  void createUnsetsPreviousDefaultAndTrimsEndpoint() {
    UUID siteId = UUID.randomUUID();
    ParkingSite site = new ParkingSite();
    site.setId(siteId);
    when(parkingSiteRepository.findById(siteId)).thenReturn(Optional.of(site));

    Printer previousDefault = new Printer();
    previousDefault.setId(UUID.randomUUID());
    previousDefault.setSite(site);
    previousDefault.setDefault(true);
    when(printerRepository.findBySite_IdAndIsDefaultTrue(siteId)).thenReturn(Optional.of(previousDefault));

    when(printerRepository.save(any(Printer.class))).thenAnswer(invocation -> {
      Printer p = invocation.getArgument(0);
      if (p.getId() == null) p.setId(UUID.randomUUID());
      p.setSite(site);
      return p;
    });

    PrinterRequest req = new PrinterRequest("  Front  ", PrinterType.THERMAL, PrinterConnection.USB, 80, "  USB0  ", true, true);
    var response = service.create(siteId, req);

    verify(printerRepository).save(previousDefault);
    assertThat(response.endpointOrDevice()).isEqualTo("USB0");
    assertThat(response.name()).isEqualTo("Front");
    assertThat(response.isDefault()).isTrue();
  }

  @Test
  void listNormalizesSearchTextBeforeDelegating() {
    UUID siteId = UUID.randomUUID();
    when(printerRepository.search(eq(siteId), eq("Front"), eq(Boolean.TRUE), any()))
        .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

    service.list(siteId, " Front ", true, PageRequest.of(0, 20));

    verify(printerRepository).search(eq(siteId), eq("Front"), eq(Boolean.TRUE), any());
  }
}
