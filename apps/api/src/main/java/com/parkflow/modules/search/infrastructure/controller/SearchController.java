package com.parkflow.modules.search.infrastructure.controller;

import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.search.application.dto.SearchResponse;
import com.parkflow.modules.search.application.port.in.GlobalSearchUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
@Tag(name = "Search", description = "Global search across ParkFlow entities")
public class SearchController {

    private final GlobalSearchUseCase globalSearchUseCase;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Global search", description = "Search across all entities (rates, vehicles, sessions, users, etc.)")
    @ApiResponse(responseCode = "200", description = "Search results returned")
    @ApiResponse(responseCode = "401", description = "Unauthorized")
    public SearchResponse search(
            @RequestParam String q,
            @RequestParam(required = false) String scope) {

        UUID companyId = TenantContext.getTenantId();
        return globalSearchUseCase.execute(q, companyId, scope);
    }
}
