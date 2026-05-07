package com.parkflow.modules.configuration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.parkflow.modules.configuration.dto.OperationalParameterRequest;
import com.parkflow.modules.configuration.entity.OperationalParameter;
import com.parkflow.modules.configuration.entity.ParkingSite;
import com.parkflow.modules.configuration.repository.OperationalParameterRepository;
import com.parkflow.modules.configuration.repository.ParkingSiteRepository;
import com.parkflow.modules.configuration.service.OperationalParameterService;
import com.parkflow.modules.parking.operation.exception.OperationException;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class OperationalParameterServiceTest {
  @Mock private OperationalParameterRepository operationalParameterRepository;
  @Mock private ParkingSiteRepository parkingSiteRepository;

  private OperationalParameterService service;

  @BeforeEach
  void setUp() {
    service = new OperationalParameterService(operationalParameterRepository, parkingSiteRepository);
  }

  @Test
  void getBySiteFailsWhenNotFound() {
    UUID siteId = UUID.randomUUID();
    when(operationalParameterRepository.findBySite_Id(siteId)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.getBySite(siteId))
        .isInstanceOf(OperationException.class)
        .satisfies(ex -> assertThat(((OperationException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
  }

  @Test
  void createOrUpdateTrimsLegalMessageAndLinksSite() {
    UUID siteId = UUID.randomUUID();
    ParkingSite site = new ParkingSite();
    site.setId(siteId);
    when(parkingSiteRepository.findById(siteId)).thenReturn(Optional.of(site));
    when(operationalParameterRepository.findBySite_Id(siteId)).thenReturn(Optional.empty());
    when(operationalParameterRepository.save(any(OperationalParameter.class)))
        .thenAnswer(invocation -> {
          OperationalParameter p = invocation.getArgument(0);
          p.setId(UUID.randomUUID());
          return p;
        });

    OperationalParameterRequest req =
        new OperationalParameterRequest("UTC", true, false, true, false, false, false, 5, 10, "  Legal msg  ", true);

    var response = service.createOrUpdate(siteId, req);

    assertThat(response.siteId()).isEqualTo(siteId);
    assertThat(response.legalMessage()).isEqualTo("Legal msg");
    assertThat(response.allowEntryWithoutPrinter()).isTrue();
  }
}
