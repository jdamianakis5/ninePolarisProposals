# ninePolarisProposals

Salesforce Lightning Web Components for the Proposal Builder rebuild (Nine media planning
proposals), plus the design handoff documentation they were built from.

## What's here

20 buildable LWC bundles (template, controller, styles, metadata, Jest tests) in
`force-app/main/default/lwc/`, across three features:

- **Durations, Dayparts and Bursts** (Brief and Optimiser Inputs pages): `burstsAndCustomDayparts`,
  `burstPeriods`, `burstPeriod`, `customDayparts`, `customDaypart`, `spotDurationsAndDayparts`,
  `spotDurations`, `standardDayparts`, `durationPill`, `topTailToggle`, `topTailSetParent`,
  `topTailSetChild`, `pill`. See `docs/LWC-DESIGN.md`.
- **Split Creator** (Optimiser Inputs page): `splitConfigurator`, `split`, `splitDetails`,
  `splitActions`. See `docs/LWC-DESIGN-split-creator.md`.
- **Market/Channel Picker and Nav Rail Item** (Brief page): `marketChannelPicker`,
  `marketChannelSelector`, `navRailItem`. See `docs/LWC-DESIGN-market-channel.md`.

`docs/design-handoff/` holds the source design specs and technical design documents these
components implement.

## Running the tests

```bash
npm install
npm test
```

98 tests pass as delivered.
