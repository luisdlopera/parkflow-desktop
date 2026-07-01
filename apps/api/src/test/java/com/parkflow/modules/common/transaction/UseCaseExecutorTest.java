package com.parkflow.modules.common.transaction;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class UseCaseExecutorTest {

    @Mock
    private TransactionTemplate transactionTemplate;

    private UseCaseExecutor useCaseExecutor;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        useCaseExecutor = new UseCaseExecutor(transactionTemplate);
    }

    @Test
    void shouldExecuteInTransactionAndReturnResult() {
        // Arrange
        when(transactionTemplate.execute(any())).thenAnswer(invocation -> {
            TransactionCallback<String> callback = invocation.getArgument(0);
            return callback.doInTransaction(null);
        });

        // Act
        String result = useCaseExecutor.executeInTransaction(() -> "Success");

        // Assert
        assertEquals("Success", result);
        verify(transactionTemplate, times(1)).execute(any());
    }

    @Test
    void shouldExecuteInTransactionWithoutResult() {
        // Arrange
        doAnswer(invocation -> {
            java.util.function.Consumer<org.springframework.transaction.TransactionStatus> callback = invocation.getArgument(0);
            callback.accept(null);
            return null;
        }).when(transactionTemplate).executeWithoutResult(any());

        // Act
        Runnable action = mock(Runnable.class);
        useCaseExecutor.executeInTransaction(action);

        // Assert
        verify(action, times(1)).run();
        verify(transactionTemplate, times(1)).executeWithoutResult(any());
    }
}
