# Handoff: Spot Durations, Dayparts and Burst Periods

## Overview

This is one panel from the Proposal Builder's **Stations & Timing** page in a TV/radio media
campaign planning tool. It captures three related sets of campaign timing inputs:

1. **Spot Durations**: which commercial lengths the campaign will book (15s, 30s, etc.), plus an
   optional Top/Tail construction for fixed-only campaigns.
2. **Dayparts**: which standard viewing periods the campaign runs in (Peak, Off-Peak, Mid-Dawn),
   plus optional named custom time periods for fixed-only campaigns.
3. **Burst Periods**: named date ranges within the campaign flight that segment the buy.

The three panels sit together because downstream (the Optimiser and Spot Management) they combine
into the dimensions a media plan is split and optimised across. Their values must be complete and
valid before a planner can navigate away or Save & Close.

The target implementation is a **Salesforce Lightning Web Component** backed by a Salesforce data
model. See "Salesforce implementation notes" at the end for what needs designing.

## About the Design Files

The files in this bundle are **design references created in HTML**: prototypes showing intended
look and behaviour, not production code to copy. The task is to **recreate this design in
Salesforce as an LWC** using SLDS and the org's existing patterns, and to produce a solution design
covering the data model, the validation layer, and where this component sits in the flow.

The HTML uses inline styles that approximate SLDS (Salesforce Lightning Design System) look and
feel. Where a style below maps to an SLDS class or design token, prefer the SLDS token: the intent
is "standard Salesforce", not a bespoke visual language.

## Fidelity

**High-fidelity.** Layout, spacing, colours, states, copy, and validation messages are final and
should be reproduced faithfully in behaviour. Exact pixel values are given below, but where SLDS
has an equivalent primitive (a pill, a combobox, a datepicker, an inline error) use the SLDS
primitive rather than hand-rolling the styles.

## Files in this bundle

| File | What it is |
| --- | --- |
| `Spot Timing Panel.dc.html` | **The primary reference.** A standalone, runnable extract containing only these three sections plus a live navigation-guard readout. Open it in a browser. |
| `Stations And Timing.dc.html` | The full page this panel lives on, for surrounding context (station/channel selection, market picker). Not in scope, provided so the panel's context is clear. |
| `support.js` | Runtime needed to open the two HTML files locally. Not part of the design. |

Open `Spot Timing Panel.dc.html` in a browser. It is self-driving: every control works, and the
box at the bottom shows the live navigation-guard state.

---

## Screen / Panel

### Name
Spot Durations, Dayparts and Bursts

### Purpose
The planner declares the shape of the campaign in time: what lengths of ad, at what times of day,
across which sub-periods of the flight.

### Layout

A single card:

- Card: white fill `#FFFFFF`, 1px border `#E5E5E5`, radius 8px.
- Card header: background `#F3F3F3`, padding `10px 16px`, bottom border 1px `#E5E5E5`, radius
  `8px 8px 0 0`. Title `Spot Durations, Dayparts and Bursts`, 13px / 600 / `#181818`.
- Card body: padding 24px, CSS grid, `grid-template-columns: repeat(auto-fit, minmax(360px, 1fr))`,
  gap 32px, `align-items: start`. On a wide viewport this yields two columns; below ~800px it
  collapses to one.
  - Column 1: **Spot Durations**
  - Column 2: **Dayparts**
  - Full-width row (`grid-column: 1 / -1`), separated by a 1px `#E5E5E5` top border with 20px
    padding above: **Burst Periods**

Section headings (`h4`): 13px / 600 / `#181818`, `margin: 0 0 12px`.

---

### Section 1: Spot Durations

**Top/Tail toggle row** (visible only when the campaign is fixed-only; see Props below).
Flex row, gap 10px, 14px bottom margin:
- A switch: 38x20px track, radius 999px. Off: 1px border `#C9C9C9`, white fill, 14px knob
  `#C9C9C9` at `left: 2px`. On: border and fill `#0176D3`, white knob at `left: 20px`, 150ms
  left transition.
