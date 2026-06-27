package com.parkflow.modules.parking.operation.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.parking.operation.application.port.out.TicketPrefixPort;
import com.parkflow.modules.parking.operation.domain.TicketCounter;
import com.parkflow.modules.parking.operation.domain.repository.TicketCounterPort;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TicketNumberServiceTest {

    @Mock private TicketCounterPort ticketCounterRepository;
    @Mock private TicketPrefixPort ticketPrefixPort;

    @InjectMocks
    private TicketNumberService service;

    private Company company;

    @BeforeEach
    void setUp() {
        company = new Company();
        company.setId(UUID.randomUUID());
        company.setName("Test Company");
    }

    @Nested
    class SequentialGeneration {

        @Test
        void generatesFirstTicketOfDayWithNumber000001() {
            LocalDate date = LocalDate.of(2026, 6, 22);
            String key = "20260622";

            when(ticketCounterRepository.findByIdForUpdate(key)).thenReturn(Optional.empty());
            when(ticketCounterRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(ticketPrefixPort.resolvePrefix(company)).thenReturn("PF-");

            String ticket = service.next(date, company);

            assertThat(ticket).isEqualTo("PF-20260622-000001");
        }

        @Test
        void incrementsCounterOnConsecutiveCalls() {
            LocalDate date = LocalDate.of(2026, 6, 22);
            String key = "20260622";

            TicketCounter existing = new TicketCounter();
            existing.setCounterKey(key);
            existing.setLastNumber(5);
            existing.setCompanyId(company.getId());

            when(ticketCounterRepository.findByIdForUpdate(key)).thenReturn(Optional.of(existing));
            when(ticketCounterRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(ticketPrefixPort.resolvePrefix(company)).thenReturn("PF-");

            String ticket = service.next(date, company);

            assertThat(ticket).isEqualTo("PF-20260622-000006");
        }

        @Test
        void savesUpdatedCounterWithIncrementedNumber() {
            LocalDate date = LocalDate.of(2026, 6, 22);
            String key = "20260622";

            TicketCounter existing = new TicketCounter();
            existing.setCounterKey(key);
            existing.setLastNumber(99);
            existing.setCompanyId(company.getId());

            when(ticketCounterRepository.findByIdForUpdate(key)).thenReturn(Optional.of(existing));
            when(ticketCounterRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(ticketPrefixPort.resolvePrefix(company)).thenReturn("PKF-");

            service.next(date, company);

            ArgumentCaptor<TicketCounter> captor = ArgumentCaptor.forClass(TicketCounter.class);
            verify(ticketCounterRepository).save(captor.capture());
            assertThat(captor.getValue().getLastNumber()).isEqualTo(100);
        }

        @Test
        void usesDateBasedKeyInISOBasicFormat() {
            LocalDate date = LocalDate.of(2026, 1, 5);
            String expectedKey = "20260105";

            when(ticketCounterRepository.findByIdForUpdate(expectedKey)).thenReturn(Optional.empty());
            when(ticketCounterRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(ticketPrefixPort.resolvePrefix(company)).thenReturn("T-");

            service.next(date, company);

            verify(ticketCounterRepository).findByIdForUpdate(expectedKey);
        }

        @Test
        void formatsTicketNumberWithSixDigitPadding() {
            LocalDate date = LocalDate.of(2026, 6, 22);
            String key = "20260622";

            TicketCounter counter = new TicketCounter();
            counter.setCounterKey(key);
            counter.setLastNumber(999998);
            counter.setCompanyId(company.getId());

            when(ticketCounterRepository.findByIdForUpdate(key)).thenReturn(Optional.of(counter));
            when(ticketCounterRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(ticketPrefixPort.resolvePrefix(company)).thenReturn("X-");

            String ticket = service.next(date, company);

            assertThat(ticket).isEqualTo("X-20260622-999999");
            // Formato de 6 dígitos: 999999 (no se rompe el padding en números grandes)
            assertThat(ticket).matches("X-\\d{8}-\\d{6}");
        }

        @Test
        void createsNewCounterWithCompanyIdWhenNotExists() {
            LocalDate date = LocalDate.of(2026, 6, 22);
            String key = "20260622";

            when(ticketCounterRepository.findByIdForUpdate(key)).thenReturn(Optional.empty());
            when(ticketCounterRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(ticketPrefixPort.resolvePrefix(company)).thenReturn("PF-");

            service.next(date, company);

            ArgumentCaptor<TicketCounter> captor = ArgumentCaptor.forClass(TicketCounter.class);
            verify(ticketCounterRepository).save(captor.capture());
            TicketCounter saved = captor.getValue();
            assertThat(saved.getCounterKey()).isEqualTo(key);
            assertThat(saved.getLastNumber()).isEqualTo(1);
            assertThat(saved.getCompanyId()).isEqualTo(company.getId());
        }
    }

    @Nested
    class PrefixResolution {

        @Test
        void usesResolvedPrefixFromPort() {
            LocalDate date = LocalDate.of(2026, 6, 22);
            when(ticketCounterRepository.findByIdForUpdate(any())).thenReturn(Optional.empty());
            when(ticketCounterRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(ticketPrefixPort.resolvePrefix(company)).thenReturn("MYPARK-");

            String ticket = service.next(date, company);

            assertThat(ticket).startsWith("MYPARK-");
        }

        @Test
        void handlesEmptyPrefix() {
            LocalDate date = LocalDate.of(2026, 6, 22);
            when(ticketCounterRepository.findByIdForUpdate(any())).thenReturn(Optional.empty());
            when(ticketCounterRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(ticketPrefixPort.resolvePrefix(company)).thenReturn("");

            String ticket = service.next(date, company);

            // Ticket válido aunque sin prefijo: solo fecha-numero
            assertThat(ticket).matches("\\d{8}-\\d{6}");
        }
    }
}
