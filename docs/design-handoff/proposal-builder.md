# Handoff: Proposal Builder (shell, Brief, Spot Management, Billing Installments, Review and Book)

## Overview

This bundle covers the master **Proposal Builder** screen: the navigation shell (collapsible
left rail, hero banner, footer), and the four sections whose markup and logic live directly in
this file: **Brief** (market selection, trading model, demographic audience, survey settings,
exclusions), **Spot Management**, **Billing Installments** and **Review and Book**.
**Sponsorship Setup** is an intentional placeholder in this prototype: no fields, just a
"to be defined" panel.

Two child sections are out of scope here because they already have their own handoff bundles or
remain design references only:

- **Optimisation** is delegated to `Optimiser Inputs.dc.html`, covered by the Optimisation
  handoff bundle in the Claude Design project (not duplicated in this repo). This file only owns
  the tab-lock rule that gates it and the summary card that reads its result back on Review and
  Book.
- The **Stations & Timing** panel embedded in Brief (market/station tree, channel, spot durations,
  dayparts, bursts) is `Stations And Timing.dc.html`, and its Spot Durations / Dayparts / Bursts
  sub-panel is covered by `docs/design-handoff/spot-timing-panel.md`. This file only owns the
  `timingErrors()` gate that reads that panel's output and blocks navigation.
- `Campaign Plan Header.dc.html` (advertiser, campaign, agreement, flight, budget) is imported at
  the top of every tab. It is not included in this bundle; treat its fields as already defined
  and out of scope, referenced here only as `plan.*`.

The purpose of this handoff is to design the **Salesforce Lightning Web Component structure and
Apex-backed data model** for the shell and the four in-scope sections: an orchestrating LWC that
owns navigation state and booking readiness, plus the child LWCs for Brief, Spot Management and
Billing Installments.

## About the design files

The files here are **design references created in HTML**. `Proposal Builder.dc.html` is a working
prototype: it opens directly in a browser (keep `support.js` beside it) and every control is live.
It is not production code to copy.

Use it as the **authoritative inventory of what state and behaviour exists on the screen**. When in
doubt about what a field means, what triggers a tab lock, or what a validation message says exactly,
run the file and interact with the control, or search the script for the field name.

## Fidelity

High-fidelity for behaviour, state and validation logic. Visual styling is Salesforce-Lightning-
flavoured placeholder chrome (inline styles approximating SLDS tokens) and is not the target
design language: use the org's SLDS components and design tokens, not the pixel values below,
except where noted as final.

Two areas are explicitly **not** production-ready and should be treated as scope markers rather
than specifications:

- **Sponsorship Setup** is an empty placeholder panel. It has no fields, no state, and no
  validation. Confirm scope for this trading model with the business before estimating it.
- The **AI agent panel** ("Nino") is UI-only: a static conversation bubble, three disabled file
  drop zones (BRQ, PDF, XLS) and a disabled send button. No parsing, no messages and no backend
  call exist. Treat it as out of scope for this handoff unless the business confirms otherwise.

## Files

| File | What it is |
| --- | --- |
| `Proposal Builder.dc.html` | The whole Proposal Builder screen: shell, Brief, Spot Management, Billing Installments, Sponsorship placeholder, Review and Book. Template above the `<script>` tag, logic class (`class Component extends DCLogic`) below it. |
| `support.js` | Runtime needed to open the HTML file locally. Not part of the design. |

Key locations inside `Proposal Builder.dc.html`:

- `state = {...}` (top of `Component`): the full state object with defaults. Everything the
  screen can hold, across every tab.
- `avail()`: which tabs are open right now, and the rules that gate them. This is the single
  source of truth for the navigation guard.
- `lockReason(id)`: the message shown when a locked tab is clicked or hovered.
- `baseErrors()` / `timingErrors()` / `briefErrors()`: Brief-tab validation. `timingErrors()`
  reads fields owned by the Stations & Timing panel (`state.inputs.*`), so it is the integration
  point between this shell and that child component.
- `readiness()`: the Booking Readiness checklist shown on Review and Book, including the credit
  check and prepaid invoice flow.
