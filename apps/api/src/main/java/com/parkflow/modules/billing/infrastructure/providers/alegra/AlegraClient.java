package com.parkflow.modules.billing.infrastructure.providers.alegra;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.billing.infrastructure.providers.alegra.dto.AlegraContactDto;
import com.parkflow.modules.billing.infrastructure.providers.alegra.dto.AlegraInvoiceDto;
import com.parkflow.modules.billing.infrastructure.providers.alegra.dto.AlegraInvoiceResponseDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Base64;
import java.util.Map;

/**
 * Low-level HTTP client for Alegra REST API.
 * Auth: Basic (email:token) encoded in Base64.
 * Base URL: https://app.alegra.com/api/r1/
 */
@Slf4j
@Component
public class AlegraClient {

  private static final String BASE_URL = "https://app.alegra.com/api/r1";
  private final RestTemplate restTemplate;
  private final ObjectMapper objectMapper;

  public AlegraClient(ObjectMapper objectMapper) {
    this.restTemplate = new RestTemplate();
    this.objectMapper = objectMapper;
  }

  public AlegraInvoiceResponseDto createInvoice(AlegraInvoiceDto invoice, Map<String, String> credentials) {
    HttpHeaders headers = buildHeaders(credentials);
    HttpEntity<AlegraInvoiceDto> entity = new HttpEntity<>(invoice, headers);

    try {
      ResponseEntity<AlegraInvoiceResponseDto> response = restTemplate.exchange(
          BASE_URL + "/invoices",
          HttpMethod.POST,
          entity,
          AlegraInvoiceResponseDto.class
      );
      return response.getBody();
    } catch (Exception e) {
      log.error("[Alegra] createInvoice failed: {}", e.getMessage());
      throw new AlegraApiException("Failed to create invoice: " + e.getMessage(), e);
    }
  }

  public AlegraInvoiceResponseDto getInvoice(String invoiceId, Map<String, String> credentials) {
    HttpHeaders headers = buildHeaders(credentials);
    HttpEntity<Void> entity = new HttpEntity<>(headers);

    try {
      ResponseEntity<AlegraInvoiceResponseDto> response = restTemplate.exchange(
          BASE_URL + "/invoices/" + invoiceId,
          HttpMethod.GET,
          entity,
          AlegraInvoiceResponseDto.class
      );
      return response.getBody();
    } catch (Exception e) {
      log.error("[Alegra] getInvoice {} failed: {}", invoiceId, e.getMessage());
      throw new AlegraApiException("Failed to get invoice " + invoiceId + ": " + e.getMessage(), e);
    }
  }

  public void voidInvoice(String invoiceId, Map<String, String> credentials) {
    HttpHeaders headers = buildHeaders(credentials);
    HttpEntity<Void> entity = new HttpEntity<>(headers);

    try {
      restTemplate.exchange(
          BASE_URL + "/invoices/" + invoiceId + "/void",
          HttpMethod.POST,
          entity,
          Void.class
      );
    } catch (Exception e) {
      log.error("[Alegra] voidInvoice {} failed: {}", invoiceId, e.getMessage());
      throw new AlegraApiException("Failed to void invoice " + invoiceId + ": " + e.getMessage(), e);
    }
  }

  public String createContact(AlegraContactDto contact, Map<String, String> credentials) {
    HttpHeaders headers = buildHeaders(credentials);
    HttpEntity<AlegraContactDto> entity = new HttpEntity<>(contact, headers);

    try {
      ResponseEntity<Map> response = restTemplate.exchange(
          BASE_URL + "/contacts",
          HttpMethod.POST,
          entity,
          Map.class
      );
      Map<?, ?> body = response.getBody();
      return body != null ? String.valueOf(body.get("id")) : null;
    } catch (Exception e) {
      log.error("[Alegra] createContact failed: {}", e.getMessage());
      throw new AlegraApiException("Failed to create contact: " + e.getMessage(), e);
    }
  }

  public boolean healthCheck(Map<String, String> credentials) {
    HttpHeaders headers = buildHeaders(credentials);
    HttpEntity<Void> entity = new HttpEntity<>(headers);

    try {
      ResponseEntity<Map> response = restTemplate.exchange(
          BASE_URL + "/users/me",
          HttpMethod.GET,
          entity,
          Map.class
      );
      return response.getStatusCode().is2xxSuccessful();
    } catch (Exception e) {
      log.warn("[Alegra] healthCheck failed: {}", e.getMessage());
      return false;
    }
  }

  public byte[] getInvoicePdf(String invoiceId, Map<String, String> credentials) {
    HttpHeaders headers = buildHeaders(credentials);
    headers.set("Accept", "application/pdf");
    HttpEntity<Void> entity = new HttpEntity<>(headers);

    try {
      ResponseEntity<byte[]> response = restTemplate.exchange(
          BASE_URL + "/invoices/" + invoiceId + "/pdf",
          HttpMethod.GET,
          entity,
          byte[].class
      );
      return response.getBody();
    } catch (Exception e) {
      log.error("[Alegra] getInvoicePdf {} failed: {}", invoiceId, e.getMessage());
      throw new AlegraApiException("Failed to download PDF for invoice " + invoiceId, e);
    }
  }

  private HttpHeaders buildHeaders(Map<String, String> credentials) {
    String email = credentials.getOrDefault("email", "");
    String token = credentials.getOrDefault("token", "");
    String encoded = Base64.getEncoder().encodeToString((email + ":" + token).getBytes());

    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    headers.set(HttpHeaders.AUTHORIZATION, "Basic " + encoded);
    return headers;
  }

  public static class AlegraApiException extends RuntimeException {
    public AlegraApiException(String message, Throwable cause) {
      super(message, cause);
    }
  }
}
