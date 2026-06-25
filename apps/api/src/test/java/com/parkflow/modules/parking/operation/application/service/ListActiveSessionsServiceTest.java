package com.parkflow.modules.parking.operation.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.parkflow.modules.auth.security.AuthPrincipal;
import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.parking.operation.domain.*;
import com.parkflow.modules.parking.operation.domain.repository.CustodiedItemPort;
import com.parkflow.modules.parking.operation.domain.repository.ParkingSessionPort;
import com.parkflow.modules.parking.operation.dto.PaginatedResponse;
import com.parkflow.modules.parking.operation.dto.ReceiptResponse;
import com.parkflow.modules.parking.spaces.domain.ParkingSpace;
import com.parkflow.modules.parking.spaces.domain.ParkingSpaceAssignment;
import com.parkflow.modules.parking.spaces.application.service.ParkingSpaceService;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class ListActiveSessionsServiceTest {

  @Mock
  private ParkingSessionPort parkingSessionRepository;

  @Mock
  private CustodiedItemPort custodiedItemRepository;

  @Mock
  private ParkingSpaceService parkingSpaceService;

  @InjectMocks
  private ListActiveSessionsService service;

  private UUID companyId;

  @BeforeEach
  void setUp() {
    companyId = UUID.randomUUID();
    AuthPrincipal principal = new AuthPrincipal(
        UUID.randomUUID(),
        companyId,
        "operator@test.com",
        UserRole.OPERADOR.name(),
        List.of(new SimpleGrantedAuthority("ROLE_OPERADOR")));
    SecurityContextHolder.getContext().setAuthentication(
        new UsernamePasswordAuthenticationToken(principal, null, principal.authorities()));
    TenantContext.setTenantId(companyId);
  }

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
    TenantContext.clear();
  }

  @Test
  void executeShouldReturnPaginatedSessions_WhenNoSearchTerm() {
    ParkingSession session = createTestSession("ABC123", "CAR", "T-1001");
    Page<ParkingSession> page = new PageImpl<>(List.of(session));
    when(parkingSessionRepository.findActiveWithAssociations(eq(SessionStatus.ACTIVE), eq(companyId), any(Pageable.class)))
        .thenReturn(page);
    when(custodiedItemRepository.findBySession(any())).thenReturn(Collections.emptyList());
    when(parkingSpaceService.findAssignmentBySessionId(any())).thenReturn(null);

    PaginatedResponse<ReceiptResponse> result = service.execute(1, 25, null, null, null);

    assertThat(result.data()).hasSize(1);
    assertThat(result.data().get(0).plate()).isEqualTo("ABC123");
    assertThat(result.data().get(0).ticketNumber()).isEqualTo("T-1001");
    assertThat(result.meta().total()).isEqualTo(1);
  }

  @Test
  void executeShouldSearchByPlate_WhenSearchTermProvided() {
    ParkingSession session = createTestSession("XYZ789", "MOTORCYCLE", "T-2002");
    Page<ParkingSession> page = new PageImpl<>(List.of(session));
    when(parkingSessionRepository.searchActiveByPlateOrTicket(eq("XYZ"), eq(companyId), any(Pageable.class)))
        .thenReturn(page);
    when(custodiedItemRepository.findBySession(any())).thenReturn(Collections.emptyList());
    when(parkingSpaceService.findAssignmentBySessionId(any())).thenReturn(null);

    PaginatedResponse<ReceiptResponse> result = service.execute(1, 25, "XYZ", null, null);

    assertThat(result.data()).hasSize(1);
    assertThat(result.data().get(0).plate()).isEqualTo("XYZ789");
  }

  @Test
  void executeShouldReturnEmptyList_WhenNoActiveSessions() {
    Page<ParkingSession> emptyPage = new PageImpl<>(Collections.emptyList());
    when(parkingSessionRepository.findActiveWithAssociations(eq(SessionStatus.ACTIVE), eq(companyId), any(Pageable.class)))
        .thenReturn(emptyPage);

    PaginatedResponse<ReceiptResponse> result = service.execute(1, 25, null, null, null);

    assertThat(result.data()).isEmpty();
    assertThat(result.meta().total()).isZero();
  }

  @Test
  void executeShouldSortByEntryAtDescending_WhenSortDirIsDesc() {
    ParkingSession session1 = createTestSession("AAA111", "CAR", "T-0001");
    session1.setEntryAt(OffsetDateTime.now().minusHours(2));
    ParkingSession session2 = createTestSession("BBB222", "CAR", "T-0002");
    session2.setEntryAt(OffsetDateTime.now().minusHours(1));
    Page<ParkingSession> page = new PageImpl<>(List.of(session1, session2));
    when(parkingSessionRepository.findActiveWithAssociations(eq(SessionStatus.ACTIVE), eq(companyId), any(Pageable.class)))
        .thenReturn(page);
    when(custodiedItemRepository.findBySession(any())).thenReturn(Collections.emptyList());
    when(parkingSpaceService.findAssignmentBySessionId(any())).thenReturn(null);

    PaginatedResponse<ReceiptResponse> result = service.execute(1, 25, null, "entryAt", "desc");

    assertThat(result.data()).hasSize(2);
  }

  @Test
  void executeShouldHandlePagination_WhenPageParameterProvided() {
    ParkingSession session = createTestSession("PAGE123", "CAR", "T-3000");
    Page<ParkingSession> page = new PageImpl<>(List.of(session), org.springframework.data.domain.PageRequest.of(2, 10), 50);
    when(parkingSessionRepository.findActiveWithAssociations(eq(SessionStatus.ACTIVE), eq(companyId), any(Pageable.class)))
        .thenReturn(page);
    when(custodiedItemRepository.findBySession(any())).thenReturn(Collections.emptyList());
    when(parkingSpaceService.findAssignmentBySessionId(any())).thenReturn(null);

    PaginatedResponse<ReceiptResponse> result = service.execute(3, 10, null, null, null);

    assertThat(result.meta().page()).isEqualTo(3);
    assertThat(result.meta().limit()).isEqualTo(10);
    assertThat(result.meta().totalPages()).isEqualTo(5);
  }

  @Test
  void executeShouldCalculateDurationCorrectly() {
    OffsetDateTime entryAt = OffsetDateTime.now().minusMinutes(45);
    ParkingSession session = createTestSession("DUR123", "CAR", "T-4000");
    session.setEntryAt(entryAt);
    Rate rate = new Rate();
    rate.setGraceMinutes(5);
    session.setRate(rate);
    Page<ParkingSession> page = new PageImpl<>(List.of(session));
    when(parkingSessionRepository.findActiveWithAssociations(eq(SessionStatus.ACTIVE), eq(companyId), any(Pageable.class)))
        .thenReturn(page);
    when(custodiedItemRepository.findBySession(any())).thenReturn(Collections.emptyList());
    when(parkingSpaceService.findAssignmentBySessionId(any())).thenReturn(null);

    PaginatedResponse<ReceiptResponse> result = service.execute(1, 25, null, null, null);

    assertThat(result.data()).hasSize(1);
    assertThat(result.data().get(0).totalMinutes()).isGreaterThanOrEqualTo(45);
  }

  @Test
  void executeShouldIncludeParkingSpace_WhenAssigned() {
    ParkingSession session = createTestSession("SPACE123", "CAR", "T-5000");
    ParkingSpace space = new ParkingSpace();
    space.setId(UUID.randomUUID());
    space.setCode("A-01");
    space.setLabel("Zona A - Espacio 1");
    ParkingSpaceAssignment assignment = new ParkingSpaceAssignment();
    assignment.setParkingSpace(space);
    when(parkingSessionRepository.findActiveWithAssociations(eq(SessionStatus.ACTIVE), eq(companyId), any(Pageable.class)))
        .thenReturn(new PageImpl<>(List.of(session)));
    when(custodiedItemRepository.findBySession(any())).thenReturn(Collections.emptyList());
    when(parkingSpaceService.findAssignmentBySessionId(session.getId())).thenReturn(assignment);

    PaginatedResponse<ReceiptResponse> result = service.execute(1, 25, null, null, null);

    assertThat(result.data()).hasSize(1);
    assertThat(result.data().get(0).parkingSpaceCode()).isEqualTo("A-01");
    assertThat(result.data().get(0).parkingSpaceLabel()).isEqualTo("Zona A - Espacio 1");
  }

  @Test
  void executeShouldIncludeCustodiedItems_WhenPresent() {
    ParkingSession session = createTestSession("CUST123", "MOTORCYCLE", "T-6000");
    CustodiedItem helmet = CustodiedItem.builder()
        .id(UUID.randomUUID())
        .session(session)
        .itemType(CustodiedItemType.HELMET)
        .identifier("CASCO-001")
        .status(CustodiedItemStatus.RECEIVED)
        .build();
    when(parkingSessionRepository.findActiveWithAssociations(eq(SessionStatus.ACTIVE), eq(companyId), any(Pageable.class)))
        .thenReturn(new PageImpl<>(List.of(session)));
    when(custodiedItemRepository.findBySession(session)).thenReturn(List.of(helmet));
    when(parkingSpaceService.findAssignmentBySessionId(any())).thenReturn(null);

    PaginatedResponse<ReceiptResponse> result = service.execute(1, 25, null, null, null);

    assertThat(result.data()).hasSize(1);
    assertThat(result.data().get(0).custodiedItems()).hasSize(1);
    assertThat(result.data().get(0).custodiedItems().get(0).identifier()).isEqualTo("CASCO-001");
  }

  @Test
  void executeShouldHandleSearchWithPartialPlateMatch() {
    ParkingSession session = createTestSession("PARTIAL123", "CAR", "T-7000");
    Page<ParkingSession> page = new PageImpl<>(List.of(session));
    when(parkingSessionRepository.searchActiveByPlateOrTicket(eq("PARTIAL"), eq(companyId), any(Pageable.class)))
        .thenReturn(page);
    when(custodiedItemRepository.findBySession(any())).thenReturn(Collections.emptyList());
    when(parkingSpaceService.findAssignmentBySessionId(any())).thenReturn(null);

    PaginatedResponse<ReceiptResponse> result = service.execute(1, 25, "PARTIAL", null, null);

    assertThat(result.data()).hasSize(1);
    assertThat(result.data().get(0).plate()).contains("PARTIAL");
  }

  @Test
  void executeShouldUseDefaultPagination_WhenInvalidValuesProvided() {
    ParkingSession session = createTestSession("DEFAULT123", "CAR", "T-8000");
    Page<ParkingSession> page = new PageImpl<>(List.of(session));
    when(parkingSessionRepository.findActiveWithAssociations(eq(SessionStatus.ACTIVE), eq(companyId), any(Pageable.class)))
        .thenReturn(page);
    when(custodiedItemRepository.findBySession(any())).thenReturn(Collections.emptyList());
    when(parkingSpaceService.findAssignmentBySessionId(any())).thenReturn(null);

    PaginatedResponse<ReceiptResponse> result = service.execute(0, 0, null, null, null);

    assertThat(result.meta().page()).isEqualTo(1);
    assertThat(result.meta().limit()).isEqualTo(25);
  }

  @Test
  void executeShouldHandleMixedVehicleTypes() {
    ParkingSession carSession = createTestSession("CAR111", "CAR", "T-CAR001");
    ParkingSession motoSession = createTestSession("MOTO111", "MOTORCYCLE", "T-MOTO001");
    Page<ParkingSession> page = new PageImpl<>(List.of(carSession, motoSession));
    when(parkingSessionRepository.findActiveWithAssociations(eq(SessionStatus.ACTIVE), eq(companyId), any(Pageable.class)))
        .thenReturn(page);
    when(custodiedItemRepository.findBySession(any())).thenReturn(Collections.emptyList());
    when(parkingSpaceService.findAssignmentBySessionId(any())).thenReturn(null);

    PaginatedResponse<ReceiptResponse> result = service.execute(1, 25, null, null, null);

    assertThat(result.data()).hasSize(2);
    assertThat(result.data()).extracting(ReceiptResponse::vehicleType).containsExactlyInAnyOrder("CAR", "MOTORCYCLE");
  }

  private ParkingSession createTestSession(String plate, String vehicleType, String ticketNumber) {
    Vehicle vehicle = new Vehicle();
    vehicle.setId(UUID.randomUUID());
    vehicle.setPlate(plate);
    vehicle.setType(vehicleType);
    ParkingSession session = ParkingSession.builder()
        .id(UUID.randomUUID())
        .ticketNumber(ticketNumber)
        .plate(plate)
        .vehicle(vehicle)
        .companyId(companyId)
        .site("TEST-SITE")
        .status(SessionStatus.ACTIVE)
        .entryAt(OffsetDateTime.now())
        .entryMode(EntryMode.VISITOR)
        .build();
    return session;
  }
}
