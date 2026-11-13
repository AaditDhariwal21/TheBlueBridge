# Design tokens: The Blue Bridge

Source of truth for the design system. Values were extracted on 2026-11-03 from the
reference build at <https://the-blue-bridge.vercel.app/> (`/`, `/about`, `/community`).
They come from the live stylesheet's `:root` variables and from computed styles read
with Playwright at 360, 768 and 1280 px. Screenshots and verbatim copy are in
[`docs/reference/`](reference/).

Status: **approved 2026-11-03.** Implemented in [`client/src/styles/tokens.css`](../client/src/styles/tokens.css),
which must stay in sync with this file. Items marked **[new]** are not in the reference.

---

## 1. Reference at a glance

- **Feel:** quiet, editorial, high-trust. Deep navy "night sky" bands alternate with warm
  paper-coloured bands. A classical serif for display, a neutral sans for body text.
  Square corners and no shadows anywhere.
- **Signature asset:** `hero-bridge.jpg`. Two women (one blue, one pink) join hands at
  the centre of a suspension bridge under a constellation network, with the
  "THE BLUE BRIDGE / CONNECTION • COMMUNITY • CONFLUENCE" lockup **baked into the image**.
- **Blue + pink duality** is the only accent idea. It appears in the image, on the two
  Community audience rules (blue for Professional, pink for Aspiring), and on the pink dots
  of the lockup.
- **Built with:** Next.js + Tailwind v4, `next/font` (Playfair Display + Inter),
  max-width container `72rem`, and a single `sm` (640 px) breakpoint for nav and grid changes.

## 2. Colour

### 2.1 Raw palette (from the reference `:root`)

| Reference var | Hex       | Used for                                      |
| ------------- | --------- | --------------------------------------------- |
| `--navy-950`  | `#001a56` | Hero, header, closing band, footer background |
| `--navy-900`  | `#0e1d42` | Pillar labels text                            |
| `--navy-800`  | `#16244d` | Declared, not visibly used                    |
| `--blue-400`  | `#7fa9ef` | Accent rule (Professional women)              |
| `--pink-400`  | `#e393c2` | Accent rule (Aspiring & emerging women)       |
| `--paper`     | `#f6f3ec` | Page background; text on navy                 |
| `--ink`       | `#16213e` | Headings / body text on paper                 |
| `--slate`     | `#5b6478` | Body paragraphs (muted)                       |
| `--hairline`  | `#ddd6c9` | Dividers on paper                             |
| (Tailwind)    | `#ffffff` | Pillars band background                       |

The hero JPEG's flat background samples at `rgb(1,25,85)` ≈ `#011955`, close enough to
`navy-950` that the image edges blend seamlessly into the section.

Translucent paper on navy (via `color-mix`) is used for secondary text:
`paper/80` nav links, `paper/70` closing body text and footer, `paper/50` copyright and
placeholders, `paper/30` input underline.

### 2.2 Additional shades **[new]**

The blue and pink accents fail as **text** on light backgrounds (about 2.1:1). I added
darker siblings so the accents can carry text on paper:

| Name       | Hex       | On paper | On white | Purpose                          |
| ---------- | --------- | -------- | -------- | -------------------------------- |
| `blue-600` | `#3563c4` | 5.08     | 5.63     | Accent text / links on light     |
| `pink-600` | `#a23c76` | 5.50     | 6.10     | Accent text on light (sparingly) |

### 2.3 Semantic roles (what components use)

Tokens are defined in two layers in `src/styles/tokens.css`:

1. **Palette** (`--palette-navy-950`, …): raw values. _Never referenced by components._
2. **Semantic** (`--color-*`): the only names components and Tailwind utilities see.

Sections choose a **tone**. The default tone is light (paper). `data-tone="inverse"` on a
section re-points the same semantic names to the navy scheme, so one `<Button>` or
`<Input>` works on either band without variants. The same mechanism makes a future
dark mode a single extra scope (`[data-theme="dark"]`).

