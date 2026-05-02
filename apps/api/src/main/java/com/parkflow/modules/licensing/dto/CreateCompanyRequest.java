package com.parkflow.modules.licensing.dto;

import com.parkflow.modules.licensing.enums.PlanType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * Request para crear una nueva empresa.
 */
@Data
public class CreateCompanyRequest {

  @NotBlank
  private String name;

  private String nit;

  private String address;

  private String city;

  private String phone;

  @Email
  private String email;

  private String contactName;

  @NotNull
  private PlanType plan = PlanType.LOCAL;

  private Integer maxDevices = 1;

  private Integer maxLocations = 1;

  private Integer maxUsers = 5;

  private Integer trialDays = 14;

  private Boolean offlineModeAllowed = true;
}
