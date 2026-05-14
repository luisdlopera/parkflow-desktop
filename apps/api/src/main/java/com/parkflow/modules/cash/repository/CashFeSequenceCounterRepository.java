package com.parkflow.modules.cash.repository;

import com.parkflow.modules.cash.domain.CashFeSequenceCounter;
import com.parkflow.modules.cash.domain.CashFeSequencePk;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CashFeSequenceCounterRepository extends JpaRepository<CashFeSequenceCounter, CashFeSequencePk> {

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT c FROM CashFeSequenceCounter c WHERE c.siteCode = :site AND c.terminal = :terminal")
  Optional<CashFeSequenceCounter> lockBySiteAndTerminal(
      @Param("site") String site, @Param("terminal") String terminal);
}
