package com.parkflow.modules.settings.infrastructure.controller;

import com.parkflow.modules.common.dto.VehicleTypeRequest;
import com.parkflow.modules.common.dto.VehicleTypeResponse;
import com.parkflow.modules.settings.application.port.in.VehicleTypeUseCase;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.http.HttpStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;
import java.util.UUID;

@RestController
@Tag(name = "SettingsVehicleType", description = "SettingsVehicleType endpoints")
@RequestMapping("/api/v1/settings/vehicle-types")
@Deprecated(since = "2.1.0", forRemoval = false)
@RequiredArgsConstructor
public class SettingsVehicleTypeController {
    private final VehicleTypeUseCase vehicleTypeUseCase;

    @GetMapping
  @Operation(summary = "GET endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
    public List<VehicleTypeResponse> list() {
        return vehicleTypeUseCase.listAll();
    }

    @PostMapping
  @Operation(summary = "POST endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "201", description = "Created")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public VehicleTypeResponse create(@Valid @RequestBody VehicleTypeRequest request) {
        return vehicleTypeUseCase.create(request);
    }

    @PutMapping("/{id}")
  @Operation(summary = "PUT endpoint")
  @ApiResponse(responseCode = "200", description = "Success")
  @ApiResponse(responseCode = "400", description = "Bad Request")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public VehicleTypeResponse update(@PathVariable UUID id, @Valid @RequestBody VehicleTypeRequest request) {
        return vehicleTypeUseCase.update(id, request);
    }

    @DeleteMapping("/{id}")
  @Operation(summary = "DELETE endpoint")
  @ApiResponse(responseCode = "204", description = "Deleted")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  @ApiResponse(responseCode = "404", description = "Not Found")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public void delete(@PathVariable UUID id) {
        vehicleTypeUseCase.delete(id);
    }
}
