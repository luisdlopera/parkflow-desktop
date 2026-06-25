package com.parkflow.modules.cash.application.usecase;

import static org.assertj.core.api.Assertions.assertThat;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.cash.domain.CashAuditLog;
import com.parkflow.modules.cash.domain.CashRegister;
import com.parkflow.modules.cash.domain.CashSession;
import com.parkflow.modules.cash.domain.CashSessionDenomination;
import com.parkflow.modules.cash.domain.CashSessionStatus;
import com.parkflow.modules.cash.dto.CashAuditEntryResponse;
import com.parkflow.modules.cash.dto.CashSessionResponse;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class CashSessionResponseMapperTest {

  private CashSessionResponseMapper mapper;

  @BeforeEach
  void setUp() {
    mapper = new CashSessionResponseMapper();
  }

  @Test
  void baseMeta_ShouldReturnCorrectMap() {
    // Arrange
    CashRegister register = new CashRegister();
    com.parkflow.modules.configuration.domain.ParkingSite siteRef = new com.parkflow.modules.configuration.domain.ParkingSite();
    siteRef.setCode("SiteA");
    register.setSiteRef(siteRef);
    register.setTerminal("Terminal1");

    CashSession session = new CashSession();
    UUID sessionId = UUID.randomUUID();
    session.setId(sessionId);
    session.setCashRegister(register);

    // Act
    Map<String, Object> meta = mapper.baseMeta(session);

    // Assert
    assertThat(meta).hasSize(2);
    assertThat(meta.get("sessionId")).isEqualTo(sessionId.toString());
    assertThat(meta.get("register")).isEqualTo("SiteA/Terminal1");
  }

  @Test
  void toAuditEntryResponse_ShouldMapAllFields() {
    // Arrange
    AppUser actor = new AppUser();
    actor.setId(UUID.randomUUID());
    actor.setName("Test User");

    CashAuditLog auditLog = new CashAuditLog();
    auditLog.setId(UUID.randomUUID());
    auditLog.setAction("CREATE_SESSION");
    auditLog.setActorUser(actor);
    auditLog.setTerminalId("T1");
    auditLog.setClientIp("127.0.0.1");
    auditLog.setOldValue("old");
    auditLog.setNewValue("new");
    auditLog.setReason("test reason");
    auditLog.setMetadata("meta");
    auditLog.setCreatedAt(OffsetDateTime.now());

    // Act
    CashAuditEntryResponse response = mapper.toAuditEntryResponse(auditLog);

    // Assert
    assertThat(response.id()).isEqualTo(auditLog.getId());
    assertThat(response.action()).isEqualTo("CREATE_SESSION");
    assertThat(response.actorUserId()).isEqualTo(actor.getId());
    assertThat(response.actorName()).isEqualTo("Test User");
    assertThat(response.terminalId()).isEqualTo("T1");
    assertThat(response.clientIp()).isEqualTo("127.0.0.1");
    assertThat(response.oldValue()).isEqualTo("old");
    assertThat(response.newValue()).isEqualTo("new");
    assertThat(response.reason()).isEqualTo("test reason");
    assertThat(response.metadata()).isEqualTo("meta");
    assertThat(response.createdAt()).isEqualTo(auditLog.getCreatedAt());
  }

  @Test
  void toAuditEntryResponse_WithNullActor_ShouldMapSafely() {
    // Arrange
    CashAuditLog auditLog = new CashAuditLog();
    auditLog.setId(UUID.randomUUID());
    auditLog.setAction("SYSTEM_ACTION");

    // Act
    CashAuditEntryResponse response = mapper.toAuditEntryResponse(auditLog);

    // Assert
    assertThat(response.actorUserId()).isNull();
    assertThat(response.actorName()).isNull();
    assertThat(response.action()).isEqualTo("SYSTEM_ACTION");
  }

  @Test
  void toSessionResponse_ShouldMapAllFieldsAndDenominations() {
    // Arrange
    CashRegister register = new CashRegister();
    com.parkflow.modules.configuration.domain.ParkingSite siteRef = new com.parkflow.modules.configuration.domain.ParkingSite();
    siteRef.setCode("SiteA");
    register.setSiteRef(siteRef);
    register.setTerminal("Terminal1");
    register.setId(UUID.randomUUID());
    register.setLabel("Main Terminal");
    com.parkflow.modules.configuration.domain.ParkingSite siteRef2 = new com.parkflow.modules.configuration.domain.ParkingSite();
    siteRef2.setCode("MainSite");
    register.setSiteRef(siteRef2);

    AppUser operator = new AppUser();
    operator.setId(UUID.randomUUID());
    operator.setName("Operator1");

    AppUser closer = new AppUser();
    closer.setId(UUID.randomUUID());
    closer.setName("Closer1");

    CashSession session = new CashSession();
    session.setId(UUID.randomUUID());
    session.setCashRegister(register);
    session.setOperator(operator);
    session.setStatus(CashSessionStatus.CLOSED);
    session.setOpeningAmount(new BigDecimal("100.00"));
    session.setOpenedAt(OffsetDateTime.now().minusSeconds(3600));
    session.setClosedAt(OffsetDateTime.now());
    session.setClosedBy(closer);
    session.setExpectedAmount(new BigDecimal("200.00"));
    session.setCountedAmount(new BigDecimal("200.00"));
    session.setDifferenceAmount(new BigDecimal("0.00"));
    session.setCountCash(new BigDecimal("150.00"));
    session.setCountCard(new BigDecimal("50.00"));
    session.setCountTransfer(BigDecimal.ZERO);
    session.setCountOther(BigDecimal.ZERO);
    session.setNotes("Notes");
    session.setClosingNotes("Closing notes");
    session.setClosingWitnessName("Witness1");
    session.setSupportDocumentNumber("DOC-123");
    session.setCountedAt(OffsetDateTime.now());
    session.setCountOperator(closer);

    CashSessionDenomination denom = new CashSessionDenomination();
    denom.setDenomination(new BigDecimal("50000"));
    denom.setQuantity(3);
    session.setDenominations(List.of(denom));

    // Act
    CashSessionResponse response = mapper.toSessionResponse(session);

    // Assert
    assertThat(response.id()).isEqualTo(session.getId());
    assertThat(response.register().site()).isEqualTo("MainSite");
    assertThat(response.operatorName()).isEqualTo("Operator1");
    assertThat(response.status()).isEqualTo("CLOSED");
    assertThat(response.closedById()).isEqualTo(closer.getId());
    assertThat(response.closedByName()).isEqualTo("Closer1");
    assertThat(response.countOperatorName()).isEqualTo("Closer1");
    assertThat(response.denominations()).hasSize(1);
    assertThat(response.denominations().get(0).denomination()).isEqualByComparingTo("50000");
    assertThat(response.denominations().get(0).quantity()).isEqualTo(3);
  }

  @Test
  void toSessionResponse_WithNulls_ShouldMapSafely() {
    // Arrange
    CashRegister register = new CashRegister();
    com.parkflow.modules.configuration.domain.ParkingSite siteRef = new com.parkflow.modules.configuration.domain.ParkingSite();
    siteRef.setCode("SiteA");
    register.setSiteRef(siteRef);
    register.setTerminal("Terminal1");
    AppUser operator = new AppUser();
    operator.setName("Op");

    CashSession session = new CashSession();
    session.setId(UUID.randomUUID());
    session.setCashRegister(register);
    session.setOperator(operator);
    session.setStatus(CashSessionStatus.OPEN);

    // Act
    CashSessionResponse response = mapper.toSessionResponse(session);

    // Assert
    assertThat(response.status()).isEqualTo("OPEN");
    assertThat(response.closedById()).isNull();
    assertThat(response.countOperatorName()).isNull();
    assertThat(response.denominations()).isNull(); // Empty denominations leads to null
  }
}
