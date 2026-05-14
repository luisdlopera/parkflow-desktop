package com.parkflow.modules.settings.controller;

import com.parkflow.modules.settings.dto.VehicleTypeRequest;
import com.parkflow.modules.settings.dto.VehicleTypeResponse;
import com.parkflow.modules.settings.service.SettingsVehicleTypeService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/settings/vehicle-types")
public class SettingsVehicleTypeController {
    private final SettingsVehicleTypeService service;

    public SettingsVehicleTypeController(SettingsVehicleTypeService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OPERADOR','AUDITOR')")
    public List<VehicleTypeResponse> list() {
        return service.listAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public VehicleTypeResponse create(@Valid @RequestBody VehicleTypeRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public VehicleTypeResponse update(@PathVariable UUID id, @Valid @RequestBody VehicleTypeRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }
}
