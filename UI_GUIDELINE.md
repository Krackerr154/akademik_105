# UI Guideline: Academic Archive Dashboard ("The Modern Scriptorium")

## 1. Overview & Creative North Star
This design system is built upon the Creative North Star of **"The Modern Scriptorium."** It envisions the digital research environment not as a standard database, but as a high-end editorial archive. By moving away from generic "app-like" interfaces, we prioritize intellectual rigor through sophisticated tonal layering, authoritative typography, and intentional asymmetry. 

The system breaks the "template" look by treating the sidebar and main stage as distinct physical planes of thought. It elevates the experience through a warmer, more tactile palette that feels permanent and institutional rather than ephemeral.

---

## 2. Colors & Surface Philosophy
The palette is rooted in a warm, scholarly atmosphere. The primary goal is to provide a "calm" canvas for complex information.

### Core Palette
- **Background (`surface`):** `#faf9f7` — A warm, non-glare off-white that reduces eye strain during long-form reading.
- **Primary Text (`primary`):** `#091526` — A deep, authoritative navy used for structural elements and primary headings.
- **Action/Interactive (`secondary`):** `#086b5b` — A muted teal that provides a sophisticated contrast without the aggression of pure blues.
- **Status/Highlight (`tertiary_fixed_dim`):** `#ffb77d` — A warm amber for badges and warnings.
- **Highlight Detail (`primary_fixed`):** `#d7e3fa` — A subtle, high-end highlight for selected text or states.

### The "No-Line" Rule
To achieve a premium feel, **1px solid borders are prohibited for sectioning.** Boundaries must be defined through:
- **Background Color Shifts:** Use `surface_container_low` (sidebar) against the `surface` (main content).
- **Tonal Transitions:** Defining an area by its slightly darker or lighter surface tier rather than a physical line.

### Surface Hierarchy & Nesting
Treat the UI as a series of nested physical layers. 
- **Base Level:** `surface` (#faf9f7) — The desk.
- **Secondary Level:** `surface_container_low` (#f4f3f1) — The sidebar or secondary panel.
- **Interactive Level:** `surface_container_lowest` (#ffffff) — Active cards or focused workspace.
- **Elevated Level:** `surface_container_highest` (#e3e2e0) — Information popovers or flyouts.

### Signature Polish
- **Glassmorphism:** For floating menus (e.g., search bars or global actions), use `surface_container_lowest` (#ffffff) with a 12px `backdrop-blur`. This ensures the UI feels integrated rather than pasted on top.
- **Subtle Gradients:** For primary CTAs, use a 15° linear gradient from `secondary` (#086b5b) to `on_secondary_container` (#126f60) to add depth.

---

## 3. Typography
The system uses a pairing of **Manrope** for editorial authority and **Inter** for functional clarity.

- **Display & Headlines:** Set in **Manrope**. These should use generous letter-spacing (-0.02em) to evoke the feel of a printed academic journal.
- **Titles & Body:** Set in **Inter**. This provides high legibility for dense research data and abstracts.
- **Metadata:** Use a high-quality **Monospace** font (e.g. Fira Code, Roboto Mono) for file sizes, IDs, and dates. This adds a "scientific/archival" layer to the UI, separating raw data from editorial content.

---

## 4. Elevation & Depth
Elevation is achieved through **Tonal Layering** rather than traditional drop shadows.

- **The Layering Principle:** Place a `surface_container_lowest` (#ffffff) card on a `surface_container_low` background to create a soft, natural lift.
- **Ambient Shadows:** When a floating effect is necessary (e.g., a context menu), use a shadow with a 24px blur and 4% opacity, tinted with the navy `on_surface` color (`#1a1c1b`). This mimics the way light interacts with heavy paper.
- **The "Ghost Border":** If a boundary is required for accessibility, use the `outline_variant` (#c5c6cd) token at **15% opacity**. This creates a "suggestion" of a container without breaking the editorial flow.

---

## 5. Components

### Buttons
- **Primary:** Background `secondary` (#086b5b), Text `on_secondary` (#ffffff). Shape: `md` (0.75rem / 12px border radius).
- **Secondary:** Background `surface_container_high` (#e9e8e6), Text `on_surface` (#1a1c1b).
- **Tertiary/Ghost:** No background. Text `primary` (#091526). For low-priority navigation.

### Cards & Lists
- **Rule:** Forbid divider lines.
- **Implementation:** Use 32px of vertical whitespace (from the spacing scale) to separate entries. In lists, use a hover state that changes the background to `surface_container_highest` (#e3e2e0) with a `sm` (0.25rem / 4px) corner radius.

### Input Fields
- **Style:** Understated. Use `surface_container_low` (#f4f3f1) as the background with no border. 
- **Focus:** Transition to a 1px `secondary` (teal) "Ghost Border" (20% opacity) on focus.
- **Metadata Inputs:** Use Monospace font for inputs relating to technical parameters.

### Research-Specific Components
- **The "Breadcrumb Tray":** A horizontal strip at the top of the content area using `label-sm` Inter.
- **The "Data Badge":** Small, Monospace tags using `secondary_container` (#9eefdc) with `on_secondary_container` (#126f60) text for file types (.pdf, .csv, .md).

---

## 6. Do's and Don'ts

### Do
- **Do** prioritize white space. If a layout feels crowded, increase the padding by 50% rather than adding a border.
- **Do** use `primary_fixed` (#d7e3fa) for subtle, high-end highlighting of text selections.
- **Do** align the left edge of the sidebar text with the main content headline to create a "strong vertical axis."

### Don't
- **Don't** use pure black (#000000) for text. Always use `primary` (#091526) or `on_surface` (#1a1c1b) to maintain the warm, organic feel.
- **Don't** use standard Material Design drop shadows. They look too "tech" and not enough "archive."
- **Don't** use 100% opaque borders. They create visual noise that competes with the scholarly content.
- **Don't** use gradients on backgrounds. Backgrounds must remain flat and "paper-like."
