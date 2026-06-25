package com.parkflow.modules.cash.infrastructure.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.config.BaseIntegrationTest;
import com.parkflow.modules.cash.application.port.in.CashConfigurationUseCase;
import com.parkflow.modules.cash.application.port.in.CashSessionManagementUseCase;
import com.parkflow.modules.cash.application.port.in.CashSessionQueryUseCase;
import com.parkflow.modules.cash.application.port.in.CashSessionAuditUseCase;
import com.parkflow.modules.cash.dto.CashCloseRequest;
import com.parkflow.modules.cash.dto.CashCountRequest;
import com.parkflow.modules.cash.dto.CashPolicyResponse;
import com.parkflow.modules.cash.dto.CashSessionResponse;
import com.parkflow.modules.cash.dto.OpenCashRequest;
import com.parkflow.modules.common.exception.OperationException;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc(addFilters = false)
class CashControllerTest extends BaseIntegrationTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;

  @MockBean private CashSessionManagementUseCase cashSessionManagementUseCase;
  @MockBean private CashSessionQueryUseCase cashSessionQueryUseCase;
  @MockBean private CashSessionAuditUseCase cashSessionAuditUseCase;
  @MockBean private CashConfigurationUseCase cashConfigurationUseCase;

  // ============= HAPPY PATH TESTS =============

  @Test
  @WithMockUser(authorities = "cierres_caja:abrir")
  void policy_ShouldReturnPolicy() throws Exception {
    CashPolicyResponse response = new CashPolicyResponse(true, false, BigDecimal.ZERO, "hint", "SiteA", true, false, new BigDecimal("2000.00"), true);
    when(cashConfigurationUseCase.getPolicy("SiteA")).thenReturn(response);

    mockMvc.perform(get("/api/v1/cash/policy").param("site", "SiteA"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.requireOpenForPayment").value(true));
  }

  @Test
  @WithMockUser(authorities = "cierres_caja:abrir")
  void open_ShouldReturnCreatedSession() throws Exception {
    OpenCashRequest request = new OpenCashRequest("SiteA", "Term1", "Label", BigDecimal.TEN, UUID.randomUUID(), "key", "Notes");
    CashSessionResponse response = new CashSessionResponse(
        UUID.randomUUID(), null, UUID.randomUUID(), "Operator", "OPEN",
        BigDecimal.TEN, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null
    );

    when(cashSessionManagementUseCase.open(any(OpenCashRequest.class))).thenReturn(response);

    mockMvc.perform(post("/api/v1/cash/open")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.id").value(response.id().toString()))
        .andExpect(jsonPath("$.status").value("OPEN"));
  }

  @Test
  @WithMockUser(authorities = "cierres_caja:abrir")
  void current_ShouldReturnCurrentSession() throws Exception {
    CashSessionResponse response = new CashSessionResponse(
        UUID.randomUUID(), null, UUID.randomUUID(), "Operator", "OPEN",
        BigDecimal.TEN, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null
    );

    when(cashSessionQueryUseCase.getCurrent("SiteA", "Term1")).thenReturn(response);

    mockMvc.perform(get("/api/v1/cash/current")
            .param("site", "SiteA")
            .param("terminal", "Term1"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(response.id().toString()));
  }

  @Test
  @WithMockUser(authorities = "cierres_caja:abrir")
  void session_ShouldReturnSessionById() throws Exception {
    UUID id = UUID.randomUUID();
    CashSessionResponse response = new CashSessionResponse(
        id, null, UUID.randomUUID(), "Operator", "OPEN",
        BigDecimal.TEN, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null
    );

    when(cashSessionQueryUseCase.getSession(id)).thenReturn(response);

    mockMvc.perform(get("/api/v1/cash/sessions/{id}", id))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(id.toString()));
  }

  @Test
  @WithMockUser(authorities = "cierres_caja:cerrar")
  void count_ShouldReturnSession() throws Exception {
    UUID id = UUID.randomUUID();
    CashCountRequest request = new CashCountRequest(BigDecimal.TEN, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, "Notes", null);
    CashSessionResponse response = new CashSessionResponse(
        id, null, UUID.randomUUID(), "Operator", "OPEN",
        BigDecimal.TEN, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null
    );

    when(cashSessionManagementUseCase.submitCount(eq(id), any(CashCountRequest.class))).thenReturn(response);

    mockMvc.perform(post("/api/v1/cash/sessions/{id}/count", id)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value(id.toString()));
  }

  @Test
  @WithMockUser(authorities = "cierres_caja:cerrar")
  void close_ShouldReturnSession() throws Exception {
    UUID id = UUID.randomUUID();
    CashCloseRequest request = new CashCloseRequest("Notes", "Witness", null);
    CashSessionResponse response = new CashSessionResponse(
        id, null, UUID.randomUUID(), "Operator", "CLOSED",
        BigDecimal.TEN, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null
    );

    when(cashSessionManagementUseCase.close(eq(id), any(CashCloseRequest.class))).thenReturn(response);

    mockMvc.perform(post("/api/v1/cash/sessions/{id}/close", id)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("CLOSED"));
  }

  // ============= ERROR CASES: 404 NOT_FOUND =============

  @Test
  @WithMockUser(authorities = "cierres_caja:abrir")
  void session_ThrowsNotFound_WhenSessionDoesNotExist() throws Exception {
    UUID id = UUID.randomUUID();
    when(cashSessionQueryUseCase.getSession(id))
        .thenThrow(new OperationException(HttpStatus.NOT_FOUND, "Sesion de caja no encontrada"));

    mockMvc.perform(get("/api/v1/cash/sessions/{id}", id))
        .andExpect(status().isNotFound());
  }

  @Test
  @WithMockUser(authorities = "cierres_caja:abrir")
  void current_ThrowsNotFound_WhenNoOpenSessionForTerminal() throws Exception {
    when(cashSessionQueryUseCase.getCurrent("SiteA", "Term1"))
        .thenThrow(new OperationException(HttpStatus.NOT_FOUND, "No hay caja abierta"));

    mockMvc.perform(get("/api/v1/cash/current")
            .param("site", "SiteA")
            .param("terminal", "Term1"))
        .andExpect(status().isNotFound());
  }

  @Test
  @WithMockUser(authorities = "cierres_caja:cerrar")
  void count_ThrowsNotFound_WhenSessionDoesNotExist() throws Exception {
    UUID id = UUID.randomUUID();
    CashCountRequest request = new CashCountRequest(BigDecimal.TEN, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, "Notes", null);

    when(cashSessionManagementUseCase.submitCount(eq(id), any(CashCountRequest.class)))
        .thenThrow(new OperationException(HttpStatus.NOT_FOUND, "Sesion de caja no encontrada"));

    mockMvc.perform(post("/api/v1/cash/sessions/{id}/count", id)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isNotFound());
  }

  @Test
  @WithMockUser(authorities = "cierres_caja:cerrar")
  void close_ThrowsNotFound_WhenSessionDoesNotExist() throws Exception {
    UUID id = UUID.randomUUID();
    CashCloseRequest request = new CashCloseRequest("Notes", "Witness", null);

    when(cashSessionManagementUseCase.close(eq(id), any(CashCloseRequest.class)))
        .thenThrow(new OperationException(HttpStatus.NOT_FOUND, "Sesion de caja no encontrada"));

    mockMvc.perform(post("/api/v1/cash/sessions/{id}/close", id)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isNotFound());
  }

  // ============= ERROR CASES: 409 CONFLICT =============

  @Test
  @WithMockUser(authorities = "cierres_caja:abrir")
  void open_ThrowsConflict_WhenSessionAlreadyOpen() throws Exception {
    OpenCashRequest request = new OpenCashRequest("SiteA", "Term1", "Label", BigDecimal.TEN, UUID.randomUUID(), "key", "Notes");

    when(cashSessionManagementUseCase.open(any(OpenCashRequest.class)))
        .thenThrow(new OperationException(HttpStatus.CONFLICT, "La sede ya tiene una caja abierta"));

    mockMvc.perform(post("/api/v1/cash/open")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isConflict());
  }

  @Test
  @WithMockUser(authorities = "cierres_caja:cerrar")
  void count_ThrowsConflict_WhenSessionNotArqueado() throws Exception {
    UUID id = UUID.randomUUID();
    CashCountRequest request = new CashCountRequest(BigDecimal.TEN, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, "Notes", null);

    when(cashSessionManagementUseCase.submitCount(eq(id), any(CashCountRequest.class)))
        .thenThrow(new OperationException(HttpStatus.CONFLICT, "La sesion de caja ya esta cerrada"));

    mockMvc.perform(post("/api/v1/cash/sessions/{id}/count", id)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isConflict());
  }

  @Test
  @WithMockUser(authorities = "cierres_caja:cerrar")
  void close_ThrowsConflict_WhenActivVehiclesPresent() throws Exception {
    UUID id = UUID.randomUUID();
    CashCloseRequest request = new CashCloseRequest("Notes", "Witness", null);

    when(cashSessionManagementUseCase.close(eq(id), any(CashCloseRequest.class)))
        .thenThrow(new OperationException(HttpStatus.CONFLICT, "No se puede cerrar el turno: 3 vehículo(s) activo(s) dentro"));

    mockMvc.perform(post("/api/v1/cash/sessions/{id}/close", id)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isConflict());
  }

  // ============= ERROR CASES: 400 BAD_REQUEST =============

  @Test
  @WithMockUser(authorities = "cierres_caja:abrir")
  void open_ThrowsBadRequest_WhenAmountNegative() throws Exception {
    OpenCashRequest request = new OpenCashRequest("SiteA", "Term1", "Label", new BigDecimal("-10"), UUID.randomUUID(), "key", "Notes");

    when(cashSessionManagementUseCase.open(any(OpenCashRequest.class)))
        .thenThrow(new OperationException(HttpStatus.BAD_REQUEST, "El monto de apertura no puede ser negativo"));

    mockMvc.perform(post("/api/v1/cash/open")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isBadRequest());
  }

  @Test
  @WithMockUser(authorities = "cierres_caja:cerrar")
  void count_ThrowsBadRequest_WhenDenominationsEmpty() throws Exception {
    UUID id = UUID.randomUUID();
    CashCountRequest request = new CashCountRequest(BigDecimal.TEN, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, "Notes", null);

    when(cashSessionManagementUseCase.submitCount(eq(id), any(CashCountRequest.class)))
        .thenThrow(new OperationException(HttpStatus.BAD_REQUEST, "At least one denomination required"));

    mockMvc.perform(post("/api/v1/cash/sessions/{id}/count", id)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isBadRequest());
  }

  @Test
  @WithMockUser(authorities = "cierres_caja:cerrar")
  void close_ThrowsBadRequest_WhenNotCountedYet() throws Exception {
    UUID id = UUID.randomUUID();
    CashCloseRequest request = new CashCloseRequest("Notes", "Witness", null);

    when(cashSessionManagementUseCase.close(eq(id), any(CashCloseRequest.class)))
        .thenThrow(new OperationException(HttpStatus.BAD_REQUEST, "Debe registrar arqueo antes de cerrar"));

    mockMvc.perform(post("/api/v1/cash/sessions/{id}/close", id)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isBadRequest());
  }

  @Test
  @WithMockUser(authorities = "cierres_caja:cerrar")
  void close_ThrowsBadRequest_WhenDiffAndNoNotes() throws Exception {
    UUID id = UUID.randomUUID();
    CashCloseRequest request = new CashCloseRequest(null, "Witness", null);

    when(cashSessionManagementUseCase.close(eq(id), any(CashCloseRequest.class)))
        .thenThrow(new OperationException(HttpStatus.BAD_REQUEST, "Hay diferencia; observacion de cierre obligatoria"));

    mockMvc.perform(post("/api/v1/cash/sessions/{id}/close", id)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isBadRequest());
  }

  // ============= ERROR CASES: 403 FORBIDDEN =============

  @Test
  @WithMockUser(authorities = "cierres_caja:abrir")
  void open_ThrowsForbidden_WhenOperatorInactive() throws Exception {
    OpenCashRequest request = new OpenCashRequest("SiteA", "Term1", "Label", BigDecimal.TEN, UUID.randomUUID(), "key", "Notes");

    when(cashSessionManagementUseCase.open(any(OpenCashRequest.class)))
        .thenThrow(new OperationException(HttpStatus.FORBIDDEN, "Operador inactivo"));

    mockMvc.perform(post("/api/v1/cash/open")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isForbidden());
  }

  @Test
  @WithMockUser(authorities = "cierres_caja:cerrar")
  void close_ThrowsForbidden_WhenDiscrepancyExceedsTolerance() throws Exception {
    UUID id = UUID.randomUUID();
    CashCloseRequest request = new CashCloseRequest("Notes", "Witness", null);

    when(cashSessionManagementUseCase.close(eq(id), any(CashCloseRequest.class)))
        .thenThrow(new OperationException(HttpStatus.FORBIDDEN, "Descuadre supera tolerancia máxima. Requiere autorización"));

    mockMvc.perform(post("/api/v1/cash/sessions/{id}/close", id)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isForbidden());
  }
}
