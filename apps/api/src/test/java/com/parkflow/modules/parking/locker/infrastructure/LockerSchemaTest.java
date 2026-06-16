package com.parkflow.modules.parking.locker.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@ActiveProfiles("test")
class LockerSchemaTest {

  @PersistenceContext
  private EntityManager entityManager;

  @Test
  @SuppressWarnings("unchecked")
  void lockerTableExistsWithExpectedColumns() {
    List<Object[]> columns = entityManager.createNativeQuery(
        """
        SELECT COLUMN_NAME, DATA_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'LOCKER'
        """
    ).getResultList();

    assertThat(columns)
        .extracting(row -> String.valueOf(row[0]).toLowerCase())
        .contains("id", "company_id", "code", "label", "status", "is_active", "created_at", "updated_at");
  }

  @Test
  @SuppressWarnings("unchecked")
  void custodiedItemReferencesLockerId() {
    List<Object[]> columns = entityManager.createNativeQuery(
        """
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'CUSTODIED_ITEM'
          AND COLUMN_NAME = 'LOCKER_ID'
        """
    ).getResultList();

    assertThat(columns).isNotEmpty();
  }
}
