---
name: Mesa Protocol
colors:
  surface: '#101417'
  surface-dim: '#101417'
  surface-bright: '#36393e'
  surface-container-lowest: '#0b0f12'
  surface-container-low: '#181c20'
  surface-container: '#1c2024'
  surface-container-high: '#272a2e'
  surface-container-highest: '#323539'
  on-surface: '#e0e2e8'
  on-surface-variant: '#b9cacb'
  inverse-surface: '#e0e2e8'
  inverse-on-surface: '#2d3135'
  outline: '#849495'
  outline-variant: '#3b494b'
  surface-tint: '#00dbe9'
  primary: '#dbfcff'
  on-primary: '#00363a'
  primary-container: '#00f0ff'
  on-primary-container: '#006970'
  inverse-primary: '#006970'
  secondary: '#d1bcff'
  on-secondary: '#3c0090'
  secondary-container: '#7000ff'
  on-secondary-container: '#ddcdff'
  tertiary: '#f5f4ff'
  on-tertiary: '#2e3039'
  tertiary-container: '#d8d8e4'
  on-tertiary-container: '#5c5e68'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#7df4ff'
  primary-fixed-dim: '#00dbe9'
  on-primary-fixed: '#002022'
  on-primary-fixed-variant: '#004f54'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#d1bcff'
  on-secondary-fixed: '#23005b'
  on-secondary-fixed-variant: '#5700c9'
  tertiary-fixed: '#e1e1ed'
  tertiary-fixed-dim: '#c5c6d1'
  on-tertiary-fixed: '#191b23'
  on-tertiary-fixed-variant: '#454650'
  background: '#101417'
  on-background: '#e0e2e8'
  surface-variant: '#323539'
typography:
  headline-lg:
    fontFamily: Geist
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.02em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  container-max: 1440px
---

## Brand & Style

The design system is engineered for a developer-centric Web3 and Embedded Finance ecosystem. The brand personality is rooted in high-performance precision, security, and technical transparency. It moves away from generic fintech aesthetics toward a "hard-tech" visual language that feels like a professional IDE mixed with a high-end financial terminal.

The design style is **Technical Glassmorphism**. This approach utilizes deep layering, background blurs, and micro-glows to indicate system status and flow logic. The UI avoids heavy skueomorphism in favor of structural clarity, using light as a functional tool to highlight "nodes" and "connections" within the platform's workflow builder. The emotional response is one of absolute control and sophisticated efficiency.

## Colors

The palette is strictly dark, optimized for long-duration technical work. 

- **Primary (Electric Cyan):** Used for primary actions, active nodes, and success states. It represents the "flow" of data.
- **Secondary (Neon Violet):** Reserved for secondary logic paths, sophisticated branding moments, and interactive hover states.
- **Surface Tiers:** The background uses a "True Black" (#000000) base to maximize contrast. Overlays use "Midnight Blue-Charcoal" (#040608) with varying levels of transparency to create depth.
- **Semantic Accents:** Statuses are handled with high-saturation neons: Warning (Amber #FFB800), Error (Crimson #FF005C), and Success (Emerald #00FF94).

## Typography

This design system employs a dual-font strategy to balance legibility with technical character.

- **UI & Interface:** Geist is used for headlines to provide a sharp, geometric feel that mirrors modern developer tools. Inter is used for body copy for its proven readability in data-heavy environments.
- **Data & System:** JetBrains Mono is used for all labels, code blocks, SDK snippets, and financial figures. This creates a clear visual distinction between "narrative" content and "functional/system" data.
- **Scale:** Type scales are aggressive but maintain tight line-heights to allow for high information density without clutter.

## Layout & Spacing

The layout philosophy follows a **Modular Grid** system based on a 4px baseline. 

- **The Flow Builder:** The core of the application uses an infinite canvas approach with a subtle dot-grid background. 
- **Sidebars & Panels:** Fixed-width sidebars (280px) house navigation and node properties, using thin 1px borders to separate sections without adding visual bulk.
- **Responsive Behavior:** On desktop, the system utilizes a 12-column fluid grid. On tablet and mobile, the layout collapses into a single-column stack, with complex flow builders transitioning to a "List-View" logic for management on the go.

## Elevation & Depth

Visual hierarchy is achieved through **Tonal Layering and Glassmorphism** rather than traditional drop shadows.

- **Level 0 (Base):** True black (#000000).
- **Level 1 (Cards/Panels):** Semi-transparent charcoal (#0A0C10) with a 1px "inner glow" border (10% white) to define the edge.
- **Level 2 (Modals/Popovers):** Higher transparency with a 20px Backdrop Blur. Borders here use a gradient stroke (Primary to Secondary) at low opacity.
- **Active State:** Elements in focus or "running" in a workflow emit a soft, localized outer glow (15px blur, 20% opacity) using the Primary Cyan color to simulate a powered-on state.

## Shapes

The shape language is **Technical and Precise**. 

A "Soft" roundedness (0.25rem) is applied to standard UI components like inputs and small buttons to keep them approachable but professional. Larger containers and cards use "rounded-lg" (0.5rem). 

Nodes within the workflow builder use a hybrid approach: straight vertical edges with slightly rounded corners, reinforcing the "building block" metaphor. Buttons are never pill-shaped; they remain rectangular with soft corners to maintain a structured, engineering-led aesthetic.

## Components

- **Buttons:** Primary buttons are solid Cyan with black text for maximum contrast. Secondary buttons use a "Ghost" style with a 1px Primary border and no fill until hover.
- **Nodes:** Specialized card components with "In/Out" connection ports. Active nodes feature a pulsing Cyan border.
- **Inputs:** Dark backgrounds (#050505) with 1px borders that glow Primary Cyan on focus. Labels are always in JetBrains Mono.
- **Chips/Status:** Small, mono-spaced tags. They do not use solid fills; instead, they use a tinted border and a small leading "LED" dot to indicate status (e.g., a green dot for 'Deployed').
- **SDK Blocks:** Code snippets are housed in a recessed, true-black container with syntax highlighting that follows the Primary/Secondary/Success color palette.
- **Graphs:** Financial data and flow metrics use thin, non-aliased lines with area-under-the-curve gradients that fade into the background.