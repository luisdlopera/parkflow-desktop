package com.parkflow.modules.settings.application.service;

import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.settings.application.port.in.MasterVehicleTypeManagementUseCase;
import com.parkflow.modules.settings.domain.MasterVehicleType;
import com.parkflow.modules.common.dto.VehicleTypeRequest;
import com.parkflow.modules.common.dto.VehicleTypeResponse;
import com.parkflow.modules.settings.domain.repository.MasterVehicleTypePort;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static com.parkflow.config.CacheConfig.VEHICLE_TYPES_ALL;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * Service for managing global/master vehicle types.
 * Handles CRUD operations on the master vehicle type catalog.
 * Single responsibility: Master type lifecycle (create, read, update, delete).
 */
@Service
public class MasterVehicleTypeManagementService implements MasterVehicleTypeManagementUseCase {
    private final MasterVehicleTypePort repository;

    public MasterVehicleTypeManagementService(MasterVehicleTypePort repository) {
        this.repository = Objects.requireNonNull(repository, "repository");
    }

    @Cacheable(VEHICLE_TYPES_ALL)
    @Transactional(readOnly = true)
    @Override
    public List<VehicleTypeResponse> listAll() {
        return repository.findAllByOrderByDisplayOrderAscNameAsc().stream()
            .map(this::toMasterResponse)
            .toList();
    }

    @CacheEvict(value = VEHICLE_TYPES_ALL, allEntries = true)
    @Transactional
    @Override
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
        return toMasterResponse(type);
    }

    @CacheEvict(value = VEHICLE_TYPES_ALL, allEntries = true)
    @Transactional
    @Override
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
        return toMasterResponse(type);
    }

    @CacheEvict(value = VEHICLE_TYPES_ALL, allEntries = true)
    @Transactional
    @Override
    public void patchStatus(UUID id, boolean active) {
        Objects.requireNonNull(id, "id");
        MasterVehicleType type = repository.findById(id)
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Tipo no encontrado"));
        type.setActive(active);
        type.setUpdatedAt(java.time.OffsetDateTime.now());
        repository.save(type);
    }

    @CacheEvict(value = VEHICLE_TYPES_ALL, allEntries = true)
    @Transactional
    @Override
    public void delete(UUID id) {
        MasterVehicleType type = repository.findById(id)
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Tipo no encontrado"));
        type.setActive(false);
        type.setUpdatedAt(java.time.OffsetDateTime.now());
        repository.save(type);
    }

    // ───── Internal helpers ─────

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

    private VehicleTypeResponse toMasterResponse(MasterVehicleType type) {
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
