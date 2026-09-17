# LWC design: Market/Channel Picker and Nav Rail Item

Three Lightning Web Components: `marketChannelPicker` and `marketChannelSelector` implementing
[channel-picker.md](design-handoff/channel-picker.md) (from
`Channel-Picker-Enhancements-and-Proposal-Use.pdf`), and `navRailItem`, one entry in the
Proposal Builder's left navigation rail (documented behaviour in
[proposal-builder.md](design-handoff/proposal-builder.md), "Navigation rail and tab locking").
The rail item was not asked for by a technical design document: it is this implementation's
answer to "the menu item on the side of the proposal builder" grounded in the already-documented
`railItem()` behaviour from the Proposal Builder shell, and worth confirming that reading is
correct. All three are complete, buildable component bundles. 15 tests cover this handoff (6
`marketChannelPicker`, 6 `marketChannelSelector`, 4 `navRailItem`) of the repo's 98.

## Scope decision: grid, not tree

Unlike Durations, Dayparts and Bursts and Split Creator, the source document for this feature
stops short of a component design: "Written detailed design of LWCs" is listed as still to be
completed. It also references reusing "the station/channel picker... already defined for the
Agreement component" without saying which one. Two candidates exist:

1. A flat grid: rows are markets (grouped under a regional aggregate header for Regional),
   columns are channels, with row/column/whole-grid Select All shortcuts. This is what the
   Proposal Builder's existing Spot Management "Station / channel" popover already does, and what
   this implementation builds.
2. A hierarchical tree seen in the Optimiser prototype's market picker (`Split Rules
   Demo.dc.html`): aggregate markets, named sub-market groups, individual sub-markets, and solus
   (standalone) markets, each with an all/main-station/multi-station channel-scope mode, plus
   saved presets (`4 Agg`, `5 Agg`, `5 Agg + WA`).

**Confirm which one is the actual Agreements picker before this ships.** If it is the tree, the
two components below need a materially different data shape and interaction model; the props
contracts here would need to change, though the two-component split (a picker, and a collapsible
parent that holds it and shows the selection beneath) should still hold.

## `marketChannelPicker`

The grid itself. Presentational and fully controlled: every prop comes from the parent, every
change goes out as one event.

| | |
| --- | --- |
| `@api markets` | `{ id, label, groupId, groupLabel }[]`. `groupId`/`groupLabel` are set for Regional (the aggregate market a sub-market sits under) and left unset for Metro, which renders as a flat list. |
| `@api channels` | `{ id, label }[]` |
| `@api selectedPairs` | `'marketId\|channelId'[]` |
| `@api disabled` | |
| Event `selectionchange` | `{ selectedPairs }`, the full next array. |

Select All exists at three levels, all toggling the full set of affected pairs on or off together:
the corner cell (every market times every channel), a column header (one channel, every market),
and a row header (one market, every channel). A group header row (e.g. "Northern NSW") renders
once above the first market in that group, for Regional only.

## `marketChannelSelector`

The collapsible parent (Level 1: holds the working selection, matching the seed-once pattern used
by `burstsAndCustomDayparts` and `spotDurationsAndDayparts`). Shows the current selection
underneath the picker regardless of whether the picker itself is expanded or collapsed.

| | |
| --- | --- |
| `@api markets`, `channels` | Passed straight through to `marketChannelPicker`. |
| `@api marketType` | `'metro' \| 'regional'`, display only in this implementation (the page decides which `markets` list to pass in based on the proposal's Sales Allocation; this component does not fetch or filter). |
| `@api selectedPairs` (seed-once) | The existing selection on open. |
| `@api disabled` | |
| `@api validate()` | Per the source document's Navigation Behaviour, the only rule that exists: at least one market and at least one channel must be selected before the user can move on to the Optimiser Inputs page. There is deliberately no validation on save itself ("there are no validations required on save for this feature"): `validate()` here is the navigation gate, not a save gate. |
| `@api getPayload()` | `{ marketType, markets, channels, pairs }`: de-duplicated market ids, de-duplicated channel ids, and the full pair list, so the Apex mapping layer can shape Linear Parameter records either way once the Channel Inclusion-to-market association question (see below) is settled. |

### Composition

```html
<c-market-channel-selector
    market-type={salesAllocation}
    markets={availableMarketsForAllocation}
    channels={availableChannels}
    selected-pairs={initialSelectedPairs}
    disabled={isBooked}>
</c-market-channel-selector>
```

```js
// Brief page controller, on Save & Close or navigating to Optimiser Inputs
handleNavigateToOptimiserInputs() {
    const selector = this.template.querySelector('c-market-channel-selector');
    const issues = selector.validate();
    if (issues.length) {
        this.showIssues(issues);
        return;
    }
    const { markets, channels, pairs } = selector.getPayload();
    // hand to the shared save alongside every other Brief page component's payload
}
```

## Data model: one open question

The source document's data model table lists two Linear Parameter shapes, `Market Inclusion` and
`Channel Inclusion`, both carrying a `MediaChannel` lookup and an External Identifier sourced from
the Brief, but **does not say whether a Channel Inclusion record also records which market it
belongs to**. `getPayload()`'s `pairs` array (`'marketId|channelId'` strings) carries that
association from the UI; confirm with the team whether the Apex layer should split each pair into
a market-scoped Channel Inclusion record, a Channel Inclusion record with its own market lookup,
or something else, before building the save service.

## `navRailItem`

One entry in the Proposal Builder's left rail (Brief, Optimisation, Spot Management, Billing
Installments, Sponsorship Setup, Review and Book). Owns no navigation logic: the page supplies
`selected`, `locked`, `lockReason`, and `done` from its existing gate (the same `avail()` /
`stepDone()` logic already described for the Proposal Builder shell), and reacts to a `select`
event to change tabs.

| | |
| --- | --- |
| `@api label` | |
| `@api selected`, `locked`, `done`, `collapsed` | |
| `@api lockReason` | Shown as the button's `title` tooltip, appended to the label, when `locked` is true. |
| Slot `icon` | The page supplies the icon markup (this component has no icon set of its own). |
| Event `select` | Fired on click, only when not `locked`. |

A locked item is not clickable at all (a disabled `<button>`, not just visually dimmed). A green
tick badge shows once a step is `done`, but only when the item is neither the currently `selected`
tab nor `locked` (matching the shell's existing rule: the active tab shows its selected state, not
a tick, even once complete). `collapsed` hides the label text for the rail's collapsed width,
leaving only the icon and (if applicable) the tick badge.

### Composition

```html
<c-nav-rail-item
    label="Optimisation"
    selected={isOptimisationTab}
    locked={optimisationLocked}
    lock-reason={optimisationLockReason}
    done={optimisationDone}
    collapsed={railCollapsed}
    onselect={handleGoToOptimisation}>
    <svg slot="icon" ...></svg>
</c-nav-rail-item>
```

## Running the tests

```bash
npm install
npm test
```
