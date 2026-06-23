package com.parkflow.modules.parking.operation.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.parkflow.modules.parking.operation.application.port.in.*;
import com.parkflow.modules.parking.operation.dto.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import com.parkflow.modules.parking.operation.domain.repository.SessionEventPort;
import com.parkflow.modules.parking.operation.domain.SessionEvent;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import com.parkflow.modules.auth.security.AuthPrincipal;

@ExtendWith(MockitoExtension.class)
class OperationControllerTest {

    private MockMvc mockMvc;

    @Mock private RegisterEntryUseCase registerEntryUseCase;
    @Mock private RegisterExitUseCase registerExitUseCase;
    @Mock private ReprintTicketUseCase reprintTicketUseCase;
    @Mock private ProcessLostTicketUseCase processLostTicketUseCase;
    @Mock private VoidSessionUseCase voidSessionUseCase;
    @Mock private FindActiveSessionUseCase findActiveSessionUseCase;
    @Mock private GetTicketUseCase getTicketUseCase;
    @Mock private ListActiveSessionsUseCase listActiveSessionsUseCase;
    @Mock private UpdatePlateUseCase updatePlateUseCase;
    @Mock private BulkExitCalculateUseCase bulkExitCalculateUseCase;
    @Mock private BulkExitProcessUseCase bulkExitProcessUseCase;
    @Mock private MassExitPreviewUseCase massExitPreviewUseCase;
    @Mock private MassExitProcessUseCase massExitProcessUseCase;
    @Mock private SessionEventPort sessionEventPort;
    @Mock private com.parkflow.modules.parking.operation.application.service.SupervisorService supervisorService;

    @InjectMocks private OperationController controller;

