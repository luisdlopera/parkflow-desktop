package com.parkflow.modules.configuration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.parkflow.modules.configuration.dto.ParkingSiteRequest;
import com.parkflow.modules.configuration.entity.ParkingSite;
import com.parkflow.modules.configuration.repository.ParkingSiteRepository;
import com.parkflow.modules.configuration.application.service.ParkingSiteManagementService;
import com.parkflow.modules.licensing.entity.Company;
import com.parkflow.modules.licensing.repository.CompanyRepository;
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
class ParkingSiteServiceTest {

  @Mock private ParkingSiteRepository parkingSiteRepository;
  @Mock private CompanyRepository companyRepository;

  private ParkingSiteManagementService service;

  @BeforeEach
  void setUp() {
    service = new ParkingSiteManagementService(parkingSiteRepository, companyRepository);
  }

  @Test
  void createFailsWhenCompanyDoesNotExist() {
    UUID companyId = UUID.randomUUID();
    when(companyRepository.findById(companyId)).thenReturn(Optional.empty());

    ParkingSiteRequest req = new ParkingSiteRequest("MAIN", "Sede", null, null, null, null, "UTC", "USD", 0, true);

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
    when(parkingSiteRepository.existsByCode("MAIN")).thenReturn(false);
    when(parkingSiteRepository.save(any(ParkingSite.class)))
        .thenAnswer(invocation -> {
          ParkingSite site = invocation.getArgument(0);
          site.setId(UUID.randomUUID());
          return site;
        });

    ParkingSiteRequest req = new ParkingSiteRequest(" main ", "  Central  ", "  Av 1  ", "  City  ", "  ", "  Mgr  ", "UTC", "USD", 0, true);

    var response = service.create(companyId, req);

    assertThat(response.code()).isEqualTo("MAIN");
    assertThat(response.name()).isEqualTo("Central");
    assertThat(response.phone()).isNull();
    assertThat(response.managerName()).isEqualTo("Mgr");
  }

  @Test
  void listDelegatesFiltersToRepositorySearch() {
    ParkingSite site = new ParkingSite();
    site.setId(UUID.randomUUID());
    Company company = new Company();
    company.setId(UUID.randomUUID());
    site.setCompany(company);
    site.setCode("MAIN");
    site.setName("Central");
    PageRequest pageable = PageRequest.of(0, 20);
    when(parkingSiteRepository.search(null, "Central", true, pageable))
        .thenReturn(new PageImpl<>(List.of(site), pageable, 1));

    var page = service.list(null, " Central ", true, pageable);

    assertThat(page.content()).hasSize(1);
    assertThat(page.content().get(0).code()).isEqualTo("MAIN");
    verify(parkingSiteRepository).search(null, "Central", true, pageable);
  }

  @Test
  void updateRejectsDuplicateNormalizedCode() {
    ParkingSite current = new ParkingSite();
    current.setId(UUID.randomUUID());
    current.setCode("MAIN");
    when(parkingSiteRepository.findById(current.getId())).thenReturn(Optional.of(current));
    when(parkingSiteRepository.existsByCode("SECOND")).thenReturn(true);

    ParkingSiteRequest req = new ParkingSiteRequest(" second ", "Sede 2", null, null, null, null, "UTC", "USD", 0, true);

    assertThatThrownBy(() -> service.update(current.getId(), req))
        .isInstanceOf(OperationException.class)
        .satisfies(ex -> assertThat(((OperationException) ex).getStatus()).isEqualTo(HttpStatus.CONFLICT));
  }
}
