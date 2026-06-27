package com.parkflow.modules.cash.application.usecase;

import com.parkflow.config.CashModuleProperties;
import com.parkflow.modules.common.dto.ParkingParametersData;
import com.parkflow.modules.settings.domain.ParkingParameters;
import com.parkflow.modules.settings.domain.repository.ParkingParametersPort;
import com.parkflow.modules.cash.dto.CashPolicyResponse;
import java.math.BigDecimal;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@RequiredArgsConstructor
public class CashPolicyResolver {
  private final CashModuleProperties props;
  private final ParkingParametersPort parkingParametersPort;

  public CashPolicyResponse resolvePolicy(String siteLabel) {
    String site = StringUtils.hasText(siteLabel) ? siteLabel.trim() : "DEFAULT";
    return new CashPolicyResponse(
        requireOpenForPayment(siteLabel),
        offlineCloseAllowed(siteLabel),
        offlineMaxManualMovement(siteLabel),
        operationsHint(),
        site,
        allowMultipleOpenSessions(siteLabel),
        allowMultipleSessionsPerUser(siteLabel),
        maxDiscrepancyTolerance(siteLabel),
        allowManualMovements(siteLabel));
  }

  public boolean requireOpenForPayment(String siteLabel) {
    Optional<Boolean> b =
        resolveData(siteLabel).map(d -> d.getCashRequireOpenForPayment());
    return b.orElse(props.isRequireOpenForPayment());
  }

  public boolean offlineCloseAllowed(String siteLabel) {
    Optional<Boolean> b =
        resolveData(siteLabel).map(d -> d.getCashOfflineCloseAllowed());
    return b.orElse(props.isOfflineCloseAllowed());
  }

  public BigDecimal offlineMaxManualMovement(String siteLabel) {
    return resolveData(siteLabel)
        .map(d -> d.getCashOfflineMaxManualMovement())
        .orElse(props.getOfflineMaxManualMovement());
  }

  public BigDecimal maxManualAdjustment(String siteLabel) {
    return resolveData(siteLabel)
        .map(d -> d.getCashMaxManualAdjustment())
        .orElse(new BigDecimal("500000.00"));
  }

  public String operationsHint() {
    return props.getOperationsHint();
  }

  public boolean allowMultipleOpenSessions(String siteLabel) {
    return resolveData(siteLabel)
        .map(d -> d.getCashAllowMultipleOpenSessions())
        .orElse(props.isAllowMultipleOpenSessions());
  }

  public boolean allowMultipleSessionsPerUser(String siteLabel) {
    return resolveData(siteLabel)
        .map(d -> d.getCashAllowMultipleSessionsPerUser())
        .orElse(props.isAllowMultipleSessionsPerUser());
  }

  public BigDecimal maxDiscrepancyTolerance(String siteLabel) {
    return resolveData(siteLabel)
        .map(d -> d.getCashMaxDiscrepancyTolerance())
        .orElse(props.getMaxDiscrepancyTolerance());
  }

  public boolean allowManualMovements(String siteLabel) {
    return resolveData(siteLabel)
        .map(d -> d.getCashAllowManualMovements())
        .orElse(props.isAllowManualMovements());
  }

  private Optional<ParkingParametersData> resolveData(String siteLabel) {
    if (!StringUtils.hasText(siteLabel)) {
      return parkingParametersPort
          .findBySiteCode("DEFAULT")
          .map(p -> p.getData());
    }
    String code = siteLabel.trim();
    Optional<ParkingParameters> row = parkingParametersPort.findBySiteCode(code);
    if (row.isPresent()) {
      return Optional.ofNullable(row.get().getData());
    }
    return parkingParametersPort
        .findBySiteCode("DEFAULT")
        .map(p -> p.getData());
  }
}
