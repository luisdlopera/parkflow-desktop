package com.parkflow.modules.parking.operation.application.service;

import com.parkflow.modules.configuration.domain.repository.MonthlyContractPort;
import com.parkflow.modules.configuration.domain.repository.ParkingSitePort;
import com.parkflow.modules.configuration.application.port.in.OperationalValidationUseCase;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.SessionStatus;
import com.parkflow.modules.parking.operation.repository.BlacklistedPlateRepository;
import com.parkflow.modules.parking.operation.repository.ParkingSessionRepository;
import com.parkflow.modules.parking.operation.repository.RateRepository;
import com.parkflow.modules.parking.operation.validation.PlateValidationResult;
import com.parkflow.modules.parking.operation.validation.PlateValidator;
import com.parkflow.modules.settings.domain.MasterVehicleType;
import com.parkflow.modules.settings.domain.repository.MasterVehicleTypePort;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
class EntryValidationService {

  private final PlateValidator plateValidator;
  private final MonthlyContractPort monthlyContractPort;
  private final ParkingSitePort parkingSitePort;
  private final MasterVehicleTypePort masterVehicleTypePort;
  private final OperationalValidationUseCase operationalConfigurationService;
  private final BlacklistedPlateRepository blacklistedPlateRepository;
  private final RateRepository rateRepository;
  private final ParkingSessionRepository parkingSessionRepository;

  MasterVehicleType requireActiveVehicleType(String code) {
    MasterVehicleType vt = masterVehicleTypePort.findByCode(code)
        .orElseThrow(() -> new OperationException(HttpStatus.BAD_REQUEST, "Tipo de vehículo no existe"));
    if (!vt.isActive()) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "Tipo de vehículo está inactivo");
    }
    return vt;
  }

  void validateOperationalPayload(UUID companyId, String vehicleType, String entryMode,
                                   String lane, String terminal) {
    operationalConfigurationService.validateEntryPayload(companyId, vehicleType, entryMode, lane, terminal, null);
  }

  PlateValidationResult validateAndNormalizePlate(String countryCode, String vehicleType, String rawPlate) {
    PlateValidationResult result = plateValidator.validatePlate(countryCode, vehicleType, rawPlate);
    if (!result.isValid()) {
      throw new OperationException(HttpStatus.BAD_REQUEST, result.errorMessage());
    }
    return result;
  }

  void assertNoActiveDuplicate(String normalizedPlate, UUID companyId) {
    parkingSessionRepository
        .findActiveByPlateForUpdate(SessionStatus.ACTIVE, normalizedPlate, companyId)
        .ifPresent(s -> {
          throw new OperationException(HttpStatus.CONFLICT, "El vehículo ya tiene una sesión activa");
        });
  }

  void assertNotBlacklisted(String normalizedPlate, UUID companyId) {
    blacklistedPlateRepository
        .findByCompanyIdAndPlateIgnoreCaseAndActiveTrue(companyId, normalizedPlate)
        .ifPresent(b -> {
          throw new OperationException(HttpStatus.FORBIDDEN, "PLATE_BLACKLISTED",
              "La placa " + normalizedPlate + " se encuentra en lista negra"
                  + (b.getReason() == null || b.getReason().isBlank() ? "" : ": " + b.getReason()));
        });
  }

  boolean isMonthlySubscriber(String plate, LocalDate date, UUID companyId) {
    return monthlyContractPort
        .findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            plate, date, date, companyId)
        .isPresent();
  }

  Rate resolveRate(UUID rateId, String vehicleType, String site, OffsetDateTime entryAt, UUID companyId) {
    Rate rate;
    if (rateId != null) {
      rate = rateRepository.findByIdAndCompanyId(rateId, companyId)
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Tarifa no encontrada"));
    } else {
      rate = rateRepository.findFirstApplicableRate(site, vehicleType, companyId)
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "No se encontró tarifa aplicable"));
    }
    if (!rate.isActive()) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "Tarifa inactiva");
    }
    return rate;
  }

  void assertCapacityAvailable(String site, UUID companyId) {
    if (site == null || site.isBlank()) return;
    parkingSitePort.findByCodeOrNameForUpdate(site.trim(), companyId)
        .ifPresent(parkingSite -> {
          if (!parkingSite.isActive()) {
            throw new OperationException(HttpStatus.BAD_REQUEST, "La sede está inactiva");
          }
          // Note: Site-level capacity checking is temporarily disabled until
          // ParkingSession is refactored to track site associations.
          // See V022__drop_deprecated_columns.sql - the 'site' field was removed from parking_session.
        });
  }
}
