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
| `NavItem`   | `NavLink` with `aria-current` styling; preloads the route's chunk on hover or focus. `AccountLink` reads "Sign in", or "Account" once signed in.          |
| `Footer`    | Wordmark, motto, the same links, copyright.                                                                                                               |
| `Container` | Centred, gutter-padded column (`page` 72rem, `reading` 42rem, `narrow` 34rem).                                                                            |
| `Section`   | Full-bleed band with `tone`: `default` (paper), `surface` (white) or `inverse` (navy, via `data-tone`).                                                   |

### `components/ui`

| Component           | Purpose                                                                                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`            | `solid`, `outline` or `danger` (destructive confirmations), `md` or `lg`. Square corners; colours invert on hover.                                       |
| `buttonClasses`     | The same styles for router `<Link>`s (use this for every link that looks like a button).                                                                 |
| `Field`             | Label, control, hint and error. Hands the control its `id`, `aria-describedby` and `aria-invalid` through a render prop.                                 |
| `Input`             | Underlined input, 16px text (so iOS doesn't zoom), underline contrast of 3:1 or more.                                                                    |
| `Card`              | White surface panel with an optional 2px blue or pink top rule.                                                                                          |
| `Picture`           | AVIF → WebP → JPEG `<picture>` with `srcset`, `sizes`, width and height. `priority` loads it eagerly with high fetch priority; otherwise it lazy-loads.  |
| `Reveal`            | Fades content in once on scroll, using IntersectionObserver and CSS. Reduced-motion users get no hidden state; focus inside shows the content instantly. |
| `Constellation`     | Decorative SVG star network echoing the hero art. Stars twinkle only when motion is allowed.                                                             |
| `Wordmark`, `Motto` | The text wordmark, and "Connection • Community • Confluence".                                                                                            |

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

| Component      | Purpose                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------- |
| `Textarea`     | Boxed multi-line field (16px text, border-strong). Used by the Blogs composers.                         |
| `StateMessage` | Centred empty / error / not-found panel with an optional action. Shared by Blogs and Auth.              |
| `Skeleton`     | Shimmering placeholder bar. Pair with an `aria-busy` region and a visually hidden label.                |
| `CategoryDot`  | A category's colour dot (decorative; the name is always beside it). `onFill` adds a paper ring on navy. |

### `components/ui` additions (admin panel, directory, feed search, toasts)

21st.dev was reviewed for the toast, dialog, drawer and select. Nothing was imported: the
native `<dialog>` already gives focus containment, Escape and top-layer stacking, and every
piece needed this system's square, shadow-free look and tokens.

| Component         | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Dialog`          | Modal on the native `<dialog>` (`showModal`): page behind inert (focus trap), Escape and a backdrop click ask to close, no page scroll behind it, focus returns to the opener. `popup` (centred from `sm`) or `drawer` (right edge from `sm`); a bottom sheet on phones. `dismissible={false}` while saving.                                                                                                                                                                                                                            |
| `DialogHeader`    | A dialog's heading (its accessible name) and close button.                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `ConfirmDialog`   | "Are you sure?" for consequential actions: plain-words description, optional length-checked reason, busy state, failures shown inside so they can be retried. `tone="danger"` for removals.                                                                                                                                                                                                                                                                                                                                             |
| `SelectMenu`      | Single-choice dropdown in the site's style (the browser's own option list can't be themed): underlined like `Input`, options in a square hairline panel with a ✓ on the current one. Select-only combobox pattern: arrows, Home/End, Enter/Space, Escape; outside click closes. Used for the admin filters.                                                                                                                                                                                                                             |
| `Avatar`          | (Moved from `features/blogs`.) Profile photo when there is one, initials on a brand colour otherwise or if the photo fails to load. Decorative.                                                                                                                                                                                                                                                                                                                                                                                         |
| `FilterMenu`      | Multi-select filter button ("Filter by category", "Filter by role") with a count of active options: a compact checklist popover from `sm` (whole rows clickable, changes apply at once, Clear in the header; closes on Escape, outside click or Tab away), a bottom sheet with "Show results" on phones.                                                                                                                                                                                                                                |
| `SearchFilterBar` | Search box + `FilterMenu` + removable pills for the active options. The Feed and the member directory both use it, so they look and behave the same.                                                                                                                                                                                                                                                                                                                                                                                    |
| `LoadMoreButton`  | "Show more" under a paged list (`lib/usePagedList`): keeps its place, shows progress; a failed page becomes "Try again" plus an error toast with a Try again action.                                                                                                                                                                                                                                                                                                                                                                    |
| `ToastProvider`   | (`Toaster.tsx`, mounted in `App`.) Toasts from `useToast()` (`toast.ts`): success, error, info, warning; optional title and one action; auto-dismiss with a shrinking bar, paused on hover or focus; Escape or ✕ dismisses; at most 3 on screen, the rest queue. Top centre on phones, top right from `sm`, under the header. Announced through always-present live regions (`role="status"`, errors `role="alert"`). Enter/exit motion is off under reduced motion. Use it for transient feedback; keep persistent form errors inline. |

