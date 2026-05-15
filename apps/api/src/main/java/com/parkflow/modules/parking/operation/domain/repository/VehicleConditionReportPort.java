package com.parkflow.modules.parking.operation.domain.repository;

import com.parkflow.modules.parking.operation.domain.ConditionStage;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.VehicleConditionReport;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VehicleConditionReportPort {
  Optional<VehicleConditionReport> findFirstBySessionAndStageOrderByCreatedAtAsc(ParkingSession session, ConditionStage stage);
  Optional<VehicleConditionReport> findFirstBySessionAndStageOrderByCreatedAtDesc(ParkingSession session, ConditionStage stage);
  List<VehicleConditionReport> findEntryAndExitReports(ParkingSession session);
  VehicleConditionReport save(VehicleConditionReport report);
  Optional<VehicleConditionReport> findById(UUID id);
}
