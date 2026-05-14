package com.parkflow.modules.parking.operation.validation;

import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
public class PlateValidator {

    private final List<PlateValidationRule> rules = List.of(
        new PlateValidationRule("CO", "CAR", Pattern.compile("^[A-Z]{3}[0-9]{3}$"), "ABC123", "Para carro en Colombia se esperan 3 letras y 3 números", true),
        new PlateValidationRule("CO", "VAN", Pattern.compile("^[A-Z]{3}[0-9]{3}$"), "ABC123", "Para van en Colombia se esperan 3 letras y 3 números", true),
        new PlateValidationRule("CO", "TRUCK", Pattern.compile("^[A-Z]{3}[0-9]{3}$"), "ABC123", "Para camión en Colombia se esperan 3 letras y 3 números", true),
        new PlateValidationRule("CO", "BUS", Pattern.compile("^[A-Z]{3}[0-9]{3}$"), "ABC123", "Para bus en Colombia se esperan 3 letras y 3 números", true),
        new PlateValidationRule("CO", "ELECTRIC", Pattern.compile("^[A-Z]{3}[0-9]{3}$"), "ABC123", "Para eléctrico en Colombia se esperan 3 letras y 3 números", true),
        new PlateValidationRule("CO", "BICYCLE", Pattern.compile("^[A-Z0-9]{3,12}$"), "BICI001", "Para bicicleta use un identificador de 3 a 12 letras o números", true),
        new PlateValidationRule("CO", "OTHER", Pattern.compile("^[A-Z]{3}[0-9]{3}$"), "ABC123", "Para vehículo general en Colombia se esperan 3 letras y 3 números", true),
        new PlateValidationRule("CO", "MOTORCYCLE", Pattern.compile("^[A-Z]{3}[0-9]{2}[A-Z]{1}$"), "ABC12A", "Para moto en Colombia se esperan 3 letras, 2 números y 1 letra", true)
    );

    /**
     * Normalizes a plate by converting to uppercase and removing spaces, dashes, and special characters.
     */
    public String normalizePlate(String plate) {
        if (plate == null) {
            return "";
        }
        return plate.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
    }

    /**
     * Validates a plate according to country and vehicle type rules.
     */
    public PlateValidationResult validatePlate(String countryCode, String vehicleType, String plate) {
        String normalized = normalizePlate(plate);
        
        if (normalized.isEmpty()) {
            return PlateValidationResult.invalid(normalized, "La placa no puede estar vacía o contener solo caracteres especiales");
        }

        // Default to CO if not provided for now, or you could make it strict
        String targetCountry = (countryCode != null && !countryCode.isBlank()) ? countryCode : "CO";
        String targetType = (vehicleType != null && !vehicleType.isBlank()) ? vehicleType : "OTHER";

        Optional<PlateValidationRule> activeRule = rules.stream()
            .filter(r -> r.enabled() && r.countryCode().equalsIgnoreCase(targetCountry) && r.vehicleType().equalsIgnoreCase(targetType))
            .findFirst();

        if (activeRule.isEmpty()) {
            boolean isCountrySupported = rules.stream().anyMatch(r -> r.countryCode().equalsIgnoreCase(targetCountry));
            if (isCountrySupported) {
                 return PlateValidationResult.invalid(normalized, "Tipo de vehículo no soportado para validación en " + targetCountry);
            }
            return PlateValidationResult.invalid(normalized, "Pais no soportado para validacion de placa: " + targetCountry);
        }

        PlateValidationRule rule = activeRule.get();
        if (rule.pattern().matcher(normalized).matches()) {
            return PlateValidationResult.valid(normalized);
        }

        // It didn't match. Let's see if it matched ANOTHER vehicle type's rule to give a better error message.
        Optional<PlateValidationRule> crossMatch = rules.stream()
            .filter(r -> r.enabled() && r.countryCode().equalsIgnoreCase(targetCountry) && !r.vehicleType().equalsIgnoreCase(targetType))
            .filter(r -> r.pattern().matcher(normalized).matches())
            .findFirst();

        String errorMessage = rule.errorMessage() + " (Ej: " + rule.example() + ").";
        if (crossMatch.isPresent()) {
            errorMessage += " Parece que ingresaste una placa de " + translateVehicleType(crossMatch.get().vehicleType()) + ".";
        }

        return PlateValidationResult.invalid(normalized, errorMessage);
    }

    private String translateVehicleType(String type) {
        return switch (type.toUpperCase(Locale.ROOT)) {
            case "CAR" -> "carro";
            case "MOTORCYCLE" -> "moto";
            case "VAN" -> "van";
            case "TRUCK" -> "camión";
            case "BUS" -> "bus";
            case "BICYCLE" -> "bicicleta";
            case "ELECTRIC" -> "eléctrico";
            default -> "otro vehículo";
        };
    }
}
