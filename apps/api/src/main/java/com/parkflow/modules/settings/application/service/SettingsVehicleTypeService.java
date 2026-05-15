package com.parkflow.modules.settings.application.service;

import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.settings.application.port.in.VehicleTypeUseCase;
import com.parkflow.modules.settings.domain.MasterVehicleType;
import com.parkflow.modules.settings.dto.VehicleTypeRequest;
import com.parkflow.modules.settings.dto.VehicleTypeResponse;
import com.parkflow.modules.settings.domain.repository.MasterVehicleTypePort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
public class SettingsVehicleTypeService implements VehicleTypeUseCase {
    private final MasterVehicleTypePort repository;

    public SettingsVehicleTypeService(MasterVehicleTypePort repository) {
        this.repository = Objects.requireNonNull(repository, "repository");
    }

    @Transactional(readOnly = true)
    public List<VehicleTypeResponse> listAll() {
        return repository.findAllByOrderByDisplayOrderAscNameAsc().stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public VehicleTypeResponse create(VehicleTypeRequest req) {
        Objects.requireNonNull(req, "req");
        String code = req.code().trim().toUpperCase();
        if (repository.findByCode(code).isPresent()) {
            throw new OperationException(HttpStatus.CONFLICT, "Ya existe un tipo de vehículo con este código");
        }
        MasterVehicleType type = new MasterVehicleType();
        type.setCode(code);
        type.setName(req.name().trim());
        applyConfig(type, req);
        type.setUpdatedAt(java.time.OffsetDateTime.now());
        type = repository.save(type);
        return toResponse(type);
    }

    private void applyConfig(MasterVehicleType type, VehicleTypeRequest req) {
        type.setIcon(normalizeIcon(req.icon(), type.getIcon()));
        type.setColor(normalizeColor(req.color(), type.getColor()));
        type.setRequiresPlate(req.requiresPlate());
        type.setHasOwnRate(req.hasOwnRate());
        type.setQuickAccess(req.quickAccess());
        type.setRequiresPhoto(req.requiresPhoto());
        type.setDisplayOrder(req.displayOrder());
    }

    private String normalizeIcon(String icon, String fallback) {
        return icon == null || icon.isBlank() ? fallback : icon.trim();
    }

    private String normalizeColor(String color, String fallback) {
        return color == null || color.isBlank() ? fallback : color.trim().toUpperCase();
    }

    @Transactional
    public VehicleTypeResponse update(UUID id, VehicleTypeRequest req) {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(req, "req");
        MasterVehicleType type = repository.findById(id)
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Tipo no encontrado"));

        String code = req.code().trim().toUpperCase();
        repository.findByCode(code).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
                throw new OperationException(HttpStatus.CONFLICT, "Ya existe otro tipo con este código");
            }
        });

        type.setCode(code);
        type.setName(req.name().trim());
        applyConfig(type, req);
        type.setUpdatedAt(java.time.OffsetDateTime.now());
        type = repository.save(type);
        return toResponse(type);
    }

    @Transactional
    public void patchStatus(UUID id, boolean active) {
        Objects.requireNonNull(id, "id");
        MasterVehicleType type = repository.findById(id)
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Tipo no encontrado"));
        type.setActive(active);
        type.setUpdatedAt(java.time.OffsetDateTime.now());
        repository.save(type);
    }

    @Transactional
    public void delete(UUID id) {
        MasterVehicleType type = repository.findById(id)
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Tipo no encontrado"));
        type.setActive(false);
        type.setUpdatedAt(java.time.OffsetDateTime.now());
        repository.save(type);
    }

    private VehicleTypeResponse toResponse(MasterVehicleType type) {
        return new VehicleTypeResponse(
            type.getId(),
            type.getCode(),
            type.getName(),
            type.getIcon(),
            type.getColor(),
            type.isActive(),
            type.isRequiresPlate(),
            type.isHasOwnRate(),
            type.isQuickAccess(),
            type.isRequiresPhoto(),
            type.getDisplayOrder(),
            type.getCreatedAt(),
            type.getUpdatedAt());
    }
}
