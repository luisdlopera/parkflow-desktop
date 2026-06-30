package com.parkflow.modules.auth.security;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import java.util.concurrent.TimeUnit;
import org.springframework.stereotype.Component;

@Component
public class OAuth2StateStore {

    private final Cache<String, OAuth2State> stateCache;

    public OAuth2StateStore() {
        this.stateCache = Caffeine.newBuilder()
            .expireAfterWrite(10, TimeUnit.MINUTES)
            .maximumSize(1000)
            .build();
    }

    public void save(String state, String provider, String nonce, String redirectUri) {
        stateCache.put(state, new OAuth2State(provider, nonce, redirectUri));
    }

    public OAuth2State consume(String state) {
        OAuth2State value = stateCache.getIfPresent(state);
        if (value != null) {
            stateCache.invalidate(state);
        }
        return value;
    }

    public record OAuth2State(String provider, String nonce, String redirectUri) {}
}
