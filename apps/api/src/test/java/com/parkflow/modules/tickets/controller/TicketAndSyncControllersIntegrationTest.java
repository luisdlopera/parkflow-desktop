package com.parkflow.modules.tickets.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.parkflow.config.BaseIntegrationTest;
import com.parkflow.modules.sync.application.service.SyncService;
import com.parkflow.modules.tickets.application.service.PrintJobService;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;

@DisplayName("Ticket and Sync Controllers Integration Tests")
class TicketAndSyncControllersIntegrationTest extends BaseIntegrationTest {

  @MockBean private PrintJobService ticketPrintUseCase;
  @MockBean private SyncService syncUseCase;

  // --- PrintJobController ---

  @Test
  @WithMockUser(authorities = "tickets:imprimir")
  void createPrintJob_ShouldReturnCreated() throws Exception {
    when(ticketPrintUseCase.create(any())).thenReturn(null);

    String json = "{"
        + "\"sessionId\": \"" + UUID.randomUUID() + "\","
        + "\"companyId\": \"" + UUID.randomUUID() + "\","
        + "\"operatorUserId\": \"" + UUID.randomUUID() + "\","
        + "\"documentType\": \"ENTRY\","
        + "\"idempotencyKey\": \"key\","
        + "\"payloadHash\": \"hash\""
        + "}";

    mockMvc.perform(post("/api/v1/print-jobs")
            .contentType(MediaType.APPLICATION_JSON)
            .content(json))
        .andExpect(status().isCreated());
  }

  @Test
  @WithMockUser(authorities = "tickets:imprimir")
  void updatePrintJobStatus_ShouldReturnOk() throws Exception {
    when(ticketPrintUseCase.updateStatus(any(), any())).thenReturn(null);

    String json = "{\"idempotencyKey\": \"key\", \"status\": \"ACKED\"}";

    mockMvc.perform(patch("/api/v1/print-jobs/" + UUID.randomUUID() + "/status")
            .contentType(MediaType.APPLICATION_JSON)
            .content(json))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(authorities = "tickets:imprimir")
  void retryPrintJob_ShouldReturnOk() throws Exception {
    when(ticketPrintUseCase.retry(any(), any())).thenReturn(null);

    String json = "{\"idempotencyKey\": \"key\"}";

    mockMvc.perform(post("/api/v1/print-jobs/" + UUID.randomUUID() + "/retry")
            .contentType(MediaType.APPLICATION_JSON)
            .content(json))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(authorities = "tickets:imprimir")
  void getPrintJob_ShouldReturnOk() throws Exception {
    when(ticketPrintUseCase.get(any())).thenReturn(null);

    mockMvc.perform(get("/api/v1/print-jobs/" + UUID.randomUUID()))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(authorities = "tickets:imprimir")
  void listPrintJobs_ShouldReturnOk() throws Exception {
    when(ticketPrintUseCase.listBySession(any())).thenReturn(List.of());

    mockMvc.perform(get("/api/v1/print-jobs")
            .param("sessionId", UUID.randomUUID().toString()))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(authorities = "tickets:imprimir")
  void listPrintJobsByTicket_ShouldReturnOk() throws Exception {
    when(ticketPrintUseCase.listByTicket(any())).thenReturn(List.of());

    mockMvc.perform(get("/api/v1/print-jobs")
            .param("ticketNumber", "123"))
        .andExpect(status().isOk());
  }

  // --- SyncController ---

  @Test
  @WithMockUser(authorities = "sync:push")
  void syncPush_ShouldReturnOk() throws Exception {
    when(syncUseCase.push(any())).thenReturn(null);

    String json = "{"
        + "\"idempotencyKey\": \"key\","
        + "\"eventType\": \"TICKET_CREATED\","
        + "\"aggregateId\": \"123\","
        + "\"payloadJson\": \"{}\""
        + "}";

    mockMvc.perform(post("/api/v1/sync/push")
            .contentType(MediaType.APPLICATION_JSON)
            .content(json))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(authorities = "sync:push")
  void syncPull_ShouldReturnOk() throws Exception {
    when(syncUseCase.pull(any(), any(Integer.class))).thenReturn(List.of());

    mockMvc.perform(get("/api/v1/sync/pull"))
        .andExpect(status().isOk());
  }

  @Test
  @WithMockUser(authorities = "sync:reconcile")
  void syncReconcile_ShouldReturnOk() throws Exception {
    when(syncUseCase.reconcile(any())).thenReturn(List.of());

    String json = "{\"eventIds\": [\"" + UUID.randomUUID() + "\"]}";

    mockMvc.perform(post("/api/v1/sync/reconcile")
            .contentType(MediaType.APPLICATION_JSON)
            .content(json))
        .andExpect(status().isOk());
  }
}
