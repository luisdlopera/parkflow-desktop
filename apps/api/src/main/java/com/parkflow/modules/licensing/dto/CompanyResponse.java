package com.parkflow.modules.licensing.dto;

import com.parkflow.modules.licensing.enums.CompanyStatus;
import com.parkflow.modules.licensing.enums.PlanType;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import lombok.Builder;
import lombok.Data;

/**
 * DTO de respuesta para información de empresa.
 */
@Data
@Builder
public class CompanyResponse {

  private UUID id;

  private String name;

  private String nit;

  private String address;

  private String city;

  private String phone;

  private String email;

  private String contactName;

  private PlanType plan;

  private CompanyStatus status;

  private OffsetDateTime expiresAt;

  private OffsetDateTime graceUntil;

  private Integer maxDevices;

  private Integer maxLocations;

  private Integer maxUsers;

  private Boolean offlineModeAllowed;

  private Integer offlineLeaseHours;

  private Boolean onboardingCompleted;

  private List<CompanyModuleResponse> modules;

  private List<LicensedDeviceResponse> devices;

  private OffsetDateTime createdAt;

  private OffsetDateTime updatedAt;

  private String customerMessage;
}
