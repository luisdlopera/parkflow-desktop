package com.parkflow.modules.parking.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/evasions")
public class EvasionController {

    @PostMapping("/register")
    public ResponseEntity<String> registerEvasion(@RequestBody EvasionRequest request) {
        // Logic to register an evaded vehicle and block it
        return ResponseEntity.ok("Evasion registered for plate: " + request.getPlate());
    }

    @PostMapping("/lost-ticket")
    public ResponseEntity<String> reportLostTicket(@RequestBody LostTicketRequest request) {
        // Logic to apply lost ticket surcharge and generate special closing
        return ResponseEntity.ok("Lost ticket registered for session: " + request.getSessionId());
    }
}

class EvasionRequest {
    private String plate;
    public String getPlate() { return plate; }
    public void setPlate(String plate) { this.plate = plate; }
}

class LostTicketRequest {
    private UUID sessionId;
    public UUID getSessionId() { return sessionId; }
    public void setSessionId(UUID sessionId) { this.sessionId = sessionId; }
}
