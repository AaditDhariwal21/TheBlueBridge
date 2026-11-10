# Components

## Third-party imports (21st.dev)

**None.** Nothing in this phase clearly beat building the piece ourselves. Every component
is small, and importing would have meant restyling it to our tokens and auditing it anyway.

Record any future import here: its source URL, licence, the dependencies it brought in, and
what was changed (restyled to tokens, props removed, keyboard, focus and ARIA checked).

| Component | Source | Licence | Changes |
| --------- | ------ | ------- | ------- |
| (none)    |        |         |         |

## Inventory

Paths below are relative to `client/src/`. All components use semantic tokens only (see [design-tokens.md](design-tokens.md)).
Sections take no data and do no fetching; their copy is defined as constants in the file.

### `components/layout`

| Component   | Purpose                                                                                                                                                   |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PageShell` | Skip link, header, a focusable `<main id="main">`, footer.                                                                                                |
| `Header`    | Sticky navy bar. Wordmark, desktop nav (≥640px), mobile menu trigger. Border appears on scroll.                                                           |
| `MobileNav` | Full-screen native modal `<dialog>`: focus contained, Escape closes it, focus returns to the trigger, it closes on navigation and on widening to desktop. |
| `NavItem`   | `NavLink` with `aria-current` styling; preloads the route's chunk on hover or focus. `SignInLink` is the `href="#"` placeholder.                          |
| `Footer`    | Wordmark, motto, the same links, copyright.                                                                                                               |
| `Container` | Centred, gutter-padded column (`page` 72rem, `reading` 42rem, `narrow` 34rem).                                                                            |
| `Section`   | Full-bleed band with `tone`: `default` (paper), `surface` (white) or `inverse` (navy, via `data-tone`).                                                   |

### `components/ui`

| Component              | Purpose                                                                                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`, `ButtonLink` | `solid` or `outline`, `md` or `lg`. Square corners; colours invert on hover. `ButtonLink` adds `rel="noopener noreferrer"` to external URLs.             |
| `buttonClasses`        | The same styles for router `<Link>`s.                                                                                                                    |
| `Field`                | Label, control, hint and error. Hands the control its `id`, `aria-describedby` and `aria-invalid` through a render prop.                                 |
| `Input`                | Underlined input, 16px text (so iOS doesn't zoom), underline contrast of 3:1 or more.                                                                    |
| `Card`                 | White surface panel with an optional 2px blue or pink top rule.                                                                                          |
| `Picture`              | AVIF → WebP → JPEG `<picture>` with `srcset`, `sizes`, width and height. `priority` loads it eagerly with high fetch priority; otherwise it lazy-loads.  |
| `Reveal`               | Fades content in once on scroll, using IntersectionObserver and CSS. Reduced-motion users get no hidden state; focus inside shows the content instantly. |
| `Constellation`        | Decorative SVG star network echoing the hero art. Stars twinkle only when motion is allowed.                                                             |
| `Wordmark`, `Motto`    | The text wordmark, and "Connection • Community • Confluence".                                                                                            |

### `components/sections`

| Section            | Used on   | Notes                                                                                 |
| ------------------ | --------- | ------------------------------------------------------------------------------------- |
| `Hero`             | Home      | Tagline is the page `h1`. LCP image at high fetch priority, cropped on mobile.        |
| `Mission`          | Home      | Problem statement as `h2` (display size), then the mission paragraph.                 |
| `Pillars`          | Home      | Four pillars with hand-drawn icons and approved copy. Visually hidden `h2`.           |
| `WaitlistCta`      | Home      | Closing band with `WaitlistForm`.                                                     |
| `WaitlistForm`     | Home      | UI only. Validates and trims, then calls `client/src/lib/submitWaitlist.ts` (a stub). |
| `AboutStory`       | About     | `h1` pinned beside the three-part story on desktop.                                   |
| `ClosingStatement` | About     | Large italic statement on navy.                                                       |
| `PageIntro`        | Community | `h1` and an optional image beside it.                                                 |
| `Audiences`        | Community | Ordered list of two cards, colour-coded blue and pink.                                |

### `components/ui` additions

| Component  | Purpose                                                                         |
| ---------- | ------------------------------------------------------------------------------- |
| `Textarea` | Boxed multi-line field (16px text, border-strong). Used by the Blogs composers. |

### `features/blogs` (Blogs section)

21st.dev was reviewed for the feed card, segmented tabs and comment thread. Nothing was
imported: each piece needed this design system's tokens, square shapes and specific ARIA
behaviour, so building it was smaller and more consistent than adapting an import.

```
features/blogs/
  model/      types (Blog, Comment, QueryBlog, User, Category), categories, validation
  api/        BlogsApi contract + in-memory mock (the only swap point for a real backend)
  data/       seed content: members, 15 blogs, comment threads, 6 Query Blog topics
  lib/        comment tree, relative time, text helpers, URL builders
  state/      context + reducer session cache, and hooks (useFeed, useBlog, useThread, ...)
  components/ feed/, article/, comments/, composer/, query/, shared/
```

| Component              | Purpose                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BlogsLayout`          | 70/30 grid at `lg` with the sticky Query Blogs panel; content only below `lg`. Preloads the sibling Blogs pages.                                                                                                                                                                                                                                                                 |
| `BlogFeed`, `BlogCard` | Newest-first feed, IntersectionObserver infinite scroll, skeletons, end marker. Card: stretched title link (whole card clickable, focus ring on the card), blue→pink hover rule.                                                                                                                                                                                                 |
| `SegmentedTabs`        | Mobile "Feed / Query Blogs" ARIA tabs with roving tabindex and a sliding indicator. The tab is kept in the URL (`?tab=queries`) so Back restores it.                                                                                                                                                                                                                             |
| `QueryBlogCard`/`List` | Pinned topic cards (topic, description, query count, last activity).                                                                                                                                                                                                                                                                                                             |
| `BlogComposer`         | Native modal `<dialog>`: full-screen sheet on phones, centred modal from `sm`. Title, category radio chips, body; validation with focus on the first error; the draft is kept until published.                                                                                                                                                                                   |
| `CommentsSection`      | Heading, composer, threaded list, empty/error/loading states, and the focused "continue thread" view (`?thread=<id>`). Moves focus to anything just posted and announces it.                                                                                                                                                                                                     |
| `CommentItem`          | Recursive comment. Thread line down from the avatar (a button: collapses the branch to an "N replies" pill), square elbow connectors, "Replying to" label, "Author" tag, inline reply composer. Indentation caps at 3 levels (2 below `sm`); deeper replies are listed flat at the last level with "Continue this thread". First 2 replies per list, then "View N more replies". |
| `BackLink`             | Behaves like browser Back inside the app (keeps feed tab and scroll); a normal link on direct visits.                                                                                                                                                                                                                                                                            |

## Copy that is not on the reference site

These lines were written for this build. All are easy to change.

- **Pillar lines** (approved).
- **Visually hidden `h2`:** "Our pillars".
- **Form errors:** "Please enter your name.", "Please keep your name under 100 characters.",
  "Please enter your email address.", "Please enter a valid email address, like name@example.com.",
  "Something went wrong. Please try again."
- **Form success:** "Thank you, {first name}. We'll keep you posted."
- **Button loading label:** "Sending…"
- **Meta descriptions for About and Community** are in `client/src/app/routes.ts`.
- **404 page:** "Page not found", "The page you're looking for doesn't exist or may have moved.",
  "Back to home".
- **Image alt text** for the hero and the Community figures image.
