package com.parkflow.modules.configuration.controller;

import com.parkflow.modules.settings.dto.VehicleTypeRequest;
import com.parkflow.modules.settings.dto.VehicleTypeResponse;
import com.parkflow.modules.settings.service.SettingsVehicleTypeService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/configuration/vehicle-types")
@RequiredArgsConstructor
public class ConfigurationVehicleTypeController {

  private final SettingsVehicleTypeService settingsVehicleTypeService;

  @GetMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR','CAJERO')")
  public ResponseEntity<List<VehicleTypeResponse>> listAll() {
    return ResponseEntity.ok(settingsVehicleTypeService.listAll());
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<VehicleTypeResponse> create(@Valid @RequestBody VehicleTypeRequest req) {
    return ResponseEntity.status(HttpStatus.CREATED).body(settingsVehicleTypeService.create(req));
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<VehicleTypeResponse> update(
      @PathVariable UUID id,
      @Valid @RequestBody VehicleTypeRequest req) {
    return ResponseEntity.ok(settingsVehicleTypeService.update(id, req));
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
  public ResponseEntity<Void> delete(@PathVariable UUID id) {
    settingsVehicleTypeService.delete(id);
    return ResponseEntity.noContent().build();
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("hasAuthority('configuracion:editar')")
  public ResponseEntity<Void> patchStatus(
      @PathVariable UUID id,
      @RequestParam boolean active) {
    settingsVehicleTypeService.patchStatus(id, active);
    return ResponseEntity.ok().build();
  }
}
