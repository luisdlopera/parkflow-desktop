---
name: dark-mode-design-expert
description: Master dark mode UI design with atmospheric theming, WCAG accessibility, and cross-platform best practices. Specializes in weather/sky/ocean-inspired color systems that adapt to time of day
  and environmental conditions.
metadata:
  category: Design
  tags:
  - dark-mode
  - accessibility
  - theming
  pairs-with:
  - skill: color-contrast-auditor
    reason: Dark mode surfaces require careful contrast ratio verification for accessibility
  - skill: design-system-generator
    reason: Dark mode token generation is a core capability of design system creation
  - skill: web-design-expert
    reason: Dark mode is a fundamental aspect of modern web design implementation
---

# Dark Mode Design Expert

Master dark mode UI design with atmospheric theming, WCAG accessibility, and cross-platform best practices. Specializes in weather/sky/ocean-inspired color systems that adapt to time of day and environmental conditions.

## When to Use This Skill

**Activate on:**
- "dark mode", "dark theme", "night mode"
- "theme switching", "light/dark toggle"
- "atmospheric UI", "weather theme", "sky gradient"
- "OLED optimization", "battery-friendly dark"
- "elevation in dark mode", "surface layering"
- "prefers-color-scheme", "color-scheme CSS"
- "contrast ratios dark mode", "accessibility dark theme"

**NOT for:**
- General color palette creation → `color-theory-palette-harmony-expert`
- Typography and font selection → `typography-expert`
- Component library architecture → `design-system-creator`
- Contrast auditing of specific colors → `color-contrast-auditor`

---

## The Science of Dark Mode

### Why Dark Mode Exists

| Factor | Light Mode | Dark Mode | Winner |
|--------|------------|-----------|--------|
| **OLED Battery** | 100% baseline | 39-47% savings at max brightness | Dark |
| **Low Light Comfort** | Eye strain, fatigue | Reduced glare | Dark |
| **Bright Environment** | Better readability | Washed out | Light |
| **Astigmatism Users** | Easier to read | Halation effect | Light |
| **Focus/Immersion** | Standard | Content pops forward | Dark |
| **Sleep Hygiene** | Blue light exposure | Reduced blue light | Dark |

**Key Insight:** Dark mode isn't universally better—it's contextually better. The best systems respect user preference AND adapt to environment.

### Contrast Requirements (WCAG 2.1)

| Element Type | Minimum Ratio | Target Ratio | Notes |
|--------------|---------------|--------------|-------|
| Body text | 4.5:1 | 7:1+ | AAA preferred for readability |
| Large text (≥24px) | 3:1 | 4.5:1+ | Headlines, hero text |
| UI components | 3:1 | 4.5:1+ | Borders, icons, focus rings |
| Disabled elements | None required | 2.5:1 | UX consideration |
| Decorative | None required | - | Pure aesthetic elements |

**Dark Mode Gotcha:** High contrast (21:1 pure white on black) causes more eye strain than moderate contrast (15:1). Target **12:1 to 16:1** for primary text.

---

## The Three-Tier Token Architecture

### Foundation: Primitives → Semantic → Component

