package com.parkflow.modules.parking.operation.infrastructure.search;

import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.repository.ParkingSessionPort;
import com.parkflow.modules.search.domain.model.SearchResult;
import com.parkflow.modules.search.domain.model.SearchType;
import com.parkflow.modules.search.domain.port.SearchProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class ParkingSearchProvider implements SearchProvider {

    private final ParkingSessionPort parkingSessionPort;

    @Override
    public List<SearchResult> search(String query, UUID companyId) {
        List<ParkingSession> sessions = parkingSessionPort.searchByPlateOrTicket(query, companyId, PageRequest.of(0, 10));
        
        return sessions.stream().map(session -> SearchResult.builder()
                .id(session.getId().toString())
                .type(SearchType.VEHICLE)
                .title(session.getVehicle().getPlate())
                .subtitle("Ticket: " + session.getTicketNumber() + " | Status: " + session.getStatus())
                .actionUrl("/parking/sessions/" + session.getId())
                .score(calculateScore(session, query))
                .metadata(Map.of(
                        "status", session.getStatus(),
                        "entryAt", session.getEntryAt().toString()
                ))
                .build()
        ).collect(Collectors.toList());
    }

    @Override
    public boolean supports(String scope) {
        return "parking".equalsIgnoreCase(scope) || "vehicles".equalsIgnoreCase(scope);
    }

    private Double calculateScore(ParkingSession session, String query) {
        // Basic relevance: Exact plate match gets higher score
        if (session.getVehicle().getPlate().equalsIgnoreCase(query)) return 1.0;
        if (session.getTicketNumber().equalsIgnoreCase(query)) return 0.9;
        return 0.5; // Partial matches
    }
}
