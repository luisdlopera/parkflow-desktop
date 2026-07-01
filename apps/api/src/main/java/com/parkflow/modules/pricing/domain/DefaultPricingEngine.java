package com.parkflow.modules.pricing.domain;

import com.parkflow.modules.parking.operation.domain.EntryMode;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.pricing.PriceBreakdown;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

public class DefaultPricingEngine implements PricingEngine {

    @Override
    public PricingQuote calculate(PricingContext context) {
        List<ExecutionStep> trace = new ArrayList<>();
        Rate rate = context.rate();
        
        // --- Unified Validations ---
        if (context.entryAt() == null || context.exitAt() == null) {
            throw new IllegalArgumentException("Entry and Exit times are required");
        }
        if (context.exitAt().isBefore(context.entryAt())) {
            throw new IllegalArgumentException("Exit time cannot be before Entry time");
        }
        if (rate == null) {
            throw new IllegalArgumentException("A Rate configuration is strictly required");
        }
        // ---------------------------
        
        long seconds = Duration.between(context.entryAt(), context.exitAt()).toSeconds();
        long totalMinutes = Math.max(0, (long) Math.ceil(seconds / 60.0));
        
        trace.add(new ExecutionStep(
            "INPUT",
            "Entrada",
            BigDecimal.valueOf(totalMinutes),
            "Estancia inicial: " + totalMinutes + " min"
        ));

        // 1. Monthly Contract (Zero-cost exit)
        if (context.hasActiveMonthlyContract()) {
            trace.add(new ExecutionStep(
                "MONTHLY_CONTRACT",
                "Contrato Mensual",
                BigDecimal.ZERO,
                "El cliente tiene un contrato mensual activo. Salida sin costo."
            ));
            return new PricingQuote(
                new PriceBreakdown(0, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.ZERO),
                trace
            );
        }

        // 2. Courtesy / Visitor (Courtesy handling from ComplexPricingService)
        if (context.entryMode() != null && context.entryMode() != EntryMode.VISITOR && !context.lostTicket()) {
            trace.add(new ExecutionStep(
                "COURTESY",
                "Cortesía",
                BigDecimal.ZERO,
                "Cortesía aplicada por modo de entrada: " + context.entryMode().name()
            ));
            return new PricingQuote(
                new PriceBreakdown(0, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.ZERO),
                trace
            );
        }

        // 3. Grace Period
        long grace = Math.max(0, rate.getGraceMinutes());
        long billableMinutes = Math.max(0, totalMinutes - grace);
        if (grace > 0 && billableMinutes != totalMinutes) {
            trace.add(new ExecutionStep(
                "GRACE_PERIOD",
                "Cortesía de entrada",
                BigDecimal.valueOf(grace),
                "Se aplicaron " + grace + " min de gracia."
            ));
        }

        // 4. Prepaid balance deduction
        int deductedMinutes = 0;
        if (billableMinutes > 0 && !context.lostTicket() && context.availablePrepaidMinutes() != null && context.availablePrepaidMinutes() > 0) {
            int toDeduct = Math.min(context.availablePrepaidMinutes(), (int) billableMinutes);
            billableMinutes -= toDeduct;
            deductedMinutes = toDeduct;
            trace.add(new ExecutionStep(
                "PREPAID_DEDUCTION",
                "Saldo Prepagado",
                BigDecimal.valueOf(toDeduct),
                "Se descontaron " + toDeduct + " min de saldo prepagado."
            ));
        }

        // 5. Strategy Calculation (Hourly, Fractional, Daily, Mixed)
        PricingResult result = calculateStrategyPrice(rate, billableMinutes);
        trace.add(new ExecutionStep(
            "STRATEGY_PRICE",
            rate.getRateType().name(),
            result.subtotal(),
            result.reason()
        ));

        BigDecimal subtotal = result.subtotal();
        BigDecimal surcharge = BigDecimal.ZERO;
        BigDecimal discount = BigDecimal.ZERO;

        // 6. Agreement/Corporate discount
        if (context.agreementCode() != null && !context.agreementCode().isBlank()) {
            if (context.agreementFlatAmount() != null) {
                BigDecimal oldSubtotal = subtotal;
                subtotal = context.agreementFlatAmount();
                trace.add(new ExecutionStep(
                    "AGREEMENT_FLAT",
                    "Convenio Tarifa Plana",
                    subtotal.subtract(oldSubtotal),
                    "Tarifa plana por convenio " + context.agreementCode() + ": " + subtotal
                ));
            } else if (context.agreementDiscountPercent() != null && context.agreementDiscountPercent().compareTo(BigDecimal.ZERO) > 0) {
                discount = subtotal.multiply(context.agreementDiscountPercent())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                trace.add(new ExecutionStep(
                    "AGREEMENT_DISCOUNT",
                    "Convenio Descuento",
                    discount.negate(),
                    "Descuento del " + context.agreementDiscountPercent() + "% por convenio " + context.agreementCode()
                ));
            }
        }

        // 7. Surcharges (Lost Ticket, etc)
        if (context.lostTicket() && rate.getLostTicketSurcharge() != null && rate.getLostTicketSurcharge().compareTo(BigDecimal.ZERO) > 0) {
            surcharge = rate.getLostTicketSurcharge();
            trace.add(new ExecutionStep(
                "LOST_TICKET",
                "Recargo Ticket Perdido",
                surcharge,
                "Recargo por pérdida de ticket."
            ));
        }

        BigDecimal total = subtotal.add(surcharge).subtract(discount).max(BigDecimal.ZERO);

        // 8. Daily/Session Caps
        if (rate.getMaxSessionValue() != null && total.compareTo(rate.getMaxSessionValue()) > 0) {
            BigDecimal max = rate.getMaxSessionValue();
            trace.add(new ExecutionStep(
                "MAX_SESSION_CAP",
                "Tope Máximo",
                max.subtract(total),
                "El total excede el tope máximo de " + max + ". Ajustado."
            ));
            total = max;
        }

        // 9. Taxes
        BigDecimal taxPercentage = rate.getTaxPercentage() != null ? rate.getTaxPercentage() : BigDecimal.ZERO;
        BigDecimal taxAmount = BigDecimal.ZERO;
        BigDecimal netAmount = total;

        if (total.compareTo(BigDecimal.ZERO) > 0 && taxPercentage.compareTo(BigDecimal.ZERO) > 0) {
            if (rate.isTaxIncluded()) {
                BigDecimal divisor = BigDecimal.ONE.add(taxPercentage.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP));
                netAmount = total.divide(divisor, 2, RoundingMode.HALF_UP);
                taxAmount = total.subtract(netAmount);
            } else {
                taxAmount = netAmount.multiply(taxPercentage).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                total = netAmount.add(taxAmount);
            }
            trace.add(new ExecutionStep(
                "TAX",
                "Impuestos",
                taxAmount,
                "Impuesto del " + taxPercentage + "% aplicado."
            ));
        }

        trace.add(new ExecutionStep(
            "RESULT",
            "Resultado Final",
            total,
            "Cálculo final completado."
        ));

        PriceBreakdown breakdown = new PriceBreakdown(
            result.chargedUnits(),
            subtotal,
            surcharge,
            discount,
            deductedMinutes,
            total,
            taxPercentage,
            taxAmount,
            netAmount
        );

        return new PricingQuote(breakdown, trace);
    }

    private PricingResult calculateStrategyPrice(Rate rate, long billableMinutes) {
        if (billableMinutes <= 0) {
            return new PricingResult(BigDecimal.ZERO, 0, "Estancia en cero minutos cobrables.");
        }

        BigDecimal amount = rate.getAmount() == null ? BigDecimal.ZERO : rate.getAmount();

        return switch (rate.getRateType()) {
            case HOURLY -> {
                int chargedUnits = Math.max(1, (int) Math.ceil(billableMinutes / 60.0));
                yield new PricingResult(
                    amount.multiply(BigDecimal.valueOf(chargedUnits)),
                    chargedUnits,
                    chargedUnits + " hora(s) x " + amount
                );
            }
            case FRACTIONAL -> {
                int fraction = rate.getFractionMinutes() > 0 ? rate.getFractionMinutes() : 60;
                int chargedUnits = Math.max(1, (int) Math.ceil(billableMinutes / (double) fraction));
                yield new PricingResult(
                    amount.multiply(BigDecimal.valueOf(chargedUnits)),
                    chargedUnits,
                    chargedUnits + " fracción(es) x " + amount
                );
            }
            case DAILY -> {
                int chargedUnits = Math.max(1, (int) Math.ceil(billableMinutes / 1440.0));
                yield new PricingResult(
                    amount.multiply(BigDecimal.valueOf(chargedUnits)),
                    chargedUnits,
                    chargedUnits + " día(s) x " + amount
                );
            }
            case FLAT -> { // Like Mixed or basic flat
                // Simplified Mixed logic
                if (rate.getBaseMinutes() > 0 && billableMinutes <= rate.getBaseMinutes()) {
                    yield new PricingResult(
                        rate.getBaseValue(),
                        1,
                        "Valor base para primeros " + rate.getBaseMinutes() + " min: " + rate.getBaseValue()
                    );
                } else if (rate.getBaseMinutes() > 0) {
                    long extra = billableMinutes - rate.getBaseMinutes();
                    int additionalUnits = rate.getAdditionalMinutes() > 0 ? 
                        (int) Math.ceil(extra / (double) rate.getAdditionalMinutes()) : 0;
                    BigDecimal total = rate.getBaseValue().add(rate.getAdditionalValue().multiply(BigDecimal.valueOf(additionalUnits)));
                    yield new PricingResult(
                        total,
                        1 + additionalUnits,
                        "Base + " + additionalUnits + " bloques adicionales"
                    );
                }
                yield new PricingResult(amount, 1, "Tarifa estándar fija: " + amount);
            }
            default -> new PricingResult(amount, 1, "Tarifa general: " + amount);
        };
    }

    private record PricingResult(BigDecimal subtotal, int chargedUnits, String reason) {}
}
