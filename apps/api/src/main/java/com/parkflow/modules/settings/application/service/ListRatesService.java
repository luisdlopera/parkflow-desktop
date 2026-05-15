package com.parkflow.modules.settings.application.service;

import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.configuration.domain.Rate;
import com.parkflow.modules.configuration.domain.RateCategory;
import com.parkflow.modules.configuration.domain.repository.RatePort;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.settings.application.mapper.RateMapper;
import com.parkflow.modules.settings.application.port.in.ListRatesUseCase;
import com.parkflow.modules.settings.dto.RateResponse;
import com.parkflow.modules.settings.dto.SettingsPageResponse;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ListRatesService implements ListRatesUseCase {
  private final RatePort ratePort;
  private final RateMapper rateMapper;

  @Override
  @Transactional(readOnly = true)
  public SettingsPageResponse<RateResponse> list(
      String site, String q, Boolean active, String category, Pageable pageable) {
    String s = site == null || site.isBlank() ? "DEFAULT" : site.trim();
    RateCategory parsedCategory = parseCategory(category);
    UUID companyId = SecurityUtils.requireCompanyId();
    Page<Rate> page = ratePort.search(s, normalizeQuery(q), active, parsedCategory, companyId, pageable);
    return SettingsPageResponse.of(page.map(rateMapper::toResponse));
  }

  private RateCategory parseCategory(String category) {
    if (category == null || category.isBlank()) return null;
    try {
      return RateCategory.valueOf(category.trim().toUpperCase());
    } catch (IllegalArgumentException ex) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "Categoria de tarifa invalida");
    }
  }

  private String normalizeQuery(String q) {
    return q == null || q.isBlank() ? null : q.trim();
  }
}
