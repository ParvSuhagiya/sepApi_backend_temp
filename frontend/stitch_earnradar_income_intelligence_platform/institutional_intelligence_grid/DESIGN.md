---
name: Institutional Intelligence Grid
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
  on-surface-variant: '#464555'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#005338'
  on-tertiary: '#ffffff'
  tertiary-container: '#006e4b'
  on-tertiary-container: '#67f4b7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.03em
  display-md:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Manrope
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Manrope
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
  mono-data:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: -0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-dense: 0.5rem
  margin: 1.5rem
  margin-compact: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

The design system establishes an institutional-grade financial intelligence interface designed for desktop risk analysis, real-time threat detection, and capital intelligence. The aesthetic pairs geometric editorial poise with dense, operational efficiency. 

The visual style is rooted in **Modern Corporate High-Contrast** paired with restrained **Optical Glassmorphism**:
- Crisp, clinical light surfaces engineered for high daytime data density.
- High-contrast structural boundaries providing absolute legibility for analytical telemetry.
- Architectural restraint: decorative gradients are strictly discarded in favor of purposeful tinting, razor-sharp 1px structural dividing lines, and micro-elevation shifts.
- Emotional cadence: conveys authoritative governance, rapid auditability, sovereign financial security, and calculated precision.

## Colors

The palette balances authoritative deep darks against pure optic light surfaces, punctuated by functional status signals:

- **Primary (`#4f46e5`)**: Royal Indigo serves as the focal action driver, active telemetry state, selected navigation anchor, and focal radar sweep accent.
- **Secondary (`#0f172a`)**: Deep Midnight Slate governs primary content hierarchies, dominant structural figures, high-impact numerical readouts, and strict framing borders.
- **Tertiary (`#10b981`)**: Precision Emerald indicates confirmed provenance, safe risk scores, affirmative yields, and positive verification badges.
- **Critical Alert (`#ef4444`)**: Crimson Coral reserved purely for risk flags, fraud warnings, and critical threshold breaches.
- **Neutral Canvas (`#ffffff` & `#f8fafc`)**: Base operational canvas with layered structural sub-surfaces (`#f1f5f9`) and crisp demarcation borders (`#e2e8f0`). Text uses `#0f172a` for primary values, `#475569` for secondary metadata, and `#94a3b8` for muted keys.

## Typography

Typography enforces high analytical density:
- **Headlines (Manrope)**: Geometric, structural precision. Used for top-level intelligence metrics, section titles, and macro-financial figures. Strict negative tracking ensures large numbers remain compact and authoritative.
- **Body & Metadata (Inter)**: Utilitarian clarity at dense scales. Configured with neutral metrics for multi-column risk reports, audit ledgers, and tabular data streams.
- **Tabular Figures**: All data readouts, monetary tickers, and radar telemetry coordinates utilize tabular numbers (`font-variant-numeric: tabular-nums`) to ensure strict vertical alignment across comparative rows.

## Layout & Spacing

The layout is built for enterprise desktop workstations with a 12-column dynamic fluid grid architecture:
- **Desktop Standard (`1280px+`)**: Fixed 240px contextual collateral sidebar, fluid multi-pane workspace spanning remaining width with 16px (`gutter`) standard gaps.
- **High-Density Monitor (`1920px+`)**: Supports 3-pane parallel analytical view (watchlist, visual radar scope, telemetry breakdown) utilizing `gutter-dense` (8px) for tightly coupled visual instruments.
- **Vertical Rhythm**: Micro-scaled increments (`space-xs` through `space-md`) dominate table and list compositions to maximize visible metrics above the fold without inducing cognitive fatigue.

## Elevation & Depth

Visual hierarchy combines micro-layering with crisp physical delineations:

1. **Canvas Tier (Level 0)**: Solid `#f8fafc`. Houses non-interactive background panels and telemetry infrastructure grids.
2. **Structural Panels (Level 1)**: Pure `#ffffff` surface with a continuous `1px solid #e2e8f0` structural rule and soft ambient drop shadow: `0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.02)`.
3. **Glass Floating Metrics (Level 2)**: Overlaid radar telemetry and live tracking tooltips employ high-clarity translucent white surfaces (`rgba(255, 255, 255, 0.85)` with `backdrop-filter: blur(12px)`), bounded by `1px solid rgba(226, 232, 240, 0.8)` and floating shadow: `0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.04)`.
4. **Modal Dialogs & Context Menus (Level 3)**: `#ffffff` elevated by `0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)`.

## Shapes

The interface balances sharp precision with modern accessibility through roundedness level `2`:
- Standard interactive elements (buttons, text inputs, segment pickers) feature an exact `0.5rem` (8px) border radius.
- Cards, modal containers, and dashboard structural panels utilize `0.75rem` (12px) to softly frame internal data matrices without consuming actionable canvas space.
- Telemetry nodes, circular verification status pips, and risk indicators retain full circular geometries (`rounded-full`).

## Components

### Buttons
- **Primary Action**: `#4f46e5` fill, `#ffffff` text, 8px radius, height 36px, `space-md` horizontal padding. Interactive hover transitions to `#4338ca`. Focused with `box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #4f46e5`.
- **Secondary Outlined**: Pure `#ffffff` background with `1px solid #e2e8f0`, text `#0f172a`. Hover transitions to `#f8fafc` background with `#cbd5e1` border.
- **Destructive Action**: `#fee2e2` fill, `#b91c1c` text, `1px solid #fecaca`. Hover shifts to `#ef4444` background, `#ffffff` text.

### Verification Badges & Risk Chips
- **Verified/Safe**: `#ecfdf5` fill, `#047857` text, `1px solid #a7f3d0`. Contains a miniature 6px Emerald solid circle pip.
- **Scam/High Risk**: `#fef2f2` fill, `#b91c1c` text, `1px solid #fecaca`. Contains a flashing alert warning icon.
- **Neutral Audit Chip**: `#f1f5f9` fill, `#475569` text, `1px solid #e2e8f0`.

### Data Tables & List Views
- Headers: `#f8fafc` fill, `label-sm` uppercase text in `#64748b`, height 32px, `1px solid #e2e8f0` bottom rule.
- Data Rows: Alternating hover state `#f8fafc/50`, fixed height 40px, cell padding `space-sm` vertical by `space-md` horizontal. Row dividers are `1px solid #f1f5f9`.
- Tabular figures use `mono-data` typography right-aligned for value columns.

### Form Inputs & Filters
- Background `#ffffff`, `1px solid #cbd5e1`, 8px radius, height 36px, padding `0 12px`.
- Active focus state: `#4f46e5` border with `0 0 0 1px #4f46e5` ring.
- Placeholder text in `#94a3b8`.

### Radar Visual Scope Container
- High-contrast circular polar coordinate system rendered via crisp 1px strokes in `#e2e8f0`.
- Live radar sweep rendered using an angular gradient wedge originating from `#4f46e5` at 18% opacity, falling off to 0% opacity.
- Target blips feature distinct concentric pings using Tertiary (`#10b981`) for verified entities and Coral (`#ef4444`) for high-risk anomalies.