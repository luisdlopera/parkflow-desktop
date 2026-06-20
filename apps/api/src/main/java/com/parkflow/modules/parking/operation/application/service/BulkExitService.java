package com.parkflow.modules.parking.operation.application.service;

import com.parkflow.modules.parking.operation.application.port.in.BulkExitCalculateUseCase;
import com.parkflow.modules.parking.operation.application.port.in.BulkExitProcessUseCase;
import com.parkflow.modules.parking.operation.application.port.in.RegisterExitUseCase;
import com.parkflow.modules.parking.operation.dto.BulkExitCalculateResponse;
import com.parkflow.modules.parking.operation.dto.BulkExitRequest;
import com.parkflow.modules.parking.operation.dto.BulkExitResponse;
import com.parkflow.modules.parking.operation.dto.ExitRequest;
import com.parkflow.modules.parking.operation.dto.OperationResultResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
@RequiredArgsConstructor
public class BulkExitService implements BulkExitCalculateUseCase, BulkExitProcessUseCase {

    private static final Logger log = LoggerFactory.getLogger(BulkExitService.class);

    private final RegisterExitUseCase registerExitUseCase;

    @Override
    public BulkExitCalculateResponse precalculate(BulkExitRequest request) {
        BigDecimal totalSubtotal = BigDecimal.ZERO;
        BigDecimal totalSurcharge = BigDecimal.ZERO;
        BigDecimal totalDiscount = BigDecimal.ZERO;
        BigDecimal finalTotal = BigDecimal.ZERO;
        List<BulkExitCalculateResponse.VehicleCalculationItem> items = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        for (String locator : request.locators()) {
            try {
                // Determine if it's a plate or ticket (simplified logic: ticket contains -, plate is alphanumeric 6 chars etc.)
                // In ParkFlow locator can be mapped to ticketNumber or plate.
                // We will try ticket first, if no - then try both. But ExitRequest takes either.
                ExitRequest singleRequest = new ExitRequest(
                        UUID.randomUUID().toString(), // not used for idempotency in precalculate
                        locator, // ticketNumber
                        locator, // plate - Backend will pick first non blank in requireActiveSession
                        request.operatorUserId(),
                        request.paymentMethod(),
                        request.agreementCode(),
                        null,
                        request.observations(),
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        request.cashSessionId(),
                        null
                );

                OperationResultResponse result = registerExitUseCase.precalculate(singleRequest);
                
                totalSubtotal = totalSubtotal.add(result.subtotal() != null ? result.subtotal() : BigDecimal.ZERO);
                totalSurcharge = totalSurcharge.add(result.surcharge() != null ? result.surcharge() : BigDecimal.ZERO);
                totalDiscount = totalDiscount.add(result.discount() != null ? result.discount() : BigDecimal.ZERO);
                finalTotal = finalTotal.add(result.total() != null ? result.total() : BigDecimal.ZERO);

                items.add(new BulkExitCalculateResponse.VehicleCalculationItem(
                        locator,
                        result.receipt() != null ? result.receipt().plate() : locator,
                        result.receipt() != null ? result.receipt().ticketNumber() : locator,
                        result.subtotal(),
                        result.discount(),
                        result.total(),
                        null
                ));
            } catch (Exception e) {
                log.warn("Error calculating bulk exit for locator {}: {}", locator, e.getMessage());
                errors.add("Error en " + locator + ": " + e.getMessage());
                items.add(new BulkExitCalculateResponse.VehicleCalculationItem(
                        locator, locator, locator, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, e.getMessage()
                ));
            }
        }

        return new BulkExitCalculateResponse(
                totalSubtotal, totalSurcharge, totalDiscount, finalTotal,
                request.locators().size(), items, errors
        );
    }

    @Override
    public BulkExitResponse process(BulkExitRequest request) {
        BigDecimal totalCharged = BigDecimal.ZERO;
        int successfulCount = 0;
        int failedCount = 0;
        List<OperationResultResponse> successfulReceipts = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        for (String locator : request.locators()) {
            try {
                // Note: we're using a single transaction for the bulk exit, so if one fails, we catch the exception,
                // but Spring will mark the transaction as rollback-only if it's a RuntimeException crossing @Transactional boundaries.
                // However, RegisterExitService has its own @Transactional. If we catch it here, it might still roll back the whole transaction.
                // For robust bulk operations, we might want REQUIRES_NEW on inner, or handle it differently.
                // Since ParkFlow wants ACID bulk, if ANY fails, maybe we should fail all? 
                // "Sistema valida inconsistencias. Usuario confirma salida." -> implies user only confirms valid ones.
                // For now, we attempt all. If one throws, we catch it.
                
                ExitRequest singleRequest = new ExitRequest(
                        "BULK-" + UUID.randomUUID().toString(), // unique idempotency key per bulk item
                        locator, // ticketNumber
                        locator, // plate
                        request.operatorUserId(),
                        request.paymentMethod(),
                        request.agreementCode(),
                        null,
                        request.observations(),
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        request.cashSessionId(),
                        null
                );

                OperationResultResponse result = registerExitUseCase.execute(singleRequest);
                
                totalCharged = totalCharged.add(result.total() != null ? result.total() : BigDecimal.ZERO);
                successfulCount++;
                successfulReceipts.add(result);
            } catch (Exception e) {
                log.error("Error processing bulk exit for locator {}: {}", locator, e.getMessage());
                failedCount++;
                errors.add("Error en " + locator + ": " + e.getMessage());
            }
        }

        if (failedCount > 0) {
            log.warn("Bulk exit partially failed. Errors: " + String.join(", ", errors));
        }

        return new BulkExitResponse(totalCharged, successfulCount, failedCount, successfulReceipts, errors);
    }
}