- Label `Enable Top/Tail durations`, 13px / 600 / `#444`.
- Helper `Fixed-only campaigns`, 11px / `#939393`.

**Duration chips.** Flex wrap, gap 8px. Each chip: `padding: 5px 13px`, radius 999px, 12px.
- Unselected: 1px `#C9C9C9`, white fill, `#444` text, weight 400.
- Selected: 1px `#0176D3`, `#0176D3` fill, white text, weight 600.
- Clicking a chip toggles selection. Chips are **not** removed by clicking, only deselected.

Base chip set is always `15s, 30s, 45s, 60s`, in that order. Any duration added from the picker is
appended after them. Any active Top/Tail set appends a chip too (see below).

**Add-duration picker.** A `<select>` styled as a dashed pill: 30px high, 1px dashed `#C9C9C9`,
radius 999px, `padding: 0 12px`, 12px / 600 / `#0176D3`, white fill. First option reads
`+ Add duration`. Its remaining options are the durations not already shown:
`5s, 6s, 7s, 8s, 10s, 20s, 75s, 90s, 120s, 180s`. Choosing one appends it to the chip row **and**
selects it. The select resets to its placeholder after each pick.

**Top/Tail sets** (rendered only when the toggle is on AND the campaign is fixed-only).
A vertical stack, gap 10px, 16px top margin. Each set is a flex-wrap block: `padding: 14px 16px`,
background `#F3F3F3`, radius 4px, gap 16px, containing:
- `Top duration`: required (red `*` prefix, `#BA0517`, weight 700). Numeric text input, 96x32px,
  radius 4px, 1px `#C9C9C9`, 13px. Suffix `sec`, 13px `#747474`. Label 12px `#444`, 4px below.
- `Middle duration`: same input, hidden unless the set has a middle. Not required.
- `Tail duration`: same as Top, required.
- Action links, 11px / 700 / `#0176D3`, 14px apart:
  - `+ Add middle duration` / `Remove middle duration` (toggles the middle field; adding seeds it
    with `5`, removing clears it).
  - `Remove set` (11px / 700 / `#747474`): hidden when only one set exists.
- A full-width status line below the fields.

**Top/Tail validation.** The set's durations must sum to a bookable duration. Bookable durations
are: `5, 6, 7, 8, 10, 15, 20, 30, 45, 60, 75, 90, 120, 180` seconds. The sum is top + tail, plus
middle when present.
- Valid: status line 11.5px `#747474`, reads `Totals 15s.`
- Invalid: all three inputs take a `#BA0517` border, and the status line reads, in 11.5px / 600 /
  `#BA0517`:
  `Top, middle and tail add up to 17s, which is not a bookable duration. Adjust them to total one
  of: 5s, 6s, 7s, 8s, 10s, 15s, 20s, 30s, 45s, 60s, 75s, 90s, 120s, 180s.`
  (The word `, middle` appears only when the set has a middle duration.)

**Top/Tail chip labels.** An active set appends a chip to the duration row labelled
`Top/Tail 10s/5s`, or `Top/Mid/Tail 10s/5s/5s` when a middle exists. A missing value renders as
`?`. Turning the toggle off removes all `Top/...` chips from the selection; turning it on adds one
per set. Removing a set removes its chip.

Default state: one set, top `10`, tail `5`, no middle.

---

### Section 2: Dayparts

Vertical flex, gap 16px.

**Standard dayparts.** A flex-wrap row, gap 8px, of three multi-select segment pills:
`Peak`, `Off-Peak`, `Mid-Dawn`. Pill: `padding: 7px 16px`, radius 999px, 13px.
- Unselected: 1px `#C9C9C9`, white fill, `#444`, weight 400.
- Selected: 1px `#0176D3`, `#0176D3` fill, white, weight 600.
Any combination may be selected, including none (which triggers the validation below).
Default: `Peak` selected.

