---
name: Mesa Protocol Design System
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#45464d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#001a42'
  on-tertiary-container: '#3980f4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#d8e2ff'
  tertiary-fixed-dim: '#adc6ff'
  on-tertiary-fixed: '#001a42'
  on-tertiary-fixed-variant: '#004395'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  headline-xl:
    fontFamily: Public Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Public Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Public Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Public Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Public Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Public Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Public Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Public Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Public Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
---

## Brand & Style
The brand personality is rooted in the intersection of high-end financial engineering and community-driven solidarity. It targets users seeking professional-grade trustless ROSCAs (Rotating Savings and Credit Associations), demanding the security of an enterprise fintech platform with the approachability of a local credit union.

The design style follows a **Modern Corporate** aesthetic with a **Tactile** edge. It prioritizes clarity, utilizing generous whitespace and structured layouts to demystify complex financial rotations. While the underlying engine is technical, the UI feels human through soft neutrals and purposeful, growth-oriented accents. The overall emotional response should be one of absolute reliability and collective empowerment.

## Colors
The palette is led by **Deep Navy (#0F172A)**, providing a foundational weight of authority and security. This is contrasted by **Emerald Green (#10B981)**, which symbolizes financial growth and successful contributions. 

**Secondary Blues** are used for interactive elements and navigational cues, maintaining the professional tone. The neutral scale relies on **Slate Grays** and **Cool Whites** to ensure the interface feels airy and modern.

**Functional Status Colors:**
- **Success:** Used for completed payments and fully funded circles.
- **Warning:** Reserved for grace periods and upcoming deadlines.
- **Error:** High-visibility red for missed payments or failed smart contract interactions.

## Typography
This design system utilizes **Public Sans** across all levels. Its institutional heritage and clean, geometric construction provide the necessary "modern engineering" feel while remaining highly legible for data-heavy financial views.

- **Headlines:** Use Bold and Semi-Bold weights with slight negative letter-spacing to create a strong, authoritative hierarchy.
- **Body:** Standardized at 16px for optimal readability. Use the Regular weight for most content and Medium for emphasis within paragraphs.
- **Labels:** Used for metadata, table headers, and micro-copy. These should often appear in the Medium or Semi-Bold weight to distinguish them from body content.

## Layout & Spacing
The design system employs a **Fixed Grid** philosophy for desktop to maintain the density expected of professional financial tools, while transitioning to a **Fluid Grid** for mobile devices.

- **Desktop:** 12-column grid with a max-width of 1200px. Gutters are fixed at 24px to provide clear separation between cards and data modules.
- **Spacing Rhythm:** Based on a 4px baseline. Most components should use `md` (16px) or `lg` (24px) for internal padding to maintain a spacious, premium feel.
- **Alignment:** All content follows a strict vertical rhythm. Major sections should be separated by `xl` (32px) spacing to prevent visual clutter.

## Elevation & Depth
Depth is created through a combination of **Tonal Layers** and **Ambient Shadows**. This approach mimics the physical stacking of financial documents and cards.

- **Surface Levels:** The base background uses the neutral `F8FAFC`. Primary cards and containers use a pure white background to "pop" from the base.
- **Shadows:** Use highly diffused, low-opacity shadows (e.g., `box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.08)`). Shadows should feel like they are part of the environment, not floating above it.
- **Borders:** Subtle, low-contrast borders (`#E2E8F0`) are used in conjunction with shadows to define boundaries without adding visual noise.

## Shapes
The shape language is refined and consistent. A **Rounded (0.5rem)** base is used for most UI elements to balance professionalism with approachable community aesthetics.

- **Primary Cards:** Use `rounded-lg` (1rem) to emphasize their role as the main containers for "Saving Circles."
- **Interactive Elements:** Buttons and input fields use the base `rounded` (0.5rem) setting.
- **Data Visuals:** Progress wheels and status badges utilize circular (pill) shapes to distinguish them from structural UI components.

## Components
- **Buttons:** Primary buttons use the Deep Navy background with white text. Growth-oriented actions (e.g., "Join Circle") can utilize the Emerald Green. Use a height of 48px for primary actions to ensure accessibility.
- **Cards (Savings Circles):** The central component of the app. Cards must feature a prominent "Rotation Wheel" (circular progress indicator) showing the current round and total participants. Include a secondary "Growth" badge in Emerald.
- **Progress Indicators:** Use a combination of step-based wizards for onboarding and circular trackers for ongoing ROSCAs. These should clearly visualize the flow of capital.
- **Input Fields:** Large, clear fields with 16px internal padding. Labels must always be visible (never placeholder-only) to maintain a sense of security and clarity.
- **Status Chips:** Small, pill-shaped badges used within tables and lists. They should use a low-opacity version of the status color as a background with a high-contrast text label (e.g., "Paid" in dark green on a light green tint).
- **Steppers:** For multi-step circle creation. Use a clear, left-aligned vertical stepper on desktop and a horizontal progress bar on mobile.