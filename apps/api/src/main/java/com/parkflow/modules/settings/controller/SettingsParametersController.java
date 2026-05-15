package com.parkflow.modules.settings.controller;

import com.parkflow.modules.settings.dto.ParkingParametersData;
import com.parkflow.modules.settings.dto.ParametersValidateResponse;
import com.parkflow.modules.settings.application.port.in.ParkingParametersUseCase;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/settings/parameters")
@RequiredArgsConstructor
public class SettingsParametersController {
  private final ParkingParametersUseCase parkingParametersUseCase;

  @GetMapping
  @PreAuthorize("hasAuthority('configuracion:leer')")
  public ParkingParametersData get(@RequestParam(required = false) String site) {
    return parkingParametersUseCase.get(site);
  }

  @PutMapping
  @PreAuthorize("hasAuthority('configuracion:editar')")
  public ParkingParametersData put(
      @RequestParam(required = false) String site, @RequestBody ParkingParametersData body) {
    return parkingParametersUseCase.put(site, body);
  }

  @PostMapping("/validate")
  @PreAuthorize("hasAuthority('configuracion:leer')")
  public ParametersValidateResponse validate(@RequestBody ParkingParametersData body) {
    return parkingParametersUseCase.validate(body);
  }

  @PostMapping("/reset")
  @ResponseStatus(HttpStatus.OK)
  @PreAuthorize("hasAuthority('configuracion:editar')")
  public ParkingParametersData reset(@RequestParam(required = false) String site) {
    return parkingParametersUseCase.reset(site);
  }
}
