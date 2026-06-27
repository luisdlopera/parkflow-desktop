package com.parkflow.modules.parking.spaces.infrastructure.persistence;

import com.parkflow.modules.parking.spaces.application.port.out.ParkingSpaceAssignmentRepositoryPort;
import com.parkflow.modules.parking.spaces.domain.ParkingSpaceAssignment;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ParkingSpaceAssignmentRepositoryAdapter implements ParkingSpaceAssignmentRepositoryPort {
    private final ParkingSpaceAssignmentRepository repository;

    @Override
    public ParkingSpaceAssignment save(ParkingSpaceAssignment assignment) {
        return repository.save(assignment);
    }

    @Override
    public Optional<ParkingSpaceAssignment> findActiveByParkingSessionId(UUID sessionId) {
        return repository.findActiveByParkingSessionId(sessionId);
    }

    @Override
    public Optional<ParkingSpaceAssignment> findLatestByParkingSessionId(UUID sessionId) {
        return repository.findLatestByParkingSessionId(sessionId);
    }

    @Override
    public Optional<ParkingSpaceAssignment> findActiveByParkingSpaceId(UUID parkingSpaceId) {
        return repository.findActiveByParkingSpaceId(parkingSpaceId);
    }

    @Override
    public boolean existsByParkingSpace_IdAndReleasedAtIsNull(UUID parkingSpaceId) {
        return repository.existsByParkingSpace_IdAndReleasedAtIsNull(parkingSpaceId);
    }

    @Override
    public boolean existsByParkingSpace_Id(UUID parkingSpaceId) {
        return repository.existsByParkingSpace_Id(parkingSpaceId);
    }

    @Override
    public long countByCompanyIdAndReleasedAtIsNull(UUID companyId) {
        return repository.countByCompanyIdAndReleasedAtIsNull(companyId);
    }

    @Override
    public void delete(ParkingSpaceAssignment assignment) {
        repository.delete(assignment);
    }
}
