package com.parkflow.modules.settings.infrastructure.controller;

import com.parkflow.modules.common.dto.ParkingParametersData;
import com.parkflow.modules.common.dto.ParametersValidateResponse;
import com.parkflow.modules.settings.application.port.in.ParkingParametersUseCase;
import lombok.RequiredArgsConstructor;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.http.HttpStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.web.bind.annotation.*;

@RestController
@Tag(name = "SettingsParameters", description = "SettingsParameters endpoints")
@RequestMapping("/api/v1/settings/parameters")
@Deprecated(since = "2.1.0", forRemoval = false)
@RequiredArgsConstructor
public class SettingsParametersController {
  private final ParkingParametersUseCase parkingParametersUseCase;

  @GetMapping
  @Operation(summary = "GET endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAuthority('configuracion:leer')")
  public ParkingParametersData get(@RequestParam(required = false) String site) {
    return parkingParametersUseCase.get(site);
  }

  @PutMapping
  @Operation(summary = "PUT endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAuthority('configuracion:editar')")
  public ParkingParametersData put(
      @RequestParam(required = false) String site, @RequestBody ParkingParametersData body) {
    return parkingParametersUseCase.put(site, body);
  }

  @PostMapping("/validate")
  @Operation(summary = "POST endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "201", description = "Created")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @PreAuthorize("hasAuthority('configuracion:leer')")
  public ParametersValidateResponse validate(@RequestBody ParkingParametersData body) {
    return parkingParametersUseCase.validate(body);
  }

  @PostMapping("/reset")
  @Operation(summary = "POST endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "201", description = "Created")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @ResponseStatus(HttpStatus.OK)
  @PreAuthorize("hasAuthority('configuracion:editar')")
  public ParkingParametersData reset(@RequestParam(required = false) String site) {
    return parkingParametersUseCase.reset(site);
  }
}
