package com.parkflow.modules.reports.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.parkflow.config.BaseIntegrationTest;
import com.parkflow.modules.cash.dto.CashSummaryResponse;
import com.parkflow.modules.reports.application.service.ReportQueryService;
import com.parkflow.modules.reports.dto.DailyOpsRow;
import com.parkflow.modules.reports.dto.IncomeExpenseResponse;
import com.parkflow.modules.reports.dto.OccupancyResponse;
import com.parkflow.modules.reports.dto.OperatorRow;
import com.parkflow.modules.reports.dto.PaymentMethodRow;
import com.parkflow.modules.reports.dto.VehicleTypeRow;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.PageImpl;
import org.springframework.security.test.context.support.WithMockUser;

@DisplayName("ReportController Integration Tests")
class ReportControllerIntegrationTest extends BaseIntegrationTest {

  @MockBean
  private ReportQueryService reportQueryService;

  @Test
  @WithMockUser(authorities = "reportes:leer")
  void dailyOperations_ShouldReturnList() throws Exception {
    when(reportQueryService.dailyOperations(any(LocalDate.class), any(LocalDate.class)))
        .thenReturn(List.of(new DailyOpsRow("2023-01-01", 10L, 5L, 5L, BigDecimal.TEN, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO)));

    mockMvc.perform(get("/api/v1/reports/daily-operations")
            .param("dateFrom", LocalDate.now().toString())
            .param("dateTo", LocalDate.now().toString()))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(authorities = "reportes:leer")
  void cashSessionHistory_ShouldReturnPage() throws Exception {
    when(reportQueryService.cashSessionHistory(any(), any(), any()))
        .thenReturn(new PageImpl<>(List.of()));

    mockMvc.perform(get("/api/v1/reports/cash-session-history")
            .param("dateFrom", LocalDate.now().toString())
            .param("dateTo", LocalDate.now().toString()))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(authorities = "reportes:leer")
  void cashSessionSummary_ShouldReturnSummary() throws Exception {
    UUID sessionId = UUID.randomUUID();
    when(reportQueryService.cashSessionSummary(sessionId))
        .thenReturn(new CashSummaryResponse(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, Map.of(), Map.of(), 0L));

    mockMvc.perform(get("/api/v1/reports/cash-session-summary")
            .param("sessionId", sessionId.toString()))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(authorities = "reportes:leer")
  void vehicleType_ShouldReturnList() throws Exception {
    when(reportQueryService.vehicleTypeSnapshot())
        .thenReturn(List.of(new VehicleTypeRow("CAR", 5L, 5L, 5L, BigDecimal.TEN)));

    mockMvc.perform(get("/api/v1/reports/vehicle-type"))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(authorities = "reportes:leer")
  void paidTickets_ShouldReturnPage() throws Exception {
    when(reportQueryService.paidTickets(any(), any(), any()))
        .thenReturn(new PageImpl<>(List.of()));

    mockMvc.perform(get("/api/v1/reports/paid-tickets")
            .param("dateFrom", LocalDate.now().toString())
            .param("dateTo", LocalDate.now().toString()))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(authorities = "reportes:leer")
  void voidedTickets_ShouldReturnList() throws Exception {
    when(reportQueryService.voidedTickets(any(), any()))
        .thenReturn(List.of());

    mockMvc.perform(get("/api/v1/reports/voided-tickets")
            .param("dateFrom", LocalDate.now().toString())
            .param("dateTo", LocalDate.now().toString()))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(authorities = "reportes:leer")
  void incomeExpense_ShouldReturnResponse() throws Exception {
    when(reportQueryService.incomeExpense(any(), any()))
        .thenReturn(new IncomeExpenseResponse(BigDecimal.TEN, BigDecimal.ONE, BigDecimal.ZERO, List.of()));

    mockMvc.perform(get("/api/v1/reports/income-expense")
            .param("dateFrom", LocalDate.now().toString())
            .param("dateTo", LocalDate.now().toString()))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(authorities = "reportes:leer")
  void occupancy_ShouldReturnResponse() throws Exception {
    when(reportQueryService.occupancy())
        .thenReturn(new OccupancyResponse(100L, 50L, 50L, 0.5, List.of()));

    mockMvc.perform(get("/api/v1/reports/occupancy"))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(authorities = "reportes:leer")
  void byOperator_ShouldReturnList() throws Exception {
    when(reportQueryService.byOperator(any(), any()))
        .thenReturn(List.of(new OperatorRow(UUID.randomUUID(), "Admin", 5L, BigDecimal.TEN, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO)));

    mockMvc.perform(get("/api/v1/reports/by-operator")
            .param("dateFrom", LocalDate.now().toString())
            .param("dateTo", LocalDate.now().toString()))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(authorities = "reportes:leer")
  void byPaymentMethod_ShouldReturnList() throws Exception {
    when(reportQueryService.byPaymentMethod(any(), any()))
        .thenReturn(List.of(new PaymentMethodRow("CASH", "CASH", 5L, BigDecimal.TEN, 1.0)));

    mockMvc.perform(get("/api/v1/reports/by-payment-method")
            .param("dateFrom", LocalDate.now().toString())
            .param("dateTo", LocalDate.now().toString()))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(authorities = "reportes:leer")
  void validateDateRange_ShouldThrowExceptionIfFromAfterTo() throws Exception {
    mockMvc.perform(get("/api/v1/reports/daily-operations")
            .param("dateFrom", LocalDate.now().plusDays(1).toString())
            .param("dateTo", LocalDate.now().toString()))
        .andExpect(status().isBadRequest());
  }

  @Test
  @WithMockUser(authorities = "reportes:leer")
  void validateDateRange_ShouldThrowExceptionIfRangeTooLarge() throws Exception {
    mockMvc.perform(get("/api/v1/reports/daily-operations")
            .param("dateFrom", LocalDate.now().minusDays(400).toString())
            .param("dateTo", LocalDate.now().toString()))
        .andExpect(status().isBadRequest());
  }
}
