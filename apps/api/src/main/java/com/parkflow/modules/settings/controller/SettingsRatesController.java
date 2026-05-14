package com.parkflow.modules.settings.controller;

import com.parkflow.modules.settings.dto.RateResponse;
import com.parkflow.modules.settings.dto.RateStatusRequest;
import com.parkflow.modules.settings.dto.RateUpsertRequest;
import com.parkflow.modules.settings.dto.SettingsPageResponse;
import com.parkflow.modules.settings.service.SettingsRateService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/settings/rates")
public class SettingsRatesController {
  private final SettingsRateService settingsRateService;

  public SettingsRatesController(SettingsRateService settingsRateService) {
    this.settingsRateService = settingsRateService;
  }

  @GetMapping
  @PreAuthorize("hasAuthority('tarifas:leer')")
  public SettingsPageResponse<RateResponse> list(
      @RequestParam(required = false) String site,
      @RequestParam(required = false) String q,
      @RequestParam(required = false) Boolean active,
      @RequestParam(required = false) String category,
      @PageableDefault(size = 20) Pageable pageable) {
    return settingsRateService.list(site, q, active, category, pageable);
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAuthority('tarifas:leer')")
  public RateResponse get(@PathVariable UUID id) {
    return settingsRateService.get(id);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasAuthority('tarifas:editar')")
  public RateResponse create(@Valid @RequestBody RateUpsertRequest request) {
    return settingsRateService.create(request);
  }

  @PatchMapping("/{id}")
  @PreAuthorize("hasAuthority('tarifas:editar')")
  public RateResponse update(@PathVariable UUID id, @Valid @RequestBody RateUpsertRequest request) {
    return settingsRateService.update(id, request);
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("hasAuthority('tarifas:editar')")
  public RateResponse status(@PathVariable UUID id, @Valid @RequestBody RateStatusRequest request) {
    return settingsRateService.patchStatus(id, request);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @PreAuthorize("hasAuthority('tarifas:editar')")
  public void delete(@PathVariable UUID id) {
    settingsRateService.delete(id);
  }
}
