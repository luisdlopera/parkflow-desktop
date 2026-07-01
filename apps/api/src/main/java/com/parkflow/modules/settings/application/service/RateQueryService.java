package com.parkflow.modules.settings.application.service;

import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.infrastructure.persistence.RateRepository;
import com.parkflow.modules.common.dto.RateResponse;
import com.parkflow.modules.common.dto.PageResponse;
import com.parkflow.config.CacheConfig;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Rate Query - handles retrieval and listing of rates.
 * Read-only service for querying rate state.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RateQueryService {
  private final RateRepository rateRepository;

  @Transactional(readOnly = true)
  public PageResponse<RateResponse> list(
      String site, String q, Boolean active, String category, Pageable pageable) {
    String s = site == null || site.isBlank() ? "DEFAULT" : site.trim();
    Page<Rate> page = rateRepository.search(s, normalizeQuery(q), active, category, pageable);
    return PageResponse.of(page.map(this::toResponse));
  }

  @Transactional(readOnly = true)
  @Cacheable(value = CacheConfig.RATES, key = "#id")
  public RateResponse get(UUID id) {
    Rate rate =
        rateRepository
            .findById(id)
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Tarifa no encontrada"));
    return toResponse(rate);
  }

  // ─── mapping helpers ───────────────────────────────────────────────────────

  private static String normalizeQuery(String q) {
    return q == null || q.isBlank() ? null : q.trim();
  }

  private RateResponse toResponse(Rate r) {
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
        r.getSiteRef() != null ? r.getSiteRef().getCode() : null,
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
}
