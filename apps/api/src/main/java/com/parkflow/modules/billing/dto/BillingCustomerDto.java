package com.parkflow.modules.billing.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class BillingCustomerDto {
  String document;
  String documentType;
  String name;
  String email;
  String phone;
  String address;
  String city;
  String countryCode;
}