    private ObjectMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new com.parkflow.modules.common.exception.GlobalExceptionHandler())
                .build();
                
        AuthPrincipal principal = new AuthPrincipal(
            UUID.randomUUID(), UUID.randomUUID(), "test@test.com", "ADMIN", List.of());
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, List.of()));
        SecurityContextHolder.setContext(context);
    }

    @Test
    void entry() throws Exception {
        String json = """
            {
                "idempotencyKey": "key1",
                "plate": "ABC1234",
                "type": "CAR",
                "countryCode": "CO",
                "entryMode": "VISITOR",
                "operatorUserId": "11111111-1111-1111-1111-111111111111",
                "siteCode": "SITE1",
                "terminalCode": "TERM1"
            }
            """;
        
        OperationResultResponse res = new OperationResultResponse("session1", null, "Success", BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.ZERO);
        when(registerEntryUseCase.execute(any())).thenReturn(res);

        mockMvc.perform(post("/api/v1/operations/entries")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("Success"));
    }

    @Test
    void exit() throws Exception {
        String json = """
            {
                "idempotencyKey": "key2",
                "ticketNumber": "TCK1",
                "operatorUserId": "%s",
                "paymentMethod": "CASH"
            }
            """.formatted(UUID.randomUUID().toString());
            
        OperationResultResponse res = new OperationResultResponse("session1", null, "Success", BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.ZERO);
        when(registerExitUseCase.execute(any())).thenReturn(res);

        mockMvc.perform(post("/api/v1/operations/exits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk());
    }

    @Test
    void lost() throws Exception {
        String json = """
            {
                "idempotencyKey": "key3",
                "ticketNumber": "TCK1",
                "reason": "lost it",
                "operatorUserId": "%s",
                "paymentMethod": "CASH"
            }
            """.formatted(UUID.randomUUID().toString());
            
        OperationResultResponse res = new OperationResultResponse("session1", null, "Success", BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.ZERO);
        when(processLostTicketUseCase.execute(any())).thenReturn(res);

        mockMvc.perform(post("/api/v1/operations/tickets/lost")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk());
    }

    @Test
    void voidTicket() throws Exception {
        String json = """
            {
                "ticketNumber": "TCK1",
                "plate": "ABC1234",
                "reason": "Test void",
                "operatorUserId": "%s",
                "idempotencyKey": "key4"
            }
            """.formatted(UUID.randomUUID().toString());
            
        OperationResultResponse res = new OperationResultResponse("session1", null, "Success", BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.ZERO);
        when(voidSessionUseCase.execute(any())).thenReturn(res);

        mockMvc.perform(post("/api/v1/operations/tickets/void")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk());
    }

    @Test
    void active() throws Exception {
        OperationResultResponse res = new OperationResultResponse("session1", null, "Success", BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.ZERO);
        when(findActiveSessionUseCase.execute(anyString(), eq(null), eq(null))).thenReturn(res);

        mockMvc.perform(get("/api/v1/operations/sessions/active?ticketNumber=TCK1"))
                .andExpect(status().isOk());
    }

    @Test
    void getTicket() throws Exception {
        OperationResultResponse res = new OperationResultResponse("session1", null, "Success", BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.ZERO);
        when(getTicketUseCase.execute(anyString())).thenReturn(res);

        mockMvc.perform(get("/api/v1/operations/tickets/TCK1"))
                .andExpect(status().isOk());
    }

    @Test
    void activeList() throws Exception {
        PaginatedResponse<ReceiptResponse> res = new PaginatedResponse<>(List.of(), new PaginatedResponse.Meta(0, 1, 25, 0));
        when(listActiveSessionsUseCase.execute(anyInt(), anyInt(), eq(null), anyString(), anyString())).thenReturn(res);

        mockMvc.perform(get("/api/v1/operations/sessions/active-list"))
                .andExpect(status().isOk());
    }

    @Test
    void updatePlate() throws Exception {
        String json = """
            {
                "newPlate": "XYZ987",
                "justification": "Typo correction"
            }
            """;
            
        mockMvc.perform(patch("/api/v1/operations/sessions/" + UUID.randomUUID() + "/plate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk());
        verify(updatePlateUseCase).execute(any(), any());
    }

    @Test
    void getReprintHistory() throws Exception {
        SessionEvent event = mock(SessionEvent.class);
        when(event.getMetadata()).thenReturn("{\"reprintNumber\": 2}");
        when(event.getId()).thenReturn(UUID.randomUUID());
        when(event.getCreatedAt()).thenReturn(OffsetDateTime.now());
        when(sessionEventPort.findReprintEventsByTicketNumber(anyString(), any())).thenReturn(List.of(event));
        mockMvc.perform(get("/api/v1/operations/tickets/TCK1/reprints"))
                .andExpect(status().isOk());
    }

    @Test
    void reprintTicket() throws Exception {
        String json = """
            {
                "idempotencyKey": "key_reprint",
                "ticketNumber": "TCK1",
                "operatorUserId": "%s",
                "reason": "Lost ticket physical"
            }
            """.formatted(UUID.randomUUID().toString());
            
        OperationResultResponse res = new OperationResultResponse("session1", null, "Success", BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.ZERO);
        when(reprintTicketUseCase.execute(any())).thenReturn(res);

        mockMvc.perform(post("/api/v1/operations/tickets/reprint")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk());
    }

    @Test
    void calculateBulkExit() throws Exception {
        String json = """
            {
                "locators": ["TCK1", "TCK2"],
                "operatorUserId": "%s"
            }
            """.formatted(UUID.randomUUID().toString());
        BulkExitCalculateResponse res = new BulkExitCalculateResponse(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 0, List.of(), List.of());
        when(bulkExitCalculateUseCase.precalculate(any())).thenReturn(res);
        mockMvc.perform(post("/api/v1/operations/bulk-exits/calculate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk());
    }

    @Test
    void processBulkExit() throws Exception {
        String json = """
            {
                "locators": ["TCK1", "TCK2"],
                "operatorUserId": "%s"
            }
            """.formatted(UUID.randomUUID().toString());
        BulkExitResponse res = new BulkExitResponse(BigDecimal.ZERO, 0, 0, List.of(), List.of());
        when(bulkExitProcessUseCase.process(any())).thenReturn(res);
        mockMvc.perform(post("/api/v1/operations/bulk-exits")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk());
    }

    @Test
    void previewMassExit() throws Exception {
        String json = """
            {
                "chargeMode": "NORMAL",
                "operatorUserId": "11111111-1111-1111-1111-111111111111",
                "customAmount": 100.0,
                "reason": "Event discount"
            }
            """;
        MassExitPreviewResponse res = new MassExitPreviewResponse(0, BigDecimal.ZERO, List.of(), List.of());
        when(massExitPreviewUseCase.preview(any())).thenReturn(res);
        mockMvc.perform(post("/api/v1/operations/mass-exit/calculate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk());
    }

    @Test
    void processMassExit() throws Exception {
        String json = """
            {
                "chargeMode": "NORMAL",
                "operatorUserId": "11111111-1111-1111-1111-111111111111",
                "customAmount": 100.0,
                "reason": "Event discount"
            }
            """;
        MassExitResponse res = new MassExitResponse(0, 0, 0, 0, BigDecimal.ZERO, BigDecimal.ZERO, 0L, "test", List.of());
        when(massExitProcessUseCase.process(any())).thenReturn(res);
        mockMvc.perform(post("/api/v1/operations/mass-exit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk());
    }

    @Test
    void supervisorSummary() throws Exception {
        OperationsSummaryResponse res = new OperationsSummaryResponse(0L, 0L, 0L, 0.0, 0L, 0L, 0L, 0L, 0L, 0L, 0L, OffsetDateTime.now());
        when(supervisorService.buildSummary(any())).thenReturn(res);
        mockMvc.perform(get("/api/v1/operations/supervisor/summary?timeZone=America/Bogota"))
                .andExpect(status().isOk());
    }

    @Test
    void supervisorSummary_noTimeZone() throws Exception {
        OperationsSummaryResponse res = new OperationsSummaryResponse(0L, 0L, 0L, 0.0, 0L, 0L, 0L, 0L, 0L, 0L, 0L, OffsetDateTime.now());
        when(supervisorService.buildSummary(any())).thenReturn(res);
        mockMvc.perform(get("/api/v1/operations/supervisor/summary"))
                .andExpect(status().isOk());
    }
}
