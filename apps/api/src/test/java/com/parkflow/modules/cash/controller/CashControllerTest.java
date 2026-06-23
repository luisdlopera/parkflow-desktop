package com.parkflow.modules.cash.controller;

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
import com.parkflow.modules.cash.dto.CashCloseRequest;
import com.parkflow.modules.cash.dto.CashCountRequest;
import com.parkflow.modules.cash.dto.CashPolicyResponse;
import com.parkflow.modules.cash.dto.CashSessionResponse;
import com.parkflow.modules.cash.dto.OpenCashRequest;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc(addFilters = false)
class CashControllerTest extends BaseIntegrationTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;

  @MockBean private CashConfigurationUseCase cashConfigurationUseCase;
  @MockBean private com.parkflow.modules.cash.application.service.CashSessionManagementService cashSessionManagementService;

  @Test
  @WithMockUser(authorities = "cierres_caja:abrir")
  void policy_ShouldReturnPolicy() throws Exception {
    CashPolicyResponse response = new CashPolicyResponse(true, false, BigDecimal.ZERO, "hint", "SiteA");
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

    when(cashSessionManagementService.open(any(OpenCashRequest.class))).thenReturn(response);

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

    when(cashSessionManagementService.getCurrent("SiteA", "Term1")).thenReturn(response);

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

    when(cashSessionManagementService.getSession(id)).thenReturn(response);

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

    when(cashSessionManagementService.submitCount(eq(id), any(CashCountRequest.class))).thenReturn(response);

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

    when(cashSessionManagementService.close(eq(id), any(CashCloseRequest.class))).thenReturn(response);

    mockMvc.perform(post("/api/v1/cash/sessions/{id}/close", id)
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("CLOSED"));
  }
}
