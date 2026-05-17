package com.parkflow.modules.configuration.service;

import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import com.parkflow.modules.licensing.enums.OperationalProfile;
import com.parkflow.modules.configuration.domain.policy.OperationalProfilePolicy;
import com.parkflow.modules.configuration.domain.model.OperationalCapability;
import com.parkflow.modules.common.exception.domain.BusinessValidationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Service central para resolver e imponer reglas operacionales según el OperationalProfile del Tenant.
 * Utiliza el Strategy Pattern para delegar políticas operacionales dinámicamente sin ifs hardcodeados.
 */
@Slf4j
@Service
public class OperationalConfigurationService {

    private final CompanyPort companyPort;
    private final Map<OperationalProfile, OperationalProfilePolicy> policyMap;

    @Autowired
    public OperationalConfigurationService(CompanyPort companyPort, List<OperationalProfilePolicy> policies) {
        this.companyPort = companyPort;
        this.policyMap = policies.stream()
                .collect(Collectors.toMap(OperationalProfilePolicy::getProfile, Function.identity()));
        log.info("[OperationalConfigurationService] Initialized with {} operational profile policies: {}", 
                policyMap.size(), policyMap.keySet());
    }

    @Transactional(readOnly = true)
    public OperationalProfile getOperationalProfile(UUID companyId) {
        return companyPort.findById(companyId)
                .map(Company::getOperationalProfile)
                .orElse(OperationalProfile.MIXED);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getOperationConfiguration(UUID companyId) {
        OperationalProfile profile = getOperationalProfile(companyId);
        log.info("[OperationalProfileResolver] Resolving operational configuration for company {} with profile {}", companyId, profile);
        
        OperationalProfilePolicy policy = getPolicyOrThrow(profile);
        Map<String, Object> config = policy.getDerivedConfiguration();
        log.info("[EntryFlowConfiguration] Resolved operational flow settings: {}", config);
        
        return config;
    }

    @Transactional(readOnly = true)
    public void validateVehicleType(UUID companyId, String vehicleType) {
        OperationalProfile profile = getOperationalProfile(companyId);
        log.info("[VehicleTypePolicy] Validating vehicle type '{}' against profile '{}' for company {}", vehicleType, profile, companyId);
        
        OperationalProfilePolicy policy = getPolicyOrThrow(profile);
        policy.validateEntry(vehicleType, null, null, null, null);
        
        log.info("[VehicleTypePolicy] Validation SUCCESS for type '{}'", vehicleType);
    }

    @Transactional(readOnly = true)
    public void validateAdvancedFields(UUID companyId, String lane, String terminal, String cashier) {
        OperationalProfile profile = getOperationalProfile(companyId);
        OperationalProfilePolicy policy = getPolicyOrThrow(profile);
        
        log.info("[OperationalRules] Checking advanced fields for company {} and profile {}", companyId, profile);
        
        if (!policy.hasCapability(OperationalCapability.LANE_SELECTION) && lane != null && !lane.isBlank()) {
            log.warn("[OperationalRules] Warning: Lane selection is disabled but lane '{}' was provided. Ignoring.", lane);
        }
        
        if (!policy.hasCapability(OperationalCapability.TERMINAL_SELECTION) && terminal != null && !terminal.isBlank()) {
            log.warn("[OperationalRules] Warning: Terminal selection is disabled but terminal '{}' was provided. Ignoring.", terminal);
        }
        
        log.info("[FeatureVisibility] All operational visibility checks passed");
    }

    public String resolveVehicleType(UUID companyId, String requestedType) {
        OperationalProfile profile = getOperationalProfile(companyId);
        OperationalProfilePolicy policy = getPolicyOrThrow(profile);
        return policy.resolveVehicleType(requestedType);
    }

    public void validateEntryPayload(UUID companyId, String vehicleType, String entryMode, String lane, String terminal, String cashier) {
        OperationalProfile profile = getOperationalProfile(companyId);
        OperationalProfilePolicy policy = getPolicyOrThrow(profile);
        policy.validateEntry(vehicleType, entryMode, lane, terminal, cashier);
    }

    private OperationalProfilePolicy getPolicyOrThrow(OperationalProfile profile) {
        OperationalProfilePolicy policy = policyMap.get(profile);
        if (policy == null) {
            throw new IllegalStateException("No OperationalProfilePolicy strategy found for profile: " + profile);
        }
        return policy;
    }
}
