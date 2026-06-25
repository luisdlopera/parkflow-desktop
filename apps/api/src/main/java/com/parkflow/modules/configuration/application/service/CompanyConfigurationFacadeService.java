package com.parkflow.modules.configuration.application.service;

import com.parkflow.modules.configuration.dto.CapacityResponse;
import com.parkflow.modules.configuration.dto.CapacityRequest;
import com.parkflow.modules.configuration.dto.FeatureConfigurationResponse;
import com.parkflow.modules.configuration.dto.FeatureConfigurationRequest;
import com.parkflow.modules.configuration.dto.HelmetHandlingRequest;
import com.parkflow.modules.configuration.dto.HelmetHandlingResponse;
import com.parkflow.modules.configuration.dto.ModuleConfigurationResponse;
import com.parkflow.modules.configuration.dto.ModuleConfigurationRequest;
import com.parkflow.modules.configuration.dto.OperationalParameterRequest;
import com.parkflow.modules.configuration.dto.OperationalParameterResponse;
import com.parkflow.modules.configuration.dto.RegionConfigurationResponse;
import com.parkflow.modules.configuration.dto.RegionConfigurationRequest;
import com.parkflow.modules.configuration.dto.ShiftConfigurationResponse;
import com.parkflow.modules.configuration.dto.ShiftConfigurationRequest;
import com.parkflow.modules.configuration.dto.ThemeConfigurationRequest;
import com.parkflow.modules.configuration.dto.ThemeConfigurationResponse;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Company Configuration Facade Service.
 *
 * <p>Orchestrates company-level configuration services: Capacity, Region, Feature, Module, Shift,
 * Helmet, Theme, and Operational Parameters. This facade provides a unified interface for
 * managing all company-wide settings.
 *
 * <p>Services delegated:
 * <ul>
 *   <li>CapacityManagementServiceImpl - Configure parking capacity
 *   <li>RegionConfigurationServiceImpl - Configure regions
 *   <li>FeatureConfigurationServiceImpl - Configure feature flags
 *   <li>ModuleConfigurationServiceImpl - Configure module availability
 *   <li>ShiftConfigurationServiceImpl - Configure shift hours
 *   <li>HelmetHandlingServiceImpl - Configure helmet handling rules
 *   <li>ThemeConfigurationManagementService - Configure company theme
 *   <li>OperationalParameterManagementService - Configure operational parameters per site
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class CompanyConfigurationFacadeService {

  private final CapacityManagementServiceImpl capacityService;
  private final RegionConfigurationServiceImpl regionService;
  private final FeatureConfigurationServiceImpl featureService;
  private final ModuleConfigurationServiceImpl moduleService;
  private final ShiftConfigurationServiceImpl shiftService;
  private final HelmetHandlingServiceImpl helmetService;
  private final ThemeConfigurationManagementService themeService;
  private final OperationalParameterManagementService operationalParameterService;

  // ===========================================================================
  // Capacity Management
  // ===========================================================================

  /**
   * Get current parking capacity configuration for a company.
   *
   * @param companyId the company ID
   * @return capacity response
   */
  @Transactional(readOnly = true)
  public CapacityResponse getCapacity(UUID companyId) {
    log.debug("Getting capacity configuration for company: {}", companyId);
    return capacityService.getCapacity(companyId);
  }

  /**
   * Update parking capacity configuration.
   *
   * @param companyId the company ID
   * @param request the capacity update request
   * @return updated capacity response
   */
  public CapacityResponse updateCapacity(UUID companyId, CapacityRequest request) {
    log.info("Updating capacity configuration for company: {}", companyId);
    return capacityService.updateCapacity(companyId, request);
  }

  // ===========================================================================
  // Region Configuration
  // ===========================================================================

  /**
   * Get region configuration for a company.
   *
   * @param companyId the company ID
   * @return region configuration response
   */
  @Transactional(readOnly = true)
  public RegionConfigurationResponse getRegion(UUID companyId) {
    log.debug("Getting region configuration for company: {}", companyId);
    return regionService.getRegionConfiguration(companyId);
  }

  /**
   * Update region configuration.
   *
   * @param companyId the company ID
   * @param request the region update request
   * @return updated region configuration response
   */
  public RegionConfigurationResponse updateRegion(
      UUID companyId, RegionConfigurationRequest request) {
    log.info("Updating region configuration for company: {}", companyId);
    return regionService.updateRegionConfiguration(companyId, request);
  }

  // ===========================================================================
  // Feature Configuration
  // ===========================================================================

  /**
   * Get feature flags configuration for a company.
   *
   * @param companyId the company ID
   * @return feature configuration response
   */
  @Transactional(readOnly = true)
  public FeatureConfigurationResponse getFeatures(UUID companyId) {
    log.debug("Getting feature configuration for company: {}", companyId);
    return featureService.getFeatureConfiguration(companyId);
  }

  /**
   * Update feature flags configuration.
   *
   * @param companyId the company ID
   * @param request the feature update request
   * @return updated feature configuration response
   */
  public FeatureConfigurationResponse updateFeatures(
      UUID companyId, FeatureConfigurationRequest request) {
    log.info("Updating feature configuration for company: {}", companyId);
    return featureService.updateFeatureConfiguration(companyId, request);
  }

  // ===========================================================================
  // Module Configuration
  // ===========================================================================

  /**
   * Get module configuration for a company.
   *
   * @param companyId the company ID
   * @return module configuration response
   */
  @Transactional(readOnly = true)
  public ModuleConfigurationResponse getModules(UUID companyId) {
    log.debug("Getting module configuration for company: {}", companyId);
    return moduleService.getModuleConfiguration(companyId);
  }

  /**
   * Update module configuration.
   *
   * @param companyId the company ID
   * @param request the module update request
   * @return updated module configuration response
   */
  public ModuleConfigurationResponse updateModules(
      UUID companyId, ModuleConfigurationRequest request) {
    log.info("Updating module configuration for company: {}", companyId);
    return moduleService.updateModuleConfiguration(companyId, request);
  }

  // ===========================================================================
  // Shift Configuration
  // ===========================================================================

  /**
   * Get shift configuration for a company.
   *
   * @param companyId the company ID
   * @return shift configuration response
   */
  @Transactional(readOnly = true)
  public ShiftConfigurationResponse getShifts(UUID companyId) {
    log.debug("Getting shift configuration for company: {}", companyId);
    return shiftService.getShiftConfiguration(companyId);
  }

  /**
   * Update shift configuration.
   *
   * @param companyId the company ID
   * @param request the shift update request
   * @return updated shift configuration response
   */
  public ShiftConfigurationResponse updateShifts(
      UUID companyId, ShiftConfigurationRequest request) {
    log.info("Updating shift configuration for company: {}", companyId);
    return shiftService.updateShiftConfiguration(companyId, request);
  }

  // ===========================================================================
  // Helmet Handling Configuration
  // ===========================================================================

  /**
   * Get helmet handling configuration for a company.
   *
   * @param companyId the company ID
   * @return helmet handling configuration response
   */
  @Transactional(readOnly = true)
  public HelmetHandlingResponse getHelmetHandling(UUID companyId) {
    log.debug("Getting helmet handling configuration for company: {}", companyId);
    return helmetService.getHelmetHandling(companyId);
  }

  /**
   * Update helmet handling configuration.
   *
   * @param companyId the company ID
   * @param request the helmet handling update request
   * @return updated helmet handling configuration response
   */
  public HelmetHandlingResponse updateHelmetHandling(
      UUID companyId, HelmetHandlingRequest request) {
    log.info("Updating helmet handling configuration for company: {}", companyId);
    return helmetService.updateHelmetHandling(companyId, request);
  }

  // ===========================================================================
  // Theme Configuration
  // ===========================================================================

  /**
   * Get theme configuration for a company.
   *
   * @param companyId the company ID
   * @return theme configuration response
   */
  @Transactional(readOnly = true)
  public ThemeConfigurationResponse getTheme(UUID companyId) {
    log.debug("Getting theme configuration for company: {}", companyId);
    return themeService.getByCompany(companyId);
  }

  /**
   * Update theme configuration (with new branding colors).
   *
   * @param companyId the company ID
   * @param request the theme update request
   * @return updated theme configuration response
   */
  public ThemeConfigurationResponse updateTheme(UUID companyId, ThemeConfigurationRequest request) {
    log.info("Updating theme configuration for company: {}", companyId);
    return themeService.createOrUpdate(companyId, request);
  }

  // ===========================================================================
  // Operational Parameters (Per-Site)
  // ===========================================================================

  /**
   * Get operational parameters for a specific site.
   *
   * @param siteId the parking site ID
   * @return operational parameter response
   */
  @Transactional(readOnly = true)
  public OperationalParameterResponse getSiteOperationalParameters(UUID siteId) {
    log.debug("Getting operational parameters for site: {}", siteId);
    return operationalParameterService.getBySite(siteId);
  }

  /**
   * Update operational parameters for a specific site.
   *
   * @param siteId the parking site ID
   * @param request the operational parameter update request
   * @return updated operational parameter response
   */
  public OperationalParameterResponse updateSiteOperationalParameters(
      UUID siteId, OperationalParameterRequest request) {
    log.info("Updating operational parameters for site: {}", siteId);
    return operationalParameterService.createOrUpdate(siteId, request);
  }

  // ===========================================================================
  // Bulk Company Settings Update
  // ===========================================================================

  /**
   * Convenience method to update multiple company configurations at once.
   * This is useful for onboarding scenarios where all settings are configured together.
   *
   * @param companyId the company ID
   * @param capacityRequest capacity update (optional)
   * @param regionRequest region update (optional)
   * @param featureRequest feature update (optional)
   * @param moduleRequest module update (optional)
   * @param shiftRequest shift update (optional)
   * @param helmetRequest helmet handling update (optional)
   * @param themeRequest theme update (optional)
   */
  public void updateCompanySettings(
      UUID companyId,
      CapacityRequest capacityRequest,
      RegionConfigurationRequest regionRequest,
      FeatureConfigurationRequest featureRequest,
      ModuleConfigurationRequest moduleRequest,
      ShiftConfigurationRequest shiftRequest,
      HelmetHandlingRequest helmetRequest,
      ThemeConfigurationRequest themeRequest) {
    log.info("Updating multiple company configurations for company: {}", companyId);

    if (capacityRequest != null) {
      updateCapacity(companyId, capacityRequest);
    }
    if (regionRequest != null) {
      updateRegion(companyId, regionRequest);
    }
    if (featureRequest != null) {
      updateFeatures(companyId, featureRequest);
    }
    if (moduleRequest != null) {
      updateModules(companyId, moduleRequest);
    }
    if (shiftRequest != null) {
      updateShifts(companyId, shiftRequest);
    }
    if (helmetRequest != null) {
      updateHelmetHandling(companyId, helmetRequest);
    }
    if (themeRequest != null) {
      updateTheme(companyId, themeRequest);
    }

    log.info("Company settings updated successfully for company: {}", companyId);
  }
}
