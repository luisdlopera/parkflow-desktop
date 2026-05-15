package com.parkflow.modules.settings.application.mapper;

import com.parkflow.modules.configuration.domain.Rate;
import com.parkflow.modules.configuration.domain.RateCategory;
import com.parkflow.modules.configuration.domain.RoundingMode;
import com.parkflow.modules.settings.dto.RateResponse;
import com.parkflow.modules.settings.dto.RateUpsertRequest;
import java.time.OffsetDateTime;
import org.springframework.stereotype.Component;

@Component
public class RateMapper {

  public RateResponse toResponse(Rate r) {
    return new RateResponse(
        r.getId(),
        r.getName(),
        r.getVehicleType(),
        r.getCategory(),
        r.getRateType(),
        r.getAmount(),
        r.getGraceMinutes(),
        r.getToleranceMinutes(),
        r.getFractionMinutes(),
        r.getRoundingMode(),
        r.getLostTicketSurcharge(),
        r.isActive(),
        r.getSite(),
        r.getSiteRef() != null ? r.getSiteRef().getId() : null,
        r.getBaseValue(),
        r.getBaseMinutes(),
        r.getAdditionalValue(),
        r.getAdditionalMinutes(),
        r.getMinSessionValue(),
        r.getMaxSessionValue(),
        r.getMaxDailyValue(),
        r.isAppliesNight(),
        r.getNightSurchargePercent(),
        r.isAppliesHoliday(),
        r.getHolidaySurchargePercent(),
        r.getAppliesDaysBitmap(),
        r.getWindowStart(),
        r.getWindowEnd(),
        r.getScheduledActiveFrom(),
        r.getScheduledActiveTo(),
        r.getCreatedAt(),
        r.getUpdatedAt());
  }

  public Rate fromRequest(RateUpsertRequest req, Rate target) {
    target.setName(req.name().trim());
    target.setVehicleType(req.vehicleType());
    target.setCategory(req.category() != null ? req.category() : RateCategory.STANDARD);
    target.setRateType(req.rateType());
    target.setAmount(req.amount());
    target.setGraceMinutes(req.graceMinutes());
    target.setToleranceMinutes(req.toleranceMinutes());
    target.setFractionMinutes(req.fractionMinutes());
    target.setRoundingMode(req.roundingMode() != null ? req.roundingMode() : RoundingMode.UP);
    target.setLostTicketSurcharge(req.lostTicketSurcharge());
    target.setActive(req.active());

    target.setBaseValue(req.baseValue() != null ? req.baseValue() : java.math.BigDecimal.ZERO);
    target.setBaseMinutes(req.baseMinutes());
    target.setAdditionalValue(req.additionalValue() != null ? req.additionalValue() : java.math.BigDecimal.ZERO);
    target.setAdditionalMinutes(req.additionalMinutes());

    target.setMinSessionValue(req.minSessionValue());
    target.setMaxSessionValue(req.maxSessionValue());
    target.setMaxDailyValue(req.maxDailyValue());

    target.setAppliesNight(req.appliesNight());
    target.setNightSurchargePercent(
        req.nightSurchargePercent() != null ? req.nightSurchargePercent() : java.math.BigDecimal.ZERO);
    target.setAppliesHoliday(req.appliesHoliday());
    target.setHolidaySurchargePercent(
        req.holidaySurchargePercent() != null ? req.holidaySurchargePercent() : java.math.BigDecimal.ZERO);

    target.setAppliesDaysBitmap(req.appliesDaysBitmap());
    target.setWindowStart(req.windowStart());
    target.setWindowEnd(req.windowEnd());
    target.setScheduledActiveFrom(req.scheduledActiveFrom());
    target.setScheduledActiveTo(req.scheduledActiveTo());
    target.setUpdatedAt(OffsetDateTime.now());
    return target;
  }
}
