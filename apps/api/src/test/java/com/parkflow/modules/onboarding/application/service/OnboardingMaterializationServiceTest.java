package com.parkflow.modules.onboarding.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.never;

import com.parkflow.modules.configuration.domain.PaymentMethod;
import com.parkflow.modules.configuration.domain.repository.PaymentMethodPort;
import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.parking.locker.application.service.LockerService;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.repository.RateRepository;
import com.parkflow.modules.parking.spaces.application.service.ParkingSpaceService;
import com.parkflow.modules.settings.application.service.SettingsVehicleTypeService;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class OnboardingMaterializationServiceTest {

  @Mock private SettingsVehicleTypeService settingsVehicleTypeService;
  @Mock private PaymentMethodPort paymentMethodPort;
  @Mock private RateRepository rateRepository;
  @Mock private LockerService lockerService;
  @Mock private ParkingSpaceService parkingSpaceService;
  @Mock private OnboardingSettingsMapper settingsMapper;

  @InjectMocks private OnboardingMaterializationService service;

  private final UUID companyId = UUID.randomUUID();

  @Test
  void materializeVehicleTypes() {
    service.materializeVehicleTypes(companyId, List.of("CAR", "BIKE"));
    verify(settingsVehicleTypeService).addTypeToCompany(companyId, "CAR");
    verify(settingsVehicleTypeService).addTypeToCompany(companyId, "BIKE");
  }

  @Test
  void materializePaymentMethods() {
    when(paymentMethodPort.existsByCodeAndCompany("CASH", companyId)).thenReturn(true);
    when(paymentMethodPort.existsByCodeAndCompany("CARD", companyId)).thenReturn(false);
    
    PaymentMethod globalCard = new PaymentMethod();
    globalCard.setName("Tarjeta");
    when(paymentMethodPort.findByCode("CARD")).thenReturn(Optional.of(globalCard));

    service.materializePaymentMethods(companyId, List.of("CASH", "CARD"));
    
    verify(paymentMethodPort, never()).save(org.mockito.ArgumentMatchers.argThat(pm -> pm.getCode().equals("CASH")));
    verify(paymentMethodPort).save(org.mockito.ArgumentMatchers.argThat(pm -> pm.getCode().equals("CARD") && pm.getName().equals("Tarjeta")));
  }

  @Test
  void createRatesFromOnboarding() {
    Company c = new Company();
    c.setId(companyId);

    Rate existing = new Rate();
    existing.setId(UUID.randomUUID());
    when(rateRepository.findByCompanyId(companyId)).thenReturn(List.of(existing));

    Map<String, Object> progress = Map.of();
    when(settingsMapper.stepMap(progress, 1)).thenReturn(Map.of());
    when(settingsMapper.stepMap(progress, 3)).thenReturn(Map.of());
    when(settingsMapper.asStringList(any(), any())).thenReturn(List.of("CAR"));
    when(settingsMapper.extractNumber(any(), eq(2000))).thenReturn(2000);
    when(settingsMapper.extractNumber(any(), eq(5))).thenReturn(5);

    service.createRatesFromOnboarding(c, progress);

    assertThat(existing.isActive()).isFalse();
    verify(rateRepository).save(existing);
    verify(rateRepository).save(org.mockito.ArgumentMatchers.argThat(r -> "CAR".equals(r.getVehicleType()) && r.getAmount() != null && r.getAmount().intValue() == 2000));
  }

  @Test
  void createDefaultRates() {
    Company c = new Company();
    c.setId(companyId);

    when(rateRepository.findByCompanyId(companyId)).thenReturn(List.of());

    service.createDefaultRates(c);

    verify(rateRepository).save(org.mockito.ArgumentMatchers.argThat(r -> r.getVehicleType().equals("MOTORCYCLE") && r.getAmount().intValue() == 1000));
    verify(rateRepository).save(org.mockito.ArgumentMatchers.argThat(r -> r.getVehicleType().equals("CAR") && r.getAmount().intValue() == 2000));
  }

  @Test
  void createLockersIfConfigured() {
    Map<String, Object> step1 = Map.of("helmetHandling", "LOCKERS", "helmetTokenCount", 10);
    when(settingsMapper.extractNumber(any(), eq(0))).thenReturn(10);
    service.createLockersIfConfigured(companyId, step1);
    verify(lockerService).createBatch(eq(companyId), any());
  }

  @Test
  void resizeCapacity() {
    service.resizeCapacity(companyId, 50);
    verify(parkingSpaceService).resizeCapacity(companyId, 50);
  }
}
