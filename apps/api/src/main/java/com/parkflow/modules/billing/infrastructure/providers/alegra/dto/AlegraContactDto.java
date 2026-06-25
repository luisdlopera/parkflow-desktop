package com.parkflow.modules.billing.infrastructure.providers.alegra.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Value;


@Value
@Builder
public class AlegraContactDto {

  String name;
  String email;

  @JsonProperty("identification")
  String identification;

  @JsonProperty("identificationObject")
  IdentificationObject identificationObject;

  @JsonProperty("phonePrimary")
  String phonePrimary;

  @Value
  @Builder
  public static class IdentificationObject {
    String type;
    String number;
    @JsonProperty("dv")
    String dv;
  }
}
