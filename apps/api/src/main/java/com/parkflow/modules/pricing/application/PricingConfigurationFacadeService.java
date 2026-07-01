package com.parkflow.modules.pricing.application;

import com.parkflow.modules.common.dto.RateStatusRequest;
import com.parkflow.modules.common.dto.PageResponse;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.configuration.domain.ParkingSite;
import com.parkflow.modules.configuration.infrastructure.persistence.ParkingSiteRepository;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateCategory;
import com.parkflow.modules.parking.operation.infrastructure.persistence.RateRepository;
import com.parkflow.modules.pricing.dto.PricingEngineV1Request;
import com.parkflow.modules.pricing.dto.PricingEngineV1Response;
import com.parkflow.modules.pricing.dto.PricingSimulationRequest;
import com.parkflow.modules.pricing.dto.PricingSimulationResponse;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PricingConfigurationFacadeService {
  private final RateRepository rateRepository;
  private final ParkingSiteRepository parkingSiteRepository;
  private final com.parkflow.modules.settings.infrastructure.persistence.MasterVehicleTypeRepository vehicleTypeRepository;
  private final PricingEngineService pricingEngineService;
  private final LegacyPricingAdapter legacyPricingAdapter;
  private final com.parkflow.modules.settings.application.service.RateValidationService rateValidationService;

  @Transactional(readOnly = true)
  public PageResponse<PricingEngineV1Response> list(String site, String q, Boolean active, Pageable pageable) {
    var page = rateRepository.search(site, q, active, RateCategory.STANDARD, pageable);
    return PageResponse.of(page.map(legacyPricingAdapter::toResponse));
  }

  @Transactional(readOnly = true)
  public PricingEngineV1Response get(UUID id) {
    return legacyPricingAdapter.toResponse(findRate(id));
  }

  @Transactional
  public PricingEngineV1Response create(PricingEngineV1Request request) {
    Rate rate = saveCanonical(new Rate(), request);
    return legacyPricingAdapter.toResponse(rateRepository.save(rate));
  }

  @Transactional
  public PricingEngineV1Response update(UUID id, PricingEngineV1Request request) {
    Rate existing = findRate(id);
    Rate updated = saveCanonical(existing, request);
    return legacyPricingAdapter.toResponse(rateRepository.save(updated));
  }

  @Transactional
  public PricingEngineV1Response patchStatus(UUID id, RateStatusRequest request) {
    Rate rate = findRate(id);
    rate.setActive(request.active());
    validate(rate, id);
    return legacyPricingAdapter.toResponse(rateRepository.save(rate));
  }

  @Transactional(readOnly = true)
  public PricingSimulationResponse simulate(PricingSimulationRequest request) {
    return pricingEngineService.simulate(request.configuration(), request.stayMinutes(), request.vehicleType());
  }

  private Rate saveCanonical(Rate target, PricingEngineV1Request request) {
    PricingEngineV1Request normalized = legacyPricingAdapter.normalize(request);
    target = legacyPricingAdapter.toRate(normalized, target);
    target.setCompanyId(com.parkflow.modules.auth.security.SecurityUtils.requireCompanyId());
    target.setSiteRef(resolveSite(normalized.siteId()));
    validate(target, target.getId());
    return target;
  }

  private void validate(Rate rate, UUID excludeId) {
    rateValidationService.validateSchedule(rate);
    rateValidationService.validateMinMax(rate);
    rateValidationService.validateVehicleType(rate, vehicleTypeRepository);
    if (!rate.isActive()) {
      return;
    }
    UUID companyId = com.parkflow.modules.auth.security.SecurityUtils.requireCompanyId();
    String siteCode = rate.getSiteRef() != null ? rate.getSiteRef().getCode() : null;
    var others = rateRepository.findActiveForConflictCheck(siteCode, rate.getVehicleType(), excludeId != null ? excludeId : UUID.randomUUID(), companyId);
    rateValidationService.validateOverlap(rate, others);
  }

  private Rate findRate(UUID id) {
    return rateRepository.findByIdAndCompanyId(id, com.parkflow.modules.auth.security.SecurityUtils.requireCompanyId())
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Tarifa no encontrada"));
  }

  private ParkingSite resolveSite(UUID siteId) {
    if (siteId == null) {
      return null;
    }
    return parkingSiteRepository.findById(siteId)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sede no encontrada"));
  }
}
