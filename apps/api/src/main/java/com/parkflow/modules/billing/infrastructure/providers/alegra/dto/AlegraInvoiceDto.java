package com.parkflow.modules.billing.infrastructure.providers.alegra.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;
import lombok.Value;

import java.math.BigDecimal;
import java.util.List;

@Value
@Builder
public class AlegraInvoiceDto {

  @JsonProperty("client")
  ClientRef client;

  @JsonProperty("items")
  List<ItemDto> items;

  @JsonProperty("dueDate")
  String dueDate;

  @JsonProperty("currency")
  CurrencyDto currency;

  @Value
  @Builder
  public static class ClientRef {
    String id;
  }

  @Value
  @Builder
  public static class ItemDto {
    String id;
    String name;
    BigDecimal quantity;
    BigDecimal price;
    List<TaxDto> tax;
  }

  @Value
  @Builder
  public static class TaxDto {
    String id;
  }

  @Value
  @Builder
  public static class CurrencyDto {
    String code;
    @JsonProperty("exchangeRate")
    BigDecimal exchangeRate;
  }
}
