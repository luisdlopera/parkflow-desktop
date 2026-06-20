# Mobile-First Development Checklist

Quick reference for developers implementing new features in ParkFlow.

---

## Before You Start

- [ ] Test on 375px viewport (iPhone SE width) — not desktop, not tablet
- [ ] Check [MOBILE_OPTIMIZATION.md](MOBILE_OPTIMIZATION.md) for current status
- [ ] Use mobile-first CSS: write mobile rules first, then `sm:`, `md:`, `lg:` overrides

---

## Component Implementation

### Forms & Inputs
- [ ] **Font size**: Use `.text-input-safe` or `text-base` class (prevents iOS zoom)
- [ ] **Width**: Use `w-full` on mobile, `sm:max-w-*` on larger screens
- [ ] **Labels**: Stack above inputs vertically on mobile
- [ ] **Spacing**: Use `gap-4 sm:gap-6` between form fields
- [ ] **Submit buttons**: Full-width on mobile (`w-full sm:w-auto`) with `min-h-11`

```tsx
// Good
<div className="form-stack-mobile">
  <Input label="Name" className="w-full text-base" />
  <Input label="Email" className="w-full text-base" />
  <button className="w-full sm:w-auto min-h-11">Save</button>
</div>

// Bad
<div className="space-y-2">
  <Input label="Name" className="w-1/2" />  // Fixed width, doesn't scale
  <Input label="Email" />  // Could be < 16px on mobile
  <button>Save</button>  // Not tall enough to tap easily
</div>
```

### Buttons & Interactive Elements
- [ ] **Minimum size**: All buttons must be ≥44x44px (use `min-h-11`)
- [ ] **Spacing**: Buttons should have ≥8px gap between them
- [ ] **Tap target**: Use `.touch-target` utility class
- [ ] **Mobile layout**: Stack buttons vertically on mobile, horizontally on desktop

```tsx
// Good
<div className="button-group-mobile">
  <button className="... min-h-11">Cancel</button>
  <button className="... min-h-11">Save</button>
</div>

// Bad
<div className="flex gap-2">  // Too small gap, hard to tap
  <button className="py-1 px-2">Cancel</button>  // Too small!
  <button className="py-1 px-2">Save</button>
</div>
```

### Tables
- [ ] **Columns**: Use `priority` property (`high`, `medium`, `low`)
  - `high`: Always visible
  - `medium`: Hidden on mobile (`md:table-cell`), shown on tablet+
  - `low`: Hidden on mobile/tablet (`lg:table-cell`), shown on desktop
- [ ] **Scrolling**: Tables can horizontal scroll on mobile (expected)
- [ ] **Actions**: Multiple buttons should be in a menu or drawer on mobile

```tsx
const columns = [
  { key: "id", label: "ID", priority: "high" },
  { key: "name", label: "Name", priority: "high" },
  { key: "email", label: "Email", priority: "medium" },  // Hidden on mobile
  { key: "phone", label: "Phone", priority: "low" },     // Hidden on mobile/tablet
];
```

### Modals & Drawers
- [ ] **Mobile**: Appear from bottom (bottom sheet), full viewport height
- [ ] **Desktop**: Appear from side or center, max-width constraint
- [ ] **Buttons**: Below content on mobile, may be fixed to prevent keyboard covering
- [ ] **Use FormDrawer component** — it's already optimized

### Navigation
- [ ] **Mobile**: Hamburger menu + mobile sidebar
- [ ] **Desktop**: Full sidebar visible
- [ ] **Safe area**: Use `.pad-safe-x` for drawer/sidebar edges
- [ ] **Already implemented** — just verify with responsive test

---

## Testing on Mobile

### Before Commit
```bash
# 1. Build locally
pnpm build  # Must pass, 0 errors

# 2. Test on 375px viewport
pnpm dev
# Open http://localhost:3000 on 375px (iPhone SE, Chrome DevTools)
```

### What to Check
- [ ] No horizontal scroll (except tables)
- [ ] All text readable (no overflow)
- [ ] All buttons easily tappable (≥44x44px)
- [ ] Forms don't hide under keyboard
- [ ] Inputs don't auto-zoom on iOS (≥16px font)
- [ ] Dark mode readable

### Simulator Testing (Ideal)
```bash
# iOS Simulator
open /Applications/Xcode.app/Contents/Developer/Applications/Simulator.app
# Safari > Responsive Design Mode (Cmd+Shift+M)
# Set to iPhone SE (375x667)

# Chrome DevTools
# F12 > Toggle device toolbar (Ctrl+Shift+M)
# Select iPhone SE from dropdown
```

---

## Tailwind Breakpoints (Know These!)

| Breakpoint | Width | Device | When to Use |
|-----------|-------|--------|------------|
| (default) | <640px | Mobile | Write all styles here first |
| sm: | ≥640px | Small tablet | Adjust for landscape phones |
| md: | ≥768px | Tablet | Show sidebar, 2 columns |
| lg: | ≥1024px | Desktop | Full layout, all columns |
| xl: | ≥1280px | Large desktop | May not need this often |

### How to Use
```tsx
// Mobile-first pattern: ✅ CORRECT
<div className="w-full sm:w-1/2 lg:w-1/3">

// Desktop-first pattern: ❌ AVOID
<div className="w-1/3 md:w-1/2 sm:w-full">
```

---

## CSS Classes You Can Use

### Already Available
```css
/* From globals.css */
.touch-target         /* min-h-11 min-w-11 */
.pad-safe-x           /* Safe area horizontal padding */
.pad-safe-top         /* Safe area top padding */
.pad-safe-bottom      /* Safe area bottom padding */
.form-stack-mobile    /* flex flex-col gap-4 sm:gap-6 */
.button-group-mobile  /* Responsive button layout */
.modal-keyboard-safe  /* Keyboard-aware padding */
```

### Existing Tailwind Classes
```tsx
// Breakpoints
sm: md: lg: xl: 2xl:

// Hide on mobile, show on desktop
<div className="hidden md:block">Sidebar content</div>
<div className="md:hidden">Mobile menu</div>

// Responsive padding
className="p-4 sm:p-6 lg:px-8 lg:py-6"

// Responsive grid
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"

// Responsive font size
className="text-sm sm:text-base lg:text-lg"

// Responsive width
className="w-full sm:w-1/2 lg:w-1/3"
```

---

## Common Mistakes

| ❌ Bad | ✅ Good | Why |
|--------|---------|-----|
| `<button className="py-1">` | `<button className="... min-h-11">` | 44x44px minimum |
| `<input className="text-xs">` | `<input className="text-base">` | Prevents iOS zoom |
| `<div className="w-1/3">` | `<div className="w-full sm:w-1/3">` | Mobile-first |
| `<div className="px-8">` | `<div className="p-4 sm:p-6 lg:p-8">` | Scales down properly |
| `Fixed width forms` | `w-full` on mobile | Works on all sizes |
| `gap-1` between buttons | `gap-3` minimum | Hard to tap with gap-1 |

---

## Quick Wins (Easy Improvements)

If you're adding a new page/component:

1. **Text inputs**: Add `text-base` class
2. **Buttons**: Add `min-h-11` class
3. **Padding**: Use `p-4 sm:p-6 lg:p-8` pattern
4. **Width**: Use `w-full sm:w-auto` for flex items
5. **Grid**: Use `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` pattern

---

## Getting Help

- **Need mobile-specific styling?** Check [MOBILE_OPTIMIZATION.md](MOBILE_OPTIMIZATION.md)
- **Button/input issues?** Check `src/components/bridge/*.tsx`
- **Form layout?** Use FormDrawer component or form-stack-mobile class
- **Table columns?** Set `priority: "high"|"medium"|"low"` in column definition
- **Dark mode colors?** Check `src/app/globals.css` dark mode section

---

## Red Flags 🚨

Stop and fix immediately if you see:
- ❌ `hidden sm:flex` (shows only on small screens — backwards!)
- ❌ `w-1/2` or `w-1/3` without `sm:` breakpoint (always that width)
- ❌ `text-xs` on inputs (iOS will auto-zoom)
- ❌ `px-8 py-8` on mobile (too much padding on small screens)
- ❌ `gap-1` between buttons (too tight to tap)
- ❌ No `overflow-x-hidden` on main layout (horizontal scroll on mobile)

---

**Last Updated**: 2026-06-20  
**Status**: All Phase 1 issues fixed, ready for mobile deployment
