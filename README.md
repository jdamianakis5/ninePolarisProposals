# ninePolarisProposals

Salesforce Lightning Web Components for the Proposal Builder rebuild (Nine media planning
proposals), plus the design handoff documentation they were built from.

## What's here

- `force-app/main/default/lwc/`: 13 buildable LWC bundles (template, controller, styles,
  metadata, Jest tests) implementing Durations, Dayparts and Bursts across two pages.
  - **Brief page** (Bursts and Custom Dayparts): `burstsAndCustomDayparts`, `burstPeriods`,
    `burstPeriod`, `customDayparts`, `customDaypart`.
  - **Optimiser Inputs page** (Spot Durations and Standard Dayparts): `spotDurationsAndDayparts`,
    `spotDurations`, `standardDayparts`, `durationPill`, `topTailToggle`, `topTailSetParent`,
    `topTailSetChild`.
  - Shared: `pill`.
- `docs/LWC-DESIGN.md`: the developer-facing spec for all 13 components (`@api` properties,
  events, public methods, composition examples, data model mapping).
- `docs/design-handoff/`: the source design specs, including the authoritative Technical Design
  PDF these components implement.

## Running the tests

```bash
npm install
npm test
```

55 tests pass as delivered. See `docs/LWC-DESIGN.md` for what each suite covers.
