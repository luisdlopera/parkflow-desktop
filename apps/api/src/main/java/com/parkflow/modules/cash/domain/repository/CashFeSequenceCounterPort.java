package com.parkflow.modules.cash.domain.repository;

import com.parkflow.modules.cash.domain.CashFeSequenceCounter;
import com.parkflow.modules.cash.domain.CashFeSequencePk;
import java.util.Optional;

public interface CashFeSequenceCounterPort {
    Optional<CashFeSequenceCounter> lockBySiteAndTerminal(String site, String terminal);
    CashFeSequenceCounter save(CashFeSequenceCounter counter);
    CashFeSequenceCounter saveAndFlush(CashFeSequenceCounter counter);
    Optional<CashFeSequenceCounter> findById(CashFeSequencePk id);
}
