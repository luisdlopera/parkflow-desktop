package com.parkflow.modules.settings;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.parkflow.modules.common.dto.VehicleTypeRequest;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.settings.application.service.SettingsVehicleTypeService;
import com.parkflow.modules.settings.domain.CompanyVehicleType;
import com.parkflow.modules.settings.domain.MasterVehicleType;
import com.parkflow.modules.settings.domain.repository.CompanyVehicleTypePort;
import com.parkflow.modules.settings.domain.repository.MasterVehicleTypePort;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SettingsVehicleTypeServiceTest {

  @Mock private MasterVehicleTypePort repository;
  @Mock private CompanyVehicleTypePort companyVehicleTypePort;

  private SettingsVehicleTypeService service;

  @BeforeEach
  void setUp() {
    service = new SettingsVehicleTypeService(repository, companyVehicleTypePort);
  }

  @Test
  void createPersistsVehicleTypeWhenCodeIsUnique() {
    when(repository.findByCode("BICYCLE")).thenReturn(Optional.empty());
    when(repository.save(any())).thenAnswer(i -> {
      MasterVehicleType t = i.getArgument(0);
      t.setId(UUID.randomUUID());
      return t;
    });

    var response = service.create(new VehicleTypeRequest("BICYCLE", "Bicicleta", "🚲", "#16A34A", false, true, true, false, 6));

    assertThat(response.code()).isEqualTo("BICYCLE");
    assertThat(response.name()).isEqualTo("Bicicleta");
    assertThat(response.icon()).isEqualTo("🚲");
    assertThat(response.color()).isEqualTo("#16A34A");
    assertThat(response.isActive()).isTrue();
  }

  @Test
  void createRejectsDuplicateCode() {
    when(repository.findByCode("CAR")).thenReturn(Optional.of(new MasterVehicleType()));
    assertThatThrownBy(() -> service.create(new VehicleTypeRequest("CAR", "Car", null, null, true, true, true, false, 1)))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Ya existe");
  }

  @Test
  void updateSuccess() {
    UUID id = UUID.randomUUID();
    MasterVehicleType current = type(id, "BIKE");
    when(repository.findById(id)).thenReturn(Optional.of(current));
    when(repository.findByCode("BIKE")).thenReturn(Optional.of(current)); // Same type
    when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

    var res = service.update(id, new VehicleTypeRequest("BIKE", "Bicycle", "i", "c", true, true, true, true, 1));
    assertThat(res.name()).isEqualTo("Bicycle");
  }

  @Test
  void updateRejectsDuplicateCodeFromAnotherType() {
    UUID id = UUID.randomUUID();
    MasterVehicleType current = type(id, "BIKE");
    MasterVehicleType existing = type(UUID.randomUUID(), "CAR");
    when(repository.findById(id)).thenReturn(Optional.of(current));
    when(repository.findByCode("CAR")).thenReturn(Optional.of(existing));

    assertThatThrownBy(() -> service.update(id, new VehicleTypeRequest("CAR", "Carro", "🚗", "#2563EB", true, true, true, false, 1)))
        .isInstanceOf(OperationException.class);
  }



  @Test
  void patchStatusDeactivatesType() {
    UUID id = UUID.randomUUID();
    MasterVehicleType current = type(id, "CAR");
    when(repository.findById(id)).thenReturn(Optional.of(current));

    service.patchStatus(id, false);
    assertThat(current.isActive()).isFalse();
    verify(repository).save(current);
  }

  @Test
  void deleteSoftDeactivatesTypeInsteadOfRemovingIt() {
    UUID id = UUID.randomUUID();
    MasterVehicleType current = type(id, "CAR");
    when(repository.findById(id)).thenReturn(Optional.of(current));

    service.delete(id);
    assertThat(current.isActive()).isFalse();
  }

  // --- Company Vehicle Types ---

  @Test
  void listByCompanyReturnsEmpty() {
    UUID companyId = UUID.randomUUID();
    when(companyVehicleTypePort.findByCompanyId(companyId)).thenReturn(List.of());
    assertThat(service.listByCompany(companyId)).isEmpty();
  }

  @Test
  void listByCompanyReturnsMappedTypes() {
    UUID companyId = UUID.randomUUID();
    UUID typeId = UUID.randomUUID();
    CompanyVehicleType cv = new CompanyVehicleType();
    cv.setId(UUID.randomUUID());
    cv.setVehicleTypeId(typeId);
    cv.setActive(true);

    MasterVehicleType master = type(typeId, "CAR");

    when(companyVehicleTypePort.findByCompanyId(companyId)).thenReturn(List.of(cv));
    when(repository.findAllById(List.of(typeId))).thenReturn(List.of(master));

    var res = service.listByCompany(companyId);
    assertThat(res).hasSize(1);
    assertThat(res.get(0).code()).isEqualTo("CAR");
  }

  @Test
  void addTypeToCompanyReactivatesExisting() {
    UUID companyId = UUID.randomUUID();
    UUID typeId = UUID.randomUUID();
    MasterVehicleType master = type(typeId, "CAR");
    when(repository.findByCode("CAR")).thenReturn(Optional.of(master));

    CompanyVehicleType existing = new CompanyVehicleType();
    existing.setId(UUID.randomUUID());
    existing.setVehicleTypeId(typeId);
    existing.setActive(false);
    when(companyVehicleTypePort.findByCompanyIdAndVehicleTypeId(companyId, typeId)).thenReturn(Optional.of(existing));
    when(companyVehicleTypePort.save(any())).thenAnswer(i -> i.getArgument(0));
    when(repository.findById(typeId)).thenReturn(Optional.of(master)); // for toCompanyResponse

    var res = service.addTypeToCompany(companyId, "CAR");
    assertThat(res.isActive()).isTrue();
  }

  @Test
  void addTypeToCompanyCreatesNewLink() {
    UUID companyId = UUID.randomUUID();
    UUID typeId = UUID.randomUUID();
    MasterVehicleType master = type(typeId, "CAR");
    when(repository.findByCode("CAR")).thenReturn(Optional.of(master));
    when(companyVehicleTypePort.findByCompanyIdAndVehicleTypeId(companyId, typeId)).thenReturn(Optional.empty());
    
    when(companyVehicleTypePort.save(any())).thenAnswer(i -> {
      CompanyVehicleType c = i.getArgument(0);
      c.setId(UUID.randomUUID());
      return c;
    });
    when(repository.findById(typeId)).thenReturn(Optional.of(master));

    var res = service.addTypeToCompany(companyId, "CAR");
    assertThat(res.code()).isEqualTo("CAR");
  }

  @Test
  void addTypeToCompanyCreatesMasterIfStandard() {
    UUID companyId = UUID.randomUUID();
    when(repository.findByCode("CAR")).thenReturn(Optional.empty());
    
    when(repository.save(any())).thenAnswer(i -> {
      MasterVehicleType t = i.getArgument(0);
      t.setId(UUID.randomUUID());
      return t;
    });
    
    when(companyVehicleTypePort.findByCompanyIdAndVehicleTypeId(any(), any())).thenReturn(Optional.empty());
    when(companyVehicleTypePort.save(any())).thenAnswer(i -> i.getArgument(0));
    when(repository.findById(any())).thenAnswer(i -> {
      MasterVehicleType m = new MasterVehicleType();
      m.setCode("CAR");
      return Optional.of(m);
    });

    var res = service.addTypeToCompany(companyId, "CAR");
    assertThat(res.code()).isEqualTo("CAR");
  }

  @Test
  void addTypeToCompanyFailsIfInvalidCode() {
    when(repository.findByCode("INVALID")).thenReturn(Optional.empty());
    assertThatThrownBy(() -> service.addTypeToCompany(UUID.randomUUID(), "INVALID"))
        .isInstanceOf(OperationException.class);
  }

  @Test
  void updateCompanyTypeSuccess() {
    UUID id = UUID.randomUUID();
    CompanyVehicleType cv = new CompanyVehicleType();
    cv.setVehicleTypeId(UUID.randomUUID());
    when(companyVehicleTypePort.findById(id)).thenReturn(Optional.of(cv));
    when(repository.findById(cv.getVehicleTypeId())).thenReturn(Optional.of(type(cv.getVehicleTypeId(), "CAR")));
    when(companyVehicleTypePort.save(any())).thenAnswer(i -> i.getArgument(0));

    var res = service.updateCompanyType(id, new VehicleTypeRequest("CAR", "N", "i", "c", true, true, true, false, 99));
    assertThat(res.displayOrder()).isEqualTo(99);
  }

  @Test
  void patchCompanyTypeStatusSuccess() {
    UUID id = UUID.randomUUID();
    CompanyVehicleType cv = new CompanyVehicleType();
    cv.setActive(true);
    when(companyVehicleTypePort.findById(id)).thenReturn(Optional.of(cv));

    service.patchCompanyTypeStatus(id, false);
    assertThat(cv.isActive()).isFalse();
    verify(companyVehicleTypePort).save(cv);
  }

  @Test
  void removeCompanyTypeSuccess() {
    UUID id = UUID.randomUUID();
    CompanyVehicleType cv = new CompanyVehicleType();
    when(companyVehicleTypePort.findById(id)).thenReturn(Optional.of(cv));

    service.removeCompanyType(id);
    verify(companyVehicleTypePort).delete(cv);
  }

  private static MasterVehicleType type(UUID id, String code) {
    MasterVehicleType type = new MasterVehicleType();
    type.setId(id);
    type.setCode(code);
    type.setName(code);
    return type;
  }
}