**`+ Custom Time Period` button** sits at the end of the same row. Dashed pill, 30px high, 1px
dashed `#C9C9C9`, radius 999px, `padding: 0 12px`, 12px / 600 / `#0176D3`.
**Visible only for fixed-only campaigns.**

**Custom time period rows.** The list is hidden when empty (no placeholder row). Each row is a
flex-wrap line, gap 8px:
- Name input: 120x30px, 1px `#C9C9C9`, radius 4px, 12px. Placeholder is `Daypart 1`, `Daypart 2`,
  and so on by row index. The placeholder is a hint only: an unnamed row is valid, and the name is
  editable.
- Start time input (`type=time`), 30px high, radius 4px, 12px.
- Literal `to`, 12px `#747474`.
- End time input, same as start.
- Summary label, 11.5px. When both times are set: `6:00am to 12:00pm` (12-hour, lowercase am/pm)
  in `#747474`. When either is missing: `Set a start and end time` in `#BA0517`, and the
  empty input(s) take a `#BA0517` border.
- `Remove`, 11px / 700 / `#747474`, borderless.

**Daypart validation banner.** Shown when no standard daypart is selected and (for fixed-only)
no custom time period exists. Block, `padding: 8px 10px`, background `#FEF1F1`, 1px `#F5CDCD`,
radius 4px, 11.5px / 600 / `#BA0517`:
- Fixed-only: `Select at least one daypart, or create at least one custom time period, before
  moving on to the Optimiser or Spot Management.`
- Otherwise: `Select at least one daypart before moving on to the Optimiser or Spot Management.`

---

### Section 3: Burst Periods

Full-width. Heading row 12px above the list.

**The list is empty by default**: there is no placeholder burst. The user adds one explicitly.

**`+ Add Burst Period` button.** 32px high, `padding: 0 14px`, radius 4px, 1px dashed `#C9C9C9`,
white fill, 13px / 600 / `#0176D3`, 12px top margin. Adds a row named `Burst N` where N is the new
count, with empty dates.

**Burst row.** Vertical flex, gap 4px. The top line is a flex-wrap row, gap 8px:
- Name input: 130x32px, 1px `#C9C9C9`, radius 4px, 13px. Placeholder `Burst 1`, `Burst 2`, and so
  on by index. Prefilled on add, editable.
- Start date field (custom picker, below).
- Literal `to`, 12px `#747474`.
- End date field.
- `Remove`, 11px / 700 / `#747474`.

Below the row, the per-row validation message, 11.5px / 600 / `#BA0517`, shown only when invalid.

**Date field and picker.** A **custom picker is required**: the native browser date input follows
the user's locale and always starts the week on Monday for AU users, which this business wants
changed. The picker specification:
- Closed field: a button, 32px high, min-width 118px, `padding: 0 10px`, radius 4px, 1px `#C9C9C9`
  (`#0176D3` while open), 13px. Shows `dd/mm/yyyy` in `#939393` when unset, otherwise the date as
  `07/09/2026` in `#181818`.
- Open popover: absolutely positioned 36px below the field, z-index above the row, `padding: 10px`,
  1px `#C9C9C9`, radius 6px, white, shadow `0 6px 18px rgba(0,0,0,.14)`.
- Header: `<` and `>` month buttons (24x24px, 1px `#C9C9C9`, radius 4px, white, `#0176D3`, 13px)
  flanking a centred `September 2026`, 12px / 700 / `#181818`.
- **Week starts on Sunday.** Weekday header row reads `Sun Mon Tue Wed Thu Fri Sat`, 10px / 700 /
  `#939393`, each 20px tall.
