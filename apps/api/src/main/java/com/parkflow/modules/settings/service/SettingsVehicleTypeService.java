package com.parkflow.modules.settings.service;

import com.parkflow.modules.parking.operation.exception.OperationException;
import com.parkflow.modules.settings.domain.MasterVehicleType;
import com.parkflow.modules.settings.dto.VehicleTypeRequest;
import com.parkflow.modules.settings.dto.VehicleTypeResponse;
import com.parkflow.modules.settings.repository.MasterVehicleTypeRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
public class SettingsVehicleTypeService {
    private final MasterVehicleTypeRepository repository;

    public SettingsVehicleTypeService(MasterVehicleTypeRepository repository) {
        this.repository = Objects.requireNonNull(repository, "repository");
    }

    @Transactional(readOnly = true)
    public List<VehicleTypeResponse> listAll() {
        return repository.findAllByOrderByCreatedAtAsc().stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public VehicleTypeResponse create(VehicleTypeRequest req) {
        Objects.requireNonNull(req, "req");
        if (repository.findByCode(req.code()).isPresent()) {
            throw new OperationException(HttpStatus.CONFLICT, "Ya existe un tipo de vehículo con este código");
        }
        MasterVehicleType type = new MasterVehicleType();
        type.setCode(req.code());
        type.setName(req.name());
        type.setRequiresPlate(req.requiresPlate());
        type.setRequiresPhoto(req.requiresPhoto());
        type.setDisplayOrder(req.displayOrder());
        type = repository.save(type);
        return new VehicleTypeResponse(type.getId(), type.getCode(), type.getName(), type.isActive(), type.isRequiresPlate(), type.isRequiresPhoto(), type.getDisplayOrder(), type.getCreatedAt(), type.getUpdatedAt());
    }

    @Transactional
    public VehicleTypeResponse update(UUID id, VehicleTypeRequest req) {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(req, "req");
        MasterVehicleType type = repository.findById(id)
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Tipo no encontrado"));
        
        repository.findByCode(req.code()).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
                throw new OperationException(HttpStatus.CONFLICT, "Ya existe otro tipo con este código");
            }
        });

        type.setCode(req.code());
        type.setName(req.name());
        type.setRequiresPlate(req.requiresPlate());
        type.setRequiresPhoto(req.requiresPhoto());
        type.setDisplayOrder(req.displayOrder());
        type.setUpdatedAt(java.time.OffsetDateTime.now());
        type = repository.save(type);
        return new VehicleTypeResponse(type.getId(), type.getCode(), type.getName(), type.isActive(), type.isRequiresPlate(), type.isRequiresPhoto(), type.getDisplayOrder(), type.getCreatedAt(), type.getUpdatedAt());
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
        repository.delete(type);
    }

    private VehicleTypeResponse toResponse(MasterVehicleType type) {
        return new VehicleTypeResponse(
            type.getId(),
            type.getCode(),
            type.getName(),
            type.isActive(),
            type.isRequiresPlate(),
            type.isRequiresPhoto(),
            type.getDisplayOrder(),
            type.getCreatedAt(),
            type.getUpdatedAt());
    }
}
