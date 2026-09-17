# Technical Design: Market/Channel Picker Enhancements and Proposal Use

Source: `Channel Picker Enhancements and Proposal Use-170926-005816.pdf`. Unlike the Durations,
Dayparts and Bursts TTP and the Split Creator TTP, this document stops at the functional and data
requirements: "Written detailed design of LWCs" is listed under "To be Completed" at the end of
the source document. The component split below (`marketChannelPicker` /
`marketChannelSelector`) is this implementation's own proposal, not a hierarchy handed down by
the document.

## Functional use of the component

As part of Proposal Creation, the user assigns included markets (aggregate and, for Regional, the
sub-markets within an aggregate) and channels to the proposal, ahead of their use in spot
selection, split creation, and optimisation. The intention is to reuse the same station/channel
picker already available in the Agreements feature. The component should:

- Navigate and view the markets available based on the proposal's Sales Allocation (Metro or
  Regional).
- Present all available markets for that allocation: for Regional users, both aggregate markets
  and the sub-markets that live within them.
- Allow the user to select or deselect individual channels within aggregate and sub-markets.

Stations/Channels are related to the Proposal record as child records, for ease of access later as
filter presets for downstream components (spot selection, split creation, optimisation).

## Data model

Markets/Channels are saved to Linear Parameter records. To support this, the object needs a
`MediaChannel` lookup and `Type` picklist values of `Market` and `Channel` available. The source
table (rendered as a diagram in the PDF, reproduced here) lists two record shapes:

| | Type | Inclusion Type | MediaChannel | External Identifier |
| --- | --- | --- | --- | --- |
| Market row | Market Inclusion | (from Brief) | (from Brief) | |
| Channel row | Channel Inclusion | (from Brief) | (from Brief) | |

**Open item, not resolved by the source document**: whether a Channel Inclusion record also
carries which market it belongs to (a lookup, or a composite external id), or whether market
association is implied some other way. `marketChannelSelector.getPayload()` in this
implementation returns de-duplicated market ids, de-duplicated channel ids, and the full list of
market/channel pairs, so the Apex mapping layer can shape either way once this is confirmed.

## Data sources

Markets and channels are sourced from the Market API, matching the retrieval pattern already
used for Agreement creation (`Media Channel (Brand)` object). Reuse the existing Agreement class
to retrieve markets/channels if possible, passing in the page's Metro/Regional selection as the
filter. An instance of the Media Channel, and potentially a copy of the External Identifier, is
copied to the Linear Parameter records created by this feature.

## Save behaviour (Salesforce and OMS)

Save happens on a call to action: Save & Close, or navigation to another page. It should be a
reusable component callable from other navigation actions, the same one-Apex-trigger-per-page
pattern used for Bursts/Custom Dayparts and Spot Durations/Standard Dayparts. **There are no
validations required on save for this feature.**

## Navigation behaviour

The only gate: users must not be able to navigate to the Optimiser Inputs page without selecting
at least one market and one channel. No other prevention exists. This is the one rule
`marketChannelSelector.validate()` implements.

## Reusable components (per the source document)

- The Agreement feature already retrieves markets and channels with the correct filter set: reuse
  that class, passing in the page's Metro/Regional selection.
- "The station/channel picker should already be defined for the Agreement component: this can be
  reused as well, with the removal of the agreement-specific elements like bonuses and discounts."

**Which picker this refers to is not settled by this implementation.** A markedly richer
market/channel picker exists as a design reference in the same Claude Design project (the
Optimiser prototype's "Split Rules Demo.dc.html"): a hierarchical tree of aggregate markets,
named sub-market groups, individual sub-markets, and solus (standalone) markets, each with an
all/main-station/multi-station channel-scope mode, plus saved presets (`4 Agg`, `5 Agg`,
`5 Agg + WA`). If that tree is the actual Agreements picker being reused, `marketChannelPicker`
in this implementation (a flat grid: rows are markets grouped under a regional aggregate header,
columns are channels, with row/column/all Select All shortcuts) is a deliberately simpler starting
point, not a faithful port of that tree. Confirm which picker is authoritative before this ships.
