package com.parkflow.modules.configuration.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeatureConfigurationResponse {

  @Schema(description = "Company ID")
  private String companyId;

  @Schema(description = "Maneja convenios empresariales")
  private Boolean agreements;

  @Schema(description = "Maneja planes prepagados")
  private Boolean prepaid;

  @Schema(description = "Maneja membresias/contratos mensuales")
  private Boolean memberships;

  @Schema(description = "Maneja facturacion electronica")
  private Boolean electronicBilling;

  @Schema(description = "Maneja control de lockers para cascos")
  private Boolean lockerControl;

  @Schema(description = "Maneja parqueadero de motos")
  private Boolean motorcycleParking;

  @Schema(description = "Maneja parqueadero de bicicletas")
  private Boolean bicycleParking;

  @Schema(description = "Maneja multiples metodos de pago")
  private Boolean multiplePaymentMethods;

  @Schema(description = "Maneja validaciones de placas")
  private Boolean plateValidation;

  @Schema(description = "Maneja tarifas especiales")
  private Boolean specialRates;

  @Schema(description = "Maneja clientes frecuentes")
  private Boolean frequentCustomers;

  @Schema(description = "Maneja control de cascos")
  private Boolean helmetControl;

  @Schema(description = "Maneja control de accesorios")
  private Boolean accessoryControl;

  @Schema(description = "Maneja reservas")
  private Boolean reservations;

  @Schema(description = "Maneja operacion 24 horas")
  private Boolean operation24Hours;
}
