package com.parkflow.modules.settings.application.service;

import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.settings.application.port.in.CompanyVehicleTypeManagementUseCase;
import com.parkflow.modules.settings.domain.CompanyVehicleType;
import com.parkflow.modules.settings.domain.MasterVehicleType;
import com.parkflow.modules.settings.domain.StandardVehicleType;
import com.parkflow.modules.common.dto.VehicleTypeRequest;
import com.parkflow.modules.common.dto.VehicleTypeResponse;
import com.parkflow.modules.settings.domain.repository.CompanyVehicleTypePort;
import com.parkflow.modules.settings.domain.repository.MasterVehicleTypePort;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static com.parkflow.config.CacheConfig.VEHICLE_TYPES_COMPANY;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Service for managing company-scoped vehicle types.
 * Handles association/dissociation of master vehicle types with specific companies.
 * Single responsibility: Company-specific vehicle type bindings.
 */
@Service
public class CompanyVehicleTypeManagementService implements CompanyVehicleTypeManagementUseCase {
    private final MasterVehicleTypePort masterRepository;
    private final CompanyVehicleTypePort companyVehicleTypePort;
    private final CacheManager cacheManager;

    @SuppressWarnings("null")
  public CompanyVehicleTypeManagementService(MasterVehicleTypePort masterRepository,
                                               CompanyVehicleTypePort companyVehicleTypePort,
                                               CacheManager cacheManager) {
        this.masterRepository = Objects.requireNonNull(masterRepository, "masterRepository");
        this.companyVehicleTypePort = Objects.requireNonNull(companyVehicleTypePort, "companyVehicleTypePort");
        this.cacheManager = Objects.requireNonNull(cacheManager, "cacheManager");
    }

    @Cacheable(value = VEHICLE_TYPES_COMPANY, key = "#companyId")
    @Transactional(readOnly = true)
    @Override
    public List<VehicleTypeResponse> listByCompany(UUID companyId) {
        Objects.requireNonNull(companyId, "companyId");
        List<CompanyVehicleType> companyTypes = companyVehicleTypePort.findByCompanyId(companyId);
        if (companyTypes.isEmpty()) return List.of();
        // Batch-load all master types to avoid N+1
        List<UUID> masterIds = companyTypes.stream().map(CompanyVehicleType::getVehicleTypeId).toList();
        Map<UUID, MasterVehicleType> masterMap = masterRepository.findAllById(masterIds).stream()
            .collect(java.util.stream.Collectors.toMap(MasterVehicleType::getId, m -> m));
        return companyTypes.stream()
            .map(cvType -> toCompanyResponseWithMaster(cvType, masterMap.get(cvType.getVehicleTypeId())))
            .filter(r -> r != null)
            .toList();
    }

    @CacheEvict(value = VEHICLE_TYPES_COMPANY, key = "#companyId")
    @Transactional
    @Override
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
    @Override
    public VehicleTypeResponse updateCompanyType(UUID id, VehicleTypeRequest req) {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(req, "req");

        CompanyVehicleType cvType = companyVehicleTypePort.findById(id)
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Tipo de vehículo no encontrado para esta empresa"));

        masterRepository.findById(cvType.getVehicleTypeId())
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Tipo maestro no encontrado"));

        cvType.setDisplayOrder(req.displayOrder());
        cvType.setUpdatedAt(OffsetDateTime.now());
        cvType = companyVehicleTypePort.save(cvType);

        evictCache(cvType.getCompanyId());
        return toCompanyResponse(cvType);
    }

    @Transactional
    @Override
    public void patchCompanyTypeStatus(UUID id, boolean active) {
        Objects.requireNonNull(id, "id");
        CompanyVehicleType cvType = companyVehicleTypePort.findById(id)
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Tipo de vehículo no encontrado para esta empresa"));
        cvType.setActive(active);
        cvType.setUpdatedAt(OffsetDateTime.now());
        companyVehicleTypePort.save(cvType);
        
        evictCache(cvType.getCompanyId());
    }

    @Transactional
    @Override
    public void removeCompanyType(UUID id) {
        Objects.requireNonNull(id, "id");
        CompanyVehicleType cvType = companyVehicleTypePort.findById(id)
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Tipo de vehículo no encontrado para esta empresa"));
        companyVehicleTypePort.delete(cvType);
        evictCache(cvType.getCompanyId());
    }

    // ───── Internal helpers ─────

    @Transactional
    private MasterVehicleType ensureMasterTypeExists(String code) {
        Objects.requireNonNull(code, "code");
        return masterRepository.findByCode(code).orElseGet(() -> {
            MasterVehicleType entity = StandardVehicleType.findByCode(code)
                .map(StandardVehicleType::toMasterEntity)
                .orElseThrow(() -> new OperationException(HttpStatus.BAD_REQUEST,
                    "Código de tipo de vehículo no válido: " + code + ". Use uno de los tipos estándar."));
            entity.setCreatedAt(OffsetDateTime.now());
            entity.setUpdatedAt(OffsetDateTime.now());
            return masterRepository.save(entity);
        });
    }

    private VehicleTypeResponse toCompanyResponse(CompanyVehicleType cvType) {
        MasterVehicleType master = masterRepository.findById(cvType.getVehicleTypeId())
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

    private void evictCache(UUID companyId) {
        if (companyId != null) {
            var cache = cacheManager.getCache(VEHICLE_TYPES_COMPANY);
            if (cache != null) {
                cache.evict(companyId);
            }
        }
    }
}
