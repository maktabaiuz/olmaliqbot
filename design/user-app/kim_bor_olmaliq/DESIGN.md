---
name: Kim Bor Olmaliq
colors:
  surface: '#f4fafd'
  surface-dim: '#d4dbdd'
  surface-bright: '#f4fafd'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eef5f7'
  surface-container: '#e8eff1'
  surface-container-high: '#e2e9ec'
  surface-container-highest: '#dde4e6'
  on-surface: '#161d1f'
  on-surface-variant: '#474554'
  inverse-surface: '#2b3234'
  inverse-on-surface: '#ebf2f4'
  outline: '#787586'
  outline-variant: '#c8c4d7'
  surface-tint: '#5847d2'
  primary: '#5341cd'
  on-primary: '#ffffff'
  primary-container: '#6c5ce7'
  on-primary-container: '#faf6ff'
  inverse-primary: '#c6bfff'
  secondary: '#775a00'
  on-secondary: '#ffffff'
  secondary-container: '#fdc73a'
  on-secondary-container: '#6f5400'
  tertiary: '#006653'
  on-tertiary: '#ffffff'
  tertiary-container: '#00816a'
  on-tertiary-container: '#e0fff3'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e4dfff'
  primary-fixed-dim: '#c6bfff'
  on-primary-fixed: '#160066'
  on-primary-fixed-variant: '#4029ba'
  secondary-fixed: '#ffdf9a'
  secondary-fixed-dim: '#f4bf32'
  on-secondary-fixed: '#251a00'
  on-secondary-fixed-variant: '#5a4300'
  tertiary-fixed: '#5ffbd6'
  tertiary-fixed-dim: '#38debb'
  on-tertiary-fixed: '#002019'
  on-tertiary-fixed-variant: '#005142'
  background: '#f4fafd'
  on-background: '#161d1f'
  surface-variant: '#dde4e6'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '800'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 17px
    fontWeight: '700'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 18px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 10px
    fontWeight: '800'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 0.75rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system powers a community-centric hyper-local mobile Telegram Mini App crafted specifically for the city of Olmaliq, Uzbekistan. It answers the everyday neighborhood question: *"Kim bor?"* ("Who is available?"). The brand personality is radiant, warm, helpful, and deeply communal—capturing the spirit of an Uzbek mahalla marketplace infused with modern digital convenience.

The visual aesthetic is **Claymorphism meets Tactile 3D Softness**. Unlike stark flat corporate directories or cold glass interfaces, the UI relies on pillowy, extruded volumes, tactile push states, gentle ambient colored glows, and glossy top highlights. Every touchpoint feels touchable, rounded, and welcoming like sculpted polymer clay. The emotional response is immediate joy, effortless navigation, and unwavering trust among local neighbors searching for plumbers, bakeries, late-night pharmacies, or open methane gas stations.

## Colors

The palette balances the vibrant, friendly violet primary with cheerful contextual accents and soft tinted category backdrops.

### Semantic & Accents
- **Primary Violet (`#6C5CE7`)**: Directs primary actions, brand headers, and active navigation indicators. Emits an ambient shadow of `rgba(108, 92, 231, 0.35)`.
- **Sunny Yellow (`#FFC93C`)**: Celebratory accent used for featured listings, star ratings, and celebratory community badges.
- **Mint Green (`#00C9A7`)**: Designates "Ochiq" (Open right now), verified phone badges, and active craftsman availability.
- **Coral Red (`#FF6B6B`)**: Reserved for "Yopiq" (Closed), SOS / Favqulodda alerts, emergency hospital / towing hotlines.
- **Sky Blue (`#4DA3FF`)**: Telegram direct links, routing shortcuts, and verified bot interactions.

