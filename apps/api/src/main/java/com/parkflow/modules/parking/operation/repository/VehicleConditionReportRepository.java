package com.parkflow.modules.parking.operation.repository;

import com.parkflow.modules.parking.operation.domain.ConditionStage;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.VehicleConditionReport;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VehicleConditionReportRepository extends JpaRepository<VehicleConditionReport, UUID> {
  Optional<VehicleConditionReport> findFirstBySessionAndStageOrderByCreatedAtAsc(
	  ParkingSession session, ConditionStage stage);

  Optional<VehicleConditionReport> findFirstBySessionAndStageOrderByCreatedAtDesc(
	  ParkingSession session, ConditionStage stage);
}
