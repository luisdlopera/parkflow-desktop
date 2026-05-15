package com.parkflow.modules.cash;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.parkflow.config.CashModuleProperties;
import com.parkflow.modules.cash.service.CashPolicyResolver;
import com.parkflow.modules.settings.dto.ParkingParametersData;
import com.parkflow.modules.settings.entity.ParkingParameters;
import com.parkflow.modules.settings.domain.repository.ParkingParametersPort;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CashPolicyResolverTest {

  @Mock private ParkingParametersPort parkingParametersRepository;

  private CashModuleProperties props;
  private CashPolicyResolver resolver;

  @BeforeEach
  void setUp() {
    props = new CashModuleProperties();
    props.setRequireOpenForPayment(true);
    props.setOfflineCloseAllowed(false);
    props.setOfflineMaxManualMovement(new BigDecimal("100.00"));
    props.setOperationsHint("hint-from-yml");
    resolver = new CashPolicyResolver(props, parkingParametersRepository);
  }

  @Test
  void usesApplicationPropertiesWhenNoRowMatches() {
    when(parkingParametersRepository.findBySiteCode(eq("X"))).thenReturn(Optional.empty());
    when(parkingParametersRepository.findBySiteCode(eq("DEFAULT"))).thenReturn(Optional.empty());
    assertThat(resolver.requireOpenForPayment("X")).isTrue();
    assertThat(resolver.offlineCloseAllowed("X")).isFalse();
    assertThat(resolver.offlineMaxManualMovement("X")).isEqualByComparingTo("100.00");
  }

  @Test
  void siteRowOverridesRequireOpenFlag() {
    ParkingParametersData data = new ParkingParametersData();
    data.setCashRequireOpenForPayment(false);
    ParkingParameters row = new ParkingParameters();
    row.setId(UUID.randomUUID());
    row.setSiteCode("Sede Norte");
    row.setData(data);
    when(parkingParametersRepository.findBySiteCode(eq("Sede Norte"))).thenReturn(Optional.of(row));
    assertThat(resolver.requireOpenForPayment("Sede Norte")).isFalse();
  }

  @Test
  void resolvePolicyIncludesHintAndResolvedSiteLabel() {
    var pol = resolver.resolvePolicy("Sede Norte");
    assertThat(pol.requireOpenForPayment()).isTrue();
    assertThat(pol.operationsHint()).isEqualTo("hint-from-yml");
    assertThat(pol.resolvedForSite()).isEqualTo("Sede Norte");
  }
}
