# LWC design: Burst Periods, Custom Time Periods and Top/Tail Durations

Three Lightning Web Components for the Proposal Builder Brief page (Stations & Timing panel),
built from the behaviour in `docs/design-handoff/spot-timing-panel.md` and, for Top/Tail Durations,
cross-checked directly against `Spot Timing Panel.dc.html`'s logic class. All three are complete,
buildable component bundles: template, controller, styles, metadata and Jest tests. Run
`npm install && npm test` from this folder: 15 tests pass against the code as delivered.

| Component | Bundle path | What it owns |
| --- | --- | --- |
| Burst Periods | `force-app/main/default/lwc/burstPeriods` | Its own header, the burst list, the Sunday-first date picker, and flight/overlap validation. Always visible. |
| Custom Time Periods | `force-app/main/default/lwc/customDayparts` | The `+ Custom Time Period` button and the custom-daypart row list. Visible only when the campaign is fixed-only, but visibility is the parent's decision, not this component's. |
| Top/Tail Durations | `force-app/main/default/lwc/topTailDurations` | The "Enable Top/Tail durations" toggle and the top/tail set editor (add, remove, add/remove middle duration, per-set validation). Fixed-only feature, same visibility pattern as Custom Time Periods. |

None of the three talk to Apex, an object, or another component directly. All are pure
"controlled" components: the parent hands in an array (or a boolean plus an array, for Top/Tail)
as `@api`, the component renders it and validates it, and every edit comes back out as one
`CustomEvent` carrying the whole next value. This matches the existing Proposal Builder pattern
(state flows up to the parent as one object, the same approach used for the Optimisation screen's
handoff and documented in `docs/design-handoff/spot-timing-panel.md`) and keeps all three
components trivially testable and reusable outside this one page.

## `burstPeriods`

### `@api` properties

