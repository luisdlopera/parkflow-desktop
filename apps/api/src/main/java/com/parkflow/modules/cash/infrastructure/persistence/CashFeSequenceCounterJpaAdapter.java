package com.parkflow.modules.cash.infrastructure.persistence;

import com.parkflow.modules.cash.domain.CashFeSequenceCounter;
import com.parkflow.modules.cash.domain.CashFeSequencePk;
import com.parkflow.modules.cash.domain.repository.CashFeSequenceCounterPort;
import jakarta.persistence.LockModeType;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Component
@RequiredArgsConstructor
public class CashFeSequenceCounterJpaAdapter implements CashFeSequenceCounterPort {

    private final CashFeSequenceCounterJpaRepository jpaRepository;

    @Override
    public Optional<CashFeSequenceCounter> lockBySiteAndTerminal(String site, String terminal) {
        return jpaRepository.lockBySiteAndTerminal(site, terminal);
    }

    @Override
    public CashFeSequenceCounter save(CashFeSequenceCounter counter) {
        return jpaRepository.save(counter);
    }

    @Override
    public CashFeSequenceCounter saveAndFlush(CashFeSequenceCounter counter) {
        return jpaRepository.saveAndFlush(counter);
    }

    @Override
    public Optional<CashFeSequenceCounter> findById(CashFeSequencePk id) {
        return jpaRepository.findById(id);
    }

    @Repository
    interface CashFeSequenceCounterJpaRepository extends JpaRepository<CashFeSequenceCounter, CashFeSequencePk> {
        @Lock(LockModeType.PESSIMISTIC_WRITE)
        @Query("SELECT c FROM CashFeSequenceCounter c WHERE c.siteCode = :site AND c.terminal = :terminal")
        Optional<CashFeSequenceCounter> lockBySiteAndTerminal(
            @Param("site") String site, @Param("terminal") String terminal);
    }
}
