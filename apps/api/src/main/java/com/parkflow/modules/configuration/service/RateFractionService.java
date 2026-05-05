package com.parkflow.modules.configuration.service;

import com.parkflow.modules.configuration.dto.RateFractionRequest;
import com.parkflow.modules.configuration.dto.RateFractionResponse;
import com.parkflow.modules.configuration.entity.RateFraction;
import com.parkflow.modules.configuration.repository.RateFractionRepository;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.exception.OperationException;
import com.parkflow.modules.parking.operation.repository.RateRepository;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RateFractionService {

  private final RateFractionRepository rateFractionRepository;
  private final RateRepository rateRepository;

  @Transactional(readOnly = true)
  public List<RateFractionResponse> listByRate(UUID rateId) {
    return rateFractionRepository.findByRate_IdAndIsActiveTrueOrderByFromMinuteAsc(rateId)
        .stream()
        .map(this::toResponse)
        .collect(Collectors.toList());
  }

  @Transactional(readOnly = true)
  public RateFractionResponse get(UUID id) {
    return toResponse(findById(id));
  }

  @Transactional
  public RateFractionResponse create(UUID rateId, RateFractionRequest req) {
    Rate rate = rateRepository.findById(rateId)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Tarifa no encontrada"));
    validateFraction(rateId, req.fromMinute(), req.toMinute(), null);

    RateFraction f = new RateFraction();
    f.setRate(rate);
    f.setFromMinute(req.fromMinute());
    f.setToMinute(req.toMinute());
    f.setValue(req.value());
    f.setRoundUp(req.roundUp());
    f.setActive(req.isActive());
    f.setCreatedAt(OffsetDateTime.now());
    f.setUpdatedAt(OffsetDateTime.now());
    f = rateFractionRepository.save(f);
    return toResponse(f);
  }

  @Transactional
  public RateFractionResponse update(UUID id, RateFractionRequest req) {
    RateFraction f = findById(id);
    validateFraction(f.getRate().getId(), req.fromMinute(), req.toMinute(), id);
    f.setFromMinute(req.fromMinute());
    f.setToMinute(req.toMinute());
    f.setValue(req.value());
    f.setRoundUp(req.roundUp());
    f.setActive(req.isActive());
    f = rateFractionRepository.save(f);
    return toResponse(f);
  }

  @Transactional
  public void delete(UUID id) {
    RateFraction f = findById(id);
    f.setActive(false);
    rateFractionRepository.save(f);
  }

  private void validateFraction(UUID rateId, int from, int to, UUID excludeId) {
    if (from >= to) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "El minuto inicial debe ser menor al final");
    }
    List<RateFraction> existing = rateFractionRepository.findByRate_IdAndIsActiveTrueOrderByFromMinuteAsc(rateId);
    for (RateFraction e : existing) {
      if (excludeId != null && e.getId().equals(excludeId)) continue;
      if (from < e.getToMinute() && to > e.getFromMinute()) {
        throw new OperationException(HttpStatus.CONFLICT,
            "La fracción se solapa con otra existente (" + e.getFromMinute() + "-" + e.getToMinute() + ")");
      }
    }
  }

  private RateFraction findById(UUID id) {
    return rateFractionRepository.findById(id)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Fracción no encontrada"));
  }

  private RateFractionResponse toResponse(RateFraction f) {
    return new RateFractionResponse(
        f.getId(), f.getRate().getId(), f.getFromMinute(), f.getToMinute(),
        f.getValue(), f.isRoundUp(), f.isActive(), f.getCreatedAt(), f.getUpdatedAt());
  }
}