Toasts are used for: signing in ("Welcome back", or "waiting for approval" for a pending
account), signing out, **Check again** on a pending account (approved, or still waiting),
publishing a blog, starting a Query Blog, removing a blog, comment, query or Query Blog
(success and failure), approving a member, and a failed "Show more" on any paged list
(with Try again). Form validation and load errors of whole views stay inline.

Shared hooks in `lib/`: `usePagedList` (moved from `features/blogs`; resets on new filters
while keeping the old rows visible, cancels stale requests), `useAsync` (one value with
loading/error/retry), `useDebouncedValue`.

### `features/blogs` (Blogs section)

21st.dev was reviewed for the feed card, segmented tabs and comment thread. Nothing was
imported: each piece needed this design system's tokens, square shapes and specific ARIA
behaviour, so building it was smaller and more consistent than adapting an import.

```
features/blogs/
  model/      types (Blog, Comment, QueryBlog, User), validation
  api/        BlogsApi contract + httpBlogsApi (maps API responses to the model)
  lib/        comment tree (prunes removed leaves), relative time, text helpers, URL builders
  state/      context + reducer session cache, and hooks (useFeed, useBlog, useThread, ...)
  components/ feed/, article/, comments/, composer/, query/, shared/
```

| Component              | Purpose                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BlogsLayout`          | 70/30 grid at `lg` with the sticky Query Blogs panel; content only below `lg`. Preloads the sibling Blogs pages.                                                                                                                                                                                                                                                                 |
| `BlogFeed`, `BlogCard` | Newest-first feed, IntersectionObserver infinite scroll, skeletons, end marker. Card: stretched title link (whole card clickable, focus ring on the card), blue→pink hover rule.                                                                                                                                                                                                 |
| `SegmentedTabs`        | Mobile "Feed / Query Blogs" ARIA tabs with roving tabindex and a sliding indicator. The tab is kept in the URL (`?tab=queries`) so Back restores it.                                                                                                                                                                                                                             |
| `QueryBlogCard`/`List` | Pinned Query Blog cards (category dot, title, description, query count, last activity), empty state, and `StartQueryBlog`.                                                                                                                                                                                                                                                       |
| `StartQueryBlog`       | "Start a Query Blog" button plus `QueryBlogComposer` dialog. Admins only, and only while a category has none. The title starts as "Official Query Blog - " and takes the chosen category's name (until the admin types their own).                                                                                                                                               |
| `CategoryChoice`       | Category chips with colour dots for both composers: checkboxes (blogs, any number) or radios (Query Blogs). Loading, error and retry. Selected chips keep their colours on hover.                                                                                                                                                                                                |
| `BlogComposer`         | Native modal `<dialog>`: full-screen sheet on phones, wide panel from `sm`. Title, category chips, and a formatting editor. Draft saved in this browser per member (survives reloads), "Draft saved" status, word count and read time, Ctrl/⌘+Enter publishes, server field errors shown on the fields.                                                                          |
| `RichTextEditor`       | TipTap editor, lazy-loaded with the composer. ARIA toolbar (one Tab stop, arrow keys): bold, italic, underline, strikethrough, H2, H3, bulleted and numbered lists, quote, link (http/https only), undo, redo. Shortcuts in each button's tooltip.                                                                                                                               |
| `RichText`             | Renders a stored blog document as React elements (never HTML). Links open in a new tab with `rel="noopener noreferrer nofollow ugc"`. Shares `.rich-text` styles (styles/index.css) with the editor.                                                                                                                                                                             |
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

### `features/auth` (sign-in, sign-up, account status)

21st.dev was reviewed for the auth forms. Nothing was imported: the existing `Field`, `Input`,
`Button` and `Card` already cover them, and an imported form kit would have clashed with the
underlined inputs and square shapes.

```
features/auth/
  supabase.ts       the browser Supabase client (Auth only; publishable key)
  AuthProvider.tsx  session + /api/me profile; authContext.ts holds the context and useAuth()
  RequireAuth.tsx   protected-route helper (route flag `requiresAuth` in app/routes.ts)
  api.ts, types.ts  the auth endpoints and their shapes
  validation.ts     client-side mirror of the server's signup rules
  paths.ts          auth URLs, safe ?next= handling, post-sign-in destination
  components/       the pieces below
