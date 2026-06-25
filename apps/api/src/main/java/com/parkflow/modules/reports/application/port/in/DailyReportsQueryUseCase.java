package com.parkflow.modules.reports.application.port.in;

import com.parkflow.modules.reports.dto.*;
import java.time.LocalDate;
import java.util.List;

/**
 * Use case for querying daily operational reports.
 * Handles reports for operations, occupancy, by operator, and by payment method.
 * Single responsibility: Daily operational insights.
 */
public interface DailyReportsQueryUseCase {
    List<DailyOpsRow> dailyOperations(LocalDate from, LocalDate to);
    List<VehicleTypeRow> vehicleTypeSnapshot();
    OccupancyResponse occupancy();
    List<OperatorRow> byOperator(LocalDate from, LocalDate to);
    List<PaymentMethodRow> byPaymentMethod(LocalDate from, LocalDate to);
}
