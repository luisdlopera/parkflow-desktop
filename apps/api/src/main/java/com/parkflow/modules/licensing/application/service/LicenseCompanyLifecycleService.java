package com.parkflow.modules.licensing.application.service;

import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.dto.CreateCompanyRequest;
import com.parkflow.modules.licensing.dto.UpdateCompanyRequest;
import com.parkflow.modules.licensing.enums.CompanyStatus;
import java.time.OffsetDateTime;
import org.springframework.stereotype.Component;

@Component
public class LicenseCompanyLifecycleService {

  public Company createFrom(CreateCompanyRequest request) {
    Company company = new Company();
    company.setName(request.getName());
    company.setNit(request.getNit());
    company.setAddress(request.getAddress());
    company.setCity(request.getCity());
    company.setPhone(request.getPhone());
    company.setEmail(request.getEmail());
    company.setContactName(request.getContactName());
    company.setPlan(request.getPlan());
    company.setMaxDevices(request.getMaxDevices());
    company.setMaxLocations(request.getMaxLocations());
    company.setMaxUsers(request.getMaxUsers());
    company.setOfflineModeAllowed(request.getOfflineModeAllowed());

    if (request.getTrialDays() != null && request.getTrialDays() > 0) {
      company.setStatus(CompanyStatus.TRIAL);
      company.setTrialStartedAt(OffsetDateTime.now());
      company.setTrialDays(request.getTrialDays());
      company.setExpiresAt(OffsetDateTime.now().plusDays(request.getTrialDays()));
    } else {
      company.setStatus(CompanyStatus.ACTIVE);
      company.setExpiresAt(OffsetDateTime.now().plusYears(1));
    }
    if (company.getExpiresAt() != null) {
      company.setGraceUntil(company.getExpiresAt().plusDays(7));
    }
    return company;
  }

  public void applyUpdate(Company company, UpdateCompanyRequest request) {
    if (request.getName() != null) company.setName(request.getName());
    if (request.getNit() != null) company.setNit(request.getNit());
    if (request.getAddress() != null) company.setAddress(request.getAddress());
    if (request.getCity() != null) company.setCity(request.getCity());
    if (request.getPhone() != null) company.setPhone(request.getPhone());
    if (request.getEmail() != null) company.setEmail(request.getEmail());
    if (request.getContactName() != null) company.setContactName(request.getContactName());
    if (request.getPlan() != null) company.setPlan(request.getPlan());
    if (request.getStatus() != null) company.setStatus(request.getStatus());
    if (request.getMaxDevices() != null) company.setMaxDevices(request.getMaxDevices());
    if (request.getMaxLocations() != null) company.setMaxLocations(request.getMaxLocations());
    if (request.getMaxUsers() != null) company.setMaxUsers(request.getMaxUsers());
    if (request.getOfflineModeAllowed() != null) company.setOfflineModeAllowed(request.getOfflineModeAllowed());
    if (request.getOfflineLeaseHours() != null) company.setOfflineLeaseHours(request.getOfflineLeaseHours());
    if (request.getCustomerMessage() != null) company.setCustomerMessage(request.getCustomerMessage());
    if (request.getAdminNotes() != null) company.setAdminNotes(request.getAdminNotes());
  }
}
