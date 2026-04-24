package com.parkflow.modules.cash.service;

import com.parkflow.config.CashModuleProperties;
import com.parkflow.modules.settings.dto.ParkingParametersData;
import com.parkflow.modules.settings.entity.ParkingParameters;
import com.parkflow.modules.settings.repository.ParkingParametersRepository;
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
  private final ParkingParametersRepository parkingParametersRepository;

  public CashPolicyResponse resolvePolicy(String siteLabel) {
    String site = StringUtils.hasText(siteLabel) ? siteLabel.trim() : "DEFAULT";
    return new CashPolicyResponse(
        requireOpenForPayment(siteLabel),
        offlineCloseAllowed(siteLabel),
        offlineMaxManualMovement(siteLabel),
        operationsHint(),
        site);
  }

  public boolean requireOpenForPayment(String siteLabel) {
    Optional<Boolean> b =
        resolveData(siteLabel).map(ParkingParametersData::getCashRequireOpenForPayment);
    return b.orElse(props.isRequireOpenForPayment());
  }

  public boolean offlineCloseAllowed(String siteLabel) {
    Optional<Boolean> b =
        resolveData(siteLabel).map(ParkingParametersData::getCashOfflineCloseAllowed);
    return b.orElse(props.isOfflineCloseAllowed());
  }

  public BigDecimal offlineMaxManualMovement(String siteLabel) {
    return resolveData(siteLabel)
        .map(ParkingParametersData::getCashOfflineMaxManualMovement)
        .orElse(props.getOfflineMaxManualMovement());
  }

  public String operationsHint() {
    return props.getOperationsHint();
  }

  private Optional<ParkingParametersData> resolveData(String siteLabel) {
    if (!StringUtils.hasText(siteLabel)) {
      return parkingParametersRepository
          .findBySiteCode("DEFAULT")
          .map(ParkingParameters::getData);
    }
    String code = siteLabel.trim();
    Optional<ParkingParameters> row = parkingParametersRepository.findBySiteCode(code);
    if (row.isPresent()) {
      return Optional.ofNullable(row.get().getData());
    }
    return parkingParametersRepository
        .findBySiteCode("DEFAULT")
        .map(ParkingParameters::getData);
  }
}