- `bookBlockers()`: the hard blockers that disable the Book campaign button.
- `spotsView()` and `billingView()`: the two largest computed view-models, each returning
  everything the Spot Management and Billing Installments tabs render. They are spread into the
  main `renderVals()` return with `...this.spotsView()` and `...this.billingView()`.
- `SPOTS`, `BIS` and their lookup tables (`STATION_OF`, `GROUP_OF`, `PROG_LEN`, `AVAIL_OVERRIDE`,
  `BI_STATUS_STYLE`, `BI_TARGETS`, `GOAL_TARGETS`): fixture data standing in for what a real org
  would source from the avails engine, the optimiser and prior billing records.

## Screen map

A fixed header and a nav bar (both out of scope: standard Salesforce chrome) sit above the
Proposal Builder itself, which is:

- A **collapsible left rail** (`railStyle`, toggled by `onRailToggle`; 196px open, 52px collapsed)
  listing six sections in a fixed order: **Brief, Optimisation, Spot Management, Billing
  Installments, Sponsorship Setup, Review and Book**. Above the list, a dashed "Ask Nino"
  entry opens the AI agent panel.
- A **hero banner** per tab (title + one-line description from `BANNERS[tab]`), hidden on
  Optimisation (that child component supplies its own header).
- The **tab content** itself (see sections below).
- A **fixed footer** with "Back to Media Plan" (`onSaveClose`) and a tab-specific primary action,
  hidden on Optimisation.
- The **AI agent panel**, a fixed-position overlay opened from the rail (placeholder, see Fidelity).

### Navigation rail and tab locking

Each rail item (`railItem(id, label)`) is one of: open and selected, open and not selected, or
locked. A locked item is not clickable; hovering shows `lockReason(id)` as a tooltip. A green dot
badge marks a tab that is "done" (`stepDone(id)`) once it is not the active tab.

`avail()` is the single gate:

| Tab | Open when |
| --- | --- |
| Brief | Always. |
| Optimisation | A demographic is set **and** there are no `timingErrors()`. |
| Spot Management | Demographic set, no timing errors, **and** Fixed is a selected trading model. |
| Billing Installments | Dynamic is a selected trading model **and** an optimiser run has been accepted (`opt.accepted`). |
| Sponsorship Setup | Demographic set **and** Sponsorship and premium is the selected trading model. |
| Review and Book | Always. |

`lockReason(id)` produces the exact tooltip and error-summary text: it prioritises the first
timing error, then falls back to "Set a demographic on Brief..." or "Select the Fixed/Dynamic/
Sponsorship trading model on Brief." messages per tab.

`go(id)` is how every navigation action in the app (rail clicks, Review and Book "Edit" links,
footer Previous/Next) attempts a tab change. If the target is locked it instead sets
`showErrors: true` and forces the tab back to Brief, which reveals the error summary banner
(`errorSummaryStyle`) with the full `briefErrors()` list. **This is the pattern to preserve**:
clicking anywhere that promises another tab either goes there or explains why not, never a
silent no-op.