### Category Tint System
Categories use high-chroma mini-icons resting on plush, desaturated, high-luminance clay tiles:
- **Ustalar (Craftsmen)**: Tint `#FFF4D2` / Accent `#F39C12`
- **Do'konlar (Shops)**: Tint `#E8FBFD` / Accent `#00CEC9`
- **Muassasalar (Institutions)**: Tint `#EFEFFF` / Accent `#6C5CE7`
- **Transport & Taksilar**: Tint `#FEF5E7` / Accent `#F0932B`
- **Arenda & Ijara (Rentals)**: Tint `#E4FAF4` / Accent `#10AC84`
- **Zapravka & Metan (Gas/Fuel)**: Tint `#FFF0E6` / Accent `#FF7675`

### Canvas & Surfaces
- **Light Mode (Default)**: Background blends from `#F7F5FF` at the top app bar down to `#FFFFFF` in listing zones. Card surfaces sit on `#FFFFFF` with double clay highlights.
- **Dark Mode**: Canvas transitions from `#14112B` down into `#1E1A3A`. Surface cards rest on `#252048` with subtle border glows of `rgba(255, 255, 255, 0.08)`.
- **Text Tiers**: Light Mode Primary `#2D3436`, Secondary `#636E72`, Muted `#A4B0BE`. Dark Mode Primary `#FFFFFF`, Secondary `#DFE6E9`, Muted `#8395A7`.

## Typography

The type system is anchored in **Plus Jakarta Sans**, chosen for its generous x-height, wide open counters, and inherently friendly, geometric curves that match the squishy clay aesthetic. 

- **Uzbek Orthography**: The typeface handles Uzbek Latin special characters (`o‘`, `g‘`, `sh`, `ch`) smoothly without visual clipping or clumsy accent marks.
- **Hierarchical Discipline**: `headline-xl` (32px Bold) is reserved for the primary Telegram Mini App viewport greetings (e.g., *"Olmaliqda kimni qidiryapsiz?"*). Section breaks use `headline-md` (20px). Body and secondary captions stay strictly readable at 14px and 12px with slightly boosted weights (500) to ensure readability on low-cost Android and iOS mobile displays in outdoor sunlight.

## Layout & Spacing

Designed precisely for the Telegram Mini App mobile viewport (defaulting to the canonical 390×844 iPhone canvas, fluid down to 360px and up to 430px).

- **Grid Structure**: Fluid 4-column layout on mobile with an outer margin of `16px` (`margin`) and gutters of `12px` (`gutter`).
- **Vertical Rhythm**: Layout units follow an intentional 4px/8px modular scale. Component stacks inside listings use `8px` (`space-sm`) gaps, while section partitions use `24px` (`space-xl`).
- **Telegram Viewport Constraints**: The top canvas honors the Telegram webview header (56px safe zone). The bottom layout reserves `84px` of padding to accommodate the floating frosted glass navigation bar and iOS Home Indicator without overlapping content cards.

## Elevation & Depth

Visual depth is achieved through **Claymorphic Extrusion & Colored Ambience** rather than gray drop shadows or harsh outlines.

1. **Clay Surface Tier (Resting Cards)**:
   - Top-left inset highlight: `inset 2px 2px 4px rgba(255, 255, 255, 0.9)`
   - Bottom-right inset shade: `inset -3px -3px 6px rgba(108, 92, 231, 0.08)`
   - Ambient under-shadow: `0 12px 24px -6px rgba(108, 92, 231, 0.12), 0 4px 8px -2px rgba(45, 52, 54, 0.04)`

2. **Hero / Featured Clay Tier (Interactive Buttons & Active Cards)**:
   - A deeper 3D depth with dual directional ambient shadows tinted to match the element:
   - For primary violet buttons: `0 8px 20px -2px rgba(108, 92, 231, 0.42), inset 0 2px 0 rgba(255, 255, 255, 0.35)`
   - Pressed state shrinks slightly (`transform: scale(0.97)` and shadow reduces to `0 2px 6px rgba(108, 92, 231, 0.3)`), delivering physical, satisfying haptic-like visual feedback.

