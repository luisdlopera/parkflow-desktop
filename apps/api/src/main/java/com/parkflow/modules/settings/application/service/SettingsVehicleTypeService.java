package com.parkflow.modules.settings.application.service;

import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.settings.application.port.in.VehicleTypeUseCase;
import com.parkflow.modules.settings.domain.CompanyVehicleType;
import com.parkflow.modules.settings.domain.MasterVehicleType;
import com.parkflow.modules.settings.domain.StandardVehicleType;
import com.parkflow.modules.common.dto.VehicleTypeRequest;
import com.parkflow.modules.common.dto.VehicleTypeResponse;
import com.parkflow.modules.settings.domain.repository.CompanyVehicleTypePort;
import com.parkflow.modules.settings.domain.repository.MasterVehicleTypePort;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static com.parkflow.config.CacheConfig.VEHICLE_TYPES_ALL;
import static com.parkflow.config.CacheConfig.VEHICLE_TYPES_COMPANY;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
public class SettingsVehicleTypeService implements VehicleTypeUseCase {
    private final MasterVehicleTypePort repository;
    private final CompanyVehicleTypePort companyVehicleTypePort;

    public SettingsVehicleTypeService(MasterVehicleTypePort repository,
                                      CompanyVehicleTypePort companyVehicleTypePort) {
        this.repository = Objects.requireNonNull(repository, "repository");
        this.companyVehicleTypePort = Objects.requireNonNull(companyVehicleTypePort, "companyVehicleTypePort");
    }

    // ───── Global methods (master_vehicle_type) ─────

    @Cacheable(VEHICLE_TYPES_ALL)
    @Transactional(readOnly = true)
    public List<VehicleTypeResponse> listAll() {
        return repository.findAllByOrderByDisplayOrderAscNameAsc().stream()
            .map(this::toMasterResponse)
            .toList();
    }

