# Product Requirements Document (PRD): EarnRadar
**Version:** 2.0  
**Target Platform:** Web Application (Desktop & Mobile Responsive)  
**Design Style:** Modern Glassmorphism & High-Contrast Professional (Dark / Light Themes)

---

## 1. Executive Summary & Vision
**EarnRadar** is an AI-powered intelligence radar that helps freelancers, job seekers, and micro-entrepreneurs in India discover verified income opportunities, freelance gigs, local market gaps, and B2B customer leads. It combines real-time search signals with AI validation, scam-shield risk ratings, interactive map geolocation, and one-click WhatsApp outreach.

---

## 2. Target Personas
1. **Tier 2/3 City Freelancers & Micro-Entrepreneurs**: Looking for verified part-time gigs or micro-businesses matching their exact weekly hours and starting capital.
2. **Micro-Agencies & B2B Service Providers**: Looking for local business leads (restaurants, salons, gyms) that need billing, software, or digital marketing services.
3. **Gig Workers & Job Seekers**: Seeking quick-turnaround local and remote work with clear salary ranges and fraud risk warnings.

---

## 3. Core Color Palette & Design System Tokens

| Token | Hex / Value | Usage |
| :--- | :--- | :--- |
| **Brand Primary** | `#4f46e5` (Indigo 600) | Primary CTAs, active indicators, brand logo |
| **Brand Accent** | `#06b6d4` (Cyan 500) | Secondary gradients, radar scanner beams, highlights |
| **Success / Trust** | `#10b981` (Emerald 500) | High score badges (80+), WhatsApp actions, verified signals |
| **Warning** | `#f59e0b` (Amber 500) | Moderate risk warnings, review count stars |
| **Danger / Scam Shield** | `#ef4444` (Rose 500) | High risk flags, fraud alerts, error states |
| **Dark Canvas** | `#090d16` (Deep Navy) | Dark mode background |
| **Dark Raised / Glass** | `rgba(17, 24, 39, 0.85)` | Glassmorphism cards with `backdrop-blur-xl` and `1px` border |
| **Light Canvas** | `#f8fafc` (Slate 50) | Light mode background |
| **Typography** | `Inter`, `sans-serif` | Clean, highly legible, tabular numerals for scores |

---

## 4. Key Screens & UI Architecture

### Screen 1: Landing & Hero Portal (`/`)
- **Header Navigation**:
  - Logo with animated rotating radar icon and pulsating live status dot.
  - Quick nav links: *Find Income*, *Find Customers*, *How It Works*, *Shortlist (starred count)*.
  - Dark/Light mode toggle switch.
- **Hero Section**:
  - Large headline: *"Turn Your Skills & Time Into Income"*.
  - Subtitle explaining AI signal blending and scam detection.
  - Dual CTAs: *Find Income Opportunities* & *Find B2B Customer Leads*.
  - Live interactive Product Mock preview widget.
- **Value Props & 3-Step Roadmap**:
  - Step 1: Input Profile / Offer.
  - Step 2: Multi-Source Radar Intelligence.
  - Step 3: Verified Scam Shield & 1-Click Outreach.
- **Interactive FAQ Accordion & Live Stat Strip**.

---

### Screen 2: Income Discovery Radar (`/`)
- **Input Form Card (Glassmorphic)**:
  - Textarea: *Skills & Interests* (with live char counter, keyboard shortcuts, quick-fill pill buttons).
  - Input: *City* (auto-complete).
  - Slider + Number Field: *Hours per week* (1–168).
  - Currency Field: *Starting Budget* (₹).
  - Primary CTA: *Find income ideas* with glowing gradient and hover lift.
- **Radar Scanning State**:
  - Rotating radar sweep animation with pulsating concentric range rings.
  - Multi-stage live progression tracker: *Searching Jobs → Scanning Google Maps → Querying Reddit/Forums → Blending AI Scores*.
- **Results View**:
  - **Efficiency Metric Strip**: Displays SerpAPI credit counter and caching badge.
  - **Categorized Tabs**: *All Opportunities*, *Jobs & Gigs*, *Local Businesses*, *Discussions & Trends*.
  - **Interactive Opportunity Card**:
    - Animated SVG Ring Score Meter (0–100).
    - Scam-Shield Risk Pill (`Low Risk`, `Medium`, `High Risk Flag`).
    - Expandable breakdown bars (*Demand*, *Feasibility*, *Competition*, *Trust*).
    - Salary / Revenue projections and estimated weekly time.
    - Direct Star / Shortlist button.
  - **Interactive Job Card**:
    - Company, role title, salary tag, source platform (LinkedIn, Indeed, etc.).
    - Expandable job description snippet.
    - External application link.
  - **Local Business Card & Geolocation Map**:
    - Business name, star rating with review count, address, and phone number.
    - Integrated Leaflet Map with interactive pins.
    - AI WhatsApp Message Generator with 1-click WhatsApp web redirect.

---

### Screen 3: B2B Customer Leads Radar (`/customers`)
- **Offer Input Form**:
  - Textarea: *Describe what you sell and who should buy it* (e.g., "Restaurant billing system for eateries").
  - Target City input.
  - Monthly Subscription Price field (₹).
  - Max Leads slider (5 to 20).
  - Example Quick-Fill chips (*Restaurant System*, *Gym Software*, *Salon Booking*).
- **Ranked Customer Leads Grid**:
  - Match Fit Score with weighted formula breakdown.
  - Pain Signals & Review Quote snippets from real customers complaining about existing solutions.
  - Suggested Pitch Angle and First Conversation Question.
  - AI WhatsApp Outreach Composer with business verification safety notice and word count meter.
  - Integrated Leaflet Map of potential client locations.
  - Competitor & Market Intelligence section.

---

### Screen 4: Shortlist Drawer & Export Modal
- Floating action button with active badge counter.
- Slide-over glassmorphic drawer containing saved gigs, jobs, and customer leads.
- Bulk actions:
  - **Export to CSV**: Downloadable structured spreadsheet.
  - **Copy Markdown**: Formatted for note-taking apps (Notion, Obsidian).
  - **Print Plan**: Clean print-optimized stylesheet.
  - **Clear Shortlist** with confirmation.

---

### Screen 5: Informational & Trust Pages
- **How It Works**: Visual pipeline breakdown of SerpAPI queries, Claude AI scoring, and anti-fraud heuristics.
- **Responsible Use**: Ethics, spam prevention guidelines, and consumer protection tips.
- **Privacy & Terms**: Zero data retention policy for personal contact info.

---

## 5. UI Micro-Animations & Interactions
1. **Radar Sweep**: CSS conic-gradient rotating animation on loading states.
2. **Score Meters**: SVG stroke-dashoffset animated reveal on card load.
3. **Tab Switcher**: Floating pill indicator sliding smoothly between active tabs via `framer-motion` layout animation.
4. **Confetti Celebration**: Canvas confetti burst upon copying outreach messages or adding to shortlist.
5. **Card Hover**: Subtle `translate-y-1` lift with glowing border illumination.
