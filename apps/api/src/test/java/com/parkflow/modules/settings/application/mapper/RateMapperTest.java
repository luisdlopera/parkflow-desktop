package com.parkflow.modules.settings.application.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import com.parkflow.modules.common.dto.RateResponse;
import com.parkflow.modules.common.dto.RateUpsertRequest;
import com.parkflow.modules.configuration.domain.ParkingSite;
import com.parkflow.modules.configuration.domain.RoundingMode;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateCategory;
import com.parkflow.modules.parking.operation.domain.RateType;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class RateMapperTest {

  private final RateMapper mapper = new RateMapper();

  @Test
  void toResponse() {
    Rate r = new Rate();
    r.setId(UUID.randomUUID());
    r.setName("Test");
    r.setVehicleType("CAR");
    r.setCategory(RateCategory.STANDARD);
    r.setRateType(RateType.HOURLY);
    r.setAmount(BigDecimal.TEN);
    r.setGraceMinutes(5);
    r.setToleranceMinutes(0);
    r.setFractionMinutes(60);
    r.setRoundingMode(RoundingMode.NEAREST);
    r.setLostTicketSurcharge(BigDecimal.ZERO);
    r.setActive(true);
    r.setSite("S1");
    ParkingSite site = new ParkingSite();
    site.setId(UUID.randomUUID());
    r.setSiteRef(site);
    r.setCreatedAt(OffsetDateTime.now());
    r.setUpdatedAt(OffsetDateTime.now());

    RateResponse res = mapper.toResponse(r);
    assertThat(res.id()).isEqualTo(r.getId());
    assertThat(res.name()).isEqualTo("Test");
    assertThat(res.siteId()).isEqualTo(site.getId());
  }

  @Test
  void fromRequest() {
    RateUpsertRequest req = new RateUpsertRequest(
        "ReqRate ", "BIKE", RateCategory.AGREEMENT, RateType.HOURLY,
        BigDecimal.ONE, 10, 5, 30, RoundingMode.UP, BigDecimal.ONE, true,
        "S1", UUID.randomUUID(), null, 0, null, 0, null, null, null,
        true, null, false, null, 127, null, null, null, null
    );

    Rate r = new Rate();
    mapper.fromRequest(req, r);

    assertThat(r.getName()).isEqualTo("ReqRate");
    assertThat(r.getVehicleType()).isEqualTo("BIKE");
    assertThat(r.getCategory()).isEqualTo(RateCategory.AGREEMENT);
    assertThat(r.getRateType()).isEqualTo(RateType.HOURLY);
    assertThat(r.getRoundingMode()).isEqualTo(RoundingMode.UP);
    assertThat(r.getBaseValue()).isEqualTo(BigDecimal.ZERO);
  }
}
