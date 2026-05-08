package com.parkflow.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.parkflow.modules.parking.operation.dto.EntryRequest;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class EntryRequestValidationTest {

  private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

  @Test
  void validate_ValidRequest_ShouldPass() {
    EntryRequest request = new EntryRequest(null, "ABC123", "CAR", UUID.randomUUID(), UUID.randomUUID(), null, null, null, null, null, null, null, null, null, null);

    var violations = validator.validate(request);

    assertThat(violations).isEmpty();
  }

  @Test
  void validate_InvalidPlate_ShouldFail() {
    EntryRequest request = new EntryRequest(null, "invalid!", "CAR", UUID.randomUUID(), UUID.randomUUID(), null, null, null, null, null, null, null, null, null, null);

    var violations = validator.validate(request);

    assertThat(violations).hasSize(1);
  }
}