`stepDone(id)` (used for the rail's green dot) is deliberately narrower than "valid":
- Brief: no `briefErrors()`.
- Optimisation: any run has been shown (not necessarily accepted).
- Spot Management: at least one non-cancelled, non-merged spot is on the proposal.
- Review: the proposal has been booked.
- Billing and Sponsorship are never marked done (no rule defined in the prototype: worth deciding
  for the real build rather than assuming "never").

## Section 1: Brief

Everything from the Campaign Plan Header down to Exclusions lives on this tab. Layout is a
single-column stack of cards, `max-width: 1640px`, centred, `gap: 16px`.

### Market Selection

A collapsible card (`mktOpen`, default open). Three segmented buttons: **Metro**, **Regional**,
**National**. Exactly one is selected at a time (`markets: ['regional']` by default); National is
present but disabled ("not available yet"). Switching away from Regional resets the sub-market
survey year to 2026. This selection drives `isRegional()`, which in turn switches which survey
block (Metro vs. Sub Markets) is shown and which market names the exclusion/optimiser scoping
uses (`BRIEF_MARKET` lookup).

### Trading Model

A required field (red asterisk), rendered as three large selectable tiles: **Dynamic** (CPM
trading), **Fixed** (Handheld trading), **Sponsorship and premium**. Multiple selection is
allowed **except** Sponsorship, which is exclusive: picking it clears Dynamic/Fixed and vice
versa (see `tile(id).onClick`). Selecting Sponsorship also forces the survey type back to
9Predict (VOZ requires Fixed-only). An amber "Selected Model" strip below the tiles echoes the
combination in plain language (`modelNote`), for example "Hybrid buy. Optimisation is required,
and both Spot Management and Billing Installments apply." This combination is the primary driver
of which later tabs unlock (see the `avail()` table above) and it is worth a dedicated business
rule table in the design doc rather than re-deriving it from the prototype code at build time.

### Demographic Audience

A single required `<select>` (`demo`), five fixed options (P25-54, W25-54, M18-39, Grocery
Buyers 25-54, All People) plus an empty placeholder. This one field gates Optimisation, Spot
Management and Sponsorship (see `avail()`); it should be modelled as a genuinely required field
with its own validation state, not folded into a generic "form is dirty" flag.

### Survey Settings

Not marked required in the UI, but `readiness()` treats "no survey selected" as a booking
blocker.

- **Survey Type**: 9Predict / VOZ segmented control. VOZ is disabled unless Fixed is the only
  selected trading model (`fixedOnly()`); the note "VOZ needs Fixed to be the only trading model
  selected" is always rendered but only meaningfully constrains the control while VOZ is
  unavailable.
- **Ratings Type**: Consolidated / Live segmented control, independent of survey type.
- When Survey Type is VOZ, two survey-selection cards appear side by side (Metro & Agg for
  metro, Sub Markets + Solus markets for regional), each with:
  - a Survey Calendar Year segmented control (2023 to 2026),
  - an interval control (Metro only: 1 Week / 4 Week / Common),
  - a badge plus either a read-only "latest survey" line (year 2026, computed by
    `surveyText()`) or a manual `<select>` of prior surveys (`surveyOpts()`, canned strings per
    year and interval; a real build needs this backed by an actual survey calendar).
  - The Solus markets block (regional only) is display-only fixture data: "Week 27, 2026
    (Latest), 28 Jun - 04 Jul 2026".
- `surveyPills()` / `surveySelected()` produce the plain-language summary used elsewhere (Review
  and Book, Brief Details); the phrasing differs for 9Predict ("9Predict, Consolidated ratings")
  versus VOZ regional (three lines: sub-market survey, Solus markets, ratings) versus VOZ metro
  (two lines).

### Exclusions

A collapsible card (`exclOpen`, default open) with two modes: a **read view** (default,
`exclEditing: false`) showing a two-column table of active exclusions (Program / Program Group /
Day of Week rows) plus a table of exclusion periods, and an **edit view** unlocked by the Edit
button, which reverts to Save on click (there is no cancel: edits apply immediately to state,
"Edit"/"Save" only toggles which view is shown).

In edit mode:
- **Programs** and **Program groups**: each an "Add a ..." `<select>` of remaining options plus
  removable pills for the current selection. Backed by fixture lists `PROGRAMS` (8 programs) and
  `GROUPS` (5 groups).
- **Days of the week**: seven toggle pills.
- **Update Defaults**: saves the current programs/groups/days as the account default
  (`state.defaults`); disabled when the current selection already matches the default
  (`defaultsMatch`). There is no per-user vs. per-account distinction modelled: this is a single
  flat default the design should place correctly in the data model (likely a user or profile
  setting, not proposal-scoped).
- **Exclusion Periods**: an independent, unbounded list (`state.periods`), each with:
  - a scope toggle, Entire Campaign vs. Specific Week (week uses the campaign's actual week list,
    computed by `weeks()` from `plan.startDate`/`plan.endDate`),
  - a day-of-week multi-select plus an "Every day" shortcut,
  - start/end time inputs.
  - Validation (feeding `timingErrors()`): a week-scoped period needs a week; every period needs
    at least one day and both times, or it produces a named error ("Exclusion period 2 needs...").

Exclusions (both the flat program/group/day rule and any exclusion period) apply downstream in
Spot Management: `spotExcluded(r)` checks a spot's program, group, day and time window against
both structures and returns a reason string used to grey out and flag the row.

## Section 2: Spot Management

Visible only once Fixed is a selected trading model. Three stacked cards: **Search Criteria**,
**Available Spots**, **Included in Proposal**. There is no persisted "Goal tracking" strip on this
tab in the current template (the equivalent tracking lives on Billing Installments instead,
against optimiser goals); `spotsView()` does compute `goalTiles`/`goalStats` against
`GOAL_TARGETS`, but nothing in the template currently renders them on this tab, worth confirming
with the business whether that is an oversight or an earlier feature that moved.

### Search Criteria (collapsible, `scOpen`)

A grid of independent filter controls, all local (`state.sc`) until "Check availability" commits
them to `state.applied`, which is what `filteredSpots()` actually reads:

- **Station / channel** (required): a popover grid, one row per market (`MC_MARKETS`: Northern
  NSW, Southern NSW, Regional QLD, Regional VIC) times one column per channel (`ALL_SPOT_CHANNELS`:
  Nine, 9Gem, 9Go!, 9Life), plus a Select All / row / column header shortcuts. Selected
  combinations render as removable pills.
- **Break** and **Spot type**: plain add-one-at-a-time selects with pills (`SPOT_BREAKS`,
  `SPOT_TYPES`, the latter a 13-value fixed list including bonus/rebook/community-service types).
- **Week commencing**: a prev/next stepper over a small fixed week list (`SC_WEEKS`), plus a
  direct select.
- **Programs**: a popover with quick-select chips (`PG_QUICK`, 5 programs), a program-group
  bulk-add select, and a searchable checklist of all programs derived from the spot data.
- **Dayparts** and **Spot durations**: popovers combining standard values (`SC_DAYPARTS`,
  `SC_DURATIONS`) with any custom dayparts/durations defined on the Brief's Stations & Timing
  panel (`state.inputs.ranges`, `state.inputs.customDurations`).
- **Top/tail durations**: three numeric inputs (top/mid/tail, digits only) plus an Add button,
  producing a chip like "Top/Tail 10s/5s"; matched against spots by combined duration.
- **Days**: seven toggle chips plus All / weekend / weekday presets.
- **Reset** clears every filter and the applied snapshot; **Check availability** commits
  `state.sc` into `state.applied` (this is what makes the button highlight blue: `scDirty`,
  a same-value comparison between the live filters and the last applied set).

Independently of the applied filters, spots are always narrowed first by whatever the Brief tab
set for market/channel/daypart/duration (`briefSets()`, reading `state.inputs`) and by whether
`hideExcl` is set to hide excluded spots (`filteredSpots()`, `spotExcluded()`).

### Available Spots

A sortable, paginated (8 rows/page) table over `SPOTS`, a 18-row fixture dataset with realistic
TV scheduling fields (program, day/date/time, channel, daypart, market, spot type, duration, rate,
TARPs, availability). Columns: Program, Day, Date, Week Comm., Time, Channel, Daypart, Market,
Spot Type, Dur, Rate, TARPs, Availability. Availability values are Available / Limited / Held /
Sold out (colour-coded, `AVAIL_COLOUR`), each with a remaining-count sub-line. Sold-out and
excluded rows cannot be selected; excluded rows show why (from `spotExcluded()`) and are visually
flagged and faded. A search box filters by program name. Selected rows show a running total
(cost, TARPs) and an "Add to Proposal" button.

**Add to Proposal** (`addToProposal()`) is not a pure append: it re-checks availability at the
moment of adding and can partially fail:
- A **Limited** spot with `availCount <= 1` fails the re-check entirely (not added).
- Two spots for the **same program and date** where either is shorter than 45 seconds are treated
  as double-spotting and blocked.
- A **Held** spot is added but flagged as "went through as a request" rather than a firm booking.
- The resulting message (`spotMsg`) is multi-part and additive: it can simultaneously report
  spots added, some sitting on hold, and some blocked, in one line. This "partial success with an
  itemised outcome message" pattern recurs in Billing Installments too and should be a shared
  interaction pattern in the design, not three bespoke banners.

### Included in Proposal

Shows everything added from Spot Management (across all tabs, i.e. this reads the whole
proposal, not just what was added this session). A ribbon above the table supports bulk actions
on selected rows: **Merge** (two or more spots, same program and date, into one combined-length
row with summed duration/TARPs), **Split** (one spot of 30 seconds or more, into two half-length
rows), **Cancel spot**, **Restore** (cancelled or merged rows only), **Remove from proposal**
(returns the spot to the avails pool entirely). A duration override select applies a new length
to the selection directly. Edits are staged in `propPending` and require an explicit **Save**;
**Discard** clears pending edits. Booked spots (status `Booked`) are locked: their checkbox and
Remove action are disabled with an explanatory tooltip. Merged child rows show "Merged into the
{time} spot" and cannot be individually selected. A split row renders as N sub-rows with an even
share of duration/rate/TARPs and a "Split 1 of 2" note.

## Section 3: Billing Installments

Visible only when Dynamic is selected **and** an optimiser run has been accepted. Three stacked
cards.

### Optimiser goal tracking

A read-only strip: four goal tiles (Dynamic value committed, Total audience, Peak/Off-peak split,
Installments committed) each with a progress bar against a fixed target (`BI_TARGETS`), plus five
supporting stats (Avg CPM, Weeks covered, Expiring in 12h, Expired, Flight). A link opens the
optimiser run this billing plan is based on.

### Draft Billing Installments

A filterable (Market / Channel / Daypart / Duration / Week / Source / Status, applied via an
explicit **Retrieve** button, same "dirty until applied" pattern as Spot Management's Search
Criteria), sortable, paginated (8 rows/page) table over `BIS`, a 16-row fixture dataset of
market/station/channel/week/daypart/duration/audience/price rows, each with a `source` (Optimiser,
Manual or BRQ) and a `status` (Draft, Proposed, Booked, Expired, Cancelled, Rejected).

Two mechanics are specific to this table and need explicit design decisions:

- **Overrides, not row mutation.** Selecting rows and choosing a new duration or a target
  adjustment (±5%/±10%) does not change the row: it stages a `biPending[id]` patch that
  recomputes audience and price proportionally (`biEff()`), shown highlighted in the table until
  **Save** commits it or **Discard** clears it. "New BI" (manually created) and "Re-run
  optimisation" (jumps to the Optimisation tab) sit in the same header.
- **Ageing and expiry.** Every installment has an `agedH` (hours since creation) and effectively
  expires 48 hours after creation if still Draft or Proposed (`left = 48 - agedH`; the
  displayed status flips to "Expired" once `left <= 0`, and the Expires column shows a coloured
  countdown). This is currently a **client-side derived clock with no real timestamps**: the real
  build needs an actual creation timestamp and either a scheduled job or a computed formula field
  to expire installments, not a value recomputed from a static fixture on every render.

A **History** ribbon action (exactly one row selected) opens a small log panel; in the prototype
this is three hardcoded lines, not real audit data. The design should specify what a real audit
trail captures (status changes, who, when) and where it is stored.

### Included in Proposal (committed installments)

Shows every installment that has been committed (status: Proposed, Booked, Cancelled or
Rejected). Its own ribbon supports Cancel BI, Move to Draft (only for Cancelled / Rejected /
Expired rows), Remove (strips it from the proposal entirely, except Booked rows, which cannot be
removed) and History. Duration/adjustment overrides apply only to rows still in **Proposed**
status. A rejected row shows its rejection reason inline (fixture text mentioning "Rejected by
Commerce"). Booked rows are locked (no checkbox, no edits, no removal).

## Section 4: Sponsorship Setup

Placeholder only: a centred icon, "Sponsorship Setup to be defined", and one line of explanatory
copy. No fields, no state. Confirm actual scope with the business before this is estimated or
designed; do not infer a design from the Trading Model tile copy alone.

## Section 5: Review and Book

- **Export row**: three buttons (PRP, SCH, PDF) that currently only set a toast state; no real
  export is wired up.
- **Booking Readiness**: a 3-column grid of check items from `readiness()`, each a tick/cross
  mark, a label, a note and an optional inline fix action:
  1. Active Client Product linked (read-only, "Add" goes to Brief; Brief itself has no field for
     this, so the fix action is a dead end in the prototype: the real build needs either a real
     field or a different fix target).
  2. Approved Agreement applied (same caveat as above).
  3. **Prepaid invoice generated**, shown only when `payTerms === 'prepaid'` and no invoice has
     been generated yet; its "Generate Invoice" action is a strong (filled) button and simply
     flips a boolean. This item and the next are mutually exclusive positions in the same slot.
  4. **Credit check conducted and confirmed** (shown once payment terms are not prepaid, or a
     prepaid invoice already exists): `runCreditCheck()` simulates an async check with a
     900ms timeout that always succeeds. The real build needs an actual Credit Control
     integration (synchronous or async with a polling/notification pattern), including a
     realistic failure path that the prototype does not model at all.
  5. Advertiser Setup Complete: read-only, driven by the `advertiserActive` prop (a design-time
     toggle in this prototype, not campaign data).
  6. Required Fields Set: demographic and survey both set.
  7. **Optimiser result accepted** (Dynamic only) and/or **At least one spot selected** (Fixed
     only) are appended conditionally.
- **Brief Details** and **Exclusions** summary cards (read-only mirrors of Brief, each with an
  Edit link back to Brief).
- **Optimisation** summary card: empty state, or the accepted run's goal, note, reference and
  metrics.
- **Billing Installments** summary (Dynamic only) and **Selected Spots** summary (Fixed only),
  each collapsible, mirroring their respective tabs.
- **Book campaign**: disabled while any `bookBlockers()` exist (every failing readiness item, plus
  the same start date / end date / budget / trading-model checks as `baseErrors()`). Booking is
  simple in the prototype: it flips `booked = true` and marks every proposal-linked spot and
  installment as `Booked`. It does not distinguish "commit" from "book" as two separate steps, and
  it is irreversible in the UI (no unbook action): confirm both of those are correct for
  production before building it that way.

## Cross-cutting behaviour

### The footer and Previous/Next

`prevNav`/`nextNav` walk the fixed `TABS` order (Brief, Optimisation, Spot Management, Billing
Installments, Sponsorship Setup, Review and Book), regardless of which tabs are actually relevant
to the current trading model combination. A user on an all-Fixed campaign still sees "Billing
Installments" as the nominal next step and gets the standard lock tooltip if they try to go there.
Decide whether the real navigation should skip tabs that can never apply to the current model
combination, or keep showing them as locked for consistency.

### Error surfacing

There is exactly one error banner (`errorSummaryStyle`), and it only ever shows on the Brief tab,
triggered by `showErrors`. Every blocked-navigation attempt anywhere in the app funnels the user
back to Brief with that flag set. There is no per-field inline error styling beyond the
demographic select's red border and the trading-model tiles' red border when `showErrors` is set
and nothing is selected.

### The AI agent panel ("Nino")

A fixed-position overlay (360px wide, docked to the right of the rail) opened from the rail's
dashed "Ask Nino" button. Entirely non-functional: a static message bubble, an amber "placeholder"
pill, three disabled file-drop labels (BRQ / PDF / XLS) that only capture the file name
client-side, and a disabled message input and Send button. Out of scope for this handoff; call
this out explicitly if it appears in any story or estimate derived from this bundle.

## State management

All state is local to this one component (`class Component extends DCLogic`); there is no prop
passed in from a parent beyond `startTab` and `advertiserActive`. Grouped by area:

| Area | Keys |
| --- | --- |
| Navigation | `tab`, `railOpen`, `showErrors`, `agentOpen` |
| Brief: plan | `plan` (advertiser, campaignName, clientProduct, agreement, classification, billingAgency, agency, salesRep, contactName, startDate, endDate, budget) |
| Brief: core | `demo`, `markets`, `models`, `mktOpen` |
| Brief: survey | `survey` (type, ratings, metroYear, metroInterval, subYear, metroPick, subPick) |
| Brief: exclusions | `exclOpen`, `exclEditing`, `excl` (programs, groups, days), `defaults`, `periods` |
| Brief: timing (shared with Stations & Timing) | `inputs` (dayparts, ranges, and whatever else that child component writes back: durations, treeSel, bursts, topTail, etc., merged via `onInputsChange`) |
| Optimisation summary | `opt` (ran, shownRun, accepted, running, goal, note, when, by, metrics) |
| Booking readiness | `credit` (status, checked, expires), `payTerms`, `prepaidInvoice` |
| Billing Installments | `instOpen`, `bis`, `biSel`, `biPending`, six `bi*` filter fields, `biApplied`, `biPage`, `biSort`, `biDurEdit`, `biAdjEdit`, `biMsg`, `biHist`, `biSeq` |
| Spot Management: search | `sc` (mc, programs, dayparts, durs, tt, breaks, types, days, week), `scPop`, `ttTop`/`ttMid`/`ttTail`, `pgSearch`, `scOpen`, `applied`, `appliedKey` |
| Spot Management: results | `spotMarket`/`spotChannel`/`spotDaypart`/`spotDur`/`spotWeek`/`spotType`/`spotQ` (declared but largely superseded by `sc`/`applied`), `hideExcl`, `spotSort`, `spotPage`, `spotSel`, `spotMsg`, `spotListOpen` |
| Spot Management: proposal | `proposal` (id → status), `propSource`, `propSel`, `propPending`, `propSaved`, `durEdit` |
| Terminal | `booked`, `brqFile`, `toast` |

Everything is mutated through two helpers: `set(k, v)` for a single top-level key, and
`mutate(fn)` for a deep-clone-then-edit pattern (`JSON.parse(JSON.stringify(state))`) used for
anything nested. There is no undo history and no autosave: "Save" buttons on Spot Management and
Billing Installments only commit **pending overlay edits** into the working state, they do not
persist to a backend (there is none in this prototype).

## Props into the two delegated children

| dc-import | Props passed from this shell |
| --- | --- |
| `Stations And Timing` (Brief tab) | `inputs`, `on-change` → `onInputsChange` (merges the child's full output back into `state.inputs`), `regional` → `isRegional()`, `dynamic` → `has('dynamic')`, `fixed-only` → `isFixedOnly` (Fixed selected and neither Dynamic nor Sponsorship), `plan-start`/`plan-end` → `plan.startDate`/`plan.endDate` |
| `Optimiser Inputs` (Optimisation tab) | `excluded-days` → `excl.days`, `plan`, `inputs`, `on-inputs-change`, `on-plan-change`, `advertiser`, `campaign-name`, `demographic` → `demo`, `dynamic-campaign`/`fixed-campaign`, `is-regional`, `survey-type`, `on-state` → `onOptState` (writes the summary shown on Billing Installments and Review and Book), `on-save-close` |

`onInputsChange` is a straight merge, not a diff: the child owns the full shape of `state.inputs`
and this shell just stores whatever it is handed back. Any Salesforce data model design should
decide explicitly which fields in that shared object are owned by which LWC and how they combine
into one persisted record, mirroring the same open question already raised for the `INPUT_KEYS`
fields in the Optimisation handoff bundle in the Claude Design project (not duplicated in this
repo).

## Design Tokens

Colours (as used in the HTML; map to SLDS equivalents where they exist):

| Value | Role |
| --- | --- |
| `#0176D3` | Brand blue: selected states, links, primary buttons |
| `#032D60` | Hero gradient end, selected pill text on light backgrounds |
| `#181818` | Primary text |
| `#444444` | Label text |
| `#747474` / `#939393` | Secondary text, placeholders, disabled text |
| `#C9C9C9` | Input borders, unselected chip borders |
| `#E5E5E5` | Card and divider borders |
| `#F3F3F3` / `#FAFAF9` | Card header fill, zebra-row fill |
| `#BA0517` | Error text, error borders |
| `#FEF1F1` / `#F5CDCD` | Error banner fill / border |
| `#2E844A` / `#EBF7EE` | Success text / success fill |
| `#A86403` / `#FFF8E6` | Warning text / warning fill |
| `#5A1BA9` / `#F4EFFF` | "Optimiser" source pill |

Spacing used: 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 32px. Radii: 4px (inputs, small
buttons), 6px (info blocks), 8px (cards), 999px/15px (pills). Type scale: 10 to 19px, weights 400,
600, 700. Standard control height: 28 to 36px depending on density (compact filter rows use 28px,
primary form controls use 32px, primary/secondary footer buttons use 36px).

## Assets

No images. Icons are inline SVG (outline style, `stroke` not `fill`, 1.5 to 2.5px stroke width).
Glyphs used as text: `✓`, `✗`, `×`, `‹`, `›`, `*`.

## Salesforce implementation notes

What the solution design should cover:

**Component boundaries.** This shell is a strong candidate for one orchestrating LWC (rail,
banner, footer, navigation guard, booking readiness) composing separate child LWCs per tab:
`proposalBrief`, `proposalSpotManagement`, `proposalBillingInstallments`, and the two already
scoped children (`stationsAndTiming`, `optimiserInputs`). Sponsorship Setup can be stubbed until
its design exists. Keep the parent thin: it should hold navigation state and the cross-tab
computed gates (`avail()`, `readiness()`, `bookBlockers()`), and let each child own its own
detailed state, the same separation the prototype already has via `spotsView()`/`billingView()`
versus the top-level `renderVals()`.

**Navigation guard contract.** Every child that can block navigation (Brief via `timingErrors()`,
implicitly Spot Management and Billing Installments if they gain their own validation) should
expose a consistent `@api validate()` returning an issue list, exactly as recommended in
`docs/design-handoff/spot-timing-panel.md`. The parent's `avail()`/`lockReason()`/`go()` pattern (try
to navigate, get told why not, land back on the tab that needs attention) is the contract to
preserve: it is the one piece of this prototype most worth keeping unchanged in the real build.

**Data model.** At minimum, child objects of the Proposal/Media Plan record for:
- Trading model selection and demographic (likely fields on the proposal itself, small enough not
  to need their own object).
- Exclusion rules (programs, program groups, days) and exclusion periods, each 0..n per proposal;
  note the separate "account defaults" concept (`state.defaults`), which is not proposal-scoped
  and needs its own home (user, profile or account setting).
- Billing installments as a child object with status (Draft, Proposed, Booked, Expired, Cancelled,
  Rejected), source (Optimiser, Manual, BRQ), and a real creation timestamp so expiry is a formula
  or scheduled job, not a client-computed hours-since-render value.
- Proposal spots as a child object with status (Proposed, Booked, Cancelled, Merged) and enough
  structure to represent a merge (parent/child spot linkage) and a split (one logical spot booked
  as two records, or one record with a split-count field): decide which before building, since it
  changes the reporting model.

**Validation placement.** As with the Stations & Timing handoff, decide what runs client-side for
immediate feedback (duplicate/double-spotting checks, exclusion checks, timing errors) versus
what must also be enforced server-side so the data cannot be corrupted by API or Flow access
outside this component.

**Async operations.** Three flows are currently faked with `setTimeout` and deserve real
integration design: the credit check (`runCreditCheck()`), the optimiser run (delegated to
`Optimiser Inputs`, out of scope here but its result lands in this shell's `state.opt`), and BRQ
file import (`onBrqFile()`, currently just captures a filename). None of these should be modelled
as synchronous Apex calls if the real systems involved are asynchronous.

**Booking readiness and the readiness/blockers split.** The prototype maintains two overlapping
lists, `readiness()` (informational checklist, shown on Review and Book) and `bookBlockers()`
(what actually disables the Book button). They are not identical: `bookBlockers()` re-derives some
of the same conditions independently rather than purely reusing `readiness()`'s `ok` flags. Decide
in the design whether the real build keeps this as two independently-computed lists or unifies
them into one rule set with two projections (display list vs. boolean gate), since divergence
between the two is a latent bug class in the current prototype.

**Sponsorship Setup and the AI agent panel** are not designed. Do not include them in a Feature
Design or estimate without an explicit scoping conversation with the business first: including a
placeholder's implied scope by inference from surrounding copy risks a materially wrong estimate.

## Running the prototype

Open `Proposal Builder.dc.html` in a browser with `support.js` beside it. The component instance
holds everything in `this.state`, matching the `state = {...}` block at the top of the class.
Use the browser console against the running page to inspect `this.state` on the mounted
component, or search the script by field name (for example `biPending`, `treeSel`) to find where
a given piece of state is read and written.
