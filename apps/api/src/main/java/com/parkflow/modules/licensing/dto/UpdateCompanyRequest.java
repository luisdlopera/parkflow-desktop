package com.parkflow.modules.licensing.dto;

import com.parkflow.modules.licensing.enums.CompanyStatus;
import com.parkflow.modules.licensing.enums.PlanType;
import lombok.Data;

/**
 * Request para actualizar una empresa.
 */
@Data
public class UpdateCompanyRequest {

  private String name;

  private String nit;

  private String address;

  private String city;

  private String phone;

  private String email;

  private String contactName;

  private PlanType plan;

  private CompanyStatus status;

  private Integer maxDevices;

  private Integer maxLocations;

  private Integer maxUsers;

  private Boolean offlineModeAllowed;

  private Integer offlineLeaseHours;

  private String customerMessage;

  private String adminNotes;
}
