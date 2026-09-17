# Split Creator and Spreading Rules: the contract

Source: "Split Creator and Spreading Rules: the contract" (Claude Design project, `Split Rules
Contract.dc.html` / `Split Rules Demo.dc.html`). This extract covers only the **Split Creator**
sections; Spreading Rules (multi-spotting, audience floor, spread, inventory adjustments) is a
separate component on the Optimiser Inputs page, out of scope for this handoff.

## Principles

1. The payload is the source of truth. What the user typed is what is sent, what is stored, and
   what is read back. No derived state is persisted separately.
2. Every option is a record id. Markets, channels, dayparts, days, and durations render from
   Salesforce reference objects and serialise as ids, with labels alongside.
3. Units are carried, not resolved away. A split entered as percentages stays percentages. The
   resolved absolute travels with it as a convenience, never as the authority. One unit per split,
   set when the split is created.
4. A returned run is read only. When the response comes back with `asRun` true, the components
   repopulate and lock. Editing means starting a new run.

## What the Split Creator must do

**2.1 Goals create and pin splits.** Fixed Budget, Fixed Audience, and Highest Reach sit above the
splits and drive what has to exist. Fixed Budget and Fixed Audience are independent toggles.
Either, both, or neither can be on. Turning on Fixed Audience reveals a 000s / TARPs choice
directly beneath it, which decides which split is created and can be changed later, converting the
existing split in place. Turning on either toggle creates its matching split immediately, seeded
with a sensible first grouping; turning it off removes that split and its values in this reference
prototype (**note**: `docs/LWC-DESIGN.md` follows the TTP Component Design instead, which is
explicit that deselecting a goal unlocks the split for removal but does not delete it
automatically). A split created by a goal cannot be deleted while the goal is on: the remove action
is disabled, not hidden. The metric pills (Budget, TARPs, 000s, Spots, CPM, CPT) add further
optional splits at any time.

**2.2 Grouping, in the order picked.** Group by offers Market, Channel, Day Part, Duration, Day,
and (fixed-only campaigns) Custom Time Period. Maximum of three selected at once. Level order
follows the order the user ticked them: untick and retick to reorder, there is no rank control.
Market is not offered on a TARP split: it is filtered out of the list, and removed from an existing
split if the metric changes to TARPs. A dimension with no upstream selections is disabled and
annotated "none selected"; the same annotation applies to Split by Week, Split by Burst, and
Custom Time Period. Split by Week and Split by Burst are mutually exclusive and are the only
column drivers: the chosen driver always occupies level 1, above the group-by levels, and cannot
be reordered. Split by Burst is disabled until at least one burst period exists on the Brief.

