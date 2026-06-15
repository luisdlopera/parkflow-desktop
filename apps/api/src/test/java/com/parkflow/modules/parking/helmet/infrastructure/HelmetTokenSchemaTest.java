package com.parkflow.modules.parking.helmet.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@ActiveProfiles("test")
class HelmetTokenSchemaTest {

  @PersistenceContext
  private EntityManager entityManager;

  @Test
  void helmetTokenTableExistsWithExpectedColumns() {
    List<Object[]> columns = entityManager.createNativeQuery(
        """
        SELECT COLUMN_NAME, DATA_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'HELMET_TOKEN'
        """
    ).getResultList();

    assertThat(columns)
        .extracting(row -> String.valueOf(row[0]).toLowerCase())
        .contains("id", "company_id", "code", "label", "is_active", "created_at", "updated_at");
  }

  @Test
  void custodiedItemReferencesTokenId() {
    List<Object[]> columns = entityManager.createNativeQuery(
        """
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'CUSTODIED_ITEM'
          AND COLUMN_NAME = 'TOKEN_ID'
        """
    ).getResultList();

    assertThat(columns).isNotEmpty();
  }
}
