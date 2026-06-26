# ADR-0003: Authentication Strategy (JWT + Role/Authority-Based Authorization)

**Status**: Accepted  
**Date**: 2026-06-25  
**Version**: 1.0  

---

## Context

ParkFlow serves multiple user types across 100+ parking facilities:
- **Super Admins**: Configure system, manage companies
- **Operations Managers**: Manage parking operations, view reports
- **Cashiers**: Open sessions, collect cash, print receipts
- **Auditors**: View audit trails, compliance reports
- **Device Terminals**: Hardware (kiosks, printers) with API keys
- **Third-Party Integrations**: Billing, licensing, SMS providers

Early implementations had security gaps:
- Plain-text password storage (❌ found in early sprint)
- Role-based access hardcoded in controllers (❌ `if (role == "ADMIN") ...`)
- No token expiration (session hijacking risk)
- Device authentication mixed with user authentication
- API key rotation not enforced

---

## Decision

**Adopt JWT-based authentication with Spring Security's Authority-based authorization system.**

### Components

#### 1. Authentication (Identity Verification)

**JWT Token Structure**:
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user-uuid",
    "email": "operator@parkflow.local",
    "name": "John Operator",
    "company": "company-uuid",
    "iat": 1719334800,
    "exp": 1719338400,
    "aud": "parkflow-api"
  },
  "signature": "HMACSHA256(...)"
}
```

**Token Lifecycle**:
1. **Access Token**: Short-lived (15 minutes), used for API requests
2. **Refresh Token**: Long-lived (7 days), used to obtain new access token
3. **Device Token**: Long-lived (30 days), for kiosk/hardware (no refresh)

**Endpoints**:
```http
POST /api/v1/auth/login
  Request: { email, password }
  Response: { accessToken, refreshToken, expiresIn }

POST /api/v1/auth/refresh
  Request: { refreshToken }
  Response: { accessToken, expiresIn }

POST /api/v1/auth/logout
  Request: {}
  Response: { success: true }

POST /api/v1/auth/device-token
  Request: { apiKey, hardwareId }
  Response: { deviceToken, expiresIn }
```

#### 2. Authorization (Permission Verification)

**Authority Hierarchy**:
```
ROLE_SUPER_ADMIN
  ├── AUTHORITY_SYSTEM_CONFIG_READ
  ├── AUTHORITY_SYSTEM_CONFIG_WRITE
  ├── AUTHORITY_COMPANY_CREATE
  ├── AUTHORITY_COMPANY_DELETE
  └── ... (30+ system authorities)

ROLE_COMPANY_ADMIN (per company)
  ├── AUTHORITY_COMPANY_READ
  ├── AUTHORITY_COMPANY_WRITE
  ├── AUTHORITY_PARKING_CONFIG_WRITE
  └── ... (15+ company authorities)

ROLE_OPERATIONS_MANAGER (per site)
  ├── AUTHORITY_PARKING_SESSION_CREATE
  ├── AUTHORITY_PARKING_SESSION_CLOSE
  ├── AUTHORITY_REPORTS_VIEW
  └── ... (8+ operation authorities)

ROLE_CASHIER (per site)
  ├── AUTHORITY_CASH_SESSION_CREATE
  ├── AUTHORITY_CASH_SESSION_CLOSE
  ├── AUTHORITY_RECEIPT_PRINT
  └── ... (5+ cashier authorities)

ROLE_AUDITOR (per company)
  └── AUTHORITY_AUDIT_READ
```

**Spring Security Configuration**:
```java
@Configuration
@EnableWebSecurity
public class SecurityConfiguration {
  
  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
      .authorizeHttpRequests(authz -> authz
        // Public endpoints
        .requestMatchers(HttpMethod.POST, "/api/v1/auth/login").permitAll()
        .requestMatchers("/api/v1/auth/device-token").permitAll()
        .requestMatchers("/actuator/health").permitAll()
        
        // Super Admin only
        .requestMatchers("/api/v1/system/**")
          .hasRole("SUPER_ADMIN")
        
        // Company Admin
        .requestMatchers(HttpMethod.PATCH, "/api/v1/configuration/**")
          .hasAuthority("AUTHORITY_COMPANY_WRITE")
        
        // Operations Manager
        .requestMatchers(HttpMethod.POST, "/api/v1/parking/sessions")
          .hasAuthority("AUTHORITY_PARKING_SESSION_CREATE")
        
        // Cashier
        .requestMatchers(HttpMethod.POST, "/api/v1/cash-sessions")
          .hasAuthority("AUTHORITY_CASH_SESSION_CREATE")
        
        // Auditor
        .requestMatchers(HttpMethod.GET, "/api/v1/audit/**")
          .hasAuthority("AUTHORITY_AUDIT_READ")
        
        // Catch-all
        .anyRequest().authenticated()
      )
      .jwt(jwt -> jwt
        .decoder(jwtDecoder())
        .jwtAuthenticationConverter(jwtAuthenticationConverter())
      )
      .csrf(csrf -> csrf.disable())
      .cors(cors -> cors.configurationSource(corsConfigurationSource()));
    
