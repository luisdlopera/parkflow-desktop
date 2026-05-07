package com.parkflow.integration;

import com.parkflow.config.BaseIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.assertj.core.api.Assertions.assertThat;

class HardwareIntegrationTest extends BaseIntegrationTest {

    @Test
    void printJob_WithMockPrinter_ShouldSucceed() throws Exception {
        String printRequest = """
            {
                "ticketId": "00000000-0000-0000-0000-000000000001",
                "printerId": "PRINTER_001",
                "template": "ENTRY_TICKET"
            }
            """;

        mockMvc.perform(post("/api/v1/print/jobs")
                .header("Authorization", "Bearer " + getAuthToken())
                .contentType(MediaType.APPLICATION_JSON)
                .content(printRequest))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("QUEUED"));
    }

    @Test
    void cardReader_Integration_ShouldProcessPayment() throws Exception {
        String paymentRequest = """
            {
                "amount": 1000,
                "method": "CARD",
                "cardData": "MOCK_CARD_DATA"
            }
            """;

        mockMvc.perform(post("/api/v1/cash/payments")
                .header("Authorization", "Bearer " + getAuthToken())
                .contentType(MediaType.APPLICATION_JSON)
                .content(paymentRequest))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.approved").value(true));
    }

    @Test
    void barcodeScanner_ShouldReadTicket() throws Exception {
        String scanRequest = """
            {
                "barcode": "TICKET_123456",
                "scannerId": "SCANNER_001"
            }
            """;

        mockMvc.perform(post("/api/v1/operations/scans")
                .header("Authorization", "Bearer " + getAuthToken())
                .contentType(MediaType.APPLICATION_JSON)
                .content(scanRequest))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ticketId").exists());
    }

    @Test
    void hardwareStatus_Check_ShouldReturnOnline() throws Exception {
        mockMvc.perform(get("/api/v1/hardware/status")
                .header("Authorization", "Bearer " + getAuthToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.printer").value("ONLINE"))
                .andExpect(jsonPath("$.cardReader").value("ONLINE"))
                .andExpect(jsonPath("$.scanner").value("ONLINE"));
    }
}