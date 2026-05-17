package com.parkflow.modules.search.infrastructure.controller;

import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.search.application.dto.SearchResponse;
import com.parkflow.modules.search.application.usecase.GlobalSearchUseCase;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
public class SearchController {

    private final GlobalSearchUseCase globalSearchUseCase;

    @GetMapping
    public SearchResponse search(
            @RequestParam String q,
            @RequestParam(required = false) String scope) {
        
        UUID companyId = TenantContext.getTenantId();
        return globalSearchUseCase.execute(q, companyId, scope);
    }
}
