# Swiss International Style Design Specification
## InsureScope Visual Redesign
**Date:** 2026-04-05  
**Approach:** Foundation-First Layered Migration (Phase B)  
**Status:** Design Complete, Pending Review

---

## 1. Design Philosophy

### Core Tenets

This redesign adopts the **International Typographic Style (Swiss Style)** — a design philosophy of objective communication from 1950s Switzerland:

1. **Objectivity over Subjectivity**: Design recedes to let content speak. No personal ornamentation.
2. **The Grid as Law**: Grid is absolute authority, often made visible through borders and patterns.
3. **Typography is Interface**: Grotesque sans-serif (Inter) as primary structural element.
4. **Active Negative Space**: White space defines boundaries and creates intellectual breathing room.
5. **Layered Texture & Depth**: Visual depth achieved through CSS patterns (grid, dots, diagonals, noise), not shadows or 3D effects.
6. **Universal Intelligibility**: Clean, legible, undeniably modern.

### Visual Signatures

- **Flush-Left, Ragged-Right**: Strict left alignment, no center alignment.
- **Grotesque Sans-Serif**: Inter font family with weights 400-900.
- **Mathematical Scales**: Font sizes relate through clear ratios (responsive scaling).
- **Swiss Red (#FF3000)**: Used only as functional signal — CTAs, warnings, highlights.
- **Zero Rounded Corners**: Strictly rectangular (`rounded-none`).
- **Thick Borders**: `border-4` black borders define the grid structure.

---

## 2. Design Token System

### 2.1 Color Palette

```css
:root {
  /* Swiss Color System */
  --swiss-bg: #FFFFFF;        /* Pure White - Primary background */
  --swiss-fg: #000000;        /* Pure Black - Text and borders */
  --swiss-muted: #F2F2F2;     /* Light Gray - Secondary backgrounds */
  --swiss-accent: #FF3000;    /* Swiss Red - Only signal color */
  --swiss-border: #000000;    /* Border color */
}
```

**Usage Rules:**
- Swiss Red ONLY for: primary CTAs, hover states, section number prefixes, critical emphasis
- Never use red as decorative fill
- Backgrounds: White primary, Muted gray for pattern application
- Text: Black only (ultra-high contrast 21:1)

### 2.2 Typography System

**Font:** Inter (Google Fonts) — closest to Helvetica/Akzidenz-Grotesk

**Weights:**
- Black (900) and Bold (700) for headings
- Regular (400) or Medium (500) for body

**Styles:**
- **UPPERCASE** for all headings, labels, buttons
- `tracking-tighter` for large headlines
- `tracking-widest` for small labels
- Strict left alignment (no center alignment)

**Type Scale (Responsive):**

| Element | Mobile (< 768px) | Tablet (768-1024px) | Desktop (1024px+) |
|---------|------------------|---------------------|-------------------|
| Hero H1 | text-6xl | text-8xl | text-9xl / text-[10rem] |
| H2 | text-4xl | text-5xl | text-6xl |
| H3 | text-2xl | text-3xl | text-4xl |
| Body | text-base | text-base | text-lg |
| Small/Labels | text-xs uppercase tracking-widest | same | same |
| Numbers (stats) | text-4xl font-black | text-5xl font-black | text-6xl font-black |

### 2.3 Spacing System

**Principles:**
- High density in information clusters (tables)
- High spaciousness in narrative sections
- Generous asymmetric padding

**Spacing Scale:**
- `p-6` (24px) - Minimum internal padding
- `p-8` (32px) - Standard card padding
- `p-12` (48px) - Section padding
- `p-16` (64px) - Hero/asymmetric sections
- `p-24` (96px) - Maximum spaciousness

**Grid Gap:**
- `gap-0` for seamless grid cells
- `gap-4` (16px) for standard content spacing
- Asymmetric column ratios: 8:4, 7:5, 5:7

### 2.4 Border & Radius

```css
/* Strictly Rectangular */
--radius: 0px;

/* Thick Visible Borders */
--border-thin: 1px solid var(--swiss-fg);
--border-thick: 4px solid var(--swiss-fg);
```

**Rules:**
- All elements use `rounded-none`
- Structure is visible through borders
- No drop shadows (flat design)

---

## 3. Pattern Textures (CSS-Only)

Four distinct CSS patterns add visual depth without breaking flatness:

### 3.1 Grid Pattern
```css
.swiss-grid-pattern {
  background-image: 
    linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px);
  background-size: 24px 24px;
}
```
- **Applied to:** Hero composition area, muted backgrounds
- **Purpose:** Makes grid structure visible

### 3.2 Dot Matrix
```css
.swiss-dots {
  background-image: radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px);
  background-size: 16px 16px;
}
```
- **Applied to:** Section headers, feature sidebars
- **Purpose:** Evokes traditional print techniques

### 3.3 Diagonal Lines
```css
.swiss-diagonal {
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 10px,
    rgba(0,0,0,0.02) 10px,
    rgba(0,0,0,0.02) 11px
  );
}
```
- **Applied to:** Benefits sections, accent backgrounds
- **Purpose:** Adds directional energy

### 3.4 Noise Texture
```css
.swiss-noise {
  position: relative;
}
.swiss-noise::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.015;
  pointer-events: none;
}
```
- **Applied to:** Global body background overlay
- **Purpose:** Simulates paper texture, adds warmth

**Application Rules:**
- Use on muted gray backgrounds (`#F2F2F2`) and white surfaces
- NEVER apply to pure black backgrounds or red accent areas
- Patterns enhance, never dominate

---

## 4. Component Specifications

### 4.1 Buttons

**Primary Button:**
```
Style: Solid black background, white text
Shape: rounded-none (strictly rectangular)
Typography: uppercase, font-bold, tracking-wide
Padding: px-8 py-4 (generous touch targets)
Border: border-2 border-black
```

**Secondary Button:**
```
Style: White background, black text, black border
Shape: rounded-none
Typography: uppercase, font-bold, tracking-wide
Border: border-2 border-black
```

**Hover States:**
- Primary → Invert to white bg, black text OR switch to Swiss Red
- Secondary → Invert to black bg, white text
- **No scale transforms** — instant color changes only
- Duration: `duration-200 ease-out`

### 4.2 Cards / Containers

**Base Card:**
```
Background: white or var(--swiss-muted)
Border: border-4 border-black
Padding: p-8 or p-12 (generous, uniform)
Radius: rounded-none
```

**Hover State:**
- Entire card background changes
- White → Swiss Red OR Black
- Text inverts accordingly (black → white, white → black)
- **Full color inversion**, not subtle opacity fade

**Card with Pattern:**
- Apply `.swiss-grid-pattern`, `.swiss-dots`, or `.swiss-diagonal` to muted bg cards

### 4.3 Inputs

**Text Input:**
```
Style: Underlined (border-b-2) or solid rectangular
Border: border-2 border-black
Focus: border-swiss-accent (sharp change, no glow)
Radius: rounded-none
Background: white or transparent
```

**Focus State:**
- Border color snaps to Swiss Red
- No shadow rings or glow effects
- `focus-visible:ring-2 focus-visible:ring-swiss-accent focus-visible:ring-offset-2`

### 4.4 Section Headers

**Numbered Section Label:**
```
Format: "01. SECTION NAME"
Number: text-swiss-accent, font-bold
Text: uppercase, tracking-widest, text-black
Layout: Flex row, gap-2
```

**Example:**
```html
<div class="flex items-center gap-2 mb-8">
  <span class="text-swiss-accent font-bold text-lg">01.</span>
  <span class="uppercase tracking-widest text-black font-bold">SYSTEM</span>
</div>
```

### 4.5 Navigation

**Tab Navigation:**
```
Layout: Horizontal with equal spacing
Active Indicator: thick bottom border (border-b-4 border-swiss-accent)
Text: uppercase, tracking-wide
Hover: text color change or underline
No rounded backgrounds on active state
```

**Mobile Navigation:**
- Bottom-positioned on mobile
- Full-width touch targets (min 44px height)
- Thick underline indicator for active tab

### 4.6 Icons

**Treatment:**
- Functional symbols, not decoration
- Stroke width matches typography weight
- Often enclosed in geometric shapes:
  ```
  Square: border-2 border-black p-2
  Circle: border-2 border-black rounded-full p-2 (ONLY exception to no-rounded rule for icons)
  ```

**Interactive Icons:**
- Plus icons rotate 90° on hover (mechanical)
- Arrow icons slide or rotate
- No elastic/spring animations

---

## 5. Layout Strategy

### 5.1 Grid Philosophy

**The Grid is Visible:**
- Grid lines made tangible through borders and background patterns
- Thick 4px black borders define major sections
- Subtle 24px grid pattern on backgrounds shows structure

**Asymmetrical Balance:**
- Prefer asymmetric layouts over center alignment
- Large element on left balanced by negative space on right
- Column ratios: 8:4, 7:5, 5:7 instead of equal splits

### 5.2 Page Layout Templates

**Hero Section:**
```
Layout: Full width, asymmetric content
Left (8 cols): Massive headline, geometric composition
Right (4 cols): Minimal text, active negative space
Background: White + global noise texture
Border: border-b-4 border-black
Padding: py-24 px-8 (generous)
```

**Content Section:**
```
Layout: Max-width container with asymmetric grid
Max-width: max-w-7xl
Padding: py-16 px-8
Grid: 12-column asymmetric splits
Separators: Horizontal lines between sections
```

**Card Grid:**
```
Layout: CSS Grid with gap-0 (seamless)
Border-collapse: Adjacent cards share borders
Hover: Individual card color inversion
```

### 5.3 Responsive Strategy

**Mobile (< 768px):**
- Typography scales down but remains bold: `text-6xl` max for hero
- Single column layouts with vertical stacking
- Borders remain 4px thick (never thin out)
- CTAs become full-width buttons with consistent height (`h-16`)
- Grid patterns maintain same opacity/scale
- Touch targets minimum 44×44px

**Tablet (768px - 1024px):**
- Two-column layouts begin appearing
- Typography scales to `text-8xl` for headlines
- Asymmetric grids emerge (7:5, 5:7)
- Touch targets remain 44×44px minimum

**Desktop (1024px+):**
- Full asymmetric grid layouts (8:4 ratios)
- Maximum typography scale (`text-9xl`, `text-[10rem]`)
- Multi-column layouts (3-4 columns)
- Sticky positioning for section headers
- All hover states and micro-interactions active

---

## 6. Animation Specifications

### 6.1 Philosophy

**Feel:** Instant, mechanical, snappy, precise. Movement is purposeful and geometric.

**No:**
- Elastic or spring physics
- Gradual opacity fades
- Scale transforms on buttons
- Backdrop blurs

### 6.2 Transition Defaults

```javascript
// Framer Motion
{
  duration: 0.2,
  ease: "linear" // or "easeOut"
}
```

```css
/* CSS Transitions */
transition: all 200ms ease-out;
```

### 6.3 Micro-interactions

**Navigation Links:**
- Vertical slide animation
- Text slides up, red replacement slides in from below
- Duration: 200ms

**Stats Cards:**
- Scale transform on numbers: 1.0 → 1.05
- Rotating plus icons: 0° → 90°
- Background color snap (not fade)

**Feature Cards:**
- Color inversion on hover (white → red)
- Arrow rotation: -45° → 0°

**Testimonials:**
- Subtle upward lift: translateY(-1px)
- Border color change: black → red
- Quote text color change

**FAQ Cards:**
- Rotating plus icons: 0° → 90°
- Full background color inversion (white → red)

**Buttons:**
- Instant background color changes
- No scale transforms
- Border color inverts with background

### 6.4 Reduced Motion

All animations respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 7. Page-Specific Designs

### 7.1 OnboardingFlow Redesign

**Current Issues:**
- Rounded corners on all cards and buttons
- State Farm red (#E31837) instead of Swiss Red
- Center-aligned text
- Soft gradients and shadows

**Swiss Redesign:**

**Step 1: Policy Selection**
```
Layout: Full-screen white background with global noise
Hero: Massive "INSURESCOPE" text (text-8xl+), flush left
Subtext: "OBJECT DETECTION FOR INSURANCE" uppercase tracking-widest
Section Label: "01. POLICY" in Swiss Red

Policy Cards Grid:
- 2×2 grid with gap-0 (seamless)
- Each card: border-2 border-black, white bg
- Hover: bg-swiss-accent, text-white, border-swiss-accent
- Icon: Inside square border-2 border-current
- Typography: uppercase, font-bold

Selected State:
- bg-swiss-accent
- Checkmark: White circle with black border containing check icon
- No rounded corners anywhere

Continue Button:
- Full width, h-16
- bg-black, text-white
- uppercase, font-bold, tracking-widest
- Hover: bg-swiss-accent
- Arrow icon slides right on hover
```

**Step 2: Camera Instruction**
```
Section Label: "02. CAMERA" in Swiss Red

Instruction Block:
- Left side: Geometric camera illustration (Bauhaus style)
  - Square with diagonal lines pattern
  - Circle with dot matrix
  - Triangle accent in Swiss Red
- Right side: Numbered instructions (01, 02, 03) in red

Action Buttons:
- Back: border-2 border-black, white bg, uppercase
- Start Camera: bg-black, white text, uppercase
```

### 7.2 Dashboard Redesign

**Current Issues:**
- Financial summary uses rounded cards with shadows
- Center-aligned content in cards
- Red gradient on unprotected value
- Green/yellow/red status badges

**Swiss Redesign:**

**Header:**
```
Layout: Flex row, space-between
Left: "FINANCIAL SUMMARY" uppercase, text-3xl, font-black
Right: Policy type badge: border-2 border-black, px-4 py-1, uppercase
```

**Stats Grid:**
```
Layout: 4-column grid with gap-0 (seamless cards)
Each stat card:
- border-2 border-black (shared borders)
- p-8 padding
- White background
- Hover: bg-swiss-muted + swiss-dots pattern

Card Structure:
Top: Label uppercase tracking-widest text-sm
Bottom: Massive number text-5xl font-black

Special: Unprotected Value Card
- bg-swiss-accent (red)
- text-white
- Full height spanning 2 rows
- Number: text-6xl font-black
- Label: uppercase, white/90
```

**Item Breakdown Table:**
```
Layout: Full-width with visible grid structure
Header row: border-b-2 border-black, bg-swiss-muted, swiss-grid-pattern
- Columns: ITEM | STATUS | VALUE
- All uppercase, tracking-widest

Data rows: border-b border-gray-200
- Hover: bg-swiss-muted
- Status indicator: 12px square (not circle)
  - Covered: bg-black
  - Conditional: border-2 border-black (hollow)
  - Not Covered: bg-swiss-accent

Item name: capitalize, font-medium
Status label: uppercase text-xs tracking-wide
Value: font-bold, text-right
```

**Recommendations Section:**
```
Layout: Asymmetric grid (8:4)
Left (8): Recommendation list with numbered items
Right (4): Swiss Red accent block with diagonal pattern

Numbered Items:
- Red number "01", "02", etc. in square border
- Text flush left
- Border-b between items
```

### 7.3 App Shell Redesign

**Header:**
```
Layout: Fixed top, full width, border-b-4 border-black
Height: h-20
Background: white with swiss-noise overlay

Left:
- Logo mark: Black square with white shield icon
- Title: "INSURESCOPE" text-2xl font-black uppercase

Right:
- Policy selector: border-2 border-black, rectangular dropdown
- CTA button (if enabled): bg-swiss-accent, white text, uppercase
```

**Tab Navigation:**
```
Mobile: Fixed bottom, full width, border-t-4 border-black
Desktop: Relative, border-b-4 border-black

Tab buttons:
- uppercase, font-bold, tracking-wide
- Active: border-b-4 border-swiss-accent (thick underline)
- Inactive: text-gray-500
- Hover: text-black
- No background color changes
```

**Manual Mode Banner:**
```
Full width, bg-black, text-white
Height: h-12
Typography: uppercase, tracking-widest
Enable link: underline, hover:text-swiss-accent
```

### 7.4 Camera View Redesign

**Overlay UI:**
```
Detection boxes: border-2 border-swiss-accent (not rounded)
Label: bg-black, text-white, uppercase text-xs, px-2 py-1

Add Item Button (floating):
- Position: absolute top-4 right-4
- bg-white, border-2 border-black
- uppercase, font-bold
- Hover: bg-black, text-white
```

**Coverage Overlay:**
```
Status badges:
- Covered: bg-black text-white uppercase
- Conditional: border-2 border-black uppercase (hollow)
- Not Covered: bg-swiss-accent text-white uppercase

All: px-3 py-1, text-xs, tracking-wide, rounded-none
```

### 7.5 Detail Modal Redesign

**Modal Container:**
```
Overlay: bg-black/90 (no blur)
Modal: bg-white, max-w-2xl, border-4 border-black
Radius: rounded-none
Padding: p-12

Close button:
- Absolute top-4 right-4
- Border-2 border-black, square
- Hover: bg-swiss-accent, border-swiss-accent
- Icon: Plus rotated 45° (becomes X)
```

**Modal Content:**
```
Left column (4 cols): Item category, large text
Right column (8 cols): Coverage details

Section: "COVERAGE STATUS" uppercase tracking-widest
Status: Large text with status color

Section: "ESTIMATED VALUE" uppercase tracking-widest
Value: text-4xl font-black

Recommendations list:
- Border-l-4 border-swiss-accent
- Pl-4 for each item
```

---

## 8. Implementation Phases

### Phase 1: Design Tokens Foundation
**File:** `src/styles/swissTheme.css`

**Tasks:**
1. Create CSS custom properties for Swiss color palette
2. Import Inter font from Google Fonts (400, 500, 700, 900)
3. Define pattern texture utility classes (grid, dots, diagonal, noise)
4. Update `index.css` to import swissTheme.css (replace stateFarmTheme.css)

**Success Criteria:**
- All Swiss CSS variables available in dev tools
- Patterns render correctly on test divs
- Typography renders in Inter font

### Phase 2: Layout Primitives
**Files:** `src/index.css`, utility updates

**Tasks:**
1. Define Swiss spacing utilities (override or supplement Tailwind)
2. Create asymmetric grid templates (8:4, 7:5, 5:7)
3. Define section separator styles (thick borders)
4. Create numbered section label component pattern

**Success Criteria:**
- Grid layouts work with Swiss spacing
- Section labels render correctly
- Asymmetric grids functional

### Phase 3: Component Migration
**Order:** Least dependent to most dependent

**3.1 Buttons**
- Update button styles in all components
- Replace rounded with rectangular
- Implement color inversion hover states

**3.2 Cards/Containers**
- Redesign card base styles
- Implement pattern backgrounds
- Add hover color inversion

**3.3 Inputs**
- Update form input styles
- Implement Swiss focus states
- Ensure no rounded corners

**3.4 Navigation**
- Redesign TabNavigation component
- Update active state indicators
- Implement mechanical animations

**3.5 Icons**
- Audit all icon usage
- Enclose in geometric shapes where appropriate
- Add rotation animations for interactive icons

**3.6 Modals**
- Redesign DetailModal
- Remove rounded corners and blur
- Add thick borders and patterns

### Phase 4: Page-Level Redesign

**4.1 OnboardingFlow**
- Complete visual overhaul
- Implement Bauhaus hero composition
- Redesign step cards and transitions

**4.2 Dashboard**
- Redesign financial summary grid
- Implement seamless bordered cards
- Redesign item breakdown table

**4.3 App Shell**
- Redesign header with Swiss styling
- Update tab navigation
- Style manual mode banner

**4.4 Camera View & Overlays**
- Update detection overlay styles
- Redesign coverage badges
- Style floating action buttons

### Phase 5: Animation Migration
**File:** All Framer Motion components

**Tasks:**
1. Audit all Framer Motion transitions
2. Replace spring physics with linear/easeOut
3. Implement color inversion hovers
4. Add icon rotation animations
5. Add reduced motion support

**Success Criteria:**
- All animations feel mechanical and snappy
- No elastic/spring physics remain
- Reduced motion preferences respected

---

## 9. Accessibility Requirements

### 9.1 Contrast

- Black/White: 21:1 ratio (exceeds AAA)
- Swiss Red on White: ~5.5:1 (meets AA)
- All text meets WCAG 2.1 AA standards

### 9.2 Focus Indicators

```css
:focus-visible {
  outline: 2px solid var(--swiss-accent);
  outline-offset: 2px;
}
```

### 9.3 Touch Targets

- Minimum 44×44px for all interactive elements
- Generous padding on buttons (min h-16 on mobile)

### 9.4 Motion

- All animations CSS-based
- Respect `prefers-reduced-motion`
- No vestibular triggers (no parallax, no rapid movements)

---

## 10. Testing Checklist

### Visual Regression
- [ ] No rounded corners anywhere
- [ ] All borders visible and thick (min 2px)
- [ ] Swiss Red (#FF3000) used correctly
- [ ] Patterns render at correct opacity
- [ ] Typography in Inter font
- [ ] All uppercase headings

### Responsive
- [ ] Mobile: Touch targets ≥ 44×44px
- [ ] Mobile: Typography scales appropriately
- [ ] Tablet: Asymmetric grids appear
- [ ] Desktop: Full layout with all hover states

### Accessibility
- [ ] Color contrast validated
- [ ] Focus indicators visible
- [ ] Keyboard navigation works
- [ ] Screen reader labels present
- [ ] Reduced motion respected

### Functionality
- [ ] All interactions work (click, hover, focus)
- [ ] Form submissions functional
- [ ] Camera detection overlay renders
- [ ] Modal open/close works
- [ ] Tab navigation functional

---

## 11. Migration Notes

### From State Farm Theme

| Current | Swiss Replacement |
|---------|-------------------|
| #E31837 (State Farm Red) | #FF3000 (Swiss Red) |
| Rounded corners (rounded-lg, rounded-xl) | rounded-none |
| Soft shadows (shadow-md, shadow-lg) | No shadows |
| Center-aligned text | Left-aligned only |
| Mixed case headings | UPPERCASE |
| Gradients on cards | Solid colors + patterns |
| Spring animations | Linear/EaseOut 200ms |

### Breaking Changes

1. **Color palette completely replaced** — any hardcoded colors must update
2. **Border radius zeroed** — all components need radius removed
3. **Typography uppercase** — content may need adjustment for readability
4. **Animations changed** — user perception of "speed" may differ

---

## 12. Approval

**Spec Status:** Ready for review  
**Next Step:** User review → Implementation plan creation

**Questions for Review:**
1. Are the pattern textures (grid, dots, diagonal, noise) at correct opacity levels?
2. Is the type scale appropriate for the content density?
3. Should any components retain rounded corners (e.g., icon containers)?
4. Any concerns about the aggressive uppercase typography?
