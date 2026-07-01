package com.parkflow.modules.common.contract;

import com.parkflow.modules.common.dto.ApiResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ApiResponseContractTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @WithMockUser
    void shouldMaintainStrictEnterpriseResponseEnvelopeContract() throws Exception {
        mockMvc.perform(get("/api/v1/contract-test"))
                .andExpect(status().isOk())
                // Contract requirements for ParkFlow Enterprise API Standards
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").exists())
                .andExpect(jsonPath("$.data.contract").value("active"))
                .andExpect(jsonPath("$.message").exists())
                .andExpect(jsonPath("$.meta").exists())
                .andExpect(jsonPath("$.meta.timestamp").exists())
                .andExpect(jsonPath("$.meta.path").exists())
                .andExpect(jsonPath("$.meta.requestId").exists())
                .andExpect(jsonPath("$.error").isEmpty());
    }

    @Test
    @WithMockUser
    void shouldInjectDeprecationHeadersOnDeprecatedEndpoints() throws Exception {
        mockMvc.perform(get("/api/v1/contract-test/deprecated"))
                .andExpect(status().isOk())
                .andExpect(header().exists("Deprecation"))
                .andExpect(header().string("Deprecation", "true"))
                .andExpect(header().exists("Sunset"))
                .andExpect(header().exists("Link"));
    }
}

@RestController
@RequestMapping("/api/v1/contract-test")
class MockContractController {

    @GetMapping
    public ApiResponse<Object> getContract() {
        return ApiResponse.success(new ContractData("active"), "Contract verified", "/api/v1/contract-test", "trace-123");
    }

    @Deprecated(since = "v2")
    @GetMapping("/deprecated")
    public ApiResponse<Object> getDeprecatedContract() {
        return ApiResponse.success(new ContractData("active"), "Deprecated contract verified", "/api/v1/contract-test/deprecated", "trace-123");
    }

    record ContractData(String contract) {}
}
