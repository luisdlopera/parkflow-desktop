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
  private String logoUrl;
  private String brandColor;
  private String taxName;
  private BigDecimal taxRatePercent;
  private Boolean pricesIncludeTax;
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
  private String ticketHeaderMessage;
  private String ticketLegalMessage;
  private String ticketFooterMessage;
  private String operationRulesMessage;
  private String qrConfig;
  private Boolean manualExitAllowed;
  private Boolean allowOfflineEntryExit;

  /** Si no es null, sustituye app.cash.require-open-for-payment para esta sede. */
  private Boolean cashRequireOpenForPayment;

  /** Si no es null, sustituye app.cash.offline-close-allowed (UI / procedimiento). */
  private Boolean cashOfflineCloseAllowed;

  /** Si no es null, sustituye app.cash.offline-max-manual-movement para movimientos offline. */
  private BigDecimal cashOfflineMaxManualMovement;

  /** URL para webhook de salida al cerrar caja (PSC). */
  private String cashFeOutboundWebhookUrl;

  /** Token bearer para el webhook de salida. */
  private String cashFeOutboundWebhookBearer;

  /** Habilita generacion de consecutivos para documentos de soporte en cierre. */
  private Boolean cashFeSequentialEnabled;

  /** Numero de digitos para el consecutivo (ej. 8 -> 00000001). */
  private Integer cashFeSequenceDigits;

  /** Si true, el consecutivo es independiente por terminal; si false, es por sede. */
  private Boolean cashFeSequencePerTerminal;

  /** Razón social o nombre del obligado tributario (tickets/cierre tipo Z). */
  private String businessLegalName;

  /** DV NIT cuando aplique (un dígito usualmente). */
  private String taxIdCheckDigit;

  /** Prefijo de numeración para factura autorizada DIAN (ej. SETP). */
  private String dianInvoicePrefix;

  /** Número de resolución de facturación. */
  private String dianResolutionNumber;

  /** Fecha resolución (YYYY-MM-DD). */
  private String dianResolutionDate;

  /** Consecutivo autorizado inicial. */
  private String dianRangeFrom;

  /** Consecutivo autorizado final. */
  private String dianRangeTo;

  /** Clave técnica (resolución); se usa cuando integre proveedor PSC certificado para CUFE. */
  private String dianTechnicalKey;
}
