package com.parkflow.modules.settings.controller;

import com.parkflow.modules.settings.dto.*;
import com.parkflow.modules.settings.application.port.in.RateManagementUseCase;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/settings/rates")
@RequiredArgsConstructor
public class SettingsRatesController {
  private final RateManagementUseCase rateManagementUseCase;

  @GetMapping
  @PreAuthorize("hasAuthority('tarifas:leer')")
  public SettingsPageResponse<RateResponse> list(
      @RequestParam(required = false) String site,
      @RequestParam(required = false) String q,
      @RequestParam(required = false) Boolean active,
      @RequestParam(required = false) String category,
      @PageableDefault(size = 20) Pageable pageable) {
    return rateManagementUseCase.list(site, q, active, category, pageable);
  }

  @GetMapping("/{id}")
  @PreAuthorize("hasAuthority('tarifas:leer')")
  public RateResponse get(@PathVariable UUID id) {
    return rateManagementUseCase.get(id);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @PreAuthorize("hasAuthority('tarifas:editar')")
  public RateResponse create(@Valid @RequestBody RateUpsertRequest request) {
    return rateManagementUseCase.create(request);
  }

  @PatchMapping("/{id}")
  @PreAuthorize("hasAuthority('tarifas:editar')")
  public RateResponse update(@PathVariable UUID id, @Valid @RequestBody RateUpsertRequest request) {
    return rateManagementUseCase.update(id, request);
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("hasAuthority('tarifas:editar')")
  public RateResponse status(@PathVariable UUID id, @Valid @RequestBody RateStatusRequest request) {
    return rateManagementUseCase.patchStatus(id, request);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @PreAuthorize("hasAuthority('tarifas:editar')")
  public void delete(@PathVariable UUID id) {
    // Implementado en el puerto como inactivación si tiene referencias
    rateManagementUseCase.patchStatus(id, new RateStatusRequest(false));
  }
}
