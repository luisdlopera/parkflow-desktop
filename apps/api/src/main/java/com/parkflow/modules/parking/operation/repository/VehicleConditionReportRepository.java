package com.parkflow.modules.parking.operation.repository;

import com.parkflow.modules.parking.operation.domain.ConditionStage;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.VehicleConditionReport;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VehicleConditionReportRepository extends JpaRepository<VehicleConditionReport, UUID> {
  Optional<VehicleConditionReport> findFirstBySessionAndStageOrderByCreatedAtAsc(
	  ParkingSession session, ConditionStage stage);

  Optional<VehicleConditionReport> findFirstBySessionAndStageOrderByCreatedAtDesc(
	  ParkingSession session, ConditionStage stage);

  /**
   * PERFORMANCE: Fetch both entry and exit reports in a single query.
   * Client code filters for earliest entry and latest exit.
   */
  @Query("SELECT r FROM VehicleConditionReport r "
      + "WHERE r.session = :session "
      + "AND r.stage IN (com.parkflow.modules.parking.operation.domain.ConditionStage.ENTRY, "
      + "               com.parkflow.modules.parking.operation.domain.ConditionStage.EXIT) "
      + "ORDER BY r.stage ASC, r.createdAt ASC")
  List<VehicleConditionReport> findEntryAndExitReports(@Param("session") ParkingSession session);
}
