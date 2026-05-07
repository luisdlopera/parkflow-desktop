package com.parkflow.modules.configuration.controller;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.configuration.dto.PaymentMethodRequest;
import com.parkflow.modules.configuration.dto.PaymentMethodResponse;
import com.parkflow.modules.configuration.service.PaymentMethodService;
import com.parkflow.modules.settings.dto.SettingsPageResponse;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = ConfigurationPaymentMethodController.class)
@AutoConfigureMockMvc
class ConfigurationPaymentMethodControllerWebMvcTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;

  @MockBean private PaymentMethodService paymentMethodService;

  @Test
  @WithMockUser(roles = "ADMIN")
  void createShouldReturn201WithBody() throws Exception {
    PaymentMethodResponse response =
        new PaymentMethodResponse(
            UUID.randomUUID(), "CASH", "Efectivo", false, true, 1, OffsetDateTime.now(), OffsetDateTime.now());

    Mockito.when(paymentMethodService.create(Mockito.any())).thenReturn(response);

    PaymentMethodRequest request = new PaymentMethodRequest("CASH", "Efectivo", false, true, 1);

    mockMvc
        .perform(
            post("/api/v1/configuration/payment-methods")
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.code").value("CASH"))
        .andExpect(jsonPath("$.name").value("Efectivo"));
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  void listShouldReturnPagedResponse() throws Exception {
    PaymentMethodResponse response =
        new PaymentMethodResponse(
            UUID.randomUUID(), "CARD", "Tarjeta", true, true, 2, OffsetDateTime.now(), OffsetDateTime.now());

    SettingsPageResponse<PaymentMethodResponse> page =
        SettingsPageResponse.of(new PageImpl<>(List.of(response), PageRequest.of(0, 20), 1));

    Mockito.when(paymentMethodService.list(Mockito.any(), Mockito.any(), Mockito.any())).thenReturn(page);

    mockMvc
        .perform(get("/api/v1/configuration/payment-methods"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content[0].code").value("CARD"))
        .andExpect(jsonPath("$.content[0].name").value("Tarjeta"));
  }
}
