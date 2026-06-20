# Animation Components Quick Start

Fast reference for using animations in ParkFlow.

## Import Animation Components

```tsx
import {
  PageTransition,
  StaggerContainer,
  StaggerItem,
  AnimatedSkeletonLoader,
  AnimatedModal,
  AnimatedCard,
  EnhancedButton,
  ScrollToTopButton,
  AnimatedDataTable,
  FadeInUp,
} from "@/components/animations";

import { useAnimatedAction } from "@/hooks/useAnimatedAction";
import { showAnimatedToast } from "@/lib/toast/animated-toast";
```

## Common Patterns

### 1. Wrap Page Content in PageTransition

```tsx
export default function Page() {
  return (
    <PageTransition>
      <h1>Page Title</h1>
      <p>Content appears with fade + scale</p>
    </PageTransition>
  );
}
```

### 2. Animated Loading State

```tsx
const { data, isLoading } = useSomeData();

if (isLoading) {
  return <AnimatedSkeletonLoader count={5} variant="table" />;
}

return <div>{data}</div>;
```

### 3. List with Stagger Animation

```tsx
<StaggerContainer staggerDelay={0.1}>
  {items.map((item) => (
    <StaggerItem key={item.id}>
      <Card>{item.name}</Card>
    </StaggerItem>
  ))}
</StaggerContainer>
```

### 4. Form Submission with Loading State

```tsx
export function MyForm() {
  const { execute, isLoading } = useAnimatedAction({
    successMessage: "Changes saved!",
    errorMessage: "Failed to save changes",
  });

  const handleSubmit = async (data) => {
    await execute(() => api.updateSettings(data));
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      handleSubmit(Object.fromEntries(formData));
    }}>
      <input name="email" type="email" />
      <EnhancedButton isLoading={isLoading} type="submit">
        Save Settings
      </EnhancedButton>
    </form>
  );
}
```

### 5. Hover Card Effect

```tsx
<AnimatedCard hoverable onClick={() => navigate(`/details/${id}`)}>
  <h3>Card Title</h3>
  <p>Hover to see lift effect</p>
</AnimatedCard>
```

### 6. Animated Data Table

```tsx
export function ConfigPage() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <PageTransition>
      <AnimatedDataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        searchable
        selectable
      />
    </PageTransition>
  );
}
```

### 7. Modal with Animation

```tsx
function MyModal({ isOpen, onClose }) {
  return (
    <AnimatedModal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h2>Confirm Action</h2>
        <p>Are you sure?</p>
        <div className="flex gap-3 mt-4">
          <button onClick={onClose}>Cancel</button>
          <EnhancedButton onClick={onConfirm}>
            Confirm
          </EnhancedButton>
        </div>
      </div>
    </AnimatedModal>
  );
}
```

### 8. Toast Notifications

```tsx
// In event handlers or async functions:
showAnimatedToast("Settings saved!", "success");
showAnimatedToast("Invalid email address", "error");
showAnimatedToast("Are you sure?", "warning");
showAnimatedToast("Processing your request...", "info");
```

### 9. Scroll to Top Button

```tsx
// Add once in layout root:
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <ScrollToTopButton threshold={300} />
      </body>
    </html>
  );
}
```

### 10. Fade In with Delay

```tsx
<FadeInUp delay={0.1} duration={0.5}>
  <div>Content appears after 100ms delay</div>
</FadeInUp>

<FadeInUp delay={0.2} duration={0.5}>
  <div>This appears 100ms later</div>
</FadeInUp>
```

## CSS Animation Classes

### Add animations with Tailwind classes:

