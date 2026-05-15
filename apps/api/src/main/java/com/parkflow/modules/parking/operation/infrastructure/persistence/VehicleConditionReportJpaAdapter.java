package com.parkflow.modules.parking.operation.infrastructure.persistence;

import com.parkflow.modules.parking.operation.domain.ConditionStage;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.VehicleConditionReport;
import com.parkflow.modules.parking.operation.domain.repository.VehicleConditionReportPort;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class VehicleConditionReportJpaAdapter implements VehicleConditionReportPort {

  private final VehicleConditionReportJpaRepository jpaRepository;

  @Override
  public Optional<VehicleConditionReport> findFirstBySessionAndStageOrderByCreatedAtAsc(ParkingSession session, ConditionStage stage) {
    return jpaRepository.findFirstBySessionAndStageOrderByCreatedAtAsc(session, stage);
  }

  @Override
  public Optional<VehicleConditionReport> findFirstBySessionAndStageOrderByCreatedAtDesc(ParkingSession session, ConditionStage stage) {
    return jpaRepository.findFirstBySessionAndStageOrderByCreatedAtDesc(session, stage);
  }

  @Override
  public List<VehicleConditionReport> findEntryAndExitReports(ParkingSession session) {
    return jpaRepository.findEntryAndExitReports(session);
  }

  @Override
  public VehicleConditionReport save(VehicleConditionReport report) {
    return jpaRepository.save(report);
  }

  @Override
  public Optional<VehicleConditionReport> findById(UUID id) {
    return jpaRepository.findById(id);
  }

  @Repository
  interface VehicleConditionReportJpaRepository extends JpaRepository<VehicleConditionReport, UUID> {
    Optional<VehicleConditionReport> findFirstBySessionAndStageOrderByCreatedAtAsc(ParkingSession session, ConditionStage stage);

    Optional<VehicleConditionReport> findFirstBySessionAndStageOrderByCreatedAtDesc(ParkingSession session, ConditionStage stage);

    @Query("SELECT r FROM VehicleConditionReport r "
        + "WHERE r.session = :session "
        + "AND r.stage IN (com.parkflow.modules.parking.operation.domain.ConditionStage.ENTRY, "
        + "               com.parkflow.modules.parking.operation.domain.ConditionStage.EXIT) "
        + "ORDER BY r.stage ASC, r.createdAt ASC")
    List<VehicleConditionReport> findEntryAndExitReports(@Param("session") ParkingSession session);
  }
}
