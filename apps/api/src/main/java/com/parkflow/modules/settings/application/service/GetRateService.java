package com.parkflow.modules.settings.application.service;

import com.parkflow.modules.configuration.domain.Rate;
import com.parkflow.modules.configuration.domain.repository.RatePort;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.settings.application.mapper.RateMapper;
import com.parkflow.modules.settings.application.port.in.GetRateUseCase;
import com.parkflow.modules.settings.dto.RateResponse;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class GetRateService implements GetRateUseCase {
  private final RatePort ratePort;
  private final RateMapper rateMapper;

  @Override
  @Transactional(readOnly = true)
  public RateResponse get(UUID id) {
    Rate rate = ratePort.findById(id)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Tarifa no encontrada"));
    return rateMapper.toResponse(rate);
  }
}
