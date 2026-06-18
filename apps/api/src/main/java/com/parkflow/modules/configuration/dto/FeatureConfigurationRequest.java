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
public class FeatureConfigurationRequest {

  @Schema(description = "Maneja convenios empresariales", example = "false")
  private Boolean agreements;

  @Schema(description = "Maneja planes prepagados", example = "false")
  private Boolean prepaid;

  @Schema(description = "Maneja membresias/contratos mensuales", example = "false")
  private Boolean memberships;

  @Schema(description = "Maneja facturacion electronica", example = "false")
  private Boolean electronicBilling;

  @Schema(description = "Maneja control de lockers para cascos", example = "false")
  private Boolean lockerControl;

  @Schema(description = "Maneja parqueadero de motos", example = "true")
  private Boolean motorcycleParking;

  @Schema(description = "Maneja parqueadero de bicicletas", example = "false")
  private Boolean bicycleParking;

  @Schema(description = "Maneja multiples metodos de pago", example = "true")
  private Boolean multiplePaymentMethods;

  @Schema(description = "Maneja validaciones de placas", example = "true")
  private Boolean plateValidation;

  @Schema(description = "Maneja tarifas especiales", example = "false")
  private Boolean specialRates;

  @Schema(description = "Maneja clientes frecuentes", example = "false")
  private Boolean frequentCustomers;

  @Schema(description = "Maneja control de cascos", example = "false")
  private Boolean helmetControl;

  @Schema(description = "Maneja control de accesorios", example = "false")
  private Boolean accessoryControl;

  @Schema(description = "Maneja reservas", example = "false")
  private Boolean reservations;

  @Schema(description = "Maneja operacion 24 horas", example = "false")
  private Boolean operation24Hours;
}