3. **Floating Bottom Navigation Bar**:
   - Translucent glassmorphic clay slab with `backdrop-filter: blur(16px)`
   - Background: `rgba(255, 255, 255, 0.85)` (Light) / `rgba(30, 26, 58, 0.85)` (Dark)
   - Border: `1px solid rgba(255, 255, 255, 0.5)`
   - Ambient lift: `0 -8px 28px rgba(0, 0, 0, 0.08)`

## Shapes

The design system embraces high curvature (`roundedness: 3`) to amplify the plump, tangible, toy-like character of clay.

- **Primary Cards & Category Hubs**: Built with an exaggerated `24px` radius (`rounded-2xl` equivalent). This rounds the corners enough to give cards an organic, pillow-like contour.
- **Buttons & Search Fields**: Fully pill-shaped (`9999px` / `rounded-full`).
- **Badges, Tags, & Status Chips**: Styled with a uniform `16px` radius, keeping them distinct from full pills while remaining completely devoid of sharp angles.
- **Icon Pods**: 48×48px squircle containers with `18px` border radius, creating a miniature cushion for 3D and emoji category icons.

## Components

### 1. Buttons
- **Primary Pill Action**: Fully rounded (`rounded-full`), background `#6C5CE7`, text `#FFFFFF` (`label-lg`), vertical padding `14px`, horizontal padding `24px`. Top rim highlight gives an extruded clay appearance. Includes a subtle physical sink on `:active`.
- **Secondary / Quick Dial ("Qo‘ng‘iroq")**: Mint Green `#00C9A7` or Sunny Yellow `#FFC93C` pill button paired with high-contrast dark text `#2D3436`.
- **Telegram Connect Button**: Sky Blue `#4DA3FF` surface, white airplane glyph, pill shape.

### 2. Category Clay Cards ("Bo'limlar")
- Compact 2-column or 3-column grid cards with `24px` rounded corners.
- Background colored with the category tint (e.g., `#FFF4D2` for Ustalar).
- Features a floating 3D-styled icon centered above a bold 14px label. Card reacts to press with an inward clay compression (`transform: translateY(2px)`).

### 3. Directory Listing Cards ("Usta / Do'kon Kartasi")
- Enclosed in a 24px white clay shell with soft violet-tinted shadow.
- Header row: Avatar (48px rounded squircle), Title (17px bold), and Verified Mint Shield ("Tasdiqlangan").
- Subtitle: Neighborhood indicator ("5-mikrorayon", "Gorkom", "Metallurg stadioni yaqinida").
- Real-time indicator pill: "Ochiq" (Mint `#00C9A7` background at 15% opacity, solid mint dot) or "Yopiq" (Coral `#FF6B6B` at 15% opacity).
- Bottom row: Direct call button ("Qo‘ng‘iroq") and Telegram direct link.

### 4. Search & Filter Bar ("Qidiruv")
- Height: 52px, pill-shaped.
- Background: `#FFFFFF` with inset soft shadows creating an embossed impression into the canvas.
- Placeholder text in colloquial Uzbek: *"Santexnik, somsa, avto moy almashtirish..."*
- Right slot houses an instant "Olmaliq filtri" filter chip (pill-shaped, `#6C5CE7` tint).

### 5. Chips & Segmented Controls
- Height: 36px, `16px` curvature.
- Inactive state: Soft muted surface `#F1F2F6`, text `#636E72`.
- Active state: Saturated primary `#6C5CE7` fill with white text and a mini ambient glow.

### 6. Urgent / SOS Strip ("Shoshilinch")
- Full-width callout tile rendered in Coral Red `#FF6B6B` with warm cream text.
- Includes quick-access one-tap buttons for 24/7 dezhurniy dorixona (pharmacy), evakuator (tow truck), and avariya xizmati (emergency utilities).

### 7. Floating Glass Dock (Bottom Nav)
- Suspended `16px` above the bottom screen edge, inset `16px` on both sides.
- Accommodates 4 key tabs: *Asosiy (Home)*, *Kategoriyalar (Categories)*, *Saqlanganlar (Saved)*, and *Mening profilim (My listings)*.
- Active tab features a floating violet clay pebble indicator underneath the icon.