```tsx
// Page entrance
<div className="animate-page-enter">Fades in with scale</div>

// Slide animations
<div className="animate-slide-in-left">Slides from left</div>
<div className="animate-slide-in-top">Slides from top</div>

// Scale entrance
<div className="animate-scale-in">Scales in from 0.95</div>

// Bounce entrance
<div className="animate-bounce-in">Bounces in</div>

// Error feedback
<div className="animate-shake">Shakes (0.4s)</div>

// Loading states
<div className="animate-shimmer">Shimmer gradient</div>
<div className="animate-spin-smooth">Smooth spinner</div>
<div className="animate-pulse-soft">Soft pulse</div>

// Hover effects
<div className="button-hover-scale">Button hover</div>
<div className="card-hover-lift">Card hover</div>

// Transitions
<div className="transition-smooth">200ms smooth</div>
<div className="transition-smooth-slow">300ms smooth</div>

// Scroll
<div className="scroll-smooth">Smooth scroll</div>
```

## Customization

### Adjust timing for slower animations:

```tsx
// In utils.ts, TRANSITIONS object:
export const TRANSITIONS = {
  fast: { duration: 0.15, ease: "easeOut" },
  normal: { duration: 0.3, ease: "easeOut" },
  slow: { duration: 0.5, ease: "easeOut" },
  // Add custom:
  verySlow: { duration: 0.8, ease: "easeOut" },
};
```

### Use in component:

```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={TRANSITIONS.verySlow}
>
  Custom timing
</motion.div>
```

## Accessibility

### Respects user motion preferences:

```tsx
const reducedMotion = prefersReducedMotion();

// Automatically handled in all components
// OR manually:
<motion.div
  animate={reducedMotion ? {} : { opacity: 1 }}
  transition={reducedMotion ? { duration: 0.01 } : { duration: 0.3 }}
>
  Content
</motion.div>
```

### Test reduced motion:
1. Open DevTools
2. Command Palette (Ctrl+Shift+P)
3. Type "reduced motion"
4. Check "Emulate CSS media feature prefers-reduced-motion"

## Performance Tips

1. **Prefer transform over position**:
   ```tsx
   // Good - GPU accelerated
   animate={{ x: 100 }}
   
   // Avoid - CPU intensive
   animate={{ marginLeft: 100 }}
   ```

2. **Use opacity for fades**:
   ```tsx
   // Good
   animate={{ opacity: 0.5 }}
   
   // Avoid
   animate={{ color: "transparent" }}
   ```

3. **Keep animations short** (200-300ms):
   ```tsx
   // Good
   transition={{ duration: 0.3 }}
   
   // Avoid
   transition={{ duration: 2 }}  // Too slow
   ```

4. **Stagger carefully**:
   ```tsx
   // Good - 10 items at 100ms each = 1s total
   <StaggerContainer staggerDelay={0.1}>
   
   // Avoid - 10 items at 500ms each = 5s total
   <StaggerContainer staggerDelay={0.5}>
   ```

## Common Issues

### Animation not working?

1. Check component is wrapped in AnimatePresence (for exit animations)
2. Verify Framer Motion is imported
3. Check prefers-reduced-motion isn't enabled in dev
4. Ensure className/styles aren't overriding transform

### Too slow/fast?

Adjust duration in variants.ts or TRANSITIONS object.

### Motion sickness concerns?

- Use `prefersReducedMotion()` in all components
- Keep animations under 400ms
- Avoid excessive motion/rotation
- Test with users

## Browser DevTools

### Chrome DevTools - Check Performance:
1. Open DevTools > Performance tab
2. Record page interaction
3. Look for:
   - `requestAnimationFrame` calls
   - Consistent 60fps (16.67ms frame time)
   - No "long task" warnings

### Firefox DevTools - Check Animations:
1. Inspector > Animations tab
2. See animation timeline
3. Scrub through animation

## Getting Help

- **Animation system docs**: `src/lib/animations/README.md`
- **Implementation guide**: `docs/ANIMATIONS_IMPLEMENTATION.md`
- **Framer Motion docs**: https://www.framer.com/motion/
- **Ask the team**: Check CLAUDE.md for current maintainers

---

**Last updated**: 2026-06-20
