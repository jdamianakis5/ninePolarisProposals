# LWC design: Durations, Dayparts and Bursts

Thirteen Lightning Web Components implementing the
[Technical Design: Durations, Dayparts and Bursts Component](design-handoff/TTP-Technical-Design-Durations-Dayparts-Bursts.pdf)
(the "TTP"), which is the authoritative source for scope, hierarchy, and validation rules in
this document. Where this document and the TTP disagree, the TTP wins; flag the difference to
the team rather than trusting this file blindly, since it is a snapshot.

The original single "Spot Durations, Dayparts and Bursts" component (documented in
`docs/design-handoff/spot-timing-panel.md`, and implemented by the first three components added
to this repo) has since split across two pages, per the TTP:

1. **Bursts and Custom Dayparts**, staying on the **Brief page**.
2. **Spot Durations and Standard Dayparts**, moving to the **Optimiser Inputs page**. Top/Tail
   and Top/Middle/Tail duration sets move with it.

All thirteen components here are complete, buildable bundles (template, controller, styles,
metadata, Jest tests). Run `npm install && npm test`: 55 tests pass against the code as
delivered.

## Component tree

### Brief page: Bursts and Custom Dayparts

```
burstsAndCustomDayparts (Level 1, card shell, holds working state)
├── burstPeriods (Level 2)
│   └── burstPeriod (Level 3, one per burst)
└── customDayparts (Level 2, fixed-only only)
    └── customDaypart (Level 3, one per custom daypart)
```

### Optimiser Inputs page: Spot Durations and Standard Dayparts

```
spotDurationsAndDayparts (Level 1, card shell, holds working state)
├── spotDurations (Level 2)
│   ├── topTailToggle (Level 3, fixed-only only)
│   ├── durationPill (Level 3)
│   │   └── pill (shared, one per duration option)
│   └── topTailSetParent (Level 3, fixed-only + toggle on)
│       └── topTailSetChild (one per set)
└── standardDayparts (Level 2)
    └── pill (shared, one per daypart option)
```

`pill` is the one component reused by both trees, per the TTP ("Existing component, reused").

## Design pattern used throughout

- **Level 1 is stateful.** `burstsAndCustomDayparts` and `spotDurationsAndDayparts` seed their
  working state once from whatever the page loads (existing Linear Parameter records mapped to
  plain rows), then own it locally. Each exposes `@api validate()` and `@api getPayload()` for
  the page's shared save to call imperatively. This matches the TTP: "Holds the working state
  for both sections and hands its payload to the page's shared save. Reports its own validity
  upward."
- **Level 2 and Level 3 are pure "controlled" components.** Props down, one `CustomEvent`
  carrying the whole next value up. No component below Level 1 talks to Apex or holds
  page-level state.