    @CacheEvict(value = VEHICLE_TYPES_ALL, allEntries = true)
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
        return toMasterResponse(type);
    }

    @CacheEvict(value = VEHICLE_TYPES_ALL, allEntries = true)
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
        return toMasterResponse(type);
    }

    @CacheEvict(value = VEHICLE_TYPES_ALL, allEntries = true)
    @Transactional
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
    public void delete(UUID id) {
        MasterVehicleType type = repository.findById(id)
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Tipo no encontrado"));
        type.setActive(false);
        type.setUpdatedAt(java.time.OffsetDateTime.now());
        repository.save(type);
    }

    // ───── Company-scoped methods (company_vehicle_type) ─────

    @Cacheable(value = VEHICLE_TYPES_COMPANY, key = "#companyId")
    @Transactional(readOnly = true)
    public List<VehicleTypeResponse> listByCompany(UUID companyId) {
        Objects.requireNonNull(companyId, "companyId");
        List<CompanyVehicleType> companyTypes = companyVehicleTypePort.findByCompanyId(companyId);
        if (companyTypes.isEmpty()) return List.of();
        // Batch-load all master types to avoid N+1
        List<UUID> masterIds = companyTypes.stream().map(CompanyVehicleType::getVehicleTypeId).toList();
        Map<UUID, MasterVehicleType> masterMap = repository.findAllById(masterIds).stream()
            .collect(java.util.stream.Collectors.toMap(MasterVehicleType::getId, m -> m));
        return companyTypes.stream()
            .map(cvType -> toCompanyResponseWithMaster(cvType, masterMap.get(cvType.getVehicleTypeId())))
            .filter(r -> r != null)
            .toList();
    }

    @CacheEvict(value = VEHICLE_TYPES_COMPANY, key = "#companyId")
    @Transactional
    public VehicleTypeResponse addTypeToCompany(UUID companyId, String code) {
        Objects.requireNonNull(companyId, "companyId");
        Objects.requireNonNull(code, "code");

        String normalizedCode = code.trim().toUpperCase();

        // Asegurar que el tipo existe en el catálogo global
        MasterVehicleType master = ensureMasterTypeExists(normalizedCode);

        // Verificar si ya está vinculado a la empresa
        var existing = companyVehicleTypePort.findByCompanyIdAndVehicleTypeId(companyId, master.getId());
        if (existing.isPresent()) {
            CompanyVehicleType cvType = existing.get();
            if (!cvType.isActive()) {
                cvType.setActive(true);
                cvType.setUpdatedAt(OffsetDateTime.now());
                companyVehicleTypePort.save(cvType);
            }
            return toCompanyResponse(cvType);
        }

        // Crear el vínculo empresa-tipo
        CompanyVehicleType cvType = new CompanyVehicleType();
        cvType.setCompanyId(companyId);
        cvType.setVehicleTypeId(master.getId());
        cvType.setActive(true);
        cvType.setDisplayOrder(master.getDisplayOrder());
        cvType.setCreatedAt(OffsetDateTime.now());
        cvType.setUpdatedAt(OffsetDateTime.now());
        cvType = companyVehicleTypePort.save(cvType);

        return toCompanyResponse(cvType);
    }

    @Transactional
    public VehicleTypeResponse updateCompanyType(UUID id, VehicleTypeRequest req) {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(req, "req");

        CompanyVehicleType cvType = companyVehicleTypePort.findById(id)
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Tipo de vehículo no encontrado para esta empresa"));

        repository.findById(cvType.getVehicleTypeId())
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Tipo maestro no encontrado"));

        cvType.setDisplayOrder(req.displayOrder());
        cvType.setUpdatedAt(OffsetDateTime.now());
        cvType = companyVehicleTypePort.save(cvType);

        return toCompanyResponse(cvType);
    }

    @Transactional
    public void patchCompanyTypeStatus(UUID id, boolean active) {
        Objects.requireNonNull(id, "id");
        CompanyVehicleType cvType = companyVehicleTypePort.findById(id)
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Tipo de vehículo no encontrado para esta empresa"));
        cvType.setActive(active);
        cvType.setUpdatedAt(OffsetDateTime.now());
        companyVehicleTypePort.save(cvType);
    }

    @Transactional
    public void removeCompanyType(UUID id) {
        Objects.requireNonNull(id, "id");
        CompanyVehicleType cvType = companyVehicleTypePort.findById(id)
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Tipo de vehículo no encontrado para esta empresa"));
        companyVehicleTypePort.delete(cvType);
    }

    @Transactional
    public MasterVehicleType ensureMasterTypeExists(String code) {
        Objects.requireNonNull(code, "code");
        return repository.findByCode(code).orElseGet(() -> {
            MasterVehicleType entity = StandardVehicleType.findByCode(code)
                .map(StandardVehicleType::toMasterEntity)
                .orElseThrow(() -> new OperationException(HttpStatus.BAD_REQUEST,
                    "Código de tipo de vehículo no válido: " + code + ". Use uno de los tipos estándar."));
            entity.setCreatedAt(OffsetDateTime.now());
            entity.setUpdatedAt(OffsetDateTime.now());
            return repository.save(entity);
        });
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

    private VehicleTypeResponse toCompanyResponse(CompanyVehicleType cvType) {
        MasterVehicleType master = repository.findById(cvType.getVehicleTypeId())
            .orElseThrow(() -> new OperationException(HttpStatus.INTERNAL_SERVER_ERROR, "Tipo maestro no encontrado para el vínculo"));
        return toCompanyResponseWithMaster(cvType, master);
    }

    private VehicleTypeResponse toCompanyResponseWithMaster(CompanyVehicleType cvType, MasterVehicleType master) {
        if (master == null) return null;
        return new VehicleTypeResponse(
            cvType.getId(),
            master.getCode(),
            master.getName(),
            master.getIcon(),
            master.getColor(),
            cvType.isActive(),
            master.isRequiresPlate(),
            master.isHasOwnRate(),
            master.isQuickAccess(),
            master.isRequiresPhoto(),
            cvType.getDisplayOrder(),
            master.getCreatedAt(),
            cvType.getUpdatedAt());
    }
}
