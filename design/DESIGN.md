---
name: Hyperlocal Admin Core
colors:
  surface: '#f6faff'
  surface-dim: '#d6dae0'
  surface-bright: '#f6faff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f4fa'
  surface-container: '#eaeef4'
  surface-container-high: '#e4e8ee'
  surface-container-highest: '#dfe3e8'
  on-surface: '#171c20'
  on-surface-variant: '#3e4850'
  inverse-surface: '#2c3135'
  inverse-on-surface: '#edf1f7'
  outline: '#6e7881'
  outline-variant: '#bec8d2'
  surface-tint: '#006591'
  primary: '#006591'
  on-primary: '#ffffff'
  primary-container: '#2aabee'
  on-primary-container: '#003c58'
  inverse-primary: '#89ceff'
  secondary: '#00658e'
  on-secondary: '#ffffff'
  secondary-container: '#54c0fd'
  on-secondary-container: '#004c6d'
  tertiary: '#845400'
  on-tertiary: '#ffffff'
  tertiary-container: '#dd910f'
  on-tertiary-container: '#503100'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c9e6ff'
  primary-fixed-dim: '#89ceff'
  on-primary-fixed: '#001e2f'
  on-primary-fixed-variant: '#004c6e'
  secondary-fixed: '#c7e7ff'
  secondary-fixed-dim: '#85cfff'
  on-secondary-fixed: '#001e2e'
  on-secondary-fixed-variant: '#004c6c'
  tertiary-fixed: '#ffddb6'
  tertiary-fixed-dim: '#ffb95a'
  on-tertiary-fixed: '#2a1800'
  on-tertiary-fixed-variant: '#643f00'
  background: '#f6faff'
  on-background: '#171c20'
  surface-variant: '#dfe3e8'
typography:
  title-bold:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 24px
  section-label:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  body-main:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 20px
  body-secondary:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  caption:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 680px
  edge-margin: 16px
  gutter: 12px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
---

## Brand & Style
The design system is engineered for efficiency and familiarity within the Telegram ecosystem. It targets local administrators managing city directories in Uzbekistan, necessitating a UI that feels native to the platform they already use for communication.

The style is **Corporate / Modern** with a strong emphasis on **Mobile-first** utility. It utilizes a refined Telegram-inspired palette to reduce cognitive load, ensuring the transition from chat to admin panel is seamless. The tone is utilitarian and warm, utilizing Uzbek Latin script with minimal, purposeful emoji usage to guide the user without cluttering the interface.

## Colors
The palette leverages the iconic Telegram blue as a linear gradient for primary actions. 

- **Primary Action:** Use the gradient from `#2AABEE` to `#229ED9` at a 135-degree angle.
- **Surface Strategy:** In Dark mode, use `#1C2733` for cards to pop against the `#17212B` background. In Light mode, use `#F7F9FB` for subtle grouping.
- **Active States:** For selected icons or navigation items, use a background tint of the primary color at 14% opacity.

## Typography
This design system employs a system font stack (Inter/SF Pro/Roboto) for maximum performance and native feel. 

- **Hierarchy:** Use `title-bold` for screen headers. 
- **Organization:** Use `section-label` in the `muted` color token for categorizing lists or form groups.
- **Content:** `body-main` is the standard for list items, while `body-secondary` is reserved for descriptions and meta-data.

## Layout & Spacing
The layout follows a **Fixed Grid** approach optimized for mobile devices. 

- **Constraints:** While mobile-first (390px base), the layout caps at 680px for desktop viewing, centered with a background fill matching the system background color.
- **Margins:** Consistent 16px lateral margins for all screen content.
- **Rhythm:** Vertical spacing between cards and sections should follow an 8px (sm) or 16px (md) rhythm.

## Elevation & Depth
Depth is communicated through **Tonal Layers** rather than heavy shadows, maintaining the clean Telegram aesthetic.

- **Layering:** In Dark mode, elevations are created by stepping from Background to Surface. 
- **Shadows:** Use a single, very soft glow for the Floating Action Button (FAB) only. The shadow should use the primary blue color at 30% opacity with a 12px blur.
- **Dividers:** Use 1px solid lines using the `divider` token to separate list items within a single surface container.

## Shapes
The shape language is friendly and modern, utilizing significant corner radii to soften the data-heavy nature of an admin panel.

- **Containers:** Cards and input fields use a consistent 14px radius.
- **Actions:** Buttons use a slightly more rounded 15px radius to differentiate them from static containers.
- **Pills:** Filter chips and navigation indicators must be fully rounded (pill-shaped).

## Components

- **Task Row Card:** A white or surface-colored card with a 6px vertical accent bar on the left (status-coded). Includes a `body-main` title, `body-secondary` description, a right-aligned badge, and a chevron icon.
- **Record Row:** A compact horizontal layout. Features a status edge, `body-main` name, and `body-secondary` landmark. Ratings are displayed with a solid star icon and `caption` text.
- **Filter Chip Row:** A horizontal scrollable container (hide scrollbars). Chips have a 1px border in `divider` color, moving to primary blue fill with white text when active.
- **Bottom Navigation:** Fixed to the bottom. 5 items. The active state is indicated by a primary blue icon sitting atop a horizontal pill-shaped background (14% blue opacity).
- **Floating Action Button (FAB):** 56px circular button using the primary gradient. Contains a white 24px solid icon. Apply a soft blue glow.
- **Form Field:** The label is placed above the input in `section-label` style. The input field is a 14px rounded rectangle with a `surface` background and 16px internal padding.
- **Empty State:** Centered vertically and horizontally. Uses a 48px muted solid icon, a `body-main` explanation text, and a primary gradient button.
- **Inline Banner:** Full-width container with 14px radius. Use a light tint of the status colors (Green/Amber/Red) for background and darker text for accessibility.