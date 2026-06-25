package com.parkflow.modules.audit.application;

import com.parkflow.modules.audit.domain.AuditEvent;
import com.parkflow.modules.audit.infrastructure.persistence.AuditEventRepository;
import com.parkflow.modules.auth.security.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuditQueryServiceTest {

    @Mock
    private AuditEventRepository repository;

    @InjectMocks
    private AuditQueryService service;

    private UUID tenantId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        TenantContext.setTenantId(tenantId);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    @SuppressWarnings("unchecked")
    void getAuditEvents_WithFilters() {
        Page<AuditEvent> expectedPage = new PageImpl<>(List.of(new AuditEvent()));
        when(repository.findAll(any(Specification.class), any(PageRequest.class))).thenReturn(expectedPage);

        Page<AuditEvent> result = service.getAuditEvents(
                "auth",
                "login",
                UUID.randomUUID(),
                OffsetDateTime.now().minusDays(1),
                OffsetDateTime.now(),
                PageRequest.of(0, 10)
        );

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
    }

    @Test
    @SuppressWarnings("unchecked")
    void getAuditEvents_NoFilters_NoTenant() {
        TenantContext.clear();
        Page<AuditEvent> expectedPage = new PageImpl<>(List.of(new AuditEvent()));
        when(repository.findAll(any(Specification.class), any(PageRequest.class))).thenReturn(expectedPage);

        Page<AuditEvent> result = service.getAuditEvents(
                null, null, null, null, null, PageRequest.of(0, 10)
        );

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
    }

    @Test
    void getAuditEventDetails_Success() {
        UUID eventId = UUID.randomUUID();
        AuditEvent event = new AuditEvent();
        event.setId(eventId);
        event.setBranchId(tenantId);

        when(repository.findById(eventId)).thenReturn(Optional.of(event));

        AuditEvent result = service.getAuditEventDetails(eventId);

        assertNotNull(result);
        assertEquals(eventId, result.getId());
    }

    @Test
    void getAuditEventDetails_WrongTenant() {
        UUID eventId = UUID.randomUUID();
        AuditEvent event = new AuditEvent();
        event.setId(eventId);
        event.setBranchId(UUID.randomUUID()); // Different tenant

        when(repository.findById(eventId)).thenReturn(Optional.of(event));

        assertThrows(RuntimeException.class, () -> service.getAuditEventDetails(eventId));
    }

    @Test
    void validateIntegrity_Valid() throws Exception {
        UUID eventId = UUID.randomUUID();
        AuditEvent event = new AuditEvent();
        event.setId(eventId);
        event.setBranchId(tenantId);
        event.setCorrelationId("corr1");
        event.setTimestampUtc(OffsetDateTime.parse("2023-01-01T00:00:00Z"));
        event.setModule("auth");
        event.setAction("login");
        event.setStatus("SUCCESS");
        event.setPreviousHash("prevHash");

        // Calculate valid hash
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        String data = "corr12023-01-01T00:00ZauthloginSUCCESSprevHash";
        byte[] hashBytes = digest.digest(data.getBytes(StandardCharsets.UTF_8));
        String expectedHash = Base64.getEncoder().encodeToString(hashBytes);

        event.setIntegrityHash(expectedHash);

        when(repository.findById(eventId)).thenReturn(Optional.of(event));

        boolean isValid = service.validateIntegrity(eventId);

        assertTrue(isValid);
    }

    @Test
    void validateIntegrity_Invalid() {
        UUID eventId = UUID.randomUUID();
        AuditEvent event = new AuditEvent();
        event.setId(eventId);
        event.setBranchId(tenantId);
        event.setCorrelationId("corr1");
        event.setTimestampUtc(OffsetDateTime.parse("2023-01-01T00:00:00Z"));
        event.setModule("auth");
        event.setAction("login");
        event.setStatus("SUCCESS");
        event.setPreviousHash("prevHash");
        event.setIntegrityHash("wrongHash");

        when(repository.findById(eventId)).thenReturn(Optional.of(event));

        boolean isValid = service.validateIntegrity(eventId);

        assertFalse(isValid);
    }
}