```

| Component          | Purpose                                                                                                                            |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `AuthShell`        | Page frame for sign-in, sign-up and account: eyebrow, `h1`, intro, blue-ruled card, footer line.                                   |
| `SignInForm`       | Email + password via Supabase. Generic "don't match" error, busy state through profile loading, focus to the first invalid field.  |
| `ReferralCodeStep` | Sign-up step 1. Normalizes the code, checks its shape locally, then asks the API (rate-limited, generic answers).                  |
| `DetailsStep`      | Sign-up step 2. Name, email, password, phone (E.164), occupation, role, categories. Maps server field errors back onto the fields. |
| `RoleChoice`       | Member / Ambassador radio cards (native radios, sr-only, styled through `peer`).                                                   |
| `CategoryPicker`   | Ambassador categories as checkbox chips with colour dots, max 2 (others disable, live count). Loading, error with retry, empty.    |
| `PasswordInput`    | `Input` with a Show/Hide toggle (`aria-pressed`).                                                                                  |
| `AccountSummary`   | Definition list of the account's facts.                                                                                            |

Pages: `SignInPage` (`/sign-in`), `SignUpPage` (`/sign-up`), `AccountPage` (`/account`,
protected): pending → "waiting for approval", approved → welcome + referral code,
rejected/suspended → a neutral "isn't active" message.

### Posting permissions in the Blogs section

Composers and "Write a blog" only render for people allowed to post (approved accounts).
Everyone else sees `JoinPrompt` (`features/blogs/components/shared/`): "Sign in to comment"
for visitors, "waiting for approval" for pending accounts. Reply buttons follow the same rules,
and under a query only its asker, an ambassador for the topic, or an admin can reply.

Moderators (an ambassador for any of a blog's categories, or an admin) see **Remove blog**
and **Remove** on comments; only admins see **Remove Query Blog**. Each asks for
confirmation, and a failed removal is reported in a toast. A removed comment
shows "This comment was removed by a moderator." while it still has replies, and disappears
otherwise.

### Feed search (`features/blogs/components/feed/`)

| Component       | Purpose                                                                                                                                                                                                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FeedSearchBar` | `SearchFilterBar` with the categories as filter options.                                                                                                                                                                                                                         |
| `BlogFeed`      | Without search or filter: the cached newest-first feed, as before. With them: live results (`useFeedSearch`), 300 ms after typing stops and from 2 characters, older requests cancelled. Empty state with "Clear filters"; error with retry; old results dim instead of jumping. |

