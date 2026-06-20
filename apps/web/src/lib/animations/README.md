# ParkFlow Animation System

Professional animations and transitions library for ParkFlow web app. Built with Framer Motion and Tailwind CSS, designed for a premium, snappy feel with full accessibility support.

## Core Principles

- **Speed**: 200-300ms durations for fast, responsive feedback
- **Accessibility**: All animations respect `prefers-reduced-motion` setting
- **Consistency**: Centralized variants and transitions for cohesive feel
- **Performance**: GPU-accelerated transforms only (translate, scale, opacity)

## Available Components

### Page Transitions

```tsx
import { PageTransition } from "@/components/animations";

<PageTransition>
  <div>Page content with fade + scale animation</div>
</PageTransition>
```

**Features**:
- Fade in + subtle upward movement
- 300ms smooth easing
- Respects reduced motion preference

### Stagger Container

For animating lists and grids with staggered timing:

```tsx
import { StaggerContainer, StaggerItem } from "@/components/animations";

<StaggerContainer staggerDelay={0.1}>
  <StaggerItem>Item 1</StaggerItem>
  <StaggerItem>Item 2</StaggerItem>
  <StaggerItem>Item 3</StaggerItem>
</StaggerContainer>
```

### Skeleton Loaders

Professional shimmer animations for loading states:

```tsx
import { AnimatedSkeletonLoader } from "@/components/animations";

// Line variant (default)
<AnimatedSkeletonLoader count={3} height="h-8" />

// Card variant
<AnimatedSkeletonLoader count={2} variant="card" />

// Table variant
<AnimatedSkeletonLoader count={5} variant="table" />
```

### Modal

Backdrop fade + content bounce animation:

```tsx
import { AnimatedModal } from "@/components/animations";

<AnimatedModal isOpen={isOpen} onClose={close}>
  <div className="bg-white rounded-xl p-6">
    Modal content
  </div>
</AnimatedModal>
```

### Buttons

Enhanced button with hover scale and loading spinner:

```tsx
import { EnhancedButton } from "@/components/animations";

<EnhancedButton
  isLoading={isLoading}
  onClick={handleClick}
  color="primary"
>
  Save Changes
</EnhancedButton>
```

### Cards

Hover lift effect with smooth transitions:

```tsx
import { AnimatedCard } from "@/components/animations";

<AnimatedCard hoverable>
  <h3>Card Title</h3>
  <p>Card content</p>
</AnimatedCard>
```

### Scroll to Top

Smooth scroll button that appears on scroll:

```tsx
import { ScrollToTopButton } from "@/components/animations";

// Place in layout root
<ScrollToTopButton threshold={100} />
```

### Data Tables

Staggered row animations:

```tsx
import { AnimatedDataTable } from "@/components/animations";

<AnimatedDataTable
  columns={columns}
  data={data}
  isLoading={isLoading}
/>
```

## Available Variants

### Framer Motion Variants

Located in `variants.ts`:

- `pageTransitionVariants` - Page enter/exit
- `fadeInVariants` - Simple fade
- `slideInFromLeftVariants` - Slide from left
- `slideInFromRightVariants` - Slide from right
- `slideInFromTopVariants` - Slide from top
- `slideInFromBottomVariants` - Slide from bottom
- `scaleInVariants` - Scale entrance
- `modalBackdropVariants` - Backdrop fade
- `modalContentVariants` - Modal content bounce
- `drawerVariants` - Drawer slide-in
- `toastVariants` - Toast slide-in
- `dropdownVariants` - Dropdown slide-down
- `buttonHoverVariants` - Button hover effects
- `cardHoverVariants` - Card lift effect
- `tableRowVariants` - Table row animations
- `statusPulseVariants` - Pulsing status badges
- `skeletonVariants` - Shimmer animation

## Hooks

### useAnimatedAction

Execute async actions with automatic toast feedback:

```tsx
import { useAnimatedAction } from "@/hooks/useAnimatedAction";

const { execute, isLoading, error } = useAnimatedAction({
  successMessage: "Saved!",
  errorMessage: "Save failed",
  onSuccess: () => refresh(),
});

const handleSave = async () => {
  await execute(() => api.save(data));
};
```

## Tailwind CSS Classes

### Page Animations

- `.animate-page-enter` - Fade + scale entrance
- `.animate-slide-in-left` - Slide from left
- `.animate-slide-in-top` - Slide from top
- `.animate-scale-in` - Scale entrance
- `.animate-bounce-in` - Bounce entrance

### Loading Animations

- `.animate-spin-smooth` - Smooth 360° rotation
- `.animate-pulse-soft` - Soft pulsing opacity
- `.animate-shimmer` - Gradient shimmer effect
- `.animate-status-pulse` - Pulsing status effect

### Transitions

- `.transition-smooth` - 200ms smooth transition
- `.transition-smooth-slow` - 300ms smooth transition
- `.button-hover-scale` - Button hover scale effect
- `.card-hover-lift` - Card lift on hover
- `.scroll-smooth` - Smooth scroll behavior

### Utilities

- `.animate-success` - Success pulse (0.3s)
- `.animate-shake` - Error shake animation

## Accessibility

All animations respect the user's motion preferences:

```tsx
// Automatically checks prefers-reduced-motion
const reducedMotion = prefersReducedMotion();

// Use in components
if (reducedMotion) {
  // Return instant state change without animation
  return <div>{content}</div>;
}
```

**User Setting**: Settings > Accessibility > Reduce motion

## Toast Notifications

Enhanced toast system with automatic dismiss timing:

```tsx
import { showSuccessToast, showErrorToast } from "@/lib/toast/animated-toast";

// Success (auto-dismiss: 3s)
showSuccessToast("Changes saved!");

// Error (auto-dismiss: 4s)
showErrorToast("Failed to save");

// Warning (auto-dismiss: 3.5s)
showWarningToast("Please verify");

// Info (auto-dismiss: 3s)
showInfoToast("Loading data...");
```

## CSS Animations

### Smooth Scroll

Enable smooth scroll globally:

```html
<html class="scroll-smooth">
```

### Shimmer Loading

Create professional skeleton screens:

```css
.animate-shimmer {
  background-image: linear-gradient(90deg, ...);
  animation: shimmer 2s infinite;
}
```

## Performance Tips

1. **Use GPU-accelerated properties only**: `transform`, `opacity`
2. **Avoid animating**: `width`, `height`, `margin`, `padding`
3. **Prefer motion hooks**: Let framer-motion handle frame timing
4. **Respect reduced motion**: Always check `prefersReducedMotion()`
5. **Test on devices**: Validate on real mobile devices

## Duration Reference

- **Fast**: 150-200ms (micro-interactions, hovers)
- **Normal**: 300ms (page transitions, modals)
- **Slow**: 500ms+ (complex sequences, tutorials)

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

All animations use standard CSS transforms, which are widely supported.

## Next Steps

### To Add Animations to Existing Components

1. Wrap content with `PageTransition` or `StaggerContainer`
2. Use `EnhancedButton` instead of `Button` for loading states
3. Replace cards with `AnimatedCard` for hover effects
4. Use `AnimatedSkeletonLoader` for loading states
5. Use `useAnimatedAction` for form submissions

### Example: Adding to a Configuration Page

```tsx
import { PageTransition, AnimatedDataTable } from "@/components/animations";
import { useAnimatedAction } from "@/hooks/useAnimatedAction";

export default function ConfigPage() {
  const { execute, isLoading } = useAnimatedAction({
    successMessage: "Configuration saved!",
  });

  const handleSave = async (data) => {
    await execute(() => api.save(data));
  };

  return (
    <PageTransition>
      <AnimatedDataTable columns={columns} data={data} />
      <EnhancedButton
        isLoading={isLoading}
        onClick={() => handleSave(data)}
      >
        Save
      </EnhancedButton>
    </PageTransition>
  );
}
```
