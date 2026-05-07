package com.parkflow.modules.configuration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.parkflow.modules.configuration.dto.ParkingSiteRequest;
import com.parkflow.modules.configuration.entity.ParkingSite;
import com.parkflow.modules.configuration.repository.ParkingSiteRepository;
import com.parkflow.modules.configuration.service.ParkingSiteService;
import com.parkflow.modules.licensing.entity.Company;
import com.parkflow.modules.licensing.repository.CompanyRepository;
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
class ParkingSiteServiceTest {

  @Mock private ParkingSiteRepository parkingSiteRepository;
  @Mock private CompanyRepository companyRepository;

  private ParkingSiteService service;

  @BeforeEach
  void setUp() {
    service = new ParkingSiteService(parkingSiteRepository, companyRepository);
  }

  @Test
  void createFailsWhenCompanyDoesNotExist() {
    UUID companyId = UUID.randomUUID();
    when(companyRepository.findById(companyId)).thenReturn(Optional.empty());

    ParkingSiteRequest req = new ParkingSiteRequest("MAIN", "Sede", null, null, null, null, "UTC", "USD", true);

    assertThatThrownBy(() -> service.create(companyId, req))
        .isInstanceOf(OperationException.class)
        .satisfies(ex -> assertThat(((OperationException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));
  }

  @Test
  void createNormalizesAndTrimsFields() {
    UUID companyId = UUID.randomUUID();
    Company company = new Company();
    company.setId(companyId);
    when(companyRepository.findById(companyId)).thenReturn(Optional.of(company));
    when(parkingSiteRepository.existsByCode(" main ")).thenReturn(false);
    when(parkingSiteRepository.save(any(ParkingSite.class)))
        .thenAnswer(invocation -> {
          ParkingSite site = invocation.getArgument(0);
          site.setId(UUID.randomUUID());
          return site;
        });

    ParkingSiteRequest req = new ParkingSiteRequest(" main ", "  Central  ", "  Av 1  ", "  City  ", "  ", "  Mgr  ", "UTC", "USD", true);

    var response = service.create(companyId, req);

    assertThat(response.code()).isEqualTo("MAIN");
    assertThat(response.name()).isEqualTo("Central");
    assertThat(response.phone()).isNull();
    assertThat(response.managerName()).isEqualTo("Mgr");
  }
}
