package com.parkflow.modules.customers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.parkflow.modules.customers.domain.Client;
import com.parkflow.modules.customers.dto.ClientRequest;
import com.parkflow.modules.customers.repository.ClientRepository;
import com.parkflow.modules.customers.application.service.ContractExpirationJob;
import com.parkflow.modules.configuration.domain.ContractStatus;
import com.parkflow.modules.configuration.domain.MonthlyContract;
import com.parkflow.modules.configuration.repository.MonthlyContractRepository;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

@ExtendWith(MockitoExtension.class)
class ContractExpirationJobTest {

    @Mock private MonthlyContractRepository contractRepository;

    @InjectMocks
    private ContractExpirationJob job;

    @Nested
    class ExpireContracts {

        @Test
        void expiresContractsWithEndDateInPast() {
            MonthlyContract expired = buildContract(ContractStatus.ACTIVE, LocalDate.now().minusDays(1));
            MonthlyContract active = buildContract(ContractStatus.ACTIVE, LocalDate.now().plusMonths(1));

            when(contractRepository.findAll()).thenReturn(List.of(expired, active));
            when(contractRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            job.expireContracts();

            verify(contractRepository).save(argThat(c ->
                c.getId().equals(expired.getId()) &&
                c.getStatus() == ContractStatus.EXPIRED));
        }

        @Test
        void skipsAlreadyExpiredContracts() {
            MonthlyContract alreadyExpired = buildContract(ContractStatus.EXPIRED, LocalDate.now().minusDays(10));

            when(contractRepository.findAll()).thenReturn(List.of(alreadyExpired));

            job.expireContracts();

            verify(contractRepository, never()).save(any());
        }

        @Test
        void skipsFutureContracts() {
            MonthlyContract future = buildContract(ContractStatus.ACTIVE, LocalDate.now().plusDays(30));

            when(contractRepository.findAll()).thenReturn(List.of(future));

            job.expireContracts();

            verify(contractRepository, never()).save(any());
        }

        @Test
        void processesMultipleExpiredContracts() {
            MonthlyContract exp1 = buildContract(ContractStatus.ACTIVE, LocalDate.now().minusDays(1));
            MonthlyContract exp2 = buildContract(ContractStatus.ACTIVE, LocalDate.now().minusDays(5));
            MonthlyContract active = buildContract(ContractStatus.ACTIVE, LocalDate.now().plusMonths(1));

            when(contractRepository.findAll()).thenReturn(List.of(exp1, exp2, active));
            when(contractRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            job.expireContracts();

            verify(contractRepository, times(2)).save(any());
        }

        @Test
        void expiresContractWithEndDateEqualToToday() {
            // Edge case: end date is today, should not be expired yet (expires tomorrow)
            MonthlyContract today = buildContract(ContractStatus.ACTIVE, LocalDate.now());

            when(contractRepository.findAll()).thenReturn(List.of(today));

            job.expireContracts();

            // isBefore checks if endDate is before today, so today == now should not expire
            verify(contractRepository, never()).save(any());
        }
    }

    // -----------------------------------------------------------------------

    private MonthlyContract buildContract(ContractStatus status, LocalDate endDate) {
        MonthlyContract c = new MonthlyContract();
        c.setId(UUID.randomUUID());
        c.setStatus(status);
        c.setEndDate(endDate);
        c.setStartDate(endDate.minusMonths(1));
        c.setAmount(java.math.BigDecimal.ZERO);
        c.setClient(new com.parkflow.modules.customers.domain.Client());
        c.setUpdatedAt(OffsetDateTime.now());
        return c;
    }
}
