package com.parkflow.modules.licensing.application.service;

import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.LicensedDevice;
import com.parkflow.modules.licensing.enums.CompanyStatus;
import com.parkflow.modules.licensing.enums.RemoteCommand;
import java.time.OffsetDateTime;
import org.springframework.stereotype.Component;

@Component
public class LicenseRemoteCommandPolicy {

  public RemoteCommand determine(Company company, LicensedDevice device) {
    if (device.getPendingCommand() != null && !Boolean.TRUE.equals(device.getCommandAcknowledged())) {
      return null;
    }
    if (company.getStatus() == CompanyStatus.BLOCKED) {
      return RemoteCommand.BLOCK_SYSTEM;
    }
    if (company.getStatus() == CompanyStatus.EXPIRED) {
      return RemoteCommand.REQUEST_RENEWAL;
    }
    if (company.getStatus() == CompanyStatus.PAST_DUE && company.getCustomerMessage() != null) {
      return RemoteCommand.SHOW_ADMIN_MESSAGE;
    }
    if (company.getExpiresAt() != null
        && company.getExpiresAt().isBefore(OffsetDateTime.now().plusDays(7))
        && company.getStatus() == CompanyStatus.ACTIVE) {
      return RemoteCommand.PAYMENT_REMINDER;
    }
    return null;
  }

  public String payloadFor(RemoteCommand command, Company company) {
    if (command == null) {
      return null;
    }
    return switch (command) {
      case SHOW_ADMIN_MESSAGE -> company.getCustomerMessage();
      case PAYMENT_REMINDER -> "Su licencia vence el " + company.getExpiresAt();
      default -> null;
    };
  }
}