- Grid: 7 columns of 28px, 2px gap, always 6 rows (42 cells).
- Day cell: 28x26px, radius 4px, 11.5px.
  - In-month, in-flight: white, `#181818`.
  - Leading/trailing month days: `#C9C9C9`.
  - **Outside the campaign flight: `#FAFAFA` background, `#B9B9B9` text** (visually de-emphasised;
    still clickable, but selecting one raises the flight validation error).
  - Selected: `#0176D3` fill, white, weight 700.
- Selecting a day sets the value and closes the popover. Only one popover is open at a time:
  opening another closes the first.

**Burst hint.** Shown under the list when at least one burst exists, 11px `#939393`, 8px top
margin: `Burst periods must sit inside the campaign flight 07/09/2026 to 18/10/2026 and cannot
overlap each other.` (dates from the campaign props).

**Burst validation**: evaluated per row, first failing rule wins, message shown inline:

| Rule | Message |
| --- | --- |
| Either date missing | `Set both a start and an end date.` |
| End before start | `The end date falls before the start date.` |
| Start before campaign start | `Starts before the campaign start (07/09/2026).` |
| End after campaign end | `Ends after the campaign end (18/10/2026).` |
| Overlaps another burst (inclusive of shared endpoints) | `Overlaps Burst 2.` or `Overlaps another burst period.` when the other row is unnamed |

Overlap is checked against every other row, both directions, so both rows in a clashing pair show
an error.

---

## Interactions & Behavior

### Navigation guard

This is the behaviour that matters most for the Salesforce build. The panel does not block input;
it blocks **exit**. Both *Save & Close* and navigating to another page of the Proposal Builder are
prevented while any of the following hold:

1. No standard daypart selected AND (for fixed-only campaigns) no custom time period exists.
2. Any custom time period is missing its start or end time.
3. (Fixed-only, Top/Tail on) Any Top/Tail set does not total a bookable duration.
4. Any burst period fails any burst rule above.

The extract's bottom card renders the live guard state for testing:
- Blocked: `Save & Close and page navigation are blocked. 3 issues:` followed by one line per
  issue, 11.5px `#BA0517`.
- Clear: `All timing inputs are valid. Save & Close and page navigation are allowed.` in `#2E844A`.

In the full Proposal Builder these messages surface as a blocking banner on the page rather than a
standalone card. The issue strings are:
- `Custom time period Daypart 1 needs both a start and an end time.`
- `Burst 1: Overlaps Burst 2.`
- `Top/tail set 1 does not total a bookable duration.`
- `Select at least one daypart.`

### Other behaviour
- No animations except the 150ms switch knob transition.
- No loading or empty-illustration states; empty lists simply render nothing.
- No confirmation on remove: deletion is immediate.
- All validation is live (on every change), not on blur or on submit. The error styling appears as
  soon as the value becomes invalid.

---

## State Management

All state is local to the panel and flows up to the parent Proposal Builder record as one object:

| Key | Type | Default | Notes |
| --- | --- | --- | --- |
| `durations` | `string[]` | `['15s','30s']` | Selected duration chip labels, includes Top/Tail labels |
| `customDurations` | `string[]` | `[]` | Durations added via the picker |
| `topTail` | `boolean` | `false` | Top/Tail toggle |
| `topTailSets` | `{top,mid,hasMid,tail}[]` | one set `{top:'10',mid:'',hasMid:false,tail:'5'}` | |
| `dayparts` | `string[]` | `['Peak']` | Subset of Peak / Off-Peak / Mid-Dawn |
| `ranges` | `{name,start,end}[]` | `[]` | Custom time periods; times as `HH:mm` |
| `bursts` | `{name,start,end}[]` | `[]` | Dates as ISO `yyyy-mm-dd` |

Transient UI state, not persisted: which date popover is open, and which month each popover is
showing.

### Props (inputs from the parent)

| Prop | Type | Purpose |
| --- | --- | --- |
| `fixedOnly` | boolean | Campaign is fixed-only. Gates the Top/Tail toggle and the custom time period feature entirely. |
| `planStart` | string `dd/mm/yyyy` | Campaign flight start. Bounds burst dates and the picker's de-emphasis. |
| `planEnd` | string `dd/mm/yyyy` | Campaign flight end. |

