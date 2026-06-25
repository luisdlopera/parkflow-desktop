package com.parkflow.modules.cash.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.cash.application.port.in.CashSessionUseCase;
import com.parkflow.modules.cash.domain.CashRegister;
import com.parkflow.modules.cash.domain.CashSession;
import com.parkflow.modules.cash.dto.CashSummaryResponse;
import com.parkflow.modules.cash.repository.CashSessionRepository;
import com.parkflow.modules.common.dto.ParkingParametersData;
import com.parkflow.modules.settings.application.service.ParkingParametersService;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CashClosingOutboundNotifierTest {

  @Mock private CashSessionRepository cashSessionRepository;
  @Mock private ParkingParametersService parkingParametersService;
  @Mock private CashSessionUseCase cashSessionUseCase;

  private ObjectMapper objectMapper = new ObjectMapper();
  private CashClosingOutboundNotifier notifier;

  private static HttpServer mockServer;
  private static String mockServerUrl;
  private static boolean requestReceived;
  private static String receivedAuthHeader;

  @BeforeAll
  static void startServer() throws IOException {
    mockServer = HttpServer.create(new InetSocketAddress(0), 0);
    mockServer.createContext("/webhook", new HttpHandler() {
      @Override
      public void handle(HttpExchange exchange) throws IOException {
        requestReceived = true;
        receivedAuthHeader = exchange.getRequestHeaders().getFirst("Authorization");
        
        String response = "OK";
        exchange.sendResponseHeaders(200, response.length());
        OutputStream os = exchange.getResponseBody();
        os.write(response.getBytes());
        os.close();
      }
    });
    mockServer.setExecutor(null);
    mockServer.start();
    mockServerUrl = "http://localhost:" + mockServer.getAddress().getPort() + "/webhook";
  }

  @AfterAll
  static void stopServer() {
    mockServer.stop(0);
  }

  @BeforeEach
  void setUp() {
    notifier = new CashClosingOutboundNotifier(
        cashSessionRepository, parkingParametersService, cashSessionUseCase, objectMapper);
    requestReceived = false;
    receivedAuthHeader = null;
  }

  @Test
  void scheduleAfterCashClose_ShouldDoNothingWhenParamsNull() throws Exception {
    when(parkingParametersService.get("SiteA")).thenReturn(null);

    notifier.scheduleAfterCashClose(UUID.randomUUID(), "SiteA");

    // Wait a bit to ensure async completes (it shouldn't even start)
    Thread.sleep(100);
    assertThat(requestReceived).isFalse();
  }

  @Test
  void scheduleAfterCashClose_ShouldDoNothingWhenWebhookUrlEmpty() throws Exception {
    ParkingParametersData params = new ParkingParametersData();
    params.setCashFeOutboundWebhookUrl("  ");
    when(parkingParametersService.get("SiteA")).thenReturn(params);

    notifier.scheduleAfterCashClose(UUID.randomUUID(), "SiteA");

    Thread.sleep(100);
    assertThat(requestReceived).isFalse();
  }

  @Test
  void scheduleAfterCashClose_ShouldDoNothingWhenWebhookUrlInvalid() throws Exception {
    ParkingParametersData params = new ParkingParametersData();
    params.setCashFeOutboundWebhookUrl("ftp://invalid-url");
    when(parkingParametersService.get("SiteA")).thenReturn(params);

    notifier.scheduleAfterCashClose(UUID.randomUUID(), "SiteA");

    Thread.sleep(100);
    assertThat(requestReceived).isFalse();
    verify(cashSessionRepository, never()).fetchForClosingWebhook(any());
  }

  @Test
  void scheduleAfterCashClose_ShouldCallWebhookSuccessfully() throws Exception {
    // Arrange
    UUID sessionId = UUID.randomUUID();
    ParkingParametersData params = new ParkingParametersData();
    params.setCashFeOutboundWebhookUrl(mockServerUrl);
    params.setCashFeOutboundWebhookBearer("my-token");
    when(parkingParametersService.get("SiteA")).thenReturn(params);

    CashRegister register = new CashRegister();
    register.setSite("SiteA");
    register.setTerminal("Term1");

    AppUser operator = new AppUser();
    operator.setId(UUID.randomUUID());
    operator.setName("Test Op");

    CashSession session = new CashSession();
    session.setId(sessionId);
    session.setCashRegister(register);
    session.setOperator(operator);
    session.setOpeningAmount(BigDecimal.TEN);
    session.setCountedAmount(BigDecimal.TEN);
    session.setDifferenceAmount(BigDecimal.ZERO);

    when(cashSessionRepository.fetchForClosingWebhook(sessionId)).thenReturn(Optional.of(session));

    CashSummaryResponse summary = new CashSummaryResponse(
        BigDecimal.TEN, BigDecimal.TEN, BigDecimal.TEN, BigDecimal.ZERO, Map.of("CASH", BigDecimal.TEN), Map.of("PAYMENT", BigDecimal.TEN), 5L
    );
    when(cashSessionUseCase.getSummary(sessionId)).thenReturn(summary);

    // Act
    notifier.scheduleAfterCashClose(sessionId, "SiteA");

    // Wait for async execution
    int retries = 10;
    while (!requestReceived && retries > 0) {
      Thread.sleep(200);
      retries--;
    }

    // Assert
    assertThat(requestReceived).isTrue();
    assertThat(receivedAuthHeader).isEqualTo("Bearer my-token");
  }
}