    return http.build();
  }
  
  private JwtAuthenticationConverter jwtAuthenticationConverter() {
    JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
    converter.setJwtGrantedAuthoritiesConverter(jwt -> {
      Collection<String> authorities = jwt.getClaimAsStringList("authorities");
      return authorities.stream()
        .map(SimpleGrantedAuthority::new)
        .collect(toList());
    });
    return converter;
  }
}
```

#### 3. Port-Based Authorization

**Output Port for Authorization Decisions**:
```java
public interface AuthorizationPortOut {
  /**
   * Check if user has permission for action.
   * @param userId User making the request
   * @param action AUTHORITY_* constant
   * @param resource Resource being accessed (e.g., company ID, site ID)
   * @return true if authorized
   */
  boolean isAuthorized(UUID userId, String action, String resource);
  
  /**
   * Get user's accessible companies.
   */
  List<UUID> getAccessibleCompanies(UUID userId);
  
  /**
   * Get user's accessible sites within company.
   */
  List<UUID> getAccessibleSites(UUID userId, UUID companyId);
}
```

**Service Using Authorization Port**:
```java
@Service
@RequiredArgsConstructor
public class CashSessionCreationService {
  private final AuthorizationPortOut authorization;
  private final CashSessionRepositoryPort repository;
  
  public CashSessionResponse createSession(UUID userId, CreateCashSessionRequest request) {
    // Check authorization
    if (!authorization.isAuthorized(userId, "AUTHORITY_CASH_SESSION_CREATE", 
                                    request.getSiteId())) {
      throw new AuthorizationException("Not authorized to create session");
    }
    
    // Business logic
    CashSession session = new CashSession(request.getSiteId(), userId);
    return repository.save(session);
  }
}
```

---

## Consequences

### Positive

✅ **Security**: 
- Short-lived access tokens minimize exposure
- Refresh tokens can be revoked without user logout
- Device tokens separate from user tokens (hardware compromise ≠ account compromise)
- JWT validation happens server-side (signature verification)

✅ **Scalability**:
- Stateless authentication (no session storage)
- JWTs contain all claims; no database lookup per request
- Supports distributed systems (multiple API instances)
- Device tokens enable offline operation (Tauri can verify locally)

✅ **Clarity**:
- Authority declarations clear in controllers (`@HasAuthority("AUTHORITY_*")`)
- Fine-grained permissions (not just role-based)
- Easy to audit who can do what

✅ **Flexibility**:
- Add new authorities without changing authentication system
- Different permission models per company (future multi-tenancy)
- Support device-specific, time-based, or location-based authorization

### Negative

❌ **Complexity**: OAuth2 / OIDC setup more involved than basic role-based
- Mitigation: Spring Security + JWT libraries handle complexity; developers use simple annotations

❌ **Token Revocation**: Revoking token before expiry requires database check
- Workaround: Refresh tokens stored in database; access tokens not revoked (rely on 15-min expiry)

❌ **Clock Skew**: Distributed systems with misaligned clocks can cause token validation failures
- Mitigation: NTP synchronization, clock skew tolerance in JWT validation (±5 seconds)

---

## Implementation Details

### 1. User Model
```java
@Entity
@Table(name = "app_user")
public class User {
  @Id
  private UUID id;
  
  @Column(unique = true, nullable = false)
  private String email;
  
  @Column(nullable = false)
  private String passwordHash;  // BCrypt, not plain text!
  
  @Column(nullable = false)
  private String name;
  
  @Enumerated(EnumType.STRING)
  private UserRole role;  // SUPER_ADMIN, COMPANY_ADMIN, etc.
  
  @ManyToOne
  @JoinColumn(name = "company_id")
  private Company company;  // null for SUPER_ADMIN
  
  @ManyToMany
  @JoinTable(
    name = "user_site_access",
    joinColumns = @JoinColumn(name = "user_id"),
    inverseJoinColumns = @JoinColumn(name = "site_id")
  )
  private Set<ParkingSite> accessibleSites;
  
  @Column(nullable = false, updatable = false)
  private LocalDateTime createdAt;
  
  @Column(nullable = false)
  private LocalDateTime updatedAt;
  
  @Column
  private LocalDateTime lastLogin;
  
  @Column(nullable = false)
  private boolean active = true;
}
```

### 2. Refresh Token Storage
```java
@Entity
@Table(name = "refresh_token")
public class RefreshToken {
  @Id
  private String tokenValue;  // Hashed token
  
  @ManyToOne
  @JoinColumn(name = "user_id")
  private User user;
  
  @Column(nullable = false)
  private LocalDateTime expiresAt;
  
  @Column(nullable = false)
  private LocalDateTime createdAt;
  
