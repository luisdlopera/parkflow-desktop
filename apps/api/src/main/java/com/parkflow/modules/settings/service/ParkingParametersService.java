package com.parkflow.modules.settings.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import java.io.IOException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.auth.entity.AuthAuditAction;
import com.parkflow.modules.parking.operation.exception.OperationException;
import com.parkflow.modules.settings.dto.ParkingParametersData;
import com.parkflow.modules.settings.dto.ParametersValidateResponse;
import com.parkflow.modules.settings.entity.ParkingParameters;
import com.parkflow.modules.settings.repository.ParkingParametersRepository;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ParkingParametersService {
  private final ParkingParametersRepository parkingParametersRepository;
  private final SettingsAuditService settingsAuditService;
  private final ObjectMapper objectMapper;

  @Transactional(readOnly = true)
  public ParkingParametersData get(String siteCode) {
    String site = normalizeSite(siteCode);
    return parkingParametersRepository
        .findBySiteCode(site)
        .map(ParkingParameters::getData)
        .orElseGet(this::defaults);
  }

  @Transactional
  public ParkingParametersData put(String siteCode, ParkingParametersData incoming) {
    String site = normalizeSite(siteCode);

    ParkingParameters row =
        parkingParametersRepository
            .findBySiteCode(site)
            .orElseGet(
                () -> {
                  ParkingParameters created = new ParkingParameters();
                  created.setSiteCode(site);
                  created.setCreatedAt(OffsetDateTime.now());
                  return created;
                });

    ParkingParametersData previous = row.getData() != null ? row.getData() : defaults();
    ParkingParametersData base = row.getData() != null ? row.getData() : defaults();
    ParkingParametersData merged = mergeOnto(base, incoming);
    List<String> errors = ParkingParametersValidator.validate(merged);
    if (!errors.isEmpty()) {
      throw new OperationException(HttpStatus.BAD_REQUEST, String.join("; ", errors));
    }
    row.setData(merged);
    row.setUpdatedAt(OffsetDateTime.now());
    parkingParametersRepository.save(row);

    settingsAuditService.log(
        AuthAuditAction.SETTINGS_PARAMETERS_UPDATE,
        "OK",
        diffMetadata(previous, row.getData()));

    return row.getData();
  }

  @Transactional(readOnly = true)
  public ParametersValidateResponse validate(ParkingParametersData data) {
    List<String> errors = ParkingParametersValidator.validate(data);
    return new ParametersValidateResponse(errors.isEmpty(), errors);
  }

  @Transactional
  public ParkingParametersData reset(String siteCode) {
    String site = normalizeSite(siteCode);
    ParkingParametersData def = defaults();
    ParkingParameters row =
        parkingParametersRepository
            .findBySiteCode(site)
            .orElseGet(
                () -> {
                  ParkingParameters created = new ParkingParameters();
                  created.setSiteCode(site);
                  created.setCreatedAt(OffsetDateTime.now());
                  return created;
                });
    ParkingParametersData previous = row.getData();
    row.setData(def);
    row.setUpdatedAt(OffsetDateTime.now());
    parkingParametersRepository.save(row);
    settingsAuditService.log(
        AuthAuditAction.SETTINGS_PARAMETERS_RESET,
        "OK",
        diffMetadata(previous, def));
    return def;
  }

  private Map<String, Object> diffMetadata(ParkingParametersData before, ParkingParametersData after) {
    try {
      Map<String, Object> meta = new LinkedHashMap<>();
      meta.put("before", objectMapper.readTree(objectMapper.writeValueAsString(before)));
      meta.put("after", objectMapper.readTree(objectMapper.writeValueAsString(after)));
      return meta;
    } catch (JsonProcessingException e) {
      return Map.of("diffError", "serialize_failed");
    }
  }

  private String normalizeSite(String siteCode) {
    if (siteCode == null || siteCode.isBlank()) {
      return "DEFAULT";
    }
    return siteCode.trim();
  }

  private ParkingParametersData mergeOnto(ParkingParametersData base, ParkingParametersData in) {
    ParkingParametersData d = deepCopy(base);
    if (in.getParkingName() != null) {
      d.setParkingName(in.getParkingName());
    }
    if (in.getTaxId() != null) {
      d.setTaxId(in.getTaxId());
    }
    if (in.getAddress() != null) {
      d.setAddress(in.getAddress());
    }
    if (in.getPhone() != null) {
      d.setPhone(in.getPhone());
    }
    if (in.getSiteLabel() != null) {
      d.setSiteLabel(in.getSiteLabel());
    }
    if (in.getCurrency() != null) {
      d.setCurrency(in.getCurrency());
    }
    if (in.getTimeZone() != null) {
      d.setTimeZone(in.getTimeZone());
    }
    if (in.getGraceMinutesDefault() != null) {
      d.setGraceMinutesDefault(in.getGraceMinutesDefault());
    }
    if (in.getLostTicketPolicy() != null) {
      d.setLostTicketPolicy(in.getLostTicketPolicy());
    }
    if (in.getAllowReprint() != null) {
      d.setAllowReprint(in.getAllowReprint());
    }
    if (in.getMaxReprints() != null) {
      d.setMaxReprints(in.getMaxReprints());
    }
    if (in.getTicketPrefix() != null) {
      d.setTicketPrefix(in.getTicketPrefix());
    }
    if (in.getTicketFormat() != null) {
      d.setTicketFormat(in.getTicketFormat());
    }
    if (in.getDefaultPaperWidthMm() != null) {
      d.setDefaultPaperWidthMm(in.getDefaultPaperWidthMm());
    }
    if (in.getDefaultPrinterName() != null) {
      d.setDefaultPrinterName(in.getDefaultPrinterName());
    }
    if (in.getOfflineModeEnabled() != null) {
      d.setOfflineModeEnabled(in.getOfflineModeEnabled());
    }
    if (in.getSyncIntervalSeconds() != null) {
      d.setSyncIntervalSeconds(in.getSyncIntervalSeconds());
    }
    if (in.getPrintTimeoutSeconds() != null) {
      d.setPrintTimeoutSeconds(in.getPrintTimeoutSeconds());
    }
    if (in.getTicketLegalMessage() != null) {
      d.setTicketLegalMessage(in.getTicketLegalMessage());
    }
    if (in.getQrConfig() != null) {
      d.setQrConfig(in.getQrConfig());
    }
    if (in.getManualExitAllowed() != null) {
      d.setManualExitAllowed(in.getManualExitAllowed());
    }
    if (in.getAllowOfflineEntryExit() != null) {
      d.setAllowOfflineEntryExit(in.getAllowOfflineEntryExit());
    }
    return d;
  }

  private ParkingParametersData deepCopy(ParkingParametersData src) {
    try {
      return objectMapper.readValue(
          objectMapper.writeValueAsBytes(src), ParkingParametersData.class);
    } catch (IOException e) {
      return defaults();
    }
  }

  private ParkingParametersData defaults() {
    ParkingParametersData d = new ParkingParametersData();
    d.setParkingName("Parkflow");
    d.setTaxId("");
    d.setAddress("");
    d.setPhone("");
    d.setSiteLabel("DEFAULT");
    d.setCurrency("COP");
    d.setTimeZone("America/Bogota");
    d.setGraceMinutesDefault(5);
    d.setLostTicketPolicy("SURCHARGE_RATE");
    d.setAllowReprint(true);
    d.setMaxReprints(3);
    d.setTicketPrefix("PF");
    d.setTicketFormat("STANDARD");
    d.setDefaultPaperWidthMm(80);
    d.setDefaultPrinterName("");
    d.setOfflineModeEnabled(true);
    d.setSyncIntervalSeconds(120);
    d.setPrintTimeoutSeconds(30);
    d.setTicketLegalMessage("");
    d.setQrConfig("PLATE_AND_ENTRY_TIME");
    d.setManualExitAllowed(true);
    d.setAllowOfflineEntryExit(true);
    return d;
  }
}
