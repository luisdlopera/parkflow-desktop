package com.parkflow.modules.parking.operation.infrastructure.persistence;

import com.parkflow.config.BaseIntegrationTest;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.SessionStatus;
import com.parkflow.modules.parking.operation.domain.Vehicle;
import com.parkflow.modules.parking.operation.domain.repository.ParkingSessionPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;

import java.time.OffsetDateTime;

import static org.junit.jupiter.api.Assertions.*;

@org.springframework.transaction.annotation.Transactional
class ParkingSessionJpaAdapterTest extends BaseIntegrationTest {

    @Autowired
    private ParkingSessionPort parkingSessionPort;

    private ParkingSession activeSession;

    @Autowired
    private jakarta.persistence.EntityManager entityManager;

    @BeforeEach
    void setupData() {
        Vehicle vehicle = new Vehicle();
        vehicle.setCompanyId(companyId);
        vehicle.setPlate("ABC1234");
        vehicle.setType("CAR");
        vehicle.setVehicleTypeId(vehicleTypeId);
        entityManager.persist(vehicle);
        
        activeSession = ParkingSession.builder()
            .companyId(companyId)
            .ticketNumber("TCK-1234")
            .vehicle(vehicle)
            .entryMode(com.parkflow.modules.parking.operation.domain.EntryMode.VISITOR)
            .entryAt(OffsetDateTime.now().minusHours(1))
            .rate(entityManager.find(com.parkflow.modules.parking.operation.domain.Rate.class, rateId))
            .status(SessionStatus.ACTIVE)
            .createdAt(OffsetDateTime.now())
            .updatedAt(OffsetDateTime.now())
            .build();
            
        activeSession = parkingSessionPort.save(activeSession);
    }

    @Test
    void testCountMethods() {
        long countStatus = parkingSessionPort.countByStatusAndCompanyId(SessionStatus.ACTIVE, companyId);
        assertTrue(countStatus >= 1);

        long countRate = parkingSessionPort.countByRate_IdAndCompanyId(rateId, companyId);
        assertTrue(countRate >= 1);

        long activeCount = parkingSessionPort.countActive(companyId);
        assertTrue(activeCount >= 1);

        long syncPending = parkingSessionPort.countSyncPending(companyId);
        assertTrue(syncPending >= 0);
    }

    @Test
    void testFindActiveWithAssociations() {
        var page = parkingSessionPort.findActiveWithAssociations(SessionStatus.ACTIVE, companyId, PageRequest.of(0, 10));
        assertFalse(page.isEmpty());
    }

    @Test
    void testFinders() {
        var byPlate = parkingSessionPort.findByStatusAndVehicle_PlateAndCompanyId(SessionStatus.ACTIVE, "ABC1234", companyId);
        assertTrue(byPlate.isPresent());

        var byTicket = parkingSessionPort.findByStatusAndTicketNumberAndCompanyId(SessionStatus.ACTIVE, "TCK-1234", companyId);
        assertTrue(byTicket.isPresent());

        var byTicketAny = parkingSessionPort.findByTicketNumberAndCompanyId("TCK-1234", companyId);
        assertTrue(byTicketAny.isPresent());

        var forUpdateTicket = parkingSessionPort.findActiveByTicketForUpdate(SessionStatus.ACTIVE, "TCK-1234", companyId);
        assertTrue(forUpdateTicket.isPresent());

        var forUpdatePlate = parkingSessionPort.findActiveByPlateForUpdate(SessionStatus.ACTIVE, "ABC1234", companyId);
        assertTrue(forUpdatePlate.isPresent());

        var updateAny = parkingSessionPort.findByTicketNumberForUpdate("TCK-1234", companyId);
        assertTrue(updateAny.isPresent());
    }

    @Test
    void testPeriodCounters() {
        OffsetDateTime start = OffsetDateTime.now().minusDays(1);
        OffsetDateTime end = OffsetDateTime.now().plusDays(1);

        long entries = parkingSessionPort.countEntriesInPeriod(start, end, companyId);
        assertTrue(entries >= 1);

        long exits = parkingSessionPort.countExitsInPeriod(start, end, companyId);
        assertEquals(0, exits); // it is active

        long reprints = parkingSessionPort.countReprintsInPeriod(start, end, companyId);
        assertEquals(0, reprints);

        long operatorReprints = parkingSessionPort.countReprintsByOperatorInPeriod(start, end, adminUserId, companyId);
        assertEquals(0, operatorReprints);

        long lostTickets = parkingSessionPort.countLostTicketsInPeriod(start, end, companyId);
        assertEquals(0, lostTickets);
    }

    @Test
    void testSearch() {
        var searchAll = parkingSessionPort.searchByPlateOrTicket("TCK", companyId, PageRequest.of(0, 10));
        assertFalse(searchAll.isEmpty());

        var searchActive = parkingSessionPort.searchActiveByPlateOrTicket("ABC", companyId, PageRequest.of(0, 10));
        assertFalse(searchActive.isEmpty());
    }

    @Test
    void testBasicCrud() {
        var found = parkingSessionPort.findById(activeSession.getId());
        assertTrue(found.isPresent());

        parkingSessionPort.delete(activeSession);
        var afterDelete = parkingSessionPort.findById(activeSession.getId());
        assertFalse(afterDelete.isPresent());
    }
}
