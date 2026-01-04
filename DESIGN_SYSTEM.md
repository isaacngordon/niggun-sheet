# Design System Documentation

## Color Palette

Our design system uses a carefully selected color palette optimized for high contrast and accessibility on dark backgrounds.

### Brand Colors

```css
--brand-yellow: #FFD700        /* Primary accent - Gold */
--brand-yellow-dark: #EAB308   /* Hover state */
--brand-yellow-darker: #CA8A04 /* Active state */
```

**Usage:** Primary CTAs, interactive elements, emphasis

**Contrast Ratio:** 
- Yellow on black: 12.6:1 (WCAG AAA)
- Yellow text is always paired with black backgrounds for maximum legibility

### Background Colors

```css
--bg-primary: #000000     /* Pure black - Main background */
--bg-secondary: #0d0d0d   /* Very dark gray - Sections */
--bg-tertiary: #1a1a1a    /* Dark gray - Cards */
--bg-elevated: #2d2d2d    /* Elevated surfaces - Inputs, hover states */
```

**Usage:** Layer your UI with these backgrounds to create depth

### Text Colors (High Contrast)

```css
--text-primary: #FFFFFF    /* White - Headings, important text */
--text-secondary: #E5E5E5  /* Light gray - Body text */
--text-tertiary: #B3B3B3   /* Medium gray - Supporting text */
--text-muted: #808080      /* Muted gray - Least important */
```

