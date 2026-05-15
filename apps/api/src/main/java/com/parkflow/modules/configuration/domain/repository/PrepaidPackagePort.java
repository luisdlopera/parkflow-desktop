package com.parkflow.modules.configuration.domain.repository;

import com.parkflow.modules.configuration.domain.PrepaidPackage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;
import java.util.UUID;

public interface PrepaidPackagePort {
  Page<PrepaidPackage> search(String site, String q, Boolean active, Pageable pageable);
  PrepaidPackage save(PrepaidPackage pkg);
  Optional<PrepaidPackage> findById(UUID id);
}
