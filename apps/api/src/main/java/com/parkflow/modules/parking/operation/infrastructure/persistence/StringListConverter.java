package com.parkflow.modules.parking.operation.infrastructure.persistence;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.Collections;
import java.util.List;

/**
 * JPA converter that serializes {@code List<String>} to a JSON array TEXT column and back.
 * Keeps Jackson out of application services — serialization is an infrastructure concern.
 */
@Converter
public class StringListConverter implements AttributeConverter<List<String>, String> {

  private static final ObjectMapper MAPPER = new ObjectMapper();
  private static final TypeReference<List<String>> TYPE_REF = new TypeReference<>() {};

  @Override
  public String convertToDatabaseColumn(List<String> list) {
    if (list == null || list.isEmpty()) return "[]";
    try {
      return MAPPER.writeValueAsString(list);
    } catch (JsonProcessingException e) {
      throw new IllegalStateException("Cannot serialize list to JSON", e);
    }
  }

  @Override
  public List<String> convertToEntityAttribute(String json) {
    if (json == null || json.isBlank()) return Collections.emptyList();
    try {
      return MAPPER.readValue(json, TYPE_REF);
    } catch (JsonProcessingException e) {
      return Collections.emptyList();
    }
  }
}
