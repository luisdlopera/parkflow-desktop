package com.parkflow.modules.parking.operation.infrastructure.search;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.SessionStatus;
import com.parkflow.modules.parking.operation.domain.Vehicle;
import com.parkflow.modules.parking.operation.domain.repository.ParkingSessionPort;
import com.parkflow.modules.search.domain.model.SearchResult;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;

class ParkingSearchProviderTest {

  private ParkingSessionPort parkingSessionPort;
  private ParkingSearchProvider provider;

  @BeforeEach
  void setUp() {
    parkingSessionPort = mock(ParkingSessionPort.class);
    provider = new ParkingSearchProvider(parkingSessionPort);
  }

  @Test
  void supports_ShouldReturnTrueForParkingAndVehicles() {
    assertTrue(provider.supports("parking"));
    assertTrue(provider.supports("vehicles"));
    assertFalse(provider.supports("settings"));
  }

  @Test
  void search_ShouldReturnEmptyWhenQueryIsBlank() {
    assertTrue(provider.search("", UUID.randomUUID()).isEmpty());
    assertTrue(provider.search("   ", UUID.randomUUID()).isEmpty());
    assertTrue(provider.search(null, UUID.randomUUID()).isEmpty());
  }

  @Test
  void search_ShouldReturnMappedResults() {
    ParkingSession s1 = mock(ParkingSession.class);
    UUID sessionId = UUID.randomUUID();
    when(s1.getId()).thenReturn(sessionId);
    when(s1.getTicketNumber()).thenReturn("T123");
    when(s1.getStatus()).thenReturn(SessionStatus.ACTIVE);
    when(s1.getEntryAt()).thenReturn(OffsetDateTime.now());
    Vehicle v = mock(Vehicle.class);
    when(v.getPlate()).thenReturn("ABC123");
    when(s1.getVehicle()).thenReturn(v);

    when(parkingSessionPort.searchByPlateOrTicket(any(), any(), any())).thenReturn(new PageImpl<>(List.of(s1)));

    List<SearchResult> results = provider.search("ABC", UUID.randomUUID());

    assertEquals(1, results.size());
    assertEquals(sessionId.toString(), results.get(0).getId());
    assertEquals("ABC123", results.get(0).getTitle());
    assertEquals("Ticket: T123 | Status: ACTIVE", results.get(0).getSubtitle());
    assertEquals("/parking/sessions/" + s1.getId(), results.get(0).getActionUrl());
  }
}
