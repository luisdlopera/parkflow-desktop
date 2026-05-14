package com.parkflow.modules.parking.operation.aspect;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Aspect
@Component
public class OperationLoggingAspect {

    private static final Logger log = LoggerFactory.getLogger(OperationLoggingAspect.class);
    private static final String CORRELATION_ID_KEY = "correlationId";

    @Around("execution(* com.parkflow.modules.parking.operation.service.OperationService.*(..))")
    public Object logOperation(ProceedingJoinPoint joinPoint) throws Throwable {
        String correlationId = MDC.get(CORRELATION_ID_KEY);
        boolean generatedHere = false;

        if (correlationId == null) {
            correlationId = UUID.randomUUID().toString();
            MDC.put(CORRELATION_ID_KEY, correlationId);
            generatedHere = true;
        }

        String methodName = joinPoint.getSignature().getName();
        long startTime = System.currentTimeMillis();

        log.info("[{}] Starting operation: {}", correlationId, methodName);

        try {
            Object result = joinPoint.proceed();
            long elapsedTime = System.currentTimeMillis() - startTime;
            log.info("[{}] Completed operation: {} in {}ms", correlationId, methodName, elapsedTime);
            return result;
        } catch (Exception ex) {
            long elapsedTime = System.currentTimeMillis() - startTime;
            log.error("[{}] Failed operation: {} after {}ms - Error: {}", correlationId, methodName, elapsedTime, ex.getMessage());
            throw ex;
        } finally {
            if (generatedHere) {
                MDC.remove(CORRELATION_ID_KEY);
            }
        }
    }
}
