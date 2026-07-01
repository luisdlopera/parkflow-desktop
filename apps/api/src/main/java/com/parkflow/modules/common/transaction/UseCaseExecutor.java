package com.parkflow.modules.common.transaction;

import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.function.Supplier;

/**
 * Enterprise Transaction Pattern (Solvy-like)
 * Encapsulates explicit database transaction boundaries using TransactionTemplate
 * to avoid issues with @Transactional (self-invocation, long-running I/O, etc).
 */
@Component
public class UseCaseExecutor {

    private final TransactionTemplate transactionTemplate;

    public UseCaseExecutor(TransactionTemplate transactionTemplate) {
        this.transactionTemplate = transactionTemplate;
    }

    public <T> T executeInTransaction(Supplier<T> action) {
        return transactionTemplate.execute(status -> action.get());
    }

    public void executeInTransaction(Runnable action) {
        transactionTemplate.executeWithoutResult(status -> action.run());
    }
}
