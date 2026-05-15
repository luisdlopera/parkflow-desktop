package com.parkflow.config;

import com.parkflow.modules.cash.domain.CashRegister;
import com.parkflow.modules.cash.domain.repository.CashRegisterPort;
import com.parkflow.modules.configuration.domain.ParkingSite;
import com.parkflow.modules.configuration.domain.repository.ParkingSitePort;
import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.Company.OperationMode;
import com.parkflow.modules.licensing.enums.CompanyStatus;
import com.parkflow.modules.licensing.enums.PlanType;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import com.parkflow.modules.parking.operation.domain.AppUser;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateType;
import com.parkflow.modules.parking.operation.domain.RoundingMode;
import com.parkflow.modules.parking.operation.domain.UserRole;
import com.parkflow.modules.auth.security.PasswordHashService;
import com.parkflow.modules.parking.operation.domain.repository.AppUserPort;
import com.parkflow.modules.parking.operation.domain.repository.RatePort;
import com.parkflow.modules.settings.domain.MasterVehicleType;
import com.parkflow.modules.settings.domain.repository.MasterVehicleTypePort;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Base class for API integration tests.
 *
 * Uses H2 in-memory database (configured in src/test/resources/application.yml)
 * instead of Testcontainers/PostgreSQL. This provides fast, self-contained tests
 * that do not require Docker.
 *
 * The test `application.yml` configures H2 with `create-drop` DDL strategy and
 * Flyway disabled. All entities use JPA field access which is compatible with H2.
 * The H2Dialect is configured for proper SQL generation.
 *
 * If PostgreSQL-specific validation is needed, Testcontainers dependencies are
 * available in build.gradle (spring-boot-testcontainers, testcontainers:postgresql).
 * See docs/TEST_ANALYSIS_2026-05-07.md for guidance on switching to Testcontainers.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class BaseIntegrationTest {

    protected static final UUID FIXED_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    protected UUID companyId;
    protected UUID siteId;
    protected UUID vehicleTypeId;
    protected UUID rateId;
    protected UUID adminUserId;
    protected UUID cashRegisterId;

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    @Autowired
    protected JdbcTemplate jdbcTemplate;

    @Autowired
    protected CompanyPort companyRepository;

    @Autowired
    protected ParkingSitePort parkingSiteRepository;

    @Autowired
    protected MasterVehicleTypePort masterVehicleTypeRepository;

    @Autowired
    protected RatePort rateRepository;

    @Autowired
    protected AppUserPort appUserRepository;

    @Autowired
    protected CashRegisterPort cashRegisterRepository;

    @Autowired
    protected RateLimitConfig rateLimitConfig;

    @Autowired
    protected PasswordHashService passwordHashService;

    @BeforeEach
    void cleanDatabase() {
        rateLimitConfig.clearAllBuckets();
        resetDatabase();
        seedData();
    }

    protected void resetDatabase() {
        jdbcTemplate.execute("SET REFERENTIAL_INTEGRITY FALSE");
        jdbcTemplate.queryForList(
                "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'PUBLIC' AND TABLE_TYPE = 'BASE TABLE'",
                String.class)
            .forEach(tableName -> jdbcTemplate.execute("TRUNCATE TABLE " + tableName));
        jdbcTemplate.execute("SET REFERENTIAL_INTEGRITY TRUE");
    }

    protected void seedData() {
        Company company = new Company();
        company.setId(FIXED_ID);
        company.setName("Test Company");
        company.setPlan(PlanType.LOCAL);
        company.setStatus(CompanyStatus.ACTIVE);
        company.setOperationMode(OperationMode.OFFLINE);
        company.setAllowSync(true);
        company.setCreatedAt(OffsetDateTime.now());
        company = companyRepository.save(company);
        companyId = company.getId();

        ParkingSite site = new ParkingSite();
        site.setId(FIXED_ID);
        site.setCompany(company);
        site.setCode("TS1");
        site.setName("Test Site");
        site.setTimezone("America/Bogota");
        site.setCurrency("COP");
        site.setActive(true);
        site = parkingSiteRepository.save(site);
        siteId = site.getId();

        MasterVehicleType vehicleType = new MasterVehicleType();
        vehicleType.setId(FIXED_ID);
        vehicleType.setCode("CAR");
        vehicleType.setName("Car");
        vehicleType.setActive(true);
        vehicleType.setRequiresPlate(true);
        vehicleType.setRequiresPhoto(false);
        vehicleType.setDisplayOrder(1);
        vehicleType = masterVehicleTypeRepository.save(vehicleType);
        vehicleTypeId = vehicleType.getId();

        Rate rate = new Rate();
        rate.setId(FIXED_ID);
        rate.setName("Standard Car");
        rate.setVehicleType("CAR");
        rate.setRateType(RateType.HOURLY);
        rate.setAmount(new BigDecimal("2000"));
        rate.setGraceMinutes(0);
        rate.setToleranceMinutes(0);
        rate.setFractionMinutes(60);
        rate.setSite("Test Site");
        rate.setSiteRef(site);
        rate.setBaseValue(BigDecimal.ZERO);
        rate.setBaseMinutes(0);
        rate.setAdditionalValue(BigDecimal.ZERO);
        rate.setAdditionalMinutes(0);
        rate.setMaxDailyValue(new BigDecimal("20000"));
        rate.setAppliesNight(false);
        rate.setAppliesHoliday(false);
        rate.setRoundingMode(RoundingMode.UP);
        rate.setLostTicketSurcharge(BigDecimal.ZERO);
        rate.setActive(true);
        rate.setCompanyId(companyId);
        rate = rateRepository.save(rate);
        rateId = rate.getId();

        AppUser admin = new AppUser();
        admin.setId(FIXED_ID);
        admin.setName("Admin");
        admin.setEmail("admin@example.com");
        admin.setDocument("DOC1");
        admin.setPhone("3000000000");
        admin.setSite("Test Site");
        admin.setTerminal("TERM1");
        admin.setRole(UserRole.ADMIN);
        admin.setPasswordHash(passwordHashService.encodePassword("admin123"));
        admin.setActive(true);
        admin.setCompanyId(companyId);
        admin.setCanVoidTickets(true);
        admin.setCanReprintTickets(true);
        admin.setCanCloseCash(true);
        admin.setRequirePasswordChange(false);
        admin = appUserRepository.save(admin);
        adminUserId = admin.getId();

        CashRegister register = new CashRegister();
        register.setId(FIXED_ID);
        register.setSite("Test Site");
        register.setTerminal("TERM1");
        register.setCode("REG1");
        register.setLabel("Register 1");
        register.setName("Register 1");
        register.setSiteRef(site);
        register.setActive(true);
        register = cashRegisterRepository.save(register);
        cashRegisterId = register.getId();
    }

    protected String getAuthToken() throws Exception {
        String loginRequest = """
            {
                "email": "admin@example.com",
                "password": "admin123",
                "deviceId": "test-device-1",
                "deviceName": "Test Device",
                "platform": "desktop",
                "fingerprint": "fingerprint-1"
            }
            """;
        var result = mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginRequest))
                .andReturn();
        JsonNode response = objectMapper.readTree(result.getResponse().getContentAsString());
        String accessToken = response.path("accessToken").asText(null);
        if (accessToken == null || accessToken.isBlank()) {
            throw new IllegalStateException("Login response did not include accessToken");
        }
        return accessToken;
    }
}
