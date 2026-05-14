package com.parkflow.modules.cash.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.cash.application.port.in.CashSessionUseCase;
import com.parkflow.modules.cash.domain.CashSession;
import com.parkflow.modules.cash.dto.CashSummaryResponse;
import com.parkflow.modules.cash.repository.CashSessionRepository;
import com.parkflow.modules.settings.dto.ParkingParametersData;
import com.parkflow.modules.settings.service.ParkingParametersService;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.StringUtils;

/**
 * Envio best-effort a PSC/middleware cuando cierra una sesion de caja (fuera del commit JDBC).
 */
@Component
@Slf4j
public class CashClosingOutboundNotifier {

  private final CashSessionRepository cashSessionRepository;
  private final ParkingParametersService parkingParametersService;
  private final CashSessionUseCase cashSessionUseCase;
  private final ObjectMapper objectMapper;

  public CashClosingOutboundNotifier(
      CashSessionRepository cashSessionRepository,
      ParkingParametersService parkingParametersService,
      @Lazy CashSessionUseCase cashSessionUseCase,
      ObjectMapper objectMapper) {
    this.cashSessionRepository = cashSessionRepository;
    this.parkingParametersService = parkingParametersService;
    this.cashSessionUseCase = cashSessionUseCase;
    this.objectMapper = objectMapper;
  }

  /** Programa llamada despues del commit si hay webhook configurado por sede. */
  public void scheduleAfterCashClose(java.util.UUID cashSessionId, String parkingParamSiteLabel) {
    ParkingParametersData p = parkingParametersService.get(parkingParamSiteLabel);
    if (p == null || !StringUtils.hasText(p.getCashFeOutboundWebhookUrl())) {
      return;
    }

    Runnable job = () -> postClosingWebhook(cashSessionId, parkingParamSiteLabel, p);

    if (TransactionSynchronizationManager.isSynchronizationActive()) {
      TransactionSynchronizationManager.registerSynchronization(
          new TransactionSynchronization() {
            @Override
            public void afterCommit() {
              CompletableFuture.runAsync(job)
                  .exceptionally(
                      ex -> {
                        log.warn("cash closing webhook PSC encolamiento: {}", ex.toString());
                        return null;
                      });
            }
          });
    } else {
      CompletableFuture.runAsync(job)
          .exceptionally(
              ex -> {
                log.warn("cash closing webhook PSC encolamiento: {}", ex.toString());
                return null;
              });
    }
  }

  private void postClosingWebhook(
      java.util.UUID cashSessionId, String parkingParamSiteLabel, ParkingParametersData params) {
    String urltrim = params.getCashFeOutboundWebhookUrl().trim();
    if (!looksLikeHttpUrl(urltrim)) {
      log.warn("cash closing webhook omitido: URL invalida para sesion {}", cashSessionId);
      return;
    }
    try {
      CashSession sess =
          cashSessionRepository.fetchForClosingWebhook(cashSessionId).orElse(null);
      if (sess == null) {
        log.warn("webhook PSC: sesion {} no encontrada", cashSessionId);
        return;
      }
      CashSummaryResponse summary = cashSessionUseCase.getSummary(sess.getId());
      Map<String, Object> body = closingPayload(sess, summary, parkingParamSiteLabel);
      byte[] json = objectMapper.writeValueAsBytes(body);

      HttpRequest.Builder rq =
          HttpRequest.newBuilder()
              .uri(URI.create(urltrim))
              .timeout(Duration.ofSeconds(45))
              .header("Content-Type", "application/json")
              .header("User-Agent", "Parkflow-CashWebhook/1.0")
              .POST(HttpRequest.BodyPublishers.ofByteArray(json));

      if (StringUtils.hasText(params.getCashFeOutboundWebhookBearer())) {
        String bearer = params.getCashFeOutboundWebhookBearer().trim();
        rq.header(
            "Authorization", bearer.regionMatches(false, 0, "Bearer ", 0, 7) ? bearer : ("Bearer " + bearer));
      }

      HttpClient client =
          HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build();
      HttpResponse<String> resp = client.send(rq.build(), HttpResponse.BodyHandlers.ofString());
      int code = resp.statusCode();
      if (code < 200 || code >= 300) {
        log.warn(
            "webhook PSC cierre {} codigo HTTP {} respuesta {}",
            cashSessionId,
            code,
            shorten(resp.body(), 280));
      }
    } catch (InterruptedException ie) {
      Thread.currentThread().interrupt();
      log.warn("webhook PSC interrupt sesion {}", cashSessionId);
    } catch (Exception e) {
      log.warn("webhook PSC fallo sesion {}: {}", cashSessionId, e.toString());
    }
  }

  private static Map<String, Object> closingPayload(
      CashSession s, CashSummaryResponse sum, String siteParamResolved) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("event", "parkflow.cash.closed.v1");
    m.put("cashSessionId", s.getId().toString());
    m.put(
        "register",
        Map.of(
            "site",
            s.getCashRegister().getSite(),
            "terminal",
            s.getCashRegister().getTerminal(),
            "parametersSiteKey",
            siteParamResolved));
    m.put("supportDocumentNumber", s.getSupportDocumentNumber());
    m.put(
        "operator",
        Map.of(
            "operatorId",
            s.getOperator().getId().toString(),
            "operatorName",
            s.getOperator().getName()));
    if (s.getClosedBy() != null) {
      m.put(
          "closedBy",
          Map.of(
              "userId",
              s.getClosedBy().getId().toString(),
              "name",
              s.getClosedBy().getName()));
    }
    m.put(
        "amounts",
        Map.ofEntries(
            Map.entry("openingAmount", s.getOpeningAmount()),
            Map.entry("expectedLedgerTotal", sum.expectedLedgerTotal()),
            Map.entry("countedTotal", s.getCountedAmount()),
            Map.entry("differenceAmount", s.getDifferenceAmount()),
            Map.entry("movementCountPosted", sum.movementCount())));
    m.put(
        "countByMethod",
        mapDecimalValues(sum.totalsByPaymentMethod()));
    m.put(
        "countByMovementType",
        mapDecimalValues(sum.totalsByMovementType()));
    try {
      m.put("issuedAtUtc", java.time.OffsetDateTime.now(java.time.ZoneOffset.UTC).toString());
    } catch (@SuppressWarnings("unused") Exception ignored) {
      //
    }
    return m;
  }

  private static Map<String, String> mapDecimalValues(Map<?, java.math.BigDecimal> src) {
    Map<String, String> dest = new LinkedHashMap<>();
    if (src == null) {
      return dest;
    }
    for (Map.Entry<?, java.math.BigDecimal> e : src.entrySet()) {
      if (e.getKey() != null && e.getValue() != null) {
        dest.put(e.getKey().toString(), e.getValue().toPlainString());
      }
    }
    return dest;
  }

  private static boolean looksLikeHttpUrl(String u) {
    return u.regionMatches(true, 0, "https://", 0, 8) || u.regionMatches(true, 0, "http://", 0, 7);
  }

  private static String shorten(String s, int max) {
    if (s == null) {
      return "";
    }
    return s.length() <= max ? s : s.substring(0, max) + "...";
  }
}
