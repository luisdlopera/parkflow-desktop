package com.parkflow.modules.settings.controller;

import com.parkflow.modules.settings.dto.VehicleTypeRequest;
import com.parkflow.modules.settings.dto.VehicleTypeResponse;
import com.parkflow.modules.settings.application.port.in.VehicleTypeUseCase;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/settings/vehicle-types")
@RequiredArgsConstructor
public class SettingsVehicleTypeController {
    private final VehicleTypeUseCase vehicleTypeUseCase;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
    public List<VehicleTypeResponse> list() {
        return vehicleTypeUseCase.listAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public VehicleTypeResponse create(@Valid @RequestBody VehicleTypeRequest request) {
        return vehicleTypeUseCase.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public VehicleTypeResponse update(@PathVariable UUID id, @Valid @RequestBody VehicleTypeRequest request) {
        return vehicleTypeUseCase.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public void delete(@PathVariable UUID id) {
        vehicleTypeUseCase.delete(id);
    }
}
