package com.parkflow.modules.audit.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.audit.domain.AuditDomainEvent;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

@ExtendWith(MockitoExtension.class)
class AuditAspectTest {

    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private ObjectMapper objectMapper;

    private AuditAspect aspect;

    // A simple service annotated with @Auditable for tests
    static class AuditableService {
        @com.parkflow.modules.audit.domain.Auditable(module = "Config", action = "Crear")
        public String create(String name) {
            return "created:" + name;
        }

        @com.parkflow.modules.audit.domain.Auditable(module = "Config", action = "Eliminar")
        public void deleteAndThrow(String name) {
            throw new RuntimeException("Simulated failure");
        }
    }

    @BeforeEach
    void setUp() {
        aspect = new AuditAspect(eventPublisher, objectMapper);
    }

    @AfterEach
    void tearDown() {
        AuditContextHolder.clearContext();
    }

    @Nested
    class EventPublishing {

        @Test
        void publishesEventAfterSuccessfulMethodExecution() throws Throwable {
            // Use Spring AOP proxy to test the aspect
            // Since we can't easily use ProceedingJoinPoint directly, we verify via real AOP
            // Here we test the aspect logic by simulating a proceeding join point
            var captureRef = new AtomicReference<AuditDomainEvent>();
            doAnswer(inv -> {
                captureRef.set(inv.getArgument(0));
                return null;
            }).when(eventPublisher).publishEvent(any(AuditDomainEvent.class));

            // Simulate the aspect by testing via ProceedingJoinPoint mock
            var joinPoint = mock(org.aspectj.lang.ProceedingJoinPoint.class);
            var signature = mock(org.aspectj.lang.reflect.MethodSignature.class);
            var method = AuditableService.class.getMethod("create", String.class);

            when(joinPoint.getSignature()).thenReturn(signature);
            when(signature.getMethod()).thenReturn(method);
            when(joinPoint.getArgs()).thenReturn(new Object[]{"TestName"});
            when(joinPoint.proceed()).thenReturn("created:TestName");

            Object result = aspect.auditMethod(joinPoint);

            assertThat(result).isEqualTo("created:TestName");
            verify(eventPublisher).publishEvent(any(AuditDomainEvent.class));

            AuditDomainEvent event = captureRef.get();
            assertThat(event.getModule()).isEqualTo("Config");
            assertThat(event.getAction()).isEqualTo("Crear");
            assertThat(event.getStatus()).isEqualTo("EXITOSA");
        }

        @Test
        void publishesEventEvenWhenMethodThrows() throws Throwable {
            var joinPoint = mock(org.aspectj.lang.ProceedingJoinPoint.class);
            var signature = mock(org.aspectj.lang.reflect.MethodSignature.class);
            var method = AuditableService.class.getMethod("deleteAndThrow", String.class);

            when(joinPoint.getSignature()).thenReturn(signature);
            when(signature.getMethod()).thenReturn(method);
            when(joinPoint.getArgs()).thenReturn(new Object[]{"TestEntity"});
            when(joinPoint.proceed()).thenThrow(new RuntimeException("Simulated failure"));

            assertThatThrownBy(() -> aspect.auditMethod(joinPoint))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Simulated failure");

            // Event must still be published even on failure
            ArgumentCaptor<AuditDomainEvent> captor = ArgumentCaptor.forClass(AuditDomainEvent.class);
            verify(eventPublisher).publishEvent(captor.capture());
            assertThat(captor.getValue().getStatus()).isEqualTo("FALLIDA");
        }

        @Test
        void includesExecutionTimeMsInEvent() throws Throwable {
            var joinPoint = mock(org.aspectj.lang.ProceedingJoinPoint.class);
            var signature = mock(org.aspectj.lang.reflect.MethodSignature.class);
            var method = AuditableService.class.getMethod("create", String.class);

            when(joinPoint.getSignature()).thenReturn(signature);
            when(signature.getMethod()).thenReturn(method);
            when(joinPoint.getArgs()).thenReturn(new Object[]{});
            when(joinPoint.proceed()).thenReturn("ok");

            aspect.auditMethod(joinPoint);

            ArgumentCaptor<AuditDomainEvent> captor = ArgumentCaptor.forClass(AuditDomainEvent.class);
            verify(eventPublisher).publishEvent(captor.capture());
            assertThat(captor.getValue().getExecutionTimeMs()).isNotNegative();
        }
    }

    @Nested
    class ContextPropagation {

        @Test
        void usesAuditContextWhenSet() throws Throwable {
            UUID userId = UUID.randomUUID();
            UUID branchId = UUID.randomUUID();
            AuditContextHolder.setContext(AuditContextHolder.AuditContext.builder()
                .correlationId("corr-123")
                .userId(userId)
                .username("operator@park.co")
                .branchId(branchId)
                .build());

            var joinPoint = mock(org.aspectj.lang.ProceedingJoinPoint.class);
            var signature = mock(org.aspectj.lang.reflect.MethodSignature.class);
            var method = AuditableService.class.getMethod("create", String.class);

            when(joinPoint.getSignature()).thenReturn(signature);
            when(signature.getMethod()).thenReturn(method);
            when(joinPoint.getArgs()).thenReturn(new Object[]{});
            when(joinPoint.proceed()).thenReturn("ok");

            aspect.auditMethod(joinPoint);

            ArgumentCaptor<AuditDomainEvent> captor = ArgumentCaptor.forClass(AuditDomainEvent.class);
            verify(eventPublisher).publishEvent(captor.capture());
            AuditDomainEvent event = captor.getValue();
            assertThat(event.getCorrelationId()).isEqualTo("corr-123");
            assertThat(event.getUserId()).isEqualTo(userId);
            assertThat(event.getUsername()).isEqualTo("operator@park.co");
            assertThat(event.getBranchId()).isEqualTo(branchId);
        }

        @Test
        void fallsBackToSystemContextWhenNoneSet() throws Throwable {
            AuditContextHolder.clearContext(); // ensure no context

            var joinPoint = mock(org.aspectj.lang.ProceedingJoinPoint.class);
            var signature = mock(org.aspectj.lang.reflect.MethodSignature.class);
            var method = AuditableService.class.getMethod("create", String.class);

            when(joinPoint.getSignature()).thenReturn(signature);
            when(signature.getMethod()).thenReturn(method);
            when(joinPoint.getArgs()).thenReturn(new Object[]{});
            when(joinPoint.proceed()).thenReturn("ok");

            aspect.auditMethod(joinPoint);

            ArgumentCaptor<AuditDomainEvent> captor = ArgumentCaptor.forClass(AuditDomainEvent.class);
            verify(eventPublisher).publishEvent(captor.capture());
            // Falls back to SYSTEM
            assertThat(captor.getValue().getCorrelationId()).isEqualTo("SYSTEM");
            assertThat(captor.getValue().getUsername()).isEqualTo("SYSTEM");
        }
    }

    @Nested
    class ArgumentCapturing {

        @Test
        void capturesNonServletArguments() throws Throwable {
            var joinPoint = mock(org.aspectj.lang.ProceedingJoinPoint.class);
            var signature = mock(org.aspectj.lang.reflect.MethodSignature.class);
            var method = AuditableService.class.getMethod("create", String.class);

            when(joinPoint.getSignature()).thenReturn(signature);
            when(signature.getMethod()).thenReturn(method);
            when(joinPoint.getArgs()).thenReturn(new Object[]{"argument-value"});
            when(joinPoint.proceed()).thenReturn("ok");

            aspect.auditMethod(joinPoint);

            ArgumentCaptor<AuditDomainEvent> captor = ArgumentCaptor.forClass(AuditDomainEvent.class);
            verify(eventPublisher).publishEvent(captor.capture());
            assertThat(captor.getValue().getOldData()).isNotNull();
        }

        @Test
        void handlesNullArgumentsGracefully() throws Throwable {
            var joinPoint = mock(org.aspectj.lang.ProceedingJoinPoint.class);
            var signature = mock(org.aspectj.lang.reflect.MethodSignature.class);
            var method = AuditableService.class.getMethod("create", String.class);

            when(joinPoint.getSignature()).thenReturn(signature);
            when(signature.getMethod()).thenReturn(method);
            when(joinPoint.getArgs()).thenReturn(new Object[]{null});
            when(joinPoint.proceed()).thenReturn("ok");

            // Should not throw
            aspect.auditMethod(joinPoint);

            verify(eventPublisher).publishEvent(any(AuditDomainEvent.class));
        }
    }
}
