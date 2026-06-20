package com.parkflow.modules.audit.infrastructure;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.audit.domain.AuditDomainEvent;
import com.parkflow.modules.audit.domain.Auditable;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.Map;

@Aspect
@Component
public class AuditAspect {

    private final ApplicationEventPublisher eventPublisher;
    private final ObjectMapper objectMapper;

    public AuditAspect(ApplicationEventPublisher eventPublisher, ObjectMapper objectMapper) {
        this.eventPublisher = eventPublisher;
        this.objectMapper = objectMapper;
    }

    @Around("@annotation(com.parkflow.modules.audit.domain.Auditable)")
    @SuppressWarnings("unchecked")
    public Object auditMethod(ProceedingJoinPoint joinPoint) throws Throwable {
        long startTime = System.currentTimeMillis();
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        Auditable auditable = method.getAnnotation(Auditable.class);

        Object result = null;
        String status = "EXITOSA";
        Map<String, Object> oldData = new HashMap<>(); // Store request arguments
        Map<String, Object> newData = new HashMap<>();

        try {
            // Capture arguments
            Object[] args = joinPoint.getArgs();
            if (args != null && args.length > 0) {
                for (int i = 0; i < args.length; i++) {
                    if (args[i] != null && !args[i].getClass().getName().startsWith("jakarta.servlet") 
                            && !args[i].getClass().getName().startsWith("org.springframework")) {
                        try {
                            oldData.put("arg" + i, objectMapper.convertValue(args[i], Map.class));
                        } catch (Exception e) {
                            oldData.put("arg" + i, args[i].toString());
                        }
                    }
                }
            }

            // Proceed with original method execution
            result = joinPoint.proceed();
            
            // Try to extract new data from result if it's an entity
            if (result != null) {
                try {
                    newData = objectMapper.convertValue(result, Map.class);
                } catch (Exception e) {
                    // Ignore conversion errors
                }
            }
            
            return result;
        } catch (Throwable ex) {
            status = "FALLIDA";
            oldData.put("error", ex.getMessage());
            throw ex;
        } finally {
            long executionTime = System.currentTimeMillis() - startTime;
            
            AuditContextHolder.AuditContext context = AuditContextHolder.getContext();
            if (context == null) {
                context = AuditContextHolder.AuditContext.builder()
                        .correlationId("SYSTEM")
                        .username("SYSTEM")
                        .branchId(com.parkflow.modules.auth.security.TenantContext.getTenantId())
                        .build();
            }

            java.util.UUID branchId = context.getBranchId();
            if (branchId == null) {
                branchId = com.parkflow.modules.auth.security.TenantContext.getTenantId();
            }

            // Create Event
            AuditDomainEvent event = AuditDomainEvent.builder()
                    .correlationId(context.getCorrelationId())
                    .userId(context.getUserId())
                    .username(context.getUsername())
                    .role(context.getRole())
                    .branchId(branchId)
                    .ipAddress(context.getIpAddress())
                    .userAgent(context.getUserAgent())
                    .device(context.getDevice())
                    .module(auditable.module())
                    .action(auditable.action())
                    .entityName(auditable.entityClass() != Void.class ? auditable.entityClass().getSimpleName() : method.getReturnType().getSimpleName())
                    .status(status)
                    .executionTimeMs(executionTime)
                    .oldData(oldData)
                    .newData(newData)
                    .modifiedFields(new HashMap<>())
                    .build();

            // Publish event asynchronously
            eventPublisher.publishEvent(event);
        }
    }
}