| Role                     | Token                   | Default (paper)     | Inverse (navy)                  |
| ------------------------ | ----------------------- | ------------------- | ------------------------------- |
| Background               | `--color-bg`            | `paper #f6f3ec`     | `navy-950 #001a56`              |
| Surface (cards, bands)   | `--color-surface`       | `white #ffffff`     | `navy-900 #0e1d42`              |
| Primary (brand)          | `--color-primary`       | `navy-950 #001a56`  | `paper #f6f3ec`                 |
| On primary               | `--color-on-primary`    | `paper #f6f3ec`     | `navy-950 #001a56`              |
| Accent (blue)            | `--color-accent`        | `blue-600 #3563c4`  | `blue-400 #7fa9ef`              |
| Accent 2 (pink)          | `--color-accent-2`      | `pink-600 #a23c76`  | `pink-400 #e393c2`              |
| Accent decorative (blue) | `--color-accent-soft`   | `blue-400 #7fa9ef`  | `blue-400 #7fa9ef`              |
| Accent decorative (pink) | `--color-accent-2-soft` | `pink-400 #e393c2`  | `pink-400 #e393c2`              |
| Text                     | `--color-text`          | `ink #16213e`       | `paper #f6f3ec`                 |
| Muted text               | `--color-text-muted`    | `slate #5b6478`     | `paper @ 75% → #b9bdc7 (8.7:1)` |
| Subtle text (fine print) | `--color-text-subtle`   | `slate #5b6478`     | `paper @ 65% → #a0a7b8 (6.8:1)` |
| Border (decorative)      | `--color-border`        | `hairline #ddd6c9`  | `paper @ 18%`                   |
| Border (controls)        | `--color-border-strong` | `slate #5b6478`     | `paper @ 55% → #8791a9 (5.2:1)` |
| Focus ring               | `--color-focus`         | `blue-600 #3563c4`  | `blue-400 #7fa9ef`              |
| Error text / border      | `--color-danger`        | `#b42318` **[new]** | `#ffb4a8` **[new]**             |
| Success                  | `--color-success`       | `#1e6b4a` **[new]** | `#9fe0bf` **[new]**             |
| Warning                  | `--color-warning`       | `#8a5300` **[new]** | `#ffd58a` **[new]**             |

**Category colours [new].** Each category has a `color` in the database (`public.category_color`:
`pink`, `green`, `blue`, `orange`, `black`). The client maps it to one token, rendered only as a
dot beside the category's name (`components/ui/CategoryDot.tsx`). Same in every tone.

| Category         | `color`  | Token                     | Value               |
| ---------------- | -------- | ------------------------- | ------------------- |
| Health           | `pink`   | `--color-category-pink`   | `pink-400 #e393c2`  |
| Finance          | `green`  | `--color-category-green`  | `#4fb37e` **[new]** |
| Tech             | `blue`   | `--color-category-blue`   | `blue-400 #7fa9ef`  |
| Entrepreneurship | `orange` | `--color-category-orange` | `#ee9a4d` **[new]** |
| Legal            | `black`  | `--color-category-black`  | `#141414` **[new]** |

On a filled (navy) chip the dot gets a paper ring so black stays visible.

"Soft" accents are only for non-text decoration (rules, dots, glows) where 3:1 isn't required.

### 2.4 Contrast audit (WCAG 2.2)

| Pair                                          | Ratio       | Result                                               |
| --------------------------------------------- | ----------- | ---------------------------------------------------- |
| ink on paper                                  | 14.34       | AAA                                                  |
| slate on paper / on white                     | 5.35 / 5.93 | AA                                                   |
| paper on navy-950                             | 14.78       | AAA                                                  |
| paper/80 on navy (nav links)                  | 9.77        | AAA                                                  |
| paper/70 on navy (body)                       | 7.70        | AAA                                                  |
| paper/50 on navy (reference copyright, 12 px) | 4.54        | AA, barely. **Raised to 65%.**                       |
| paper/30 on navy (reference input underline)  | 2.43        | **Fails 1.4.11 (needs 3:1). Raised to 55% (5.2:1).** |
| blue-400 / pink-400 on navy                   | 6.88 / 7.19 | AA, fine as text on navy                             |
| blue-400 / pink-400 on paper                  | 2.15 / 2.06 | Decoration only → `-600` for text                    |
| blue-600 / pink-600 on paper                  | 5.08 / 5.50 | AA                                                   |
| amber-700 (warning) on paper / on white       | 5.7 / 6.3   | AA                                                   |
| amber-200 (warning) on navy-950               | 11.8        | AAA                                                  |
| hairline on paper                             | 1.30        | Decorative dividers only                             |

## 3. Typography

