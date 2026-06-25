package com.parkflow.modules.common.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("CSRF Controller Tests")
class CsrfControllerTest {
  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private CsrfTokenService csrfTokenService;

  @Test
  @DisplayName("Should generate CSRF token for session")
  void testGenerateToken() throws Exception {
    MockHttpSession session = new MockHttpSession();

    mockMvc
        .perform(post("/api/v1/csrf/token").session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.token").isNotEmpty())
        .andExpect(jsonPath("$.headerName").value("X-CSRF-Token"))
        .andExpect(jsonPath("$.expiresAt").isNotEmpty());
  }

  @Test
  @DisplayName("Should generate unique tokens for different sessions")
  void testGenerateUniqueTokens() throws Exception {
    MockHttpSession session1 = new MockHttpSession();
    MockHttpSession session2 = new MockHttpSession();

    String response1 =
        mockMvc
            .perform(post("/api/v1/csrf/token").session(session1))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();

    String response2 =
        mockMvc
            .perform(post("/api/v1/csrf/token").session(session2))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();

    String token1 = objectMapper.readTree(response1).get("token").asText();
    String token2 = objectMapper.readTree(response2).get("token").asText();

    assert (!token1.equals(token2));
  }

  @Test
  @DisplayName("Should regenerate token for same session")
  void testRegenerateToken() throws Exception {
    MockHttpSession session = new MockHttpSession();

    String response1 =
        mockMvc
            .perform(post("/api/v1/csrf/token").session(session))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();

    String token1 = objectMapper.readTree(response1).get("token").asText();

    // Request new token for same session (should replace old one)
    String response2 =
        mockMvc
            .perform(post("/api/v1/csrf/token").session(session))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();

    String token2 = objectMapper.readTree(response2).get("token").asText();

    assert (!token1.equals(token2));
  }
}