| Property | Type | Description |
| --- | --- | --- |
| `bursts` | `{ id: String, name: String, start: String, end: String }[]` | The current burst list. `start`/`end` are ISO `yyyy-mm-dd` (or empty string when unset). `id` is a stable, component-generated key: the parent should persist it (e.g. as the child record's `Id` once saved) so re-renders don't lose picker state. |
| `planStart` | `String` (ISO `yyyy-mm-dd`) | Campaign flight start. Bounds the date picker's out-of-flight shading and the `validate()` rules. |
| `planEnd` | `String` (ISO `yyyy-mm-dd`) | Campaign flight end. |
| `disabled` | `Boolean`, default `false` | Set when the proposal is booked/locked. Disables every input, the date pickers and Remove. |

### Events

| Event | `detail` | Fired when |
| --- | --- | --- |
| `burstschange` | `{ bursts: [...] }` | Any add, edit, date pick, or remove. Always the **full** next array, not a delta. |

### Public methods

| Method | Returns | Notes |
| --- | --- | --- |
| `validate()` | `String[]` | One message per invalid burst, in the exact wording the existing navigation guard uses (`Set both a start and an end date.`, `The end date falls before the start date.`, `Starts before the campaign start (DD/MM/YYYY).`, `Ends after the campaign end (DD/MM/YYYY).`, `Overlaps {name}.`). Call this from the parent's own `@api validate()` before allowing Save & Close or a page change. |

### Composition

```html
<c-burst-periods
    bursts={inputs.bursts}
    plan-start={planStartIso}
    plan-end={planEndIso}
    disabled={isBooked}
    onburstschange={handleBurstsChange}>
</c-burst-periods>
```

```js
handleBurstsChange(event) {
    this.inputs = { ...this.inputs, bursts: event.detail.bursts };
    this.notifyProposalBuilder();
}
```

### Why a hand-rolled date picker

`lightning-input type="date"` cannot be forced to start the week on Sunday (it follows the user's
locale), which the source design requires. `burstPeriods` implements its own popover instead:
Sunday-first 6-row grid, month navigation, and shading for out-of-month and out-of-flight days.
If more than one component in the org ends up needing a Sunday-first picker, extract this into its
own `c/weekPicker` component; it was kept inline here to match the two-component scope of this
handoff.

## `customDayparts`

### `@api` properties

| Property | Type | Description |
| --- | --- | --- |
| `ranges` | `{ id: String, name: String, start: String, end: String }[]` | The current custom time periods. `start`/`end` are `HH:mm` 24-hour strings. |
| `disabled` | `Boolean`, default `false` | Same lock behaviour as `burstPeriods`. |

### Events

| Event | `detail` | Fired when |
| --- | --- | --- |
| `daypartrangeschange` | `{ ranges: [...] }` | Any add, edit or remove. Full next array. |

### Public methods

| Method | Returns | Notes |
| --- | --- | --- |
| `validate()` | `String[]` | One message per row missing a start or end time: `Custom time period {name or Daypart N} needs both a start and an end time.` This is **not** the full daypart validation: the "select at least one daypart, or create a custom time period" rule needs the standard Peak/Off-Peak/Mid-Dawn selection too, which this component does not own. Combine both in the parent (see below). |

### Composition and the fixed-only gate

This component does not check the trading model itself. The Dayparts section of the Stations &
Timing panel (which also owns the standard daypart pills) decides whether to render it at all:

```html
<!-- Dayparts section, inside Stations & Timing -->
<c-daypart-pills selected={inputs.dayparts} onchange={handleDaypartsChange}></c-daypart-pills>

<template lwc:if={isFixedOnly}>
    <c-custom-dayparts
        ranges={inputs.ranges}
        disabled={isBooked}
        ondaypartrangeschange={handleRangesChange}>
    </c-custom-dayparts>
</template>
```

```js
get isFixedOnly() {
    return this.tradingModels.length === 1 && this.tradingModels[0] === 'fixed';
}

// Combine with the standard daypart rule; this lives on the parent, not on either child.
@api validate() {
    const issues = [];
    const hasStandardDaypart = (this.inputs.dayparts || []).some((d) => !d.startsWith('~'));
    const hasCustomRange = (this.inputs.ranges || []).length > 0;
    if (!hasStandardDaypart && !(this.isFixedOnly && hasCustomRange)) {
        issues.push(this.isFixedOnly
            ? 'Select at least one daypart, or create at least one custom time period.'
            : 'Select at least one daypart.');
    }
    if (this.isFixedOnly) {
        issues.push(...this.template.querySelector('c-custom-dayparts')?.validate() ?? []);
    }
    issues.push(...this.template.querySelector('c-top-tail-durations').validate());
    issues.push(...this.template.querySelector('c-burst-periods').validate());
    return issues;
}
```

Because visibility is the parent's decision, flipping away from fixed-only does not delete
`inputs.ranges`: the data stays on the record, the component just stops rendering. **Confirm with
the business** whether that "hidden but preserved" behaviour is correct, or whether ranges should
be cleared when a campaign leaves fixed-only. This is the same open question already flagged for
Top/Tail sets in `docs/design-handoff/spot-timing-panel.md`.

## `topTailDurations`

### `@api` properties

| Property | Type | Description |
| --- | --- | --- |
| `topTail` | `Boolean`, default `false` | Whether Top/Tail durations are enabled for this campaign. |
| `topTailSets` | `{ id: String, top: String, mid: String, hasMid: Boolean, tail: String }[]` | The current top/tail sets. `top`/`mid`/`tail` are raw digit strings in seconds (not coerced to Number: matches the source, which strips non-digits only when summing). `hasMid` gates whether the middle field renders. `id` is a stable, component-generated key. |
| `disabled` | `Boolean`, default `false` | Same lock behaviour as the other two components. |

### Events

| Event | `detail` | Fired when |
| --- | --- | --- |
| `toptailchange` | `{ topTail: Boolean, topTailSets: [...], chipLabels: String[] }` | Toggling on/off, add set, remove set, add/remove middle duration, or editing a top/mid/tail field. |

`chipLabels` is the derived list of duration-chip labels for the currently enabled sets (for
example `['Top/Tail 10s/5s', 'Top/Mid/Tail 15s/5s/10s']`), empty when `topTail` is `false`. A
Top/Tail set doubles as an entry in the sibling "Spot Durations" chip picker, so the parent should
reconcile `chipLabels` into its own duration selection on every event: remove any label that used
to be in the previous `chipLabels` but is not in the new one, add any that is new. This component
does not touch that chip list directly, the same separation of concerns as `customDayparts` not
owning the standard daypart pills.

### Public methods

| Method | Returns | Notes |
| --- | --- | --- |
| `validate()` | `String[]` | Returns `[]` when `topTail` is `false`. Otherwise, one message per set whose top (+ middle, if present) + tail does not sum to a bookable duration (`5, 6, 7, 8, 10, 15, 20, 30, 45, 60, 75, 90, 120, 180` seconds): `Top/tail set {n} does not total a bookable duration.` This is the **short** form used by the navigation guard. The inline UI under each set shows a more detailed message (exact total, full bookable list, and whether "middle" is mentioned), which is presentation only and is not what `validate()` returns. |

### Composition

```html
<c-top-tail-durations
    top-tail={inputs.topTail}
    top-tail-sets={inputs.topTailSets}
    disabled={isBooked}
    ontoptailchange={handleTopTailChange}>
</c-top-tail-durations>
```

```js
handleTopTailChange(event) {
    const { topTail, topTailSets, chipLabels } = event.detail;
    const withoutOldTopTailChips = this.inputs.durations.filter((label) => !label.startsWith('Top/'));
    this.inputs = {
        ...this.inputs,
        topTail,
        topTailSets,
        durations: [...withoutOldTopTailChips, ...chipLabels]
    };
    this.notifyProposalBuilder();
}
```

Rendering is gated by the parent exactly like `customDayparts`:

```html
<template lwc:if={isFixedOnly}>
    <c-top-tail-durations ...></c-top-tail-durations>
</template>
```

## Data model notes

All three components assume child objects, not fields on the proposal/campaign record:

- **Burst period**: `Name`, `Start_Date__c` (Date), `End_Date__c` (Date), parent lookup to the
  proposal. The flight-bounds and overlap rules in `validate()` should also be enforced
  server-side (a trigger/validation rule), since this component only guards the UI.
- **Custom daypart**: `Name`, `Start_Time__c` (Time), `End_Time__c` (Time), parent lookup to the
  proposal. Consider whether the standard dayparts (Peak/Off-Peak/Mid-Dawn) and these custom
  entries should share one object with a `Is_Custom__c` flag, or stay as two separate structures
  as the prototype has them (a flat picklist plus a child object): the combined validation rule
  above needs to read both regardless of which shape is chosen.
- **Top/tail set**: `Top_Duration__c`, `Middle_Duration__c` (nullable), `Tail_Duration__c`
  (Numbers, seconds), parent lookup to the proposal. The `hasMid` flag can be derived from whether
  `Middle_Duration__c` is populated rather than stored separately. The bookable-duration list
  (`5, 6, 7, 8, 10, 15, 20, 30, 45, 60, 75, 90, 120, 180`) is business reference data shared with
  the base duration picker: model it once (custom metadata is a good fit, per the same
  recommendation already made for it in `docs/design-handoff/spot-timing-panel.md`), not as a literal
  list duplicated in this component and in Apex.

## Running the tests

```bash
cd sfdx-project
npm install
npm test
```

15 tests pass as delivered (5 for `burstPeriods`, 4 for `customDayparts`, 6 for
`topTailDurations`), covering rendering, event payloads, and the exact validation wording listed
above.
