package com.parkflow.modules.configuration.application.service;

import com.parkflow.modules.configuration.dto.AgreementRequest;
import com.parkflow.modules.configuration.dto.AgreementResponse;
import com.parkflow.modules.configuration.dto.MonthlyContractRequest;
import com.parkflow.modules.configuration.dto.MonthlyContractResponse;
import com.parkflow.modules.configuration.dto.PrepaidBalancePurchaseRequest;
import com.parkflow.modules.configuration.dto.PrepaidBalanceResponse;
import com.parkflow.modules.configuration.dto.PrepaidPackageRequest;
import com.parkflow.modules.configuration.dto.PrepaidPackageResponse;
import com.parkflow.modules.common.dto.SettingsPageResponse;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Billing Management Facade Service.
 *
 * <p>Orchestrates billing-related services: Agreement, Prepaid, and Monthly Contract management.
 * This facade provides a single point of entry for all billing operations, consolidating
 * multiple services into a cohesive interface.
 *
 * <p>Services delegated:
 * <ul>
 *   <li>AgreementService - Manage parking agreements with discounts/flat rates
 *   <li>PrepaidService - Manage prepaid packages and balance deduction
 *   <li>MonthlyContractService - Manage monthly subscription contracts
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class BillingManagementFacadeService {

  private final AgreementService agreementService;
  private final PrepaidService prepaidService;
  private final MonthlyContractService monthlyContractService;

  // ===========================================================================
  // Agreements
  // ===========================================================================

  /**
   * List all agreements with optional filtering.
   *
   * @param site filter by site (optional)
   * @param q search query (optional)
   * @param active filter by active status (optional)
   * @param pageable pagination info
   * @return paginated list of agreements
   */
  @Transactional(readOnly = true)
  public SettingsPageResponse<AgreementResponse> listAgreements(
      String site, String q, Boolean active, Pageable pageable) {
    log.debug("Listing agreements with filters: site={}, q={}, active={}", site, q, active);
    return agreementService.list(site, q, active, pageable);
  }

  /**
   * Get a single agreement by ID.
   *
   * @param id the agreement ID
   * @return the agreement response
   */
  @Transactional(readOnly = true)
  public AgreementResponse getAgreement(UUID id) {
    log.debug("Getting agreement: {}", id);
    return agreementService.get(id);
  }

  /**
   * Resolve an agreement by code (used in cashier operations).
   *
   * @param code the agreement code
   * @return the agreement response
   */
  @Transactional(readOnly = true)
  public AgreementResponse resolveAgreementByCode(String code) {
    log.debug("Resolving agreement by code: {}", code);
    return agreementService.resolveByCode(code);
  }

  /**
   * Create a new agreement.
   *
   * @param req the agreement request
   * @return the created agreement
   */
  public AgreementResponse createAgreement(AgreementRequest req) {
    log.info("Creating agreement with code: {}", req.code());
    return agreementService.create(req);
  }

  /**
   * Update an existing agreement.
   *
   * @param id the agreement ID
   * @param req the agreement request
   * @return the updated agreement
   */
  public AgreementResponse updateAgreement(UUID id, AgreementRequest req) {
    log.info("Updating agreement: {}", id);
    return agreementService.update(id, req);
  }

  /**
   * Change the status of an agreement (active/inactive).
   *
   * @param id the agreement ID
   * @param active the new status
   * @return the updated agreement
   */
  public AgreementResponse updateAgreementStatus(UUID id, boolean active) {
    log.info("Updating agreement status: id={}, active={}", id, active);
    return agreementService.patchStatus(id, active);
  }

  // ===========================================================================
  // Prepaid Packages
  // ===========================================================================

  /**
   * List all prepaid packages with optional filtering.
   *
   * @param site filter by site (optional)
   * @param q search query (optional)
   * @param active filter by active status (optional)
   * @param pageable pagination info
   * @return paginated list of prepaid packages
   */
  @Transactional(readOnly = true)
  public SettingsPageResponse<PrepaidPackageResponse> listPrepaidPackages(
      String site, String q, Boolean active, Pageable pageable) {
    log.debug("Listing prepaid packages with filters: site={}, q={}, active={}", site, q, active);
    return prepaidService.listPackages(site, q, active, pageable);
  }

  /**
   * Get a single prepaid package by ID.
   *
   * @param id the package ID
   * @return the prepaid package response
   */
  @Transactional(readOnly = true)
  public PrepaidPackageResponse getPrepaidPackage(UUID id) {
    log.debug("Getting prepaid package: {}", id);
    return prepaidService.getPackage(id);
  }

  /**
   * Create a new prepaid package.
   *
   * @param req the prepaid package request
   * @return the created package
   */
  public PrepaidPackageResponse createPrepaidPackage(PrepaidPackageRequest req) {
    log.info("Creating prepaid package: {}", req.name());
    return prepaidService.createPackage(req);
  }

  /**
   * Update an existing prepaid package.
   *
   * @param id the package ID
   * @param req the prepaid package request
   * @return the updated package
   */
  public PrepaidPackageResponse updatePrepaidPackage(UUID id, PrepaidPackageRequest req) {
    log.info("Updating prepaid package: {}", id);
    return prepaidService.updatePackage(id, req);
  }

  /**
   * Change the status of a prepaid package (active/inactive).
   *
   * @param id the package ID
   * @param active the new status
   * @return the updated package
   */
  public PrepaidPackageResponse updatePrepaidPackageStatus(UUID id, boolean active) {
    log.info("Updating prepaid package status: id={}, active={}", id, active);
    return prepaidService.patchPackageStatus(id, active);
  }

  // ===========================================================================
  // Prepaid Balances
  // ===========================================================================

  /**
   * Get all prepaid balances for a vehicle plate.
   *
   * @param plate the vehicle plate
   * @return list of prepaid balance responses
   */
  @Transactional(readOnly = true)
  public List<PrepaidBalanceResponse> getPrepaidBalancesByPlate(String plate) {
    log.debug("Getting prepaid balances for plate: {}", plate);
    return prepaidService.getBalancesByPlate(plate);
  }

  /**
   * Purchase a prepaid package (create a new balance).
   *
   * @param req the purchase request
   * @return the created balance
   */
  public PrepaidBalanceResponse purchasePrepaidBalance(PrepaidBalancePurchaseRequest req) {
    log.info("Purchasing prepaid balance for plate: {}", req.plate());
    return prepaidService.purchase(req);
  }

  /**
   * Deduct minutes from a prepaid balance (used during exit/checkout).
   *
   * @param balanceId the balance ID
   * @param minutesToDeduct the number of minutes to deduct
   * @return the updated balance
   */
  public PrepaidBalanceResponse deductPrepaidBalance(UUID balanceId, int minutesToDeduct) {
    log.info("Deducting {} minutes from prepaid balance: {}", minutesToDeduct, balanceId);
    return prepaidService.deduct(balanceId, minutesToDeduct);
  }

  // ===========================================================================
  // Monthly Contracts
  // ===========================================================================

  /**
   * List all monthly contracts with optional filtering.
   *
   * @param site filter by site (optional)
   * @param plate filter by plate (optional)
   * @param active filter by active status (optional)
   * @param pageable pagination info
   * @return paginated list of contracts
   */
  @Transactional(readOnly = true)
  public SettingsPageResponse<MonthlyContractResponse> listMonthlyContracts(
      String site, String plate, Boolean active, Pageable pageable) {
    log.debug(
        "Listing monthly contracts with filters: site={}, plate={}, active={}",
        site, plate, active);
    return monthlyContractService.list(site, plate, active, pageable);
  }

  /**
   * Get a single monthly contract by ID.
   *
   * @param id the contract ID
   * @return the contract response
   */
  @Transactional(readOnly = true)
  public MonthlyContractResponse getMonthlyContract(UUID id) {
    log.debug("Getting monthly contract: {}", id);
    return monthlyContractService.get(id);
  }

  /**
   * Create a new monthly contract.
   *
   * @param req the contract request
   * @return the created contract
   */
  public MonthlyContractResponse createMonthlyContract(MonthlyContractRequest req) {
    log.info("Creating monthly contract for plate: {}", req.plate());
    return monthlyContractService.create(req);
  }

  /**
   * Update an existing monthly contract.
   *
   * @param id the contract ID
   * @param req the contract request
   * @return the updated contract
   */
  public MonthlyContractResponse updateMonthlyContract(UUID id, MonthlyContractRequest req) {
    log.info("Updating monthly contract: {}", id);
    return monthlyContractService.update(id, req);
  }

  /**
   * Change the status of a monthly contract (active/cancelled).
   *
   * @param id the contract ID
   * @param active the new status
   * @return the updated contract
   */
  public MonthlyContractResponse updateMonthlyContractStatus(UUID id, boolean active) {
    log.info("Updating monthly contract status: id={}, active={}", id, active);
    return monthlyContractService.patchStatus(id, active);
  }
}
