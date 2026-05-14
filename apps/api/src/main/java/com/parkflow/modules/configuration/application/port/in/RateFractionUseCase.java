package com.parkflow.modules.configuration.application.port.in;

import com.parkflow.modules.configuration.dto.RateFractionRequest;
import com.parkflow.modules.configuration.dto.RateFractionResponse;

import java.util.List;
import java.util.UUID;

/**
 * Port for managing rate fractions.
 */
public interface RateFractionUseCase {
  List<RateFractionResponse> listByRate(UUID rateId);
  RateFractionResponse get(UUID id);
  RateFractionResponse create(UUID rateId, RateFractionRequest request);
  RateFractionResponse update(UUID id, RateFractionRequest request);
  void delete(UUID id);
}