**2.3 Units per split.** One unit for the whole split, chosen when the split is created. A split is
either absolute ($ for Budget, # for TARPs, 000s and Spots) or percentage. Every level carries that
same unit; there is no per-level unit control. CPM and CPT are rates, so they are dollar splits
only, including on second and later CPM/CPT splits. Absolute splits are created by the Fixed
Budget, Fixed Audience and Fixed Price toggles; the metric pills add percentage splits, except for
CPM and CPT, which are added as dollar splits. A percentage in a week- or burst-driven split is
relative to its column: the rows in one week must total 100%.

**2.4 Where values are entered.** Values sit on the lowest level of the split, and nowhere else.
Per-week and per-burst values are only accepted on the lowest group-by level. On an absolute
split, every level above the lowest takes one total for the row, a hard allocation whose children
must sum to it. On a percentage split, levels above the lowest take no value at all: their cells and
totals are read-only rollups of the level below. With no column driver, there are no weekly
columns, so every level takes a total. Changing the number of levels keeps whatever values still
sit on a level that can hold them; the rest are dropped.

**2.5 No duplicate allocation.** A dimension is allocated in one split per metric, never two. Two
splits of the same metric cannot both allocate the same dimension at their lowest level, whatever
their units (budget in dollars by market and budget in percent by market is the case this
prevents). Different metrics are unaffected. The first split created keeps the dimension; in the
other split those rows stay visible with their value fields greyed out, and a tooltip names the
split that owns them. The greyed rows are reclaimed either by adding a level below them in this
split, or by clearing the values in the split that owns them.

**2.6 The grid.** Rows nest to the depth of the grouping. Columns come from the column driver,
paged when there are more weeks than fit. Multi-select rows, then group them into one line,
ungroup them again, apply an even split, clear, upweight, copy, or paste across levels or across all
columns. Row totals and the split total show the allocated figure against the expected figure,
with the shortfall or overage called out. On a percentage split, a week column that does not total
100% turns its column header red and blocks the run.

**2.7 Enforce for breakouts.** Any dimension not already used for grouping can be selected as a
breakout. A split with breakouts is held within every one of them, not just across the campaign in
total. There is no separate hard-constraint switch: breakout enforcement is the whole mechanism.

## Validation (Split Creator rows only)

| Rule | Behaviour | Severity |
| --- | --- | --- |
| Fixed Budget on, no value anywhere | The budget split shows an inline requirement. Either the split total or at least one level must carry a dollar amount. | Blocker |
| Fixed Audience on, no value anywhere | Same rule against the TARP or 000s split, with the number rather than a dollar amount. | Blocker |
| Goal split deletion | The remove action is disabled while the goal that created the split is on. | Blocker |
| More than three group-by dimensions | Remaining options are disabled and annotated "three level maximum". | Blocker |
| Both column drivers selected | Selecting one clears the other. Only one column driver can be active. | Blocker |
| Split by Burst with no bursts | The option is disabled and points the user at the Brief to create burst periods. | Blocker |
| Levels do not add to their parent | The row shows the shortfall or overage and the split reports as off target. | Warning |
| No optimisation goal selected | The run is blocked until at least one goal is on. | Blocker |

## Reference data

| Dimension | Source object | Carried in the payload |
| --- | --- | --- |
| Market | `Market__c` | Record id, short code, display label. Aggregate and sub-aggregate markets are the same object with a parent reference. |
| Channel | `Channel__c` | Record id, code, label. Availability per market comes from the market-channel junction. |
| Day Part | `Daypart__c` | Record id, code, label. |
| Day | `Weekday__c` | Record id, code, label. Fixed seven-record set. |
| Duration | `Spot_Duration__c` | Record id, seconds, label. Top/tail sets resolve to the bookable total duration. |
| Demographic | `Demographic__c` | Record id only, on the campaign context. |
| Week / Burst / Time period | Proposal-local | Minted on the Proposal. Ids are stable for the life of the proposal, not global. |

**Reference object API names are placeholders**, per the contract's own "Still open" section:
confirm the real objects, and whether markets and channels are one object with a record type.

## The payload (worked example)

```json
{
  "schemaVersion": "1.0",
  "proposalId": "a0X5j000001AbCdEAJ",
  "context": {
    "campaign": { "startDate": "2026-09-07", "endDate": "2026-11-01", "demographicId": "a1D5j000000GhIjEAK", "marketType": "METRO", "tradingModels": ["FIXED"] },
    "weeks": [{ "weekId": "w1", "index": 1, "startDate": "2026-09-07", "label": "W1 - 07 Sep" }],
    "bursts": [{ "burstId": "b1", "name": "Launch", "startDate": "2026-09-07", "endDate": "2026-09-27" }],
    "timePeriods": [{ "timePeriodId": "tp1", "start": "18:00", "end": "22:30" }]
  },
  "goals": {
    "fixedBudget": { "enabled": true, "amount": 1250000, "currencyIsoCode": "AUD" },
    "fixedAudience": { "enabled": true, "unit": "TARPS", "amount": 850 },
    "highestReach": { "enabled": false }
  },
  "splitConstraints": [
    {
      "constraintId": "sc-1",
      "metric": "BUDGET",
      "required": true,
      "columnDriver": { "type": "WEEK" },
      "groupBy": [
        { "level": 1, "dimension": "MARKET", "unit": "PERCENT" },
        { "level": 2, "dimension": "CHANNEL", "unit": "CURRENCY" }
      ],
      "breakouts": ["DAYPART"],
      "total": { "value": 1250000, "unit": "CURRENCY" },
      "mergedGroups": [{ "dimension": "MARKET", "groupId": "g-1", "label": "Sydney; Melbourne", "memberIds": ["a2M...1", "a2M...2"] }],
      "rows": [
        { "rowId": "sc-1-r001", "level": 1, "path": [{ "dimension": "MARKET", "refIds": ["a2M...1"] }], "column": { "type": "WEEK", "id": "w1" }, "entered": { "value": 60, "unit": "PERCENT" }, "resolved": { "value": 375000, "unit": "CURRENCY" } },
        { "rowId": "sc-1-r002", "level": 2, "parentRowId": "sc-1-r001", "path": [{ "dimension": "MARKET", "refIds": ["a2M...1"] }, { "dimension": "CHANNEL", "refIds": ["a3C...1"] }], "column": { "type": "WEEK", "id": "w1" }, "entered": { "value": 240000, "unit": "CURRENCY" }, "resolved": { "value": 240000, "unit": "CURRENCY" } }
      ]
    }
  ]
}
```

**Open tension worth reconciling before build**: this worked example shows `groupBy[0].unit`
(`PERCENT`) differing from `groupBy[1].unit` (`CURRENCY`) within the same split, and shows an
`entered` value on a non-leaf row (level 1), both of which read as contradicting the "one unit per
split" and "values sit on the lowest level, and nowhere else" prose above. `docs/LWC-DESIGN.md`
documents the simplification this implementation makes (one unit for the whole split, values only
at the leaf, plus one fixed total on the overall row) and flags the discrepancy for the optimiser
team rather than silently picking a side.

## Storage and round trip

| Field | Type | Purpose |
| --- | --- | --- |
| `Optimiser_Request_JSON__c` | Long Text Area (131,072) | The full request, stored verbatim on the Proposal at the moment Run Optimiser is pressed. Rehydrates both components. |
| `Last_Optimiser_Result_Id__c` | Text (50) | Identifier of the optimised result. The result itself is refetched on demand, not stored. |
| `Optimiser_Request_Sent_At__c` | DateTime | Stamps the stored payload so a stale request can be detected against later Brief edits. |

Round-trip rules: no recomputation on load (an entered percentage is redisplayed as that
percentage; the resolved absolute is recalculated from it, never read back from the payload);
group-by order comes from the level numbers, not array position; merged row groups rebuild from
`mergedGroups` before rows are laid out; a `refId` no longer present in reference data renders as a
disabled chip with a warning rather than being silently dropped; `asRun: true` puts the whole
Split Creator into read-only with a banner offering "Edit as a new run" (clones the request with
`asRun: false` and clears the result id).

## Still open (per the contract itself)

- Reference object API names are placeholders (Nine platform).
- How long the optimiser keeps a result addressable by id (Optimiser team).
- Payload size ceiling: a three-level split across all regional markets, every channel, and 13
  weeks needs sizing against the 131,072 character field (Joint).
- Whether a CPM/CPT rate split is a ceiling per level or a target the optimiser solves toward
  (Optimiser team).