### Members and referrals (`features/members/`, `features/referrals/`)

| Component                     | Purpose                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MemberDirectory`             | Community page section headed "The community": `SearchFilterBar` (name or occupation, filter by role), then Admins, Ambassadors and Members sub-sections with counts, one full-width card per person ("(You)" beside the signed-in member), "Show more", loading/empty/error. Search results stay in their sections. Approved members only; others get `JoinPrompt`. |
| `MemberPanel`, `PanelSection` | The side panel a member opens in (bottom sheet on phones): photo, then role, name and one line under it (occupation, or status for admins), then titled sections. Shared by the community directory and the admin Community Directory.                                                                                                                               |
| `MemberProfilePanel`          | The community directory's panel: profile details (contact, categories, joined) and the member's blogs and comments. Opened profiles are cached for the session.                                                                                                                                                                                                      |
| `RoleSections`                | Groups a members list under Admins, Ambassadors and Members with counts. Used by both directories.                                                                                                                                                                                                                                                                   |
| `ProfileDetails`              | Definition list of a profile: occupation, phone (`tel:`), email (`mailto:`), categories, joined. Shared with the admin drawer.                                                                                                                                                                                                                                       |
| `RoleLabel`, `StatusLabel`    | Role as small spaced capitals in its colour (admin pink, ambassador blue, member grey); status as a small icon and its name in its colour. No boxes: boxed chips are kept for categories.                                                                                                                                                                            |
| `MyReferrals`                 | Account page: "People who joined using your code", with the total, role and status of each, and "Show more".                                                                                                                                                                                                                                                         |
| `ReferralRow`                 | One person who used a code. Shared with the admin drawer.                                                                                                                                                                                                                                                                                                            |

### Admin panel (`features/admin/`, page `pages/AdminPanelPage.tsx`, route `/adminpanel/*`)

The page redirects anyone who isn't an approved admin to their account; the API checks every
request anyway. Admins reach it from **Go to Admin Panel** on the account page.

| Component               | Purpose                                                                                                                                                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AdminLayout`           | Title, then a sticky sidebar of sections from `lg`; a sticky, sideways-scrolling tab row below that.                                                                                                                                                    |
| `AdminOverview`         | Pending approvals (members, ambassadors) with "Review applications", and quick links.                                                                                                                                                                   |
| `AdminMembers`          | The **Community Directory**: everyone of every status, grouped like the community page (admins, ambassadors, members; each by name), status on the right. Search (name or occupation), status and role filters, "Show more". Opens `AdminMemberDrawer`. |
| `AdminMemberDrawer`     | `MemberPanel` with the status under the name, **Approve** for pending users (with `ConfirmDialog` and an optional note), profile, blogs and comments (`AuthorActivity`), who invited them, and everyone who used their code.                            |
| `AdminQueryBlogs`       | Query Blogs with **Start a Query Blog** (reuses `QueryBlogComposer`) and **Remove**.                                                                                                                                                                    |
| `RemoveQueryBlogDialog` | Says what removal takes with it, takes an optional reason. Also used on the Query Blog page.                                                                                                                                                            |
| `AdminActivityLog`      | The read-only activity log: who did what to which target, why, and when; filter by action; "Show more".                                                                                                                                                 |

### Account activity (`features/blogs/components/mine/`)

`AuthorActivity` shows the same blog and comment lists inside a member's profile panel: two
of each at first, then "Show more".

`MyBlogs` and `MyComments`, shown under the Account card for approved members: newest first,
"Show more" paging (`state/usePagedList.ts`), with loading, empty and error states. Comments
are labelled (Comment, Reply, Query, Reply to a query) and link to their thread
(`?thread=<id>`).
