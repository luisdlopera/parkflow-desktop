# Global Engineering Rules

## General Principles

- Siempre respeta la arquitectura actual del proyecto antes de proponer cambios.
- Antes de crear nuevas estructuras, analiza las existentes y reutiliza patrones ya implementados.
- Mantén consistencia en nombres, convenciones, organización de carpetas y estilo de código.
- No introduzcas nuevas librerías o frameworks sin justificar claramente su beneficio.
- Prioriza soluciones simples, mantenibles y escalables sobre soluciones complejas.
- Todo cambio debe estar alineado con los objetivos del negocio y el dominio de la aplicación.

## Architecture

- Sigue la arquitectura actual del proyecto.
- Identifica violaciones arquitectónicas y propón alternativas cuando corresponda.
- Mantén una clara separación de responsabilidades.
- Evita acoplamientos innecesarios entre módulos.
- Favorece diseños modulares y desacoplados.
- Aplica principios de arquitectura evolutiva.
- Diseña pensando en escalabilidad horizontal y crecimiento futuro.
- Mantén dependencias dirigidas hacia el dominio y no hacia la infraestructura.
- Stack principal: UI con HeroUI v3 + TailwindCSS v4. Usa el MCP `heroui-react` para consultar documentación de componentes antes de implementarlos.
- **Form Elements**: Todos los elementos de formulario (Select, Checkbox, Input, Dropdown, TextArea, etc.) DEBEN usar componentes de HeroUI v3, no HTML nativo. Prohibido usar `<select>`, `<input type="checkbox">`, `<textarea>` nativos. Consulta el MCP `heroui-react` antes de implementar cualquier componente UI.

## Clean Code

- Aplica los principios de Clean Code de Robert C. Martin.
- Usa nombres descriptivos y orientados al negocio.
- Mantén funciones pequeñas y con una única responsabilidad.
- Evita duplicación de código (DRY).
- Evita complejidad innecesaria (KISS).
- Evita sobreingeniería (YAGNI).
- Elimina código muerto, comentarios obsoletos y lógica no utilizada.
- Prefiere código autoexplicativo sobre comentarios extensos.

## SOLID

Aplica siempre:

- **S** — Single Responsibility Principle
- **O** — Open/Closed Principle
- **L** — Liskov Substitution Principle
- **I** — Interface Segregation Principle
- **D** — Dependency Inversion Principle

Cuando identifiques una violación de SOLID, indícala y propón una alternativa.

## Design Patterns

Utiliza patrones únicamente cuando resuelvan un problema real. Considera: Strategy, Factory, Builder, Observer, Adapter, Decorator, Facade, Command, Mediator, Repository, Unit of Work.

## Dependency Injection

- Favorece siempre la inyección de dependencias.
- Evita instanciaciones directas dentro de servicios de negocio.
- Facilita pruebas unitarias mediante desacoplamiento.
- Mantén dependencias explícitas y fácilmente reemplazables.

## Performance

Antes de optimizar: identifica cuellos de botella reales y mide antes de optimizar. Durante la implementación: evita consultas innecesarias, N+1 queries, operaciones repetitivas. Utiliza cache cuando aporte valor. Reduce consumo de memoria y complejidad algorítmica. Analiza Big O en operaciones críticas.

## Concurrency & Parallelism

Evalúa oportunidades para: paralelismo seguro, procesamiento asíncrono, event-driven architecture, message queues, background jobs, batch processing. Evita: race conditions, deadlocks, shared mutable state, bloqueos innecesarios. Diseña para alta concurrencia cuando el caso de negocio lo requiera.

## Security

Aplica seguridad por defecto. Verifica: validación de entrada, sanitización de datos, autorización, autenticación, principio de mínimo privilegio, protección contra SQL Injection, XSS, CSRF, SSRF. Manejo seguro de secretos y credenciales. Cifrado cuando sea necesario. Nunca expongas información sensible en logs.

## Testing

Prioriza: 1) Unit Tests, 2) Integration Tests, 3) E2E Tests. Las pruebas deben validar: reglas de negocio, casos límite, casos de error, flujos críticos. Evita pruebas frágiles dependientes de implementaciones internas.

## Observability

Siempre considera: logging estructurado, métricas, trazabilidad, monitoreo, alertas. Los errores deben ser accionables y fáciles de diagnosticar.

## Documentation

- Mantén documentación sincronizada con el código.
- Actualiza documentación cuando cambie el comportamiento.
- Elimina documentación obsoleta.
- Documenta decisiones arquitectónicas importantes.

## Refactoring

Cuando encuentres: código duplicado, acoplamiento excesivo, complejidad innecesaria, violaciones de SOLID, patrones mal implementados — propón refactorizaciones concretas. No refactorices por estética; refactoriza para mejorar mantenibilidad, escalabilidad o claridad.

## Code Review Mode

Al finalizar cualquier tarea:

1. Evalúa la solución propuesta.
2. Identifica riesgos técnicos.
3. Identifica deuda técnica generada.
4. Identifica problemas de rendimiento.
5. Identifica problemas de seguridad.
6. Identifica problemas de mantenibilidad.
7. Propón una alternativa mejor si existe.
8. Asigna una calificación de calidad del 1 al 10.
9. Explica qué haría un Staff Engineer o Principal Engineer para mejorar la solución.

## Enterprise Standards

Asume que el proyecto debe cumplir estándares de empresas como Google, Amazon, Microsoft, Netflix, Uber, Airbnb, Accenture, Globant, Thoughtworks. Por defecto:
- Prioriza mantenibilidad sobre velocidad de desarrollo.
- Prioriza escalabilidad sobre soluciones temporales.
- Prioriza legibilidad sobre trucos de código.
- Prioriza robustez sobre optimizaciones prematuras.
- Si detectas una solución mejor que la solicitada, explícalo y justifica el cambio.

---

## Runtime Error Detection & Prevention

**IMPORTANTE: Antes de ejecutar build/tests, debes revisar activamente si el código contiene estos errores comunes:**

### Hydration Errors (Next.js)

1. **Nested `<button>` elements**: `<Dropdown.Trigger>` (HeroUI) renderiza un `<button>`. Si dentro pones un `<Button>` que también renderiza un `<button>`, se crean botones anidados → hydration error.
   - **Solución**: No uses `<Dropdown.Trigger>` cuando el trigger es un `<Button>`. Pon el `<Button>` directamente como hijo de `<Dropdown>`.
   - **Excepción**: Usa `<Dropdown.Trigger>` solo con elementos que NO son botones (Avatar, íconos sin Button wrapper, etc.).

2. **Nested `<a>` elements**: Similar a botones, no ancles enlaces dentro de enlaces.

3. **`className` mismatch** entre server y client: No uses valores no deterministas (como `randomUUID`, `Date.now()`, `Math.random()`) en classNames o estilos.

### Console Errors & Warnings

1. **"Cannot update a component while rendering a different component"**: Ocurre cuando un setState se llama durante el render de otro componente. Refactoriza usando `useEffect` o `useLayoutEffect`.

2. **"Each child in a list should have a unique key prop"**: Toda iteración con `.map()` debe tener `key` única y estable (no usar `index` a menos que la lista sea estática).

3. **"Props with type string/number/boolean are not valid"**: Pasar valores incorrectos a props de componentes HeroUI. Verifica tipos.

4. **"Warning: A props object containing a "key" prop is being spread"**: No esparzas objetos que contengan `key` como props.

### Reglas de Componentes HeroUI v3

1. **`Dropdown.Trigger`**: Solo úsalo cuando el trigger NO sea un `Button`. Si usas `Button`, ponlo directamente como hijo de `<Dropdown>`.
2. **`Select.Trigger` + `Select.Value`**: Siempre deben usarse dentro de `Select`, nunca fuera.
3. **`Modal`**: Usa `Modal.Backdrop` → `Modal.Container` → `Modal.Dialog` → `Modal.Header`/`Modal.Body`/`Modal.Footer`. No omitas niveles.
4. **`Table` + `Table.Content`**: `Table.Content` requiere `Table.Header` y `Table.Body` como hijos directos.

### Proceso ante errores de runtime

1. Si detectas un error de hydration o console error en el código que estás modificando, **debes corregirlo antes de continuar**.
2. Si el error está en código que NO modificaste, detente y notifícalo al usuario antes de proseguir.
3. No desplegar código que tenga console errors o hydration errors conocidos.

---

## Build & Test Verification

**IMPORTANTE: Cada vez que realices cambios en el código, debes seguir este proceso obligatorio:**

1. Después de implementar los cambios solicitados, ejecuta **inmediatamente** los comandos de build y test correspondientes al/los módulos modificados.
2. Los comandos disponibles según el módulo afectado son:

   | Módulo | Build | Test |
   |--------|-------|------|
   | API (`apps/api`) | `pnpm build:api` | `pnpm test:api` |
   | Desktop (`apps/desktop`) | `pnpm build:desktop` | `pnpm test:desktop` |
   | Web (`apps/web`) | `pnpm build:web` | `pnpm test:web` |
   | Print Agent (`apps/print-agent`) | `pnpm --filter @parkflow/print-agent build` | *(no tiene tests)* |
   | Todo el proyecto | `pnpm build:all` | `pnpm test` o `pnpm validate` |

3. Si el build o los tests fallan:
   - Analiza la causa del error.
   - Aplica las correcciones necesarias.
   - Vuelve a ejecutar build y tests hasta que pasen exitosamente.
4. Solo considera la tarea como completada cuando build y tests pasen sin errores.
5. Si el cambio afecta múltiples módulos, ejecuta build y test en cada uno de ellos.

**No entregues una solución que rompa el build o los tests existentes.**
