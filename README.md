# ninePolarisProposals

Salesforce Lightning Web Components for the Proposal Builder rebuild (Nine media planning
proposals), plus the design handoff documentation they were built from.

## What's here

- `force-app/main/default/lwc/`: buildable LWC bundles (template, controller, styles, metadata,
  Jest tests).
  - `burstPeriods`: the Burst Periods section of the Brief page's Stations & Timing panel.
  - `customDayparts`: the fixed-only-only custom time period list in the Dayparts section.
  - `topTailDurations`: the Top/Tail durations toggle and set editor in the Spot Durations
    section.
- `docs/LWC-DESIGN.md`: the developer-facing spec for the three components above (`@api`
  properties, events, public methods, composition examples, data model notes).
- `docs/design-handoff/`: the source design specs these components implement, exported from the
  Claude Design project.

## Running the tests

```bash
npm install
npm test
```

15 tests pass as delivered. See `docs/LWC-DESIGN.md` for what each suite covers.
