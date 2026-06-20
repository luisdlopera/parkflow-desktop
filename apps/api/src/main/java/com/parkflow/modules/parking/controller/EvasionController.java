package com.parkflow.modules.parking.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/evasions")
public class EvasionController {

    @PostMapping("/register")
    @PreAuthorize("hasAnyAuthority('evasiones:registrar', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
    public ResponseEntity<String> registerEvasion(@Valid @RequestBody EvasionRequest request) {
        // Logic to register an evaded vehicle and block it
        return ResponseEntity.ok("Evasion registered for plate: " + request.getPlate());
    }

    @PostMapping("/lost-ticket")
    @PreAuthorize("hasAnyAuthority('evasiones:registrar', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN')")
    public ResponseEntity<String> reportLostTicket(@Valid @RequestBody LostTicketRequest request) {
        // Logic to apply lost ticket surcharge and generate special closing
        return ResponseEntity.ok("Lost ticket registered for session: " + request.getSessionId());
    }
}

class EvasionRequest {
    @NotBlank(message = "La placa es obligatoria")
    @Size(max = 20, message = "La placa no puede superar 20 caracteres")
    private String plate;

    public String getPlate() { return plate; }
    public void setPlate(String plate) { this.plate = plate; }
}

class LostTicketRequest {
    @NotNull(message = "El ID de la sesión es obligatorio")
    private UUID sessionId;

    public UUID getSessionId() { return sessionId; }
    public void setSessionId(UUID sessionId) { this.sessionId = sessionId; }
}
