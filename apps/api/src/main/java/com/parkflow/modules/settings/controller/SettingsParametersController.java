package com.parkflow.modules.settings.controller;

import com.parkflow.modules.settings.dto.ParkingParametersData;
import com.parkflow.modules.settings.dto.ParametersValidateResponse;
import com.parkflow.modules.settings.service.ParkingParametersService;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/settings/parameters")
public class SettingsParametersController {
  private final ParkingParametersService parkingParametersService;

  public SettingsParametersController(ParkingParametersService parkingParametersService) {
    this.parkingParametersService = parkingParametersService;
  }

  @GetMapping
  @PreAuthorize("hasAuthority('configuracion:leer')")
  public ParkingParametersData get(@RequestParam(required = false) String site) {
    return parkingParametersService.get(site);
  }

  @PutMapping
  @PreAuthorize("hasAuthority('configuracion:editar')")
  public ParkingParametersData put(
      @RequestParam(required = false) String site, @RequestBody ParkingParametersData body) {
    return parkingParametersService.put(site, body);
  }

  @PostMapping("/validate")
  @PreAuthorize("hasAuthority('configuracion:leer')")
  public ParametersValidateResponse validate(@RequestBody ParkingParametersData body) {
    return parkingParametersService.validate(body);
  }

  @PostMapping("/reset")
  @ResponseStatus(HttpStatus.OK)
  @PreAuthorize("hasAuthority('configuracion:editar')")
  public ParkingParametersData reset(@RequestParam(required = false) String site) {
    return parkingParametersService.reset(site);
  }
}