- **Validation is layered.** Each Level 2/3 component validates what it alone can see (a set's
  own bookable total, a row's own missing time). Cross-row checks that need sibling knowledge
  (overlap, duplicate combinations) are computed by the nearest parent that can see every
  sibling, never by the row itself. Checks that need two sections together (at least one
  duration AND at least one daypart) live on Level 1, the only place that has both.

---

## Brief page components

### `burstsAndCustomDayparts` (Level 1)

| | |
| --- | --- |
| `@api planStart`, `planEnd` | ISO `yyyy-mm-dd`. Campaign flight, passed through to `burstPeriods`. |
| `@api fixedOnly` | Gates the whole Custom Dayparts section. |
| `@api defaultDayparts` | The stored Account-level default set, live/reactive (only ever changes as a result of Update Defaults succeeding server-side). |
| `@api bursts`, `dayparts` | Seed-once working state (existing records on open). |
| `@api disabled` | Locks every input (e.g. once the proposal is booked). |
| `@api validate()` | Returns every issue from `burstPeriods`, plus `customDayparts`'s issues only while `fixedOnly` is true. |
| `@api getPayload()` | `{ bursts, dayparts }`, the current working state. `dayparts` is returned even when not currently fixed-only: whether data from an earlier fixed-only state should be cleared, preserved, or flagged is open (TTP section 8.1/spot-timing-panel.md), so this defaults to preserving it. |
| Event `updatedefaults` | Re-dispatched from the `customDayparts` child, detail `{ dayparts }`. The Brief page owns the actual Apex call to replace the Account-level defaults; on success it should pass a refreshed `defaultDayparts` back down. |

### `burstPeriods` (Level 2)

| | |
| --- | --- |
| `@api bursts` | `{ id, name, start, end }[]`. `start`/`end` are ISO `yyyy-mm-dd`. |
| `@api planStart`, `planEnd` | Bounds the calendar shading and the flight-bounds rule. |
| Event `burstschange` | `{ bursts }`, full next array, on add/edit/remove from any child row. |
| `@api validate()` | One message per invalid burst: missing date(s), end before start, outside the flight, or overlapping another burst (checked pairwise across every row). |

### `burstPeriod` (Level 3)

One row: name, start date, end date via a Sunday-first custom calendar (`lightning-input
type="date"` cannot be forced off the user's locale week start), and its own inline message
(computed by the parent, since overlap needs sibling rows).

| | |
| --- | --- |
| `@api burst`, `placeholder`, `planStart`, `planEnd`, `issue`, `showRemove`, `disabled` | |
| Event `burstchange` | `{ id, patch }`: a partial patch, merged by the parent. |
| Event `burstremove` | `{ id }` |

### `customDayparts` (Level 2)

Repeats `customDaypart` rows and owns the **Update Defaults** action (TTP section 2, 6.5): a
Sales Person can save the current set as the Account's default, the same pattern already used
for Program/Program Group exclusions elsewhere on the Brief page.

| | |
| --- | --- |
| `@api dayparts` | `{ id, name, start, end, isApplyByDefault }[]`. `start`/`end` are `HH:mm`. |
| `@api defaultDayparts` | The stored Account-level default, for divergence comparison only. |
| Event `customdaypartschange` | `{ dayparts }`, full next array. |
| Event `updatedefaults` | `{ dayparts }`, fired on Update Defaults click. Persisting it is out of scope for this component. |
| `@api validate()` | One message per row missing a time, or per overlapping pair. Custom dayparts are entirely optional (TTP section 8.1 drops the old "at least one required" rule): an empty list is valid. |
| Update Defaults, disabled when | Every row has `isApplyByDefault === true` **and** the set exactly matches `defaultDayparts` (same rows, same name/start/end). Adding, removing, or editing any row clears divergence and enables the button. |

### `customDaypart` (Level 3)

One row: name, start time, end time, and its own inline message (parent-computed, overlap
needs siblings). Editing any field clears `isApplyByDefault` on that row, the same as editing a
copied-in Program/Program Group exclusion clears its own default flag.

| | |
| --- | --- |
| `@api daypart`, `placeholder`, `issue`, `disabled` | |
| Event `customdaypartchange` | `{ id, patch }` (`patch` always includes `isApplyByDefault: false`). |
| Event `customdaypartremove` | `{ id }` |

### Composition (Brief page)

```html
<c-bursts-and-custom-dayparts
    plan-start={planStartIso}
    plan-end={planEndIso}
    fixed-only={isFixedOnly}
    bursts={initialBursts}
    dayparts={initialCustomDayparts}
    default-dayparts={accountDefaultDayparts}
    disabled={isBooked}
    onupdatedefaults={handleUpdateDefaults}>
</c-bursts-and-custom-dayparts>
```

```js
// Brief page controller, on Save & Close or navigating away
handleSaveOrNavigate() {
    const shell = this.template.querySelector('c-bursts-and-custom-dayparts');
    const issues = shell.validate(); // combine with every other Brief page component's issues
    if (issues.length) {
        this.showIssues(issues);
        return;
    }
    const { bursts, dayparts } = shell.getPayload();
    // hand these to the single Apex trigger alongside every other Brief page component's payload
}

handleUpdateDefaults(event) {
    // call the default-saving service (mirrors DefaultExclusionService), then refresh:
    this.accountDefaultDayparts = event.detail.dayparts.map((d) => ({ name: d.name, start: d.start, end: d.end }));
}
```

---

## Optimiser Inputs page components

### `spotDurationsAndDayparts` (Level 1)

| | |
| --- | --- |
| `@api availableDurations` | The duration catalogue, sourced from Agreement Default Ratio records (live, reactive: reference data, not working state). |
| `@api fixedOnly`, `disabled` | |
| `@api visibleDurations`, `selectedDurations`, `topTail`, `topTailSets`, `selectedDayparts` | Seed-once working state. |
| `@api validate()` | `spotDurations`'s Top/Tail issues, plus "at least one duration selected" and "at least one daypart selected" (TTP section 8.2: exact trigger point and message copy are unconfirmed pending sign-off; the strings here are a starting point). |
| `@api getPayload()` | `{ durations, dayparts }`: `durations` is `spotDurations`'s combined list (base selections plus any live Top/Tail chip labels), `dayparts` is the standard daypart selection. |

### `spotDurations` (Level 2)

The toggle, duration chips, and the Top/Tail sets. Emits the full duration selection upward.

| | |
| --- | --- |
| `@api visibleDurations` | Durations always shown as pills: the four mains plus any added via the picker. Never shrinks (matching "chips are not removed by clicking, only deselected"). |
| `@api selected` | The base (non-Top/Tail) durations currently toggled on. |
| `@api availableDurations`, `topTail`, `topTailSets`, `fixedOnly`, `disabled` | |
| `@api get durations()` | The combined list: `selected` plus, only while `topTail` is true, one synthetic label per Top/Tail set (e.g. `Top/Tail 10s/5s`). |
| Event `spotdurationschange` | `{ visibleDurations, selected, topTail, topTailSets, durations }` on any change below. |
| `@api validate()` | Delegates to `topTailSetParent`, only while `fixedOnly` and `topTail` are both true. |

### `standardDayparts` (Level 2)

Peak / Off-Peak / Mid-Dawn, rendered as `pill` directly: no Level 3 wrapper, since custom
dayparts moved to the Brief page.

| | |
| --- | --- |
| `@api selected`, `disabled` | |
| Event `standarddaypartschange` | `{ selected }` |

### `durationPill` (Level 3)

The chip row: `pill` for each option in `visibleDurations`, plus the Add duration picklist for
durations in `availableDurations` not already shown.

| | |
| --- | --- |
| `@api visibleDurations`, `selected`, `availableDurations`, `disabled` | |
| Event `durationschange` | `{ visibleDurations, selected }`. Picking a new duration appends it to both arrays and selects it; clicking an existing pill only toggles `selected`. |

### `topTailToggle` (Level 3)

The "Enable Top/Tail durations" toggle. A thin control: turning it off dropping every Top/Tail
chip and hiding the sets below is `spotDurations`'s responsibility, not this component's.

| | |
| --- | --- |
| `@api checked`, `disabled` | |
| Event `togglechange` | `{ checked }` |

### `topTailSetParent` (Level 3)

Repeats `topTailSetChild`, adds and removes sets, and keeps the matching Top/Tail chip in step.
Also owns the cross-set duplicate-combination check.

| | |
| --- | --- |
| `@api sets`, `disabled` | `{ id, top, mid, hasMid, tail }[]` |
| Event `toptailsetschange` | `{ sets, chipLabels }`: `chipLabels` is the derived label per set (e.g. `Top/Mid/Tail 15s/5s/10s`), used by `spotDurations` to build the combined `durations` list. |
| `@api validate()` | One message per set that is not a bookable total (`Top/tail set {n} does not total a bookable duration.`), plus one per set that duplicates an earlier set's exact top/middle/tail combination (`Top/tail set {n} duplicates set {m}.`, **wording unconfirmed**: the TTP states the rule ("No two sets can duplicate the same combination, e.g. two 10s/5s Top/Tail sets") but not the exact copy). |
| Named exports `newSet`, `labelFor` | Reused by `spotDurations` to derive chip labels without duplicating the formatting logic. |

### `topTailSetChild`

One Top/Tail (or Top/Middle/Tail) set: Top duration (required), Middle duration (only when
`hasMid`), Tail duration (required), an add/remove-middle link, Remove set, and its own
bookable-total message. Bookable durations: `5, 6, 7, 8, 10, 15, 20, 30, 45, 60, 75, 90, 120,
180` seconds.

| | |
| --- | --- |
| `@api set`, `showRemove`, `disabled` | |
| `@api issue` | A duplicate-combination message from the parent, shown in place of the bookable-total message when present. |
| Event `toptailsetchange` | `{ id, patch }` |
| Event `toptailsetremove` | `{ id }` |
| Named exports `sumOf`, `isBookable` | Reused by `topTailSetParent` for its own validation. |

### `pill`

Shared, presentational leaf: a single selectable chip. No business logic; the parent decides
what "selected" means for its own list.

| | |
| --- | --- |
| `@api label`, `value`, `selected`, `disabled` | |
| Event `pillclick` | `{ value }`, only when not disabled. |

### Composition (Optimiser Inputs page)

```html
<c-spot-durations-and-dayparts
    available-durations={agreementDefaultRatioDurations}
    fixed-only={isFixedOnly}
    visible-durations={initialVisibleDurations}
    selected-durations={initialSelectedDurations}
    top-tail={initialTopTail}
    top-tail-sets={initialTopTailSets}
    selected-dayparts={initialSelectedDayparts}
    disabled={isBooked}>
</c-spot-durations-and-dayparts>
```

```js
// Optimiser Inputs page controller, on Save & Close or navigating away
handleSaveOrNavigate() {
    const shell = this.template.querySelector('c-spot-durations-and-dayparts');
    const issues = shell.validate();
    if (issues.length) {
        this.showIssues(issues);
        return;
    }
    const { durations, dayparts } = shell.getPayload();
    // hand these to the single Apex trigger alongside every other Optimiser Inputs component's payload
}
```

The TTP itself flags a discrepancy worth raising with the team before building this: the Save
Architecture section (4.2) assumes the same single-trigger, save-on-CTA pattern as the Brief
page, but notes the earlier `optimiser-inputs-03`/`optimiser-inputs-04` stories described a
different pattern, field-level autosave via `OptimiserInputsAutosaveController`. `validate()` /
`getPayload()` above assume the CTA-triggered pattern; if autosave is what actually ships, the
save-triggering side of this contract needs to change (call `getPayload()` on every field
change instead of once on Save & Close), though the component tree and validation logic stay
the same either way.

---

## Data model

Per TTP section 6. All records are individual Linear Parameter records related to the Proposal
(`Proposal ID` populated on the Proposal lookup field), five new `Type` values:

| Type | Produced by | Notes |
| --- | --- | --- |
| Single Duration | `spotDurationsAndDayparts.getPayload().durations` (entries with no `Top/` prefix) | One record per selected plain duration, e.g. `Duration Value = 10`. |
| Combo Duration | same, entries with a `Top/` prefix | One record per Top/Tail or Top/Middle/Tail set; distinguished from Single Duration by `Middle Duration` being populated, not by a separate Type. `Top Duration`/`Middle Duration`/`Tail Duration` map directly from `topTailSets`. |
| Burst Period | `burstsAndCustomDayparts.getPayload().bursts` | `Label`, `Start Date`, `End Date`. |
| Standard Daypart | `spotDurationsAndDayparts.getPayload().dayparts` | One record per selected pill (Peak / Off-Peak / Mid-Dawn), external identifier from the proposed standard-daypart custom object (TTP section 7.1). |
| Custom Daypart | `burstsAndCustomDayparts.getPayload().dayparts` | `Label`, `Start Time`, `End Time`. Also used for the Account-level default records (`AccountId__c` populated, Proposal ID blank), per TTP section 6.5. |

`Start Date`, `End Date`, `Start Time`, and `End Time` are generic fields, not prefixed per
Type, so they can be reused by future date-bound or time-bound Linear Parameter Types (the TTP
gives exclusion periods as an example). None of the components above assume any particular field
API name: the exact `__c` suffixes are an Apex/schema decision, not an LWC one.

## What this delivers, and what it does not

This is the LWC layer only: components, their contracts, and their client-side validation. Not
included, and needed before any of this can go live:

- The Apex service classes and the shared save trigger per page (TTP sections 4-5).
- The selector that loads existing Linear Parameter records into the seed props on open.
- The `DefaultExclusionService`-style copy-forward service for Custom Daypart Account defaults,
  and the Apex call `burstsAndCustomDayparts`'s `updatedefaults` event should trigger.
- The OMS push on save (TTP section 5): happens as part of the same save, not a separate sync.
- The standard-daypart custom object proposed in TTP section 7.1.
- Confirmation of the unconfirmed items already called out above: the duplicate Top/Tail
  combination message, and the exact validation trigger point and message copy for "at least
  one duration/daypart selected" on the Optimiser Inputs page.

## Running the tests

```bash
npm install
npm test
```

55 tests pass as delivered, covering rendering, event payloads, seed-once state, and every
validation message quoted above.