  @Column
  private LocalDateTime revokedAt;  // null if active
  
  @Column
  private String revokeReason;
  
  public boolean isValid() {
    return revokedAt == null && expiresAt.isAfter(now());
  }
}
```

### 3. Authentication Service
```java
@Service
@RequiredArgsConstructor
public class AuthenticationService {
  private final UserRepositoryPort userRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtTokenProvider tokenProvider;
  private final RefreshTokenRepositoryPort refreshTokenRepository;
  
  public AuthenticationResponse login(LoginRequest request) {
    User user = userRepository.findByEmail(request.getEmail())
      .orElseThrow(() -> new AuthenticationException("Invalid credentials"));
    
    if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
      throw new AuthenticationException("Invalid credentials");
    }
    
    if (!user.isActive()) {
      throw new AuthenticationException("User account disabled");
    }
    
    // Create tokens
    String accessToken = tokenProvider.generateAccessToken(user);
    String refreshToken = tokenProvider.generateRefreshToken(user);
    
    // Store refresh token
    RefreshToken rt = new RefreshToken();
    rt.setTokenValue(hashToken(refreshToken));
    rt.setUser(user);
    rt.setExpiresAt(now().plusDays(7));
    rt.setCreatedAt(now());
    refreshTokenRepository.save(rt);
    
    // Audit
    auditService.logLogin(user.getId(), request.getClientIp());
    
    return new AuthenticationResponse(accessToken, refreshToken, 15 * 60);  // 15 min
  }
  
  public void logout(UUID userId) {
    // Revoke all refresh tokens for user
    refreshTokenRepository.revokeAllForUser(userId);
  }
}
```

### 4. Password Security
```
✅ Hashing Algorithm: BCrypt (auto-salt, auto-iterations)
✅ Password Policy: Min 8 chars, uppercase + lowercase + digit + special char
✅ Login Attempts: 5 failures → account locked 15 minutes
✅ Password Expiry: 90 days (configurable per company)
✅ Breach Detection: Integrated with HaveIBeenPwned API (future)
```

---

## Transition Plan

### Current Status
- [✅] JWT token generation implemented
- [✅] Spring Security configuration in place
- [✅] User role hierarchy defined
- [✅] Refresh token storage added
- [ ] Authority-based checks in all controllers (in progress)
- [ ] Device token endpoint (pending)
- [ ] Multi-tenancy authorization (deferred to Phase 2)

### Timeline
- **Week 1**: Document authorities matrix (done)
- **Week 2-3**: Retrofit existing controllers with @HasAuthority (50% done)
- **Week 4**: Device authentication (pending)
- **Week 5**: Testing and security audit

---

## Testing Strategy

### Unit Tests
```java
@ExtendWith(MockitoExtension.class)
class AuthenticationServiceTest {
  @Mock UserRepositoryPort userRepository;
  @Mock PasswordEncoder passwordEncoder;
  @Mock JwtTokenProvider tokenProvider;
  @Mock RefreshTokenRepositoryPort refreshTokenRepository;
  @InjectMocks AuthenticationService service;
  
  @Test
  void login_validCredentials_returnsTokens() { ... }
  
  @Test
  void login_invalidPassword_throwsException() { ... }
  
  @Test
  void login_disabledUser_throwsException() { ... }
}
```

### Integration Tests
```java
@SpringBootTest
class AuthenticationControllerTest {
  @Autowired MockMvc mockMvc;
  @Autowired UserRepository userRepository;
  @Autowired PasswordEncoder passwordEncoder;
  
  @Test
  void postLogin_validCredentials_returns200WithTokens() {
    mockMvc.perform(post("/api/v1/auth/login")
      .contentType(APPLICATION_JSON)
      .content(objectMapper.writeValueAsString(
        new LoginRequest("admin@parkflow.local", "Qwert.12345"))))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.accessToken").isNotEmpty());
  }
}
```

---

## Related ADRs

- [ADR-0001: Hexagonal Architecture](0001-hexagonal-architecture.md) — AuthorizationPortOut as example
- [ADR-0004: Multi-Tenant RLS](0004-multi-tenant-rls.md) — Row-level security + authority checks
- [ADR-0005: Deprecation Path](0005-deprecation-path.md) — Auth endpoint versioning

---

## References

- **RFC 7519**: JSON Web Token (JWT) standard
- **RFC 7234**: HTTP/1.1 Cache Control header
- **Spring Security**: [JWT Authentication](https://spring.io/blog/2015/01/12/the-login-page-angular-js-and-spring-security-part-ii)
- **OWASP**: [Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- **Auth0**: [JWT Best Practices](https://auth0.com/resources/whitepapers/jwt-best-practices)

---

**Last Updated**: 2026-06-25  
**Maintainer**: Staff Software Engineer (Security)  
**Enforcement**: Mandatory for all endpoints (code review + automated checks)  
**Compliance**: OWASP Top 10 #2 (Broken Authentication), PCI DSS
