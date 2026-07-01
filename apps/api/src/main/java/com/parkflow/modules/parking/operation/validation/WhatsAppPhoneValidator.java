package com.parkflow.modules.parking.operation.validation;

import com.parkflow.modules.common.exception.MessagesEnum;
import com.parkflow.modules.common.exception.OperationException;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class WhatsAppPhoneValidator {

  private static final Pattern PHONE_PATTERN = Pattern.compile("^\\+?[0-9\\s()-]{7,20}$");

  public void validate(boolean whatsappEnabled, String phoneNumber) {
    if (!whatsappEnabled) {
      return;
    }

    String normalized = phoneNumber == null ? "" : phoneNumber.trim();
    if (normalized.isBlank()) {
      throw new OperationException(
          HttpStatus.BAD_REQUEST,
          MessagesEnum.WHATSAPP_PHONE_REQUIRED.getCode(),
          MessagesEnum.WHATSAPP_PHONE_REQUIRED.getDefaultMessage());
    }

    if (!PHONE_PATTERN.matcher(normalized).matches()) {
      throw new OperationException(
          HttpStatus.BAD_REQUEST,
          MessagesEnum.WHATSAPP_PHONE_INVALID.getCode(),
          MessagesEnum.WHATSAPP_PHONE_INVALID.getDefaultMessage());
    }
  }
}
