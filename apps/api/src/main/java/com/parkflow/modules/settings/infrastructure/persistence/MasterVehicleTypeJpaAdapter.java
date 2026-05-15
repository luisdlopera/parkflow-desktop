package com.parkflow.modules.settings.infrastructure.persistence;

import com.parkflow.modules.settings.domain.MasterVehicleType;
import com.parkflow.modules.settings.domain.repository.MasterVehicleTypePort;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class MasterVehicleTypeJpaAdapter implements MasterVehicleTypePort {

    private final MasterVehicleTypeJpaRepository jpaRepository;

    @Override
    public List<MasterVehicleType> findAllByOrderByDisplayOrderAscNameAsc() {
        return jpaRepository.findAllByOrderByDisplayOrderAscNameAsc();
    }

    @Override
    public Optional<MasterVehicleType> findByCode(String code) {
        return jpaRepository.findByCode(code);
    }

    @Override
    public Optional<MasterVehicleType> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public MasterVehicleType save(MasterVehicleType type) {
        return jpaRepository.save(type);
    }

    @Override
    public void delete(MasterVehicleType type) {
        jpaRepository.delete(type);
    }

    @Repository
    interface MasterVehicleTypeJpaRepository extends JpaRepository<MasterVehicleType, UUID> {
        List<MasterVehicleType> findAllByOrderByDisplayOrderAscNameAsc();
        Optional<MasterVehicleType> findByCode(String code);
    }
}
