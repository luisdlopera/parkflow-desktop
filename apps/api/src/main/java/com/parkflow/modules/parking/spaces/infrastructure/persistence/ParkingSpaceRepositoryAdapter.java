package com.parkflow.modules.parking.spaces.infrastructure.persistence;

import com.parkflow.modules.parking.spaces.application.port.out.ParkingSpaceRepositoryPort;
import com.parkflow.modules.parking.spaces.domain.ParkingSpace;
import com.parkflow.modules.parking.spaces.domain.ParkingSpaceStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ParkingSpaceRepositoryAdapter implements ParkingSpaceRepositoryPort {
    private final ParkingSpaceRepository repository;

    @Override
    public ParkingSpace save(ParkingSpace parkingSpace) {
        return repository.save(parkingSpace);
    }

    @Override
    public List<ParkingSpace> findByCompanyIdOrderBySortOrderAscCodeAsc(UUID companyId) {
        return repository.findByCompanyIdOrderBySortOrderAscCodeAsc(companyId);
    }

    @Override
    public long countByCompanyId(UUID companyId) {
        return repository.countByCompanyId(companyId);
    }

    @Override
    public long countByCompanyIdAndStatus(UUID companyId, ParkingSpaceStatus status) {
        return repository.countByCompanyIdAndStatus(companyId, status);
    }

    @Override
    public Optional<ParkingSpace> findByIdAndCompanyId(UUID id, UUID companyId) {
        return repository.findByIdAndCompanyId(id, companyId);
    }

    @Override
    public Optional<ParkingSpace> findByIdAndCompanyIdForUpdate(UUID id, UUID companyId) {
        return repository.findByIdAndCompanyIdForUpdate(id, companyId);
    }

    @Override
    public Optional<ParkingSpace> findFirstAvailableForUpdate(UUID companyId) {
        return repository.findFirstAvailableForUpdate(companyId);
    }

    @Override
    public List<ParkingSpace> findByIdIn(List<UUID> ids) {
        return repository.findAllById(ids);
    }

    @Override
    public List<ParkingSpace> findAllByCompanyId(UUID companyId) {
        return repository.findByCompanyIdOrderBySortOrderAscCodeAsc(companyId); // Fallback to ordered
    }

    @Override
    public List<ParkingSpace> findAll() {
        return repository.findAll();
    }

    @Override
    public Optional<ParkingSpace> findById(UUID id) {
        return repository.findById(id);
    }

    @Override
    public void delete(ParkingSpace parkingSpace) {
        repository.delete(parkingSpace);
    }
}
