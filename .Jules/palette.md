## 2026-06-21 - [Component State ARIA Attributes]
**Learning:** Interactive components like StatusToggle, ThemeToggle, MotorcycleEntryFormUI's helmet buttons, and PrintStatusMonitor's dropdown required explicit state communication for screen readers (e.g., using role="switch" with aria-checked, and aria-pressed/aria-expanded).
**Action:** Always ensure that interactive toggle states and dynamically expanded sections are paired with appropriate ARIA attributes to relay state changes properly.
