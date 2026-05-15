package com.parkflow.modules.configuration.domain.repository;

import com.parkflow.modules.configuration.domain.Printer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PrinterPort {
  Optional<Printer> findBySite_IdAndIsDefaultTrue(UUID siteId);
  List<Printer> findBySite_IdAndIsActiveTrue(UUID siteId);
  Page<Printer> search(UUID siteId, String q, Boolean active, Pageable pageable);
  Printer save(Printer printer);
  Optional<Printer> findById(UUID id);
}