```css
/* ══════════════════════════════════════════════════════════════════
   TIER 1: PRIMITIVES - Raw color values, never used directly
   ══════════════════════════════════════════════════════════════════ */
:root {
  /* Neutrals */
  --color-gray-50: #f8fafc;
  --color-gray-100: #f1f5f9;
  --color-gray-200: #e2e8f0;
  --color-gray-300: #cbd5e1;
  --color-gray-400: #94a3b8;
  --color-gray-500: #64748b;
  --color-gray-600: #475569;
  --color-gray-700: #334155;
  --color-gray-800: #1e293b;
  --color-gray-900: #0f172a;
  --color-gray-950: #020617;

  /* Brand Colors */
  --color-ocean-300: #7dd3fc;
  --color-ocean-400: #38bdf8;
  --color-ocean-500: #0ea5e9;
  --color-ocean-600: #0284c7;
  --color-ocean-700: #0369a1;

  /* Atmospheric Colors (for weather theming) */
  --color-twilight-deep: #0c1222;
  --color-twilight-mid: #151b2e;
  --color-twilight-surface: #1a1f3a;
  --color-dawn-warm: #fef3c7;
  --color-sunset-orange: #fb923c;
  --color-storm-gray: #374151;
}

/* ══════════════════════════════════════════════════════════════════
   TIER 2: SEMANTIC - Purpose-driven, theme-aware
   ══════════════════════════════════════════════════════════════════ */

/* Light Mode (Default) */
:root, :root.theme-light {
  /* Text */
  --color-text-primary: var(--color-gray-900);      /* 15.3:1 on white */
  --color-text-secondary: var(--color-gray-600);    /* 7.0:1 on white */
  --color-text-muted: var(--color-gray-500);        /* 4.6:1 on white */
  --color-text-inverse: var(--color-gray-50);

  /* Backgrounds */
  --color-bg-primary: #ffffff;
  --color-bg-secondary: var(--color-gray-50);
  --color-bg-elevated: #ffffff;
  --color-bg-overlay: rgba(0, 0, 0, 0.5);

  /* Surfaces (elevation system) */
  --color-surface-base: #ffffff;
  --color-surface-raised: #ffffff;
  --color-surface-overlay: #ffffff;

  /* Borders */
  --color-border-default: var(--color-gray-200);
  --color-border-muted: var(--color-gray-100);
  --color-border-emphasis: var(--color-gray-300);

  /* Interactive */
  --color-interactive-primary: var(--color-ocean-600);
  --color-interactive-hover: var(--color-ocean-700);
  --color-interactive-focus: var(--color-ocean-500);
}

/* Dark Mode */
:root.theme-dark {
  /* Text - slightly off-white to reduce strain */
  --color-text-primary: var(--color-gray-50);       /* 15.3:1 on dark */
  --color-text-secondary: var(--color-gray-300);    /* 9.3:1 on dark */
  --color-text-muted: var(--color-gray-400);        /* 5.5:1 on dark */
  --color-text-inverse: var(--color-gray-900);

  /* Backgrounds - NOT pure black (#000) */
  --color-bg-primary: var(--color-twilight-deep);   /* #0c1222 */
  --color-bg-secondary: var(--color-twilight-mid);  /* #151b2e */
  --color-bg-elevated: var(--color-twilight-surface); /* #1a1f3a */
  --color-bg-overlay: rgba(0, 0, 0, 0.7);

  /* Surfaces - LIGHTER for elevation (key dark mode principle) */
  --color-surface-base: var(--color-twilight-deep);
  --color-surface-raised: var(--color-twilight-mid);
  --color-surface-overlay: var(--color-twilight-surface);

  /* Borders - more visible in dark mode */
  --color-border-default: rgba(255, 255, 255, 0.1);
  --color-border-muted: rgba(255, 255, 255, 0.05);
  --color-border-emphasis: rgba(255, 255, 255, 0.2);

  /* Interactive - brighter for visibility */
  --color-interactive-primary: var(--color-ocean-400);
  --color-interactive-hover: var(--color-ocean-300);
  --color-interactive-focus: var(--color-ocean-500);
}
```

---

## Elevation in Dark Mode: The Critical Difference

### Why Shadows Fail in Dark Mode

In light mode, shadows create depth by simulating light from above. In dark mode:
- Shadows become invisible against dark backgrounds
- Pure black shadows look like "holes"
- The illusion breaks completely

### Material Design 3 Solution: Tonal Elevation

Instead of shadows, use **lighter surface colors** for elevated elements:

```css
/* Light Mode: Shadows create elevation */
.card-light {
  background: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Dark Mode: Surface color creates elevation */
.card-dark {
  background: #1e1e1e;  /* Elevated from #121212 base */
  box-shadow: none;      /* Or very subtle */
}
```

### Elevation Scale (Material Design 3)

| Level | Light Mode | Dark Mode Surface | Overlay % |
|-------|------------|-------------------|-----------|
| 0 (base) | #ffffff | #121212 | 0% |
| 1 | shadow-sm | #1e1e1e | 5% white |
| 2 | shadow-md | #232323 | 7% white |
| 3 | shadow-lg | #282828 | 8% white |
| 4 | shadow-xl | #2d2d2d | 9% white |
| 5 | shadow-2xl | #323232 | 11% white |

### Implementation Pattern

```css
:root.theme-dark {
  /* Calculate overlay colors */
  --elevation-1: color-mix(in srgb, white 5%, var(--color-bg-primary));
  --elevation-2: color-mix(in srgb, white 7%, var(--color-bg-primary));
  --elevation-3: color-mix(in srgb, white 8%, var(--color-bg-primary));
  --elevation-4: color-mix(in srgb, white 9%, var(--color-bg-primary));
  --elevation-5: color-mix(in srgb, white 11%, var(--color-bg-primary));
}

.card {
  background: var(--elevation-2);
}

.modal {
  background: var(--elevation-4);
}

.dropdown {
  background: var(--elevation-3);
}
```

---

## CSS Implementation Patterns

### Modern Approach: `prefers-color-scheme` + `light-dark()`