---

## Design Tokens

Colours (as used in the HTML; map to SLDS equivalents where they exist):

| Value | Role | SLDS equivalent |
| --- | --- | --- |
| `#0176D3` | Brand / selected / links | `--slds-g-color-accent-container-*` (brand blue) |
| `#181818` | Primary text | `--slds-g-color-neutral-base-10` |
| `#444444` | Label text | |
| `#747474` | Secondary text, remove links | `--slds-g-color-neutral-base-30` |
| `#939393` | Placeholder, helper text | |
| `#C9C9C9` | Input borders, unselected chip border | `--slds-g-color-border-base-4` |
| `#E5E5E5` | Card and divider borders | `--slds-g-color-border-base-1` |
| `#F3F3F3` | Card header, top/tail block fill | `--slds-g-color-neutral-base-95` |
| `#FFFFFF` | Card fill | |
| `#BA0517` | Error text and error borders | `--slds-g-color-error-base-40` |
| `#FEF1F1` / `#F5CDCD` | Error banner fill / border | |
| `#2E844A` | Success (guard clear) | `--slds-g-color-success-base-40` |
| `#FAFAFA` / `#B9B9B9` | Out-of-flight day cell fill / text | |

Spacing used: 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 32px.
Radii: 4px (inputs, cards inside), 6px (popover), 8px (card), 999px (pills).
Type scale: 10, 11, 11.5, 12, 12.5, 13px. Weights: 400, 600, 700.
Control heights: 26px (day cell), 30px (small input, pill), 32px (standard input, button).
One shadow only: `0 6px 18px rgba(0,0,0,.14)` on the date popover.

## Assets

None. No images or icons: the only glyphs are the text characters `<`, `>`, `-` (en dash), `*`,
and `+`.

---

## Salesforce implementation notes

What the solution design should cover:

**Data model.** These are child records of a campaign/proposal, not fields on it. Suggested shape,
to be validated against the org:
- Spot durations: a multi-select of a controlled duration set, plus user-added durations. Consider
  whether the bookable duration list (`5` to `180`) is a picklist, custom metadata, or a reference
  object: it is business reference data and appears in Top/Tail validation, so custom metadata is
  likely the right home.
- Top/Tail sets: a child object (top, middle, tail, in seconds), 0..n per campaign.
- Dayparts: standard dayparts are a controlled set (Peak / Off-Peak / Mid-Dawn); custom time
  periods are a child object with name, start time, end time.
- Burst periods: a child object with name, start date, end date.

**Validation placement.** Every rule above is cross-record (overlap checks span sibling rows;
flight bounds reference the parent). Decide what runs client-side in the LWC for immediate
feedback and what must be enforced server-side (Apex or validation rules) so the data cannot be
made invalid by API or Flow. The design should state both layers explicitly rather than relying on
the component alone.

**Navigation guard.** The parent Proposal Builder needs a way to ask this component whether it is
valid before allowing Save & Close or a page change. Consider a public `@api validate()` returning
the issue list, or a `reportvalidity`-style contract, and how the parent surfaces the messages.

**The date picker.** `lightning-input type="date"` cannot be forced to a Sunday-first week, so a
custom picker is required to meet the requirement. The design should decide between a bespoke LWC
picker (as specified above) and an approved base component, and note the accessibility obligations
if bespoke: keyboard navigation across the grid, `role="grid"`, focus trapping in the popover, and
an accessible name on each day cell.

**Fixed-only gating.** `fixedOnly` hides features rather than disabling them. Confirm whether that
is right for Salesforce, where a hidden control can be surprising after a campaign type change,
and whether existing Top/Tail or custom-time-period data should be cleared, preserved, or flagged
when a campaign moves out of fixed-only.