| Family               | Role                                          | Weights seen in the reference          |
| -------------------- | --------------------------------------------- | -------------------------------------- |
| **Playfair Display** | Display: wordmark, headings, tagline, pillars | 400 (+ 500/600 declared), 400 _italic_ |
| **Inter**            | Body, UI, nav, buttons, inputs                | 400 (+ 500/600 declared)               |

- The hero lockup ("THE BLUE BRIDGE" in classical Roman caps plus a spaced sans
  sub-line) is **part of the image, not a web font**. It is closer to a Trajan/Cinzel
  style than to Playfair. I'm not adding a third font for it.
- Self-hosted via `@fontsource` (Playfair Display 400/500/600 + 400/500 italic, Inter
  variable), latin subset, `font-display: swap`. Only the two most critical faces are preloaded.

| Token                       | Family            | Mobile (<640)                 | ≥640 / desktop                                   | Reference usage                                          |
| --------------------------- | ----------------- | ----------------------------- | ------------------------------------------------ | -------------------------------------------------------- |
| `--text-display`            | Playfair          | 2.25rem / 1.15 **[new]**      | 3.5rem / 1.1                                     | Home statement **[new]**                                 |
| `--text-h1`                 | Playfair          | 1.875rem / 1.2 (30/36)        | 2.25rem / 1.11 (36/40) → 2.75rem at lg **[new]** | About / Community `h1`                                   |
| `--text-h2`                 | Playfair          | 1.875rem / 1.2                | 1.875rem → 2.25rem at lg                         | "Connection. Community. Confluence."                     |
| `--text-lead-serif`         | Playfair          | 1.5rem / 1.375 (24/33)        | 1.75rem / 1.375 (28/38.5)                        | Problem statement; About closing (italic)                |
| `--text-tagline`            | Playfair _italic_ | 1.5rem / 1.33 (24/32)         | 1.875rem / 1.2 (30/36)                           | Hero tagline                                             |
| `--text-h3`                 | Playfair          | 1.25rem / 1.4 (20/28)         | same                                             | Pillar labels, audience headings                         |
| `--text-wordmark`           | Playfair          | 1.25rem / 1.4, tracking 0.5px | same                                             | Header wordmark (footer 18/28)                           |
| `--text-lg`                 | Inter             | 1.125rem / 1.625 (18/29.25)   | same                                             | All body paragraphs (muted)                              |
| `--text-base`               | Inter             | 1rem / 1.5                    | same                                             | Closing body copy                                        |
| `--text-sm`                 | Inter             | 0.875rem / 1.43 (14/20)       | same                                             | Nav, buttons, inputs                                     |
| `--text-xs`                 | Inter             | 0.75rem / 1.33 (12/16)        | same                                             | Copyright                                                |
| `--tracking-wordmark`       |                   | 0.5px                         |                                                  | Wordmark                                                 |
| `--tracking-caps` **[new]** | Inter             | 0.18em                        |                                                  | Small-caps eyebrows (echoes the image's spaced sub-line) |

Reading measure: reference paragraphs cap at `64rem` (≈150 characters, too long).
**Proposed:** `--measure: 68ch` for prose.

## 4. Spacing, layout, radius, shadow, motion

| Token                         | Value                                      | Reference evidence                         |
| ----------------------------- | ------------------------------------------ | ------------------------------------------ |
| `--space-unit`                | `0.25rem` (Tailwind scale)                 | Tailwind `--spacing: .25rem`               |
| `--container-max`             | `72rem` (1152 px)                          | `max-w-6xl`, content 1104 px after gutters |
| `--gutter`                    | `1.5rem` (24 px)                           | `px-6` at every width                      |
| `--section-y`                 | `5rem` (80 px) → `7rem` at lg **[new]**    | `py-20`                                    |
| `--header-h`                  | `4.25rem` (68 px)                          | Header 68 px desktop / 76 px mobile        |
| Breakpoints                   | `sm 640`, `md 768`, `lg 1024`              | Reference uses only `sm`                   |
| `--radius-none`               | `0`                                        | **Every element is square-cornered**       |
| `--radius-sm` **[new]**       | `2px`                                      | Reserved (focus ring softening only)       |
| `--shadow-*`                  | `none`                                     | **No shadows in the reference**            |
| `--shadow-glow` **[new]**     | soft blue/pink radial glow, no drop shadow | For the closing band's constellation motif |
| `--ease-standard`             | `cubic-bezier(0.4, 0, 0.2, 1)`             | Tailwind default on `transition-colors`    |
| `--duration-fast`             | `150ms`                                    | Button/link colour transitions             |
| `--duration-reveal` **[new]** | `600ms`                                    | Scroll reveal                              |
| Reduced motion                | durations → ~0                             | Reference already honours it; we keep this |

## 5. Components in the reference

- **Button (outline):** 1 px `paper` border, transparent, Inter 14/20, padding 12×28
  (hero) or 8×24 (form), square. Hover inverts to `paper` background with `navy-950` text,
  150 ms. Focus is the browser default outline only.
- **Text input:** bottom border only (`paper/30`), transparent, padding 8×4, Inter 14,
  placeholder `paper/50`, focus brightens the border to `paper`, `outline: none`.
  Labels are **sr-only**; the placeholder acts as the visible label.
- **Nav link:** Inter 14, `paper/80` → `paper` on hover. No active-page indicator.
- **Divider:** 1 px `hairline` top rule above the problem statement; vertical hairlines
  between pillars at ≥640.
- **Accent rule:** 2 px left border, `blue-400` / `pink-400`, 24 px inset (Community).
- **Mobile menu:** two-line hamburger at <640, toggles `aria-expanded`/label.

## 6. Logo / wordmark

- Header and footer: the text "The Blue Bridge" in Playfair Display 400 (header 20 px,
  tracking 0.5px; footer 18 px), colour `paper`. No graphic logo file exists
  (`/logo.*` returns 404).
- Hero: the lockup lives inside `hero-bridge.jpg` (1758×878, 149 KB JPEG).
- Favicon: `/favicon.ico` (64×64). Copied to `public/`.

## 7. Reference issues to fix in the rebuild

1. **Home has no `h1`.** The only heading is the closing `h2`; the tagline is a `<p>`.
2. **No skip-to-content link.**
3. **Mobile menu:** not focus-trapped, **Escape does not close it**, and Tab runs into
   the page behind it.
4. **Inputs:** `outline: none`, placeholder-as-label, 2.43:1 underline, no visible error text.
5. **Focus:** relies on default outlines, which are invisible on navy in some browsers.
6. **Copy measure:** about 150 characters per line on desktop.
7. **Meta:** identical description and OG tags on every page; no `og:url` or canonical.
8. **Pillars:** labels only, so the band reads as a stray nav row.
9. **Hero on 360 px:** the baked-in lockup shrinks to about 180 px tall, and the
   sub-line becomes about 6 px tall and illegible.

## 8. Implementation notes

- **How tokens become utilities.** Tailwind v4's default colour, font, text, radius, shadow,
  container, tracking, ease, animation and aspect scales are reset with `--*: initial`, so
  only our tokens exist as utilities. Off-palette classes like `bg-blue-500` simply don't
  compile. ESLint also rejects arbitrary hex or px values (`bg-[#123456]`, `p-[13px]`).
- **Tokens added during the build:**
  - `--text-body-lg`: the larger sans paragraph size used for lead paragraphs.
  - `--container-hero`: 110rem, the hero image's natural width.
  - `--aspect-hero`, `--aspect-hero-crop` (8/5 on mobile, to enlarge the lockup) and `--aspect-figures`.
  - `--spacing-gutter`, `--spacing-header` and `--spacing-section` (fluid).
  - `--animate-rise`, `--animate-fade` and `--animate-twinkle`.
  - Blogs section (2026-11-05): `--text-title` (fluid 19→23px, feed card and topic titles);
    `--animate-arrive` (something just posted rises in under a soft blue wash that fades to
    the element's own background), `--animate-shimmer` (loading skeletons) and
    `--animate-sheet` (composer sheet entrance). All are neutralised by reduced motion.
  - Admin panel and toasts (2026-11-12): `--color-warning` (pending status, warning toasts);
    `--animate-toast-in`, `--animate-toast-out` and `--animate-toast-progress` (the bar under a
    toast, its duration set inline). Toasts follow the brand: square, hairline border, a 2px
    left rule in the variant's colour, no shadow. Reduced motion neutralises the motion and
    hides the progress bar.
  - Avatars and status dots use `rounded-full`; everything else stays square-cornered.
- **Type scale:** display, h1, h2, lead and tagline are fluid `clamp()` values whose rem term
  keeps them scaling with browser zoom. Their mobile and desktop ends match section 3.
- **Pillar copy:** approved 2026-11-03, as proposed.
