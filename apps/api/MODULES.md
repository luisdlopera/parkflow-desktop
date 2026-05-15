# Parkflow API: Modular Architecture

This document describes the modular hexagonal architecture of the Parkflow API, following the architectural hardening performed in May 2026.

## Core Principles

1.  **Hexagonal Structure (Ports & Adapters):**
    *   **Domain:** Pure business logic, entities, and domain services. Zero dependencies on external frameworks (except JPA annotations for pragmatic reasons).
    *   **Application:** Use Cases and Input/Output Ports. Orchestrates the flow of data.
    *   **Infrastructure:** Implementation of Output Ports (Repositories, External Services).
    *   **Presentation/Controller:** REST API endpoints (Input Adapters).

2.  **Strict Modularity:**
    *   Modules must not have circular dependencies.
    *   Cross-module communication is performed via **Application Ports** or **Domain Services**.
    *   Shared logic is moved to the `common` module.

## Module Map

### 1. `auth` (Identity & Access)
*   **Domain:** `AppUser`, `UserRole`, `AuthSession`.
*   **Responsibility:** Authentication, security filtering (JWT), and user management.
*   **Dependencies:** None (Terminal/Common only).

### 2. `configuration` (Master Data)
*   **Domain:** `Rate`, `RoundingMode`, `ParkingSite`, `MonthlyContract`.
*   **Responsibility:** Management of rates, sites, and operational parameters.
*   **Dependencies:** `auth` (for auditing).

### 3. `parking` (Operations)
*   **Domain:** `ParkingSession`, `Vehicle`, `Payment`, `VehicleConditionReport`.
*   **Responsibility:** Core business flow: Entry, Exit, Pricing calculation, and Session lifecycle.
*   **Dependencies:** `auth`, `configuration` (for rates and sites).

### 4. `cash` (Financial)
*   **Domain:** `CashSession`, `CashMovement`, `CashRegister`.
*   **Responsibility:** Cashier operations, movements, and session control.
*   **Dependencies:** `auth`, `parking` (to link payments).

## Hardening Achievements

*   **Circular Dependency Removal:** Successfully decoupled `auth` and `parking.operation`.
*   **Granular Use Cases:** Fragmented "God Services" (like `SettingsRateService`) into single-responsibility classes.
*   **Domain Enrichment:** Moved validation logic (overlap, capacity) from Services to Domain Services.
*   **Standardized Exceptions:** Unified error handling using `OperationException` in `common`.

## How to add a new Feature

1.  Identify the module.
2.  Define the **Domain Entity** and its **Port** (Interface).
3.  Implement the **Use Case** in the `application` layer.
4.  Implement the **Adapter** (JPA/External) in the `infrastructure` layer.
5.  Expose via a **Controller**.

---
*Maintained by: Antigravity AI*
