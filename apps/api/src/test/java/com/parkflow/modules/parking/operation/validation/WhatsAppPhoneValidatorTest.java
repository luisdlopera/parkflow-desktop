package com.parkflow.modules.parking.operation.validation;

import com.parkflow.modules.common.exception.OperationException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class WhatsAppPhoneValidatorTest {

  private final WhatsAppPhoneValidator validator = new WhatsAppPhoneValidator();

  @Test
  void allowsValidPhoneWhenWhatsAppIsEnabled() {
    assertDoesNotThrow(() -> validator.validate(true, "+573001234567"));
  }

  @Test
  void rejectsMissingPhoneWhenWhatsAppIsEnabled() {
    OperationException ex = assertThrows(OperationException.class, () -> validator.validate(true, ""));
    assertEquals("WHATSAPP_PHONE_REQUIRED", ex.getCode());
  }

  @Test
  void rejectsInvalidPhoneFormatWhenWhatsAppIsEnabled() {
    OperationException ex = assertThrows(OperationException.class, () -> validator.validate(true, "abc-123"));
    assertEquals("WHATSAPP_PHONE_INVALID", ex.getCode());
  }

  @Test
  void ignoresPhoneWhenWhatsAppIsDisabled() {
    assertDoesNotThrow(() -> validator.validate(false, null));
  }
}
