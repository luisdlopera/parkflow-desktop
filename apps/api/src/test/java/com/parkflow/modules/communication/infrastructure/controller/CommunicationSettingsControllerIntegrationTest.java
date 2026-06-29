package com.parkflow.modules.communication.infrastructure.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.communication.infrastructure.dto.EmailSettingsDto;
import com.parkflow.modules.communication.domain.enums.SecurityMode;
import com.parkflow.modules.communication.domain.enums.ProviderType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CommunicationSettingsControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("Should block unauthenticated access")
    void shouldBlockUnauthenticatedAccess() throws Exception {
        UUID companyId = UUID.randomUUID();
        mockMvc.perform(get("/api/v1/companies/" + companyId + "/communication-settings"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "CASHIER")
    @DisplayName("Should block access for users without ADMIN or SUPER_ADMIN role")
    void shouldBlockAccessForCashierRole() throws Exception {
        UUID companyId = UUID.randomUUID();
        mockMvc.perform(get("/api/v1/companies/" + companyId + "/communication-settings"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Should allow access for ADMIN role")
    void shouldAllowAccessForAdminRole() throws Exception {
        UUID companyId = UUID.randomUUID();
        mockMvc.perform(get("/api/v1/companies/" + companyId + "/communication-settings"))
                .andExpect(status().isOk());
    }
    
    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Should save email settings when authorized")
    void shouldSaveEmailSettings() throws Exception {
        UUID companyId = UUID.randomUUID();
        
        EmailSettingsDto request = new EmailSettingsDto();
        request.setEnabled(true);
        request.setProvider(ProviderType.SMTP);
        request.setHost("smtp.test.com");
        request.setPort(587);
        request.setUsername("testuser");
        request.setPassword("secretpass");
        request.setSecurityMode(SecurityMode.TLS);
        
        mockMvc.perform(put("/api/v1/companies/" + companyId + "/communication-settings/email")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }
}