```css
/* 1. Set color-scheme for native element styling */
:root {
  color-scheme: light dark;
}

/* 2. Use light-dark() for inline theming (2024+ browsers) */
.card {
  background: light-dark(#ffffff, #1e1e1e);
  color: light-dark(#1f2937, #f3f4f6);
  border: 1px solid light-dark(#e5e7eb, rgba(255,255,255,0.1));
}

/* 3. Respect system preference */
@media (prefers-color-scheme: dark) {
  :root:not(.theme-light) {
    /* Dark mode tokens */
  }
}
```

### Theme Switching with JavaScript

```typescript
type Theme = 'light' | 'dark' | 'system';

function setTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove('theme-light', 'theme-dark');

  if (theme === 'system') {
    localStorage.removeItem('theme');
    return;
  }

  root.classList.add(`theme-${theme}`);
  localStorage.setItem('theme', theme);
}
```

### Preventing Flash of Wrong Theme (FOWT)

```html
<!-- In <head>, before any CSS -->
<script>
  (function() {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
      document.documentElement.classList.add('theme-dark');
    } else if (theme === 'light') {
      document.documentElement.classList.add('theme-light');
    }
  })();
</script>
```

---

## Anti-Patterns to Avoid

### 1. Pure Black Background (#000000)

**Problem:** Causes eye strain, harsh contrast, OLED "smearing" on scroll
**Solution:** Use near-black like #0c1222, #121212, or #1a1a2e

### 2. Pure White Text (#FFFFFF) on Dark

**Problem:** Too harsh, causes halation for astigmatism users
**Solution:** Use off-white like #f1f5f9, #e2e8f0

### 3. Same Colors for Both Themes

**Problem:** Teal that looks great on white becomes invisible on dark
**Solution:** Use brighter variants in dark mode (ocean-400 instead of ocean-600)

### 4. Shadows in Dark Mode

**Problem:** Shadows disappear against dark backgrounds
**Solution:** Use lighter surface colors for elevation instead

### 5. Inverted Light Mode Colors

**Problem:** Simply inverting creates jarring, unnatural results
**Solution:** Design dark mode as its own coherent system

### 6. Ignoring System Preference

**Problem:** Forcing dark mode ignores user's system-wide preference
**Solution:** Default to `prefers-color-scheme`, allow override

### 7. Flash of Wrong Theme

**Problem:** Page loads light, then flashes to dark
**Solution:** Inline script in `<head>` before CSS loads

---

## Testing Checklist

### Visual Testing

- [ ] Primary text readable on all backgrounds (4.5:1+)
- [ ] Secondary text readable (4.5:1+)
- [ ] Muted text acceptable (3:1+ for large, 4.5:1+ for normal)
- [ ] Interactive elements distinguishable
- [ ] Focus states clearly visible
- [ ] Disabled states identifiable (but not required contrast)
- [ ] Elevation hierarchy clear without shadows
- [ ] No harsh white/black combinations

### Functional Testing

- [ ] Theme toggle works correctly
- [ ] System preference respected on first load
- [ ] Theme persists across page reloads
- [ ] No flash of wrong theme
- [ ] Images adapt appropriately
- [ ] Code blocks readable
- [ ] Charts/graphs remain legible
- [ ] Form elements properly styled

### Device Testing

- [ ] OLED screens (check for smearing on scroll)
- [ ] LCD screens (check for backlight bleed visibility)
- [ ] High brightness outdoor use
- [ ] Low brightness night use
- [ ] Color blindness simulation

---

## Industry References

### Material Design 3
- Base dark surface: #121212
- Tonal elevation with white overlay (5-11%)
- Primary colors at 80% lightness for dark mode
- 15.8:1 target contrast for elevated surfaces

### Apple Human Interface Guidelines
- Respect system appearance setting
- Semantic colors that adapt automatically
- Increased vibrancy in dark mode
- Base system background: dynamic (not static black)

### Figma
- Background: #2c2c2c (base), #383838 (elevated)
- Text: #ffffff (primary), #b3b3b3 (secondary)
- Accent: #0d99ff (brand blue, brightened for dark)

### Discord
- Background: #36393f (main), #2f3136 (sidebar)
- Text: #dcddde (primary), #72767d (muted)
- Accent: #5865f2 (blurple, same in both modes)

### Slack
- Background: #1a1d21 (base), #222529 (elevated)
- Uses colored sidebars in dark mode
- Maintains brand identity while adapting

---

*Remember: Dark mode isn't the absence of light—it's the careful orchestration of luminance to guide attention, reduce strain, and create atmosphere.*
