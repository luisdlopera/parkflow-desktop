package com.parkflow.modules.settings.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ParkingParametersData {
  private String parkingName;
  private String taxId;
  private String address;
  private String phone;
  private String siteLabel;
  private String currency;
  private String timeZone;
  private Integer graceMinutesDefault;
  private String lostTicketPolicy;
  private Boolean allowReprint;
  private Integer maxReprints;
  private String ticketPrefix;
  private String ticketFormat;
  private Integer defaultPaperWidthMm;
  private String defaultPrinterName;
  private Boolean offlineModeEnabled;
  private Integer syncIntervalSeconds;
  private Integer printTimeoutSeconds;
  private String ticketLegalMessage;
  private String qrConfig;
  private Boolean manualExitAllowed;
  private Boolean allowOfflineEntryExit;

  /** Si no es null, sustituye app.cash.require-open-for-payment para esta sede. */
  private Boolean cashRequireOpenForPayment;

  /** Si no es null, sustituye app.cash.offline-close-allowed (UI / procedimiento). */
  private Boolean cashOfflineCloseAllowed;

  /** Si no es null, sustituye app.cash.offline-max-manual-movement para movimientos offline. */
  private BigDecimal cashOfflineMaxManualMovement;
}