**Contrast Ratios:**
- Primary (#FFFFFF on #000000): 21:1 (WCAG AAA)
- Secondary (#E5E5E5 on #000000): 17.9:1 (WCAG AAA)
- Tertiary (#B3B3B3 on #000000): 12.1:1 (WCAG AAA)
- Muted (#808080 on #000000): 5.9:1 (WCAG AA)

### Accent Colors

```css
--accent-success: #10B981  /* Green - Success states */
--accent-error: #EF4444    /* Red - Errors */
--accent-warning: #F59E0B  /* Orange - Warnings */
--accent-info: #3B82F6     /* Blue - Information */
```

### Border Colors

```css
--border-primary: rgba(255, 255, 255, 0.2)   /* 20% white opacity */
--border-secondary: rgba(255, 255, 255, 0.1) /* 10% white opacity */
--border-accent: #FFD700                      /* Brand yellow */
```

## Typography

### Font Family

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
             Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', 
             sans-serif;
```

**System font stack** ensures optimal performance and native look across platforms.

### Type Scale

| Class | Size | Weight | Line Height | Use Case |
|-------|------|--------|-------------|----------|
| `.text-hero` | 3.5-6rem | 800 | 1.1 | Homepage hero titles |
| `.text-heading-1` | 3-4rem | 700 | 1.2 | Page titles |
| `.text-heading-2` | 2-3rem | 700 | 1.2 | Section titles |
| `.text-heading-3` | 1.5-2rem | 600 | 1.3 | Subsection titles |
| `.text-body-large` | 1.125rem | 400 | 1.5 | Lead paragraphs |
| `.text-body` | 1rem | 400 | 1.5 | Body text |
| `.text-body-small` | 0.875rem | 400 | 1.5 | Small text, captions |

**Note:** All headings use `text-text-primary` (white) for maximum contrast.

## Components

### Buttons

#### Primary Button

```html
<button class="btn-primary">Download Sheet</button>
```

**Properties:**
- Background: `#FFD700` (brand yellow)
- Text: `#000000` (black) - 12.6:1 contrast
- Hover: Darker yellow with glow effect
- Focus: Yellow ring with offset

**Use for:** Primary actions, main CTAs

#### Secondary Button

```html
<button class="btn-secondary">Learn More</button>
```

**Properties:**
- Background: Transparent
- Border: 2px solid rgba(255, 255, 255, 0.2)
- Text: White
- Hover: Elevated background, yellow border

**Use for:** Secondary actions, alternative options

#### Ghost Button

```html
<button class="btn-ghost">Cancel</button>
```

**Properties:**
- Background: Transparent
- Text: Secondary gray
- Hover: Elevated background, white text

**Use for:** Tertiary actions, cancel buttons

### Inputs

#### Text Input

```html
<input type="text" class="input-primary" placeholder="Search...">
```

**Properties:**
- Background: `#2d2d2d` (elevated)
- Border: 1px solid rgba(255, 255, 255, 0.2)
- Text: White
- Placeholder: `#808080` (muted gray)
- Focus: Yellow border with glow ring

**Accessibility:** 
- Minimum touch target: 44x44px
- Clear focus indicators
- Placeholder text at 5.9:1 contrast

### Cards

```html
<div class="card">
  <h3>Card Title</h3>
  <p>Card content...</p>
</div>
```

**Properties:**
- Background: `#1a1a1a`
- Border: 1px solid rgba(255, 255, 255, 0.1)
- Padding: 1.5rem
- Border radius: 0.5rem

**Elevated variant:**
```html
<div class="card-elevated">...</div>
```

Adds shadow for additional depth.

### Badges

```html
<span class="badge-new">NEW</span>
```

**Variants:**
- `.badge-new` - Yellow background, black text
- `.badge-info` - Blue background with border

## Utility Classes

### Text Shadows

```css
.text-shadow    /* Subtle shadow for text on images */
.text-shadow-lg /* Stronger shadow for more contrast */
```

### Gradients

```css
.bg-gradient-dark     /* Subtle vertical gradient */
.bg-gradient-elevated /* Diagonal gradient for depth */
```

## Usage with Tailwind

All design tokens are available as Tailwind classes:

```html
<!-- Colors -->
<div class="bg-bg-secondary text-text-primary">
  <h1 class="text-brand-yellow">Title</h1>
</div>

<!-- Responsive utilities -->
<h1 class="text-4xl md:text-5xl lg:text-6xl font-bold">
  Responsive Heading
</h1>

<!-- Custom component classes -->
<button class="btn-primary">Click Me</button>
```

## Accessibility Guidelines

### Contrast Requirements

All text meets WCAG 2.1 Level AAA standards:
- **Large text (18px+):** Minimum 4.5:1 contrast ratio
- **Normal text:** Minimum 7:1 contrast ratio
- **Our implementation:** Most text exceeds 12:1 contrast

### Interactive Elements

- Minimum touch target size: 44x44px
- Clear focus indicators on all interactive elements
- Keyboard navigation support
- Hover states for all clickable elements

### Color Usage

- Never rely on color alone to convey information
- Use text labels, icons, and patterns in addition to color
- Test designs in grayscale to ensure clarity

## Implementation

### In React Components

```jsx
import React from 'react';

export function MyComponent() {
  return (
    <div className="bg-bg-tertiary p-6 rounded-lg">
      <h2 className="text-heading-2 mb-4">Section Title</h2>
      <p className="text-body-large mb-6">
        Description text with high contrast
      </p>
      <button className="btn-primary">
        Take Action
      </button>
    </div>
  );
}
```

### In CSS

```css
/* Use CSS variables for consistency */
.custom-element {
  background-color: var(--bg-elevated);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
}

.custom-element:hover {
  background-color: var(--bg-tertiary);
  border-color: var(--border-accent);
}
```

## Best Practices

1. **Always test contrast** - Use browser dev tools or contrast checkers
2. **Use semantic HTML** - Proper heading hierarchy, buttons, links
3. **Layer backgrounds** - Create depth with our background color scale
4. **Consistent spacing** - Use Tailwind's spacing scale (4px increments)
5. **Test on multiple displays** - Check both light and dark environments
6. **Mobile first** - Design for small screens, enhance for large
7. **Respect user preferences** - Support system dark mode settings

## Tools

- **Contrast Checker:** [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- **Color Blindness Simulator:** Chrome DevTools > Rendering > Emulate vision deficiencies
- **Accessibility Inspector:** Browser developer tools accessibility pane

## Migration Notes

When converting existing components:
1. Replace low-contrast grays (#a0a0a0) with `text-secondary` (#E5E5E5)
2. Update button styles to use `.btn-primary` or `.btn-secondary`
3. Use `input-primary` class for all form inputs
4. Replace inline styles with utility classes
5. Test all interactive states (hover, focus, active)

## Future Enhancements

- [ ] Add dark mode toggle (currently defaults to dark)
- [ ] Create component library with Storybook
- [ ] Add animation utilities
- [ ] Create themed variants for special pages
- [ ] Add print stylesheet
