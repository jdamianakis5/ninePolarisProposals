# LWC design: Split Creator

Four Lightning Web Components implementing `c-splitConfigurator` / `c-split` /
`c-splitDetails` / `c-splitActions` from
[TTP-Split-Creator-Component-Design.pdf](design-handoff/TTP-Split-Creator-Component-Design.pdf),
cross-checked against the behaviour and validation rules in
[split-creator-contract.md](design-handoff/split-creator-contract.md) (the "Split Creator and
Spreading Rules" contract from the Claude Design project) and, for exact interaction detail,
`Split Rules Demo.dc.html`'s `secSectionsView()` logic. All four are complete, buildable component
bundles. Run `npm install && npm test`: 27 tests pass for this feature (98 across the whole repo).

## Component tree

```
splitConfigurator (Level 1, card shell, holds the working state)
└── split (Level 2, one per split constraint)
    ├── splitDetails (the grid and payload builder)
    └── splitActions (stateless toolbar)
```

Same layering pattern as Durations, Dayparts and Bursts: Level 1 is stateful (seeded once from
whatever the page loads, then owns it), Level 2/3 are pure controlled components (props down, one
event up per change).

## Design decisions where the source material disagreed with itself

The TTP's prose and the contract's worked JSON example do not fully agree (see
`split-creator-contract.md`'s "Open tension" note). This implementation makes explicit,
documented choices rather than silently picking one reading:

1. **One unit per split**, chosen once when the split is created (contract section 2.3,
   literally). The contract's own worked example shows a level-by-level unit
   (`groupBy[0].unit: PERCENT`, `groupBy[1].unit: CURRENCY`) in the same split, which this
   implementation does not replicate. Flag this to the optimiser team before build.
2. **Values are entered only at the leaf (deepest) group-by level**, plus one editable "Fixed
   total" on the split's Overall row for absolute splits (contract section 2.4, literally).
   Intermediate non-leaf, non-overall rows are pure rollups. The contract's worked example shows
   an `entered` value on a non-leaf row, which this implementation does not replicate either, for
   the same reason.
3. **Goal-driven deletion follows the TTP, not the reference prototype.** The TTP Component Design
   is explicit: "Deselecting the goal toggle unlocks the split for removal but does not delete it
   automatically. This is deliberately different from the Bursts/Custom Dayparts deletion rule...
   which is a data-integrity rule, not a goal-management rule." `Split Rules Demo.dc.html`'s own
   `toggleGoal()` method actually deletes the split (`dropSec`) when a goal is switched off. This
   implementation follows the TTP.
4. **The "no duplicate allocation" rule (section 2.5) is checked, but not its greyed-out-fields
   UI.** `splitConfigurator.validate()` reports a conflict when two splits of the same metric
   share the same lowest-level dimension, as a blocking message. It does not grey out the
   affected value fields with a tooltip naming the owning split, which the contract also
   specifies. Building that needs a cross-split prop (which rows in split B are reclaimed by split
   A) that this handoff does not implement.
5. **The toolbar's exact action set follows the reference prototype's actual buttons**, not the
   TTP's paraphrase ("group, ungroup, duplicate, reorder, delete"). The demo's real buttons are
   Copy (with a Copy to All Levels / Copy to All Weeks-or-Bursts menu), Paste, Expand level,
   Collapse level, Group, Ungroup, Even split, Clear (with a Clear All menu item), and a permanently
   disabled Upweight (the demo itself ships it disabled and wired to a no-op, so this
   implementation matches that rather than treating it as a gap).

## `splitConfigurator` (Level 1)

| | |
| --- | --- |
| `@api availableMarkets`, `availableChannels`, `availableDayparts`, `availableDurations`, `availableWeekdays`, `availableCustomTimePeriods` | `{ id, label }[]`, the option catalogue per Group By dimension. |
| `@api availableWeeks`, `availableBursts` | `{ id, label }[]`, the column catalogue for the two column drivers. |
| `@api fixedOnly`, `disabled` | |
| `@api goals` (seed-once) | `{ budget, price, audience, reach }` booleans. |
| `@api priceUnit` (seed-once) | `'CPM' \| 'CPT'` |
| `@api audienceUnit` (seed-once) | `'000s' \| 'TARPS'` |
| `@api splits` (seed-once) | The working list of split records: `{ id, metric, unit, dims, columnDriver, breakouts, total, values, groups, open, required }`. |
| `@api validate()` | Every split's own issues, plus a best-effort "no duplicate allocation" check (see decision 4 above). |
| `@api get warnings()` | Every split's advisory (non-blocking) messages. |
| `@api getPayload()` | `{ goals, splitConstraints }`, matching the contract's request shape. |

Renders the four goal toggles (with the Price CPM/CPT and Audience 000s/TARPS sub-choice pills)
and the six metric pills, and creates/locks/converts the goal-driven splits per decisions 1 to 3
above. Switching Fixed Price between CPM and CPT, or Fixed Audience between 000s and TARPS,
converts the existing required split's `metric` in place rather than creating a second one
(contract 2.1: "converts the existing split in place"), and switching to TARPs drops `market` from
that split's `dims` if present (Market is banned on a TARP split).

## `split` (Level 2)

One instance per split constraint. Header (collapse chevron, title, dim-label summary, gear/shield/
trash buttons), a settings panel (Group By checkboxes with "none selected" / "three level maximum"
annotations, a numbered level-order list, the Week/Burst column driver, and the unit picker), a
breakout panel, and hosts `splitDetails` + `splitActions`.

| | |
| --- | --- |
| `@api id`, `title`, `metric`, `unit`, `allowPercent` | `allowPercent` is `false` for CPM/CPT: the unit picker then shows `$` only. |
| `@api dims`, `columnDriver`, `breakouts`, `total`, `values`, `groups`, `open`, `required`, `disabled` | |
| `@api dimensionCatalog` | The dimension list already filtered for this split's metric (Market excluded for a TARPs split), passed down by `splitConfigurator`. |
| `@api dimensionOptionCounts`, `dimensionOptions`, `dimensionLabels` | |
| `@api weekColumns`, `burstColumns`, `fixedOnly` | |
| Event `splitchange` | `{ id, patch }`: whichever fields changed (`dims`, `columnDriver`, `breakouts`, `unit`, `total`, `open`, or `values`/`groups` forwarded from `splitDetails`). |
| Event `splitremove` | `{ id }`, only fireable when `!required`. |
| `@api validate()` | `splitDetails.validate()` plus the goal-driven "no value anywhere" requirement message. |
| `@api get warnings()` | Forwarded from `splitDetails`. |
| `@api getPayload()` | One `splitConstraints[]` entry: metric, required, columnDriver, ordered `groupBy` (one entry per dim, all sharing this split's unit per decision 1), breakouts, and whatever `splitDetails.getPayload()` builds for total/mergedGroups/rows. |

## `splitDetails`

The grid, and the component that builds the row-level payload.

| | |
| --- | --- |
| `@api dims`, `dimensionOptions`, `dimensionLabels` | |
| `@api columnDriver`, `columns` | `columns` is `{ id, label }[]`; empty renders a single implicit column. |
| `@api unit`, `total`, `values`, `groups`, `disabled` | |
| `@api validate()` | Blocking only: a percentage split's column not totalling 100% (contract 2.6, "turns its column header red and blocks the run"). |
| `@api get warnings()` | Advisory only: the split's fixed total does not match what is allocated across every leaf row. Never blocks Save & Close, Run Optimiser, or navigation. |
| `@api hasAnyValue()` | Used by `split` for the goal-driven requirement check. |
| `@api getPayload()` | `{ total, mergedGroups, rows }`. Rows are one per leaf per column: `{ rowId, level, parentRowId, path, column, entered, resolved }`. `rowId` is the row's own dimension path string (stable across re-renders without a persisted id map, since it is derived, not random). |
| `@api applyAction(action)` | Performs `group` / `ungroup` / `even` / `clear` / `clearAll` / `copy` / `paste` / `copyToAllLevels` / `copyToAllColumns` against the current row selection, then emits `detailschange`. |
| Event `detailschange` | `{ values, groups }` |
| Event `totalchange` | `{ total }` |
| Event `rowselectionchange` | `{ selectedRowKeys }`, so `split` can compute `canGroup`/`canUngroup` for `splitActions`. |

## `splitActions`

A stateless action bar (Technical Design: "it reads whatever c-splitDetails currently has
selected and fires... the action bar orchestrates, the grid owns the data"). It holds no data and
never touches a Linear Parameter record.

| | |
| --- | --- |
| `@api selectionCount`, `canGroup`, `canUngroup`, `hasClipboard`, `columnDriver`, `disabled` | |
| Event `action` | `{ name }`, one of the action names `splitDetails.applyAction()` accepts. |

## Composition

```html
<c-split-configurator
    available-markets={agreementMarkets}
    available-channels={agreementChannels}
    available-dayparts={briefDayparts}
    available-durations={briefDurations}
    available-weekdays={weekdayReferenceData}
    available-custom-time-periods={briefCustomDayparts}
    available-weeks={campaignWeeks}
    available-bursts={briefBursts}
    fixed-only={isFixedOnly}
    goals={initialGoals}
    price-unit={initialPriceUnit}
    audience-unit={initialAudienceUnit}
    splits={initialSplits}
    disabled={isBooked}>
</c-split-configurator>
```

```js
// Optimiser Inputs page controller, on Save & Close, Run Optimiser, or navigating away
handleSaveOrRunOptimiser() {
    const configurator = this.template.querySelector('c-split-configurator');
    const issues = configurator.validate(); // blocking only; configurator.warnings is advisory
    if (issues.length) {
        this.showIssues(issues);
        return;
    }
    const { goals, splitConstraints } = configurator.getPayload();
    // merge into the same request object as Spreading Rules and the campaign context,
    // then hand the whole thing to SplitSaveService per the Technical Design's Save Behaviour
}
```

## Data model and Apex

Everything the TTP and the contract specify about persistence: one Apex trigger per page,
`SplitSaveService` (imperative, `@AuraEnabled`, one method per save point: Save & Close and Run
Optimiser), `allOrNone = false` with partial-failure logging, and the existing
`LinearParameterSelector` for reading records back on open, is Apex/data-model work this handoff
does not build. See `TTP-Split-Creator-Component-Design.pdf` section 4 (Save Architecture) and
`split-creator-contract.md` (Data Model, Reference data, Storage) for what to design next.

## Running the tests

```bash
npm install
npm test
```

27 of the repo's 98 tests cover this feature (5 `splitConfigurator`, 8 `split`, 9 `splitDetails`, 5
`splitActions`).
