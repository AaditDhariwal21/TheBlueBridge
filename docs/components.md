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
| `Footer`    | Wordmark, motto, the same links (44px touch targets), copyright. Shared by every page.                                                                    |
| `Container` | Centred, gutter-padded column (`page` 72rem, `reading` 42rem, `narrow` 34rem).                                                                            |
| `Section`   | Full-bleed band with `tone`: `default` (paper), `surface` (white) or `inverse` (navy, via `data-tone`).                                                   |

### `components/ui`

| Component           | Purpose                                                                                                                                                                                                                                                                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`            | `solid`, `outline`, `subtle` (secondary buttons inside bordered surfaces in the Blogs area: hairline border, darker on hover) or `danger` (destructive confirmations), `md` or `lg`. Square corners.                                                                                                                                    |
| `buttonClasses`     | The same styles for router `<Link>`s (use this for every link that looks like a button). Variants also include `danger-outline` (opens a destructive or negative action). `dangerTextClasses()`: a destructive action written as text ("Remove blog", "Remove"): red, darker and underlined on hover or keyboard focus, red focus ring. |
| `Field`             | Label, control, hint and error. Hands the control its `id`, `aria-describedby` and `aria-invalid` through a render prop.                                                                                                                                                                                                                |
| `Input`             | Underlined input, 16px text (so iOS doesn't zoom), underline contrast of 3:1 or more.                                                                                                                                                                                                                                                   |
| `Card`              | White surface panel with an optional 2px blue or pink top rule.                                                                                                                                                                                                                                                                         |
| `Picture`           | AVIF → WebP → JPEG `<picture>` with `srcset`, `sizes`, width and height. `priority` loads it eagerly with high fetch priority; otherwise it lazy-loads.                                                                                                                                                                                 |
| `Reveal`            | Fades content in once on scroll, using IntersectionObserver and CSS. Reduced-motion users get no hidden state; focus inside shows the content instantly.                                                                                                                                                                                |
| `Constellation`     | Decorative SVG star network echoing the hero art. Stars twinkle only when motion is allowed.                                                                                                                                                                                                                                            |
| `DeadEnd`           | Not-found and no-access states: a small original drawing of a bridge that stops mid-air, eyebrow, heading, copy, actions. `page` (404, admin no access) or `inline` (a missing blog or Query Blog). Stars twinkle only when motion is allowed.                                                                                          |
| `CharacterCount`    | Length feedback under a field: "8 characters minimum", "3 more characters needed", then "120 / 140" (red over the limit). Composers, comments, the sign-up password.                                                                                                                                                                    |
| `Wordmark`, `Motto` | The text wordmark, and "Connection • Community • Confluence".                                                                                                                                                                                                                                                                           |

### `components/sections`

| Section            | Used on   | Notes                                                                             |
| ------------------ | --------- | --------------------------------------------------------------------------------- |
| `Hero`             | Home      | Tagline is the page `h1`. LCP image at high fetch priority, cropped on mobile.    |
| `Mission`          | Home      | Problem statement as `h2` (display size), then the mission paragraph (justified). |
| `Pillars`          | Home      | Four pillars, 2×2 from `sm`, full-bleed on phones, justified copy, equal height.  |
| `JoinCta`          | Home      | Closing navy band: the motto, "Ready to join?" and **Create your account**.       |
| `AboutStory`       | About     | `h1` pinned beside the three-part story on desktop.                               |
| `ClosingStatement` | About     | Large italic statement on navy.                                                   |
| `PageIntro`        | Community | `h1` and an optional image beside it.                                             |
| `Audiences`        | Community | Ordered list of two cards, colour-coded blue and pink.                            |

### `components/ui` additions

| Component      | Purpose                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------- |
| `Textarea`     | Boxed multi-line field (16px text, border-strong). Used by the Blogs composers.                         |
| `StateMessage` | Centred empty / error panel with an optional action and an optional line `icon` in a square tile.       |
| `Skeleton`     | Shimmering placeholder bar. Pair with an `aria-busy` region and a visually hidden label.                |
| `CategoryDot`  | A category's colour dot (decorative; the name is always beside it). `onFill` adds a paper ring on navy. |

### `components/ui` additions (admin panel, directory, feed search, toasts)

21st.dev was reviewed for the toast, dialog, drawer and select. Nothing was imported: the
native `<dialog>` already gives focus containment, Escape and top-layer stacking, and every
piece needed this system's square, shadow-free look and tokens.

| Component         | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Dialog`          | Modal on the native `<dialog>` (`showModal`): page behind inert (focus trap), Escape and a backdrop click (`lib/useBackdropDismiss.ts`, also used by both composers) ask to close, no page scroll behind it, focus returns to the opener. Reacts only to its own close/cancel events, so a confirmation opened inside a drawer closes alone. `popup` (centred from `sm`) or `drawer` (right edge from `sm`); a bottom sheet on phones. `dismissible={false}` while saving.                                                              |
| `DialogHeader`    | A dialog's heading (its accessible name) and close button.                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `ConfirmDialog`   | "Are you sure?" for consequential actions: plain-words description, a length-checked reason or note (optional, or `required`, with its own `hint`), busy state, failures shown inside so they can be retried. `tone="danger"` for removals and rejections.                                                                                                                                                                                                                                                                              |
| `SelectMenu`      | Single-choice dropdown in the site's style (the browser's own option list can't be themed): underlined like `Input`, options in a square hairline panel with a ✓ on the current one. Select-only combobox pattern: arrows, Home/End, Enter/Space, Escape; outside click closes. Used for the admin filters.                                                                                                                                                                                                                             |
| `Avatar`          | (Moved from `features/blogs`.) Profile photo when there is one, otherwise navy initials on one of five soft brand tints, chosen deterministically from the person's id. `sm` to `xl`. Decorative.                                                                                                                                                                                                                                                                                                                                       |
| `FilterMenu`      | Multi-select filter button ("Filter by category", "Filter by role") with a count of active options: a compact checklist popover from `sm` (whole rows clickable, changes apply at once, Clear in the header; closes on Escape, outside click or Tab away), a bottom sheet with "Show results" on phones.                                                                                                                                                                                                                                |
| `SearchFilterBar` | One bar (hairline box with the site's strong underline, search icon, `FilterMenu` flush inside behind a divider), then removable pills for the active options. The Feed and the member directory both use it, so they look and behave the same.                                                                                                                                                                                                                                                                                         |
| `Select`          | Native `<select>` underlined like `Input`, for long lists (countries, dialling codes): the phone's own picker and type-to-find. Takes `Field`'s control props.                                                                                                                                                                                                                                                                                                                                                                          |
| `LoadMoreButton`  | "Show more" under a paged list (`lib/usePagedList`): keeps its place, shows progress; a failed page becomes "Try again" plus an error toast with a Try again action.                                                                                                                                                                                                                                                                                                                                                                    |
| `ToastProvider`   | (`Toaster.tsx`, mounted in `App`.) Toasts from `useToast()` (`toast.ts`): success, error, info, warning; optional title and one action; auto-dismiss with a shrinking bar, paused on hover or focus; Escape or ✕ dismisses; at most 3 on screen, the rest queue. Top centre on phones, top right from `sm`, under the header. Announced through always-present live regions (`role="status"`, errors `role="alert"`). Enter/exit motion is off under reduced motion. Use it for transient feedback; keep persistent form errors inline. |

Toasts are used for: signing in ("Welcome back", or "waiting for approval" for a pending
account), signing out, **Check again** on a pending account (approved, or still waiting),
publishing a blog, starting a Query Blog, removing a blog, comment, query or Query Blog
(success and failure), approving or rejecting an application, news about one's own
application, sending a reapplication, copying the referral code, and a failed "Show more" on
any paged list (with Try again). Form validation and load errors of whole views stay inline.

**Data loading (`lib/queryCache.ts`).** One cache and one freshness rule for everything read
from the API (stale-while-revalidate): a view loads its data every time it mounts; if the data
is cached it is shown at once and replaced in place when the fresh copy arrives (no blank
flash, no scroll jump); every key on screen loads again when the tab becomes visible, regains
focus or comes back online. Actions update the cached copies directly (a posted comment, a
removed blog), and a load that started before such a change is discarded and re-run. The cache
is cleared when the signed-in user changes. Hooks: `useQuery(key, loader)` for one value,
`usePagedList(key, fetchPage, { pageSize })` for cursor lists (a refresh refetches as many
items as are on screen; new filters are a new key, and the previous rows stay, dimmed, until
the first page arrives), `useQueryData` to read a value something else loads. The signed-in
profile follows the same rule through `AuthProvider` (`refresh()` on page entry, `onRevalidate`).
Other shared hooks: `useDebouncedValue`. `lib/clipboard.ts` copies text (Clipboard API, with a
hidden-textarea fallback).

### `features/blogs` (Blogs section)

21st.dev was reviewed for the feed card, segmented tabs and comment thread. Nothing was
imported: each piece needed this design system's tokens, square shapes and specific ARIA
behaviour, so building it was smaller and more consistent than adapting an import.

```
features/blogs/
  model/      types (Blog, Comment, QueryBlog, User), validation
  api/        BlogsApi contract + httpBlogsApi (maps API responses to the model)
  lib/        comment tree (prunes removed leaves), relative time, text helpers, URL builders
  state/      hooks over lib/queryCache (useFeed, useBlog, useThread, ...) and viewer helpers
  components/ feed/, article/, comments/, composer/, query/, shared/
```

| Component                                | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BlogsLayout`                            | From `xl` (1280px): three columns in a container wider than the navbar's (`max-w-blogs`, 1488px, 24px page padding), `HowBlogsWork`, the page (up to 760px, centred), `QueryBlogPanel`, 28px apart; both side columns are equal, 282px at 1280 growing to 312px from about 1420px. `lg` to `xl`: inside the navbar's edges, the page beside a 280px column with the Query Blogs and `HowBlogsWork` under them. Below `lg`: the page only (phones get the Query Blogs tab). A `header` (page heading, back link) sits above the centre column only; the side columns start below it, level with the search row, sticky 88px from the top, with a thin scrollbar only if they overflow. Each panel is rendered once. Preloads the sibling Blogs pages. |
| `BlogFeed`                               | Rectangular search box and "Write a blog" button (both 48px, from `lg`), `CategoryChips`, then separate `BlogCard`s 20px apart. IntersectionObserver infinite scroll, skeleton cards, end marker, designed empty and no-results states. The first six cards fade up in turn on the first visit (motion allowed).                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `SegmentedTabs`                          | Mobile "Feed / Query Blogs" ARIA tabs styled as a square segmented control, with roving tabindex and a sliding indicator. The tab is kept in the URL (`?tab=queries`) so Back restores it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `QueryBlogPanel`, `QueryBlogCard`/`List` | "Query Blogs": a square, bordered panel (just the heading; `HowBlogsWork` explains them) of Query Blog rows: category dot, 18px 600-weight balanced title, two-line description, query count and last activity; paper shade on hover; the open one is shaded, ruled in navy and marked "Viewing". Empty, error and loading states; `StartQueryBlog` (a full-width `subtle` button) at the foot for admins.                                                                                                                                                                                                                                                                                                                                           |
| `StartQueryBlog`                         | "Start a Query Blog" button plus `QueryBlogComposer` dialog. Admins only, and only while a category has none. The title starts as "Official Query Blog - " and takes the chosen category's name (until the admin types their own).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `CategoryChoice`                         | Category chips with colour dots for both composers: checkboxes (blogs, any number) or radios (Query Blogs). Loading, error and retry. Selected chips keep their colours on hover.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `BlogComposer`                           | Native modal `<dialog>`: full-screen sheet on phones, wide panel from `sm`. Title, category chips, and a formatting editor. Draft saved in this browser per member (survives reloads), "Draft saved" status, word count and read time, Ctrl/⌘+Enter publishes, server field errors shown on the fields.                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `RichTextEditor`                         | TipTap editor, lazy-loaded with the composer. ARIA toolbar (one Tab stop, arrow keys): bold, italic, underline, strikethrough, H2, H3, bulleted and numbered lists, quote, link (http/https only), undo, redo. Shortcuts in each button's tooltip.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `RichText`                               | Renders a stored blog document as React elements (never HTML). Links open in a new tab with `rel="noopener noreferrer nofollow ugc"`. Shares `.rich-text` styles (styles/index.css) with the editor.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `CommentsSection`                        | Heading, composer, threaded list, empty/error/loading states, and the focused "continue thread" view (`?thread=<id>`). Moves focus to anything just posted and announces it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `CommentItem`                            | Recursive comment. Thread line down from the avatar (a button: collapses the branch to an "N replies" pill), square elbow connectors, "Replying to" label, "Author" tag, inline reply composer. Indentation caps at 3 levels (2 below `sm`); deeper replies are listed flat at the last level with "Continue this thread". First 2 replies per list, then "View N more replies".                                                                                                                                                                                                                                                                                                                                                                     |
| `BackLink`                               | Behaves like browser Back inside the app (keeps feed tab and scroll); a normal link on direct visits.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `WriteBlogEntry`                         | (`WriteBlogButtons.tsx`) "Write a blog" as a square navy button (beside the search box, and in the empty feed) or a floating button on phones. Approved members open the composer; visitors go to sign in and come back; accounts awaiting approval get a disabled button that explains why.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `BlogCard`                               | (`feed/`) A square, bordered card (no shadow): 28px avatar, name, occupation and time (13px); a 2-line, 600-weight display title; a 2-line excerpt; then the category pill (+N for more) on the left and read time, comment count and a blue arrow on the right. A quiet `BlogThumb` on the right (72px square on phones, 112px, 144px, then 160px wide at 3:2). Stretched title link; hover lifts 2px with a blue border; focus ring on the card. `BlogCardSkeleton` matches it.                                                                                                                                                                                                                                                                    |
| `CategoryChips`                          | (`feed/`) "All" plus a toggle chip per category (`aria-pressed`, any match; "All" clears). Round pills, 36px tall with a 44px touch area. Unselected: white, hairline border, category dot; selected: the category tint with a darker border and semibold text ("All": navy with white text); hover darkens the border. Each label reserves its semibold width, so toggling never changes a chip's size. The styles are one `CHIP` block in the file (it notes how to go back to tinted chips). Always one row: it scrolls sideways, with edges faded in the gutters, when the chips outgrow it.                                                                                                                                                     |
| `BlogThumb`                              | (`shared/`) A blog's thumbnail: `imageUrl` (object-cover) when given (nothing sends one yet), otherwise memoized line art: bridge arches, a deck, faint water and sometimes a sun, in the first category's ink at low contrast on a soft tint, varied by a hash of the blog id. Square, decorative, sized by the caller (no layout shift).                                                                                                                                                                                                                                                                                                                                                                                                           |
| `ShareButton`                            | (`shared/`) A square "Copy link" button in the article's author block: copies the blog's absolute URL (`lib/clipboard.ts`) and toasts "Link copied".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `HowBlogsWork`                           | (`shared/`) Static three-step explainer with plain outlined icons, in the same square panel and heading style as the Query Blogs: the left column from `xl`, under the Query Blogs otherwise.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `BlogArticle`                            | Large bold navy title, author block (avatar, name, occupation, date, read time, "Copy link"), category chips, body in a 38rem column (`max-w-article`, about 65-70 characters) at 18px / 1.75 (`text-reading`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `ReadingProgress`                        | Thin blue→pink bar under the header that fills as the article is read. Decorative; updated per frame without re-rendering.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

## Copy that is not on the reference site

These lines were written for this build. All are easy to change.

- **Pillar lines** (approved).
- **Visually hidden `h2`:** "Our pillars".
- **Meta descriptions for About and Community** are in `client/src/app/routes.ts`.
- **404 page:** "Page not found" / "This bridge doesn't lead anywhere", "The page you were looking
  for isn't here. It may have moved, or the link may be incomplete. Let's get you back on solid
  ground.", "Back to home", "Read the blogs".
- **Missing blog / Query Blog:** "This blog is no longer available" (or Query Blog), "Back to the feed".
- **Admin panel, no access:** "Admins only" / "You don't have access to this page".
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
  validation.ts     referral code helpers (format, shape); other limits are in shared/limits.ts
  paths.ts          auth URLs, safe ?next= handling, post-sign-in destination
  components/       the pieces below
```

| Component          | Purpose                                                                                                                                        |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `AuthShell`        | Page frame for sign-in, sign-up and account: eyebrow, `h1`, intro, blue-ruled card, footer line.                                               |
| `SignInForm`       | Email + password via Supabase. Generic "don't match" error, busy state through profile loading, focus to the first invalid field.              |
| `ReferralCodeStep` | Sign-up step 1. Normalizes the code, checks its shape locally, then asks the API (rate-limited, generic answers).                              |
| `RoleChoice`       | Member / Ambassador radio cards (native radios, sr-only, styled through `peer`).                                                               |
| `CategoryPicker`   | Ambassador categories as checkbox chips with colour dots, one to three (others disable, live count). Loading, error with retry, empty.         |
| `PasswordInput`    | `Input` with a Show/Hide toggle (`aria-pressed`).                                                                                              |
| `AccountSummary`   | Definition list of the account's facts and application answers.                                                                                |
| `TeamMessage`      | The review note, headed "Message from the Blue Bridge team". On the account page (not approved, or approved with a note) and the reapply form. |

Pages: `SignInPage` (`/sign-in`), `SignUpPage` (`/sign-up`: invitation code, then
`ApplicationForm`), `AccountPage` (`/account`, protected; refreshes the profile on entry):
pending → "waiting for approval"; rejected → the team's message and **Reapply**; approved →
welcome, referral code with **Copy**, the team's message if any; suspended → a neutral "isn't
active" message. `ReapplyPage` (`/account/reapply`, protected, rejected accounts only) →
`ApplicationForm` prefilled with the previous answers.

### Membership application (`features/application/`)

Loaded only by the sign-up and reapply pages, so the phone library (libphonenumber-js) stays
out of the first page.

```
features/application/
  types.ts        option sets, the answers on a profile, the input the API takes
  model.ts        the form's draft, per-step validation (shared/limits.ts, shared/profile.ts,
                  shared/phone.ts: the same rules the server applies), prefill from a profile
  api.ts          useProfileOptions() (GET /profile-options), reapply()
  countries.ts    ISO country names (Intl.DisplayNames), sorted
  detailsRows.tsx the answers as definition-list rows (profile panel, admin, own account)
  components/     the pieces below
```

| Component         | Purpose                                                                                                                                                                                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ApplicationForm` | The application in short steps (Your account [sign-up only], About you, Your Jodhpur connection, Education & work, Your journey, Your role): progress bar, "Step N of M" heading focused on each step, Continue checks the step, Back keeps every answer, server field errors jump to their step. |
| `StepFields`      | (`ApplicationSteps.tsx`) The questions of each step, with helper text. Option-set questions show loading and error states.                                                                                                                                                                        |
| `ChoiceGroup`     | One question with fixed answers as full-width rows: checkboxes ("choose all that apply", kept in the options' order) or radios, plus an "Other" text field underneath when chosen.                                                                                                                |
| `PhoneField`      | Dialling-code `Select` + number. Validated with libphonenumber-js, sent as E.164.                                                                                                                                                                                                                 |
| `StepProgress`    | The segmented progress bar (decorative; the heading carries the text).                                                                                                                                                                                                                            |

### Posting permissions in the Blogs section

Composers and "Write a blog" only render for people allowed to post (approved accounts).
Everyone else sees `JoinPrompt` (`features/blogs/components/shared/`): "Sign in to comment"
for visitors, "waiting for approval" for pending accounts. Reply buttons follow the same rules,
and under a query only its asker, an ambassador for the topic, or an admin can reply.

Moderators (an ambassador for any of a blog's categories, or an admin) see **Remove blog**
and **Remove** on comments; only admins see **Remove Query Blog**. All are red
(`dangerTextClasses`) and ask for confirmation in a `ConfirmDialog`; a failed removal stays in
the dialog so it can be retried, and a success is confirmed by a toast. A removed comment
shows "This comment was deleted." (no author, no text, an empty avatar circle) while live
replies still hang from it, and disappears otherwise. The API never sends a removed comment's
text or author.

### Feed search (`features/blogs/components/feed/`)

The search box and `CategoryChips` are part of `BlogFeed`. (`SearchFilterBar` and `FilterMenu` are now used only by the member directory.)

| Component  | Purpose                                                                                                                                                                                                                                                                          |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BlogFeed` | Without search or filter: the cached newest-first feed, as before. With them: live results (`useFeedSearch`), 300 ms after typing stops and from 2 characters, older requests cancelled. Empty state with "Clear filters"; error with retry; old results dim instead of jumping. |

### Members and referrals (`features/members/`, `features/referrals/`)

| Component                     | Purpose                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MemberDirectory`             | Community page section headed "The community": `SearchFilterBar` (name or occupation, filter by role), then Admins, Ambassadors and Members sub-sections with counts, one full-width card per person ("(You)" beside the signed-in member), "Show more", loading/empty/error. Search results stay in their sections. Approved members only; others get `JoinPrompt`. |
| `MemberPanel`, `PanelSection` | The side panel a member opens in (bottom sheet on phones): photo, then role, name and one line under it (occupation, or status for admins), then titled sections. Shared by the community directory and the admin Community Directory.                                                                                                                               |
| `MemberProfilePanel`          | The community directory's panel: profile details (contact, application answers, categories, joined) and the member's blogs and comments. Cached (`lib/queryCache`): shown at once when reopened, refreshed in place.                                                                                                                                                 |
| `RoleSections`                | Groups a members list under Admins, Ambassadors and Members with counts. Used by both directories.                                                                                                                                                                                                                                                                   |
| `ProfileDetails`              | Definition list of a profile: occupation, phone (`tel:`), email (`mailto:`), the application answers (`applicationRows`; unanswered ones are left out), categories, joined. Shared with the admin drawer. Exports `DetailList`.                                                                                                                                      |
| `RoleLabel`, `StatusLabel`    | Role as small spaced capitals in its colour (admin pink, ambassador blue, member grey); status as a small icon and its name in its colour. No boxes: boxed chips are kept for categories.                                                                                                                                                                            |
| `MyReferrals`                 | Account page: "People who joined using your code", with the total, role and status of each, and "Show more".                                                                                                                                                                                                                                                         |
| `ReferralCodeCard`            | Account page: the member's own referral code with **Copy** (clipboard, with a fallback; confirmed by a toast and a ✓, labelled "Copy referral code …").                                                                                                                                                                                                              |
| `ReferralRow`                 | One person who used a code. Shared with the admin drawer.                                                                                                                                                                                                                                                                                                            |

### Admin panel (`features/admin/`, page `pages/AdminPanelPage.tsx`, route `/adminpanel/*`)

Anyone signed in who isn't an approved admin sees "You don't have access to this page"
(`DeadEnd`, with links to their account and home); the API checks every request anyway. Admins reach it from **Go to Admin Panel** on the account page.

| Component               | Purpose                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AdminLayout`           | Title, then a sticky sidebar of sections from `lg`; a sticky, sideways-scrolling tab row below that.                                                                                                                                                                                                                                                                                            |
| `AdminOverview`         | Pending approvals (members, ambassadors) with "Review applications", and quick links.                                                                                                                                                                                                                                                                                                           |
| `AdminMembers`          | The **Community Directory**: everyone of every status, grouped like the community page (admins, ambassadors, members; each by name), status on the right. Search (name or occupation), status (pending, approved, not approved) and role filters, "Show more". Opens `AdminMemberDrawer`.                                                                                                       |
| `AdminMemberDrawer`     | `MemberPanel` with the status under the name; for pending users **Approve** (optional note) and **Reject** (required note), both in `ConfirmDialog`; the whole application and the current note; **Decisions** (every logged approval or rejection with its note, so a reapplication shows its history); blogs and comments (`AuthorActivity`); who invited them; everyone who used their code. |
| `AdminQueryBlogs`       | Query Blogs with **Start a Query Blog** (reuses `QueryBlogComposer`) and **Remove**.                                                                                                                                                                                                                                                                                                            |
| `RemoveQueryBlogDialog` | Says what removal takes with it, takes an optional reason. Also used on the Query Blog page.                                                                                                                                                                                                                                                                                                    |
| `AdminActivityLog`      | The read-only activity log: who did what to which target, why, and when; filter by action; "Show more".                                                                                                                                                                                                                                                                                         |

### Account activity (`features/blogs/components/mine/`)

`AuthorActivity` shows the same blog and comment lists inside a member's profile panel: two
of each at first, then "Show more".

`MyBlogs` and `MyComments`, shown under the Account card for approved members: newest first,
"Show more" paging (`lib/usePagedList.ts`), with loading, empty and error states. Comments
are labelled (Comment, Reply, Query, Reply to a query) and link to their thread
(`?thread=<id>`).
