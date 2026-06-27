package com.parkflow.modules.auth.infrastructure.search;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.auth.application.port.out.AppUserPort;
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
public class UserSearchProvider implements SearchProvider {

    private final AppUserPort appUserPort;

    @Override
    public List<SearchResult> search(String query, UUID companyId) {
        return appUserPort.search(query, null, companyId, PageRequest.of(0, 10))
                .stream()
                .map(user -> toResult(user, query))
                .collect(Collectors.toList());
    }

    @Override
    public boolean supports(String scope) {
        return "users".equalsIgnoreCase(scope) || "settings".equalsIgnoreCase(scope) || "admin-users".equalsIgnoreCase(scope);
    }

    private SearchResult toResult(AppUser user, String query) {
        return SearchResult.builder()
                .id(user.getId().toString())
                .type(SearchType.USER)
                .title(user.getName())
                .subtitle(buildSubtitle(user))
                .actionUrl("/admin/users")
                .score(calculateScore(user, query))
                .metadata(Map.of(
                        "email", user.getEmail(),
                        "role", user.getRole().name(),
                        "status", user.isActive() ? "ACTIVE" : "INACTIVE"
                ))
                .build();
    }

    private String buildSubtitle(AppUser user) {
        StringBuilder subtitle = new StringBuilder(user.getEmail());
        if (user.getRole() != null) {
            subtitle.append(" · ").append(labelFor(user.getRole()));
        }
        subtitle.append(user.isActive() ? " · Activo" : " · Inactivo");
        return subtitle.toString();
    }

    private String labelFor(UserRole role) {
        return switch (role) {
            case SUPER_ADMIN -> "Super admin";
            case ADMIN -> "Administrador";
            case CAJERO -> "Cajero";
            case OPERADOR -> "Operador";
            case AUDITOR -> "Auditor";
        };
    }

    private Double calculateScore(AppUser user, String query) {
        String q = query == null ? "" : query.trim().toLowerCase();
        if (q.isEmpty()) return 0.4;
        if (user.getEmail() != null && user.getEmail().equalsIgnoreCase(q)) return 1.0;
        if (user.getName() != null && user.getName().equalsIgnoreCase(q)) return 0.95;
        if (user.getDocument() != null && user.getDocument().equalsIgnoreCase(q)) return 0.9;
        if (user.getEmail() != null && user.getEmail().toLowerCase().contains(q)) return 0.8;
        if (user.getName() != null && user.getName().toLowerCase().contains(q)) return 0.75;
        if (user.getDocument() != null && user.getDocument().toLowerCase().contains(q)) return 0.7;
        return 0.5;
    }
}
