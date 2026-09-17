import { LightningElement, api } from 'lwc';

/**
 * The market/channel grid itself (Technical Design: Market/Channel Picker Enhancements
 * and Proposal Use). Presents every market available to the proposal's Sales Allocation
 * (Metro, or Regional with its aggregate markets and their sub-markets) as rows, and
 * every channel as columns, with Select All shortcuts per row, per column, and for the
 * whole grid, the same pattern already used for the Spot Management station/channel
 * picker on this page.
 *
 * This is a grid, not the fuller aggregate/group/sub-market/solus tree with presets seen
 * in the Optimiser prototype's market picker: that richer picker may be the one actually
 * shared with the Agreements feature. Confirm which picker is being reused before this
 * ships (see docs/LWC-DESIGN.md).
 */
export default class MarketChannelPicker extends LightningElement {
    @api markets = []; // { id, label, groupId, groupLabel }[]; groupId/groupLabel unset for Metro
    @api channels = []; // { id, label }[]
    @api selectedPairs = []; // 'marketId|channelId'[]
    @api disabled = false;

    get hasGroups() {
        return this.markets.some((market) => market.groupId);
    }

    pairKey(marketId, channelId) {
        return `${marketId}|${channelId}`;
    }

    isSelected(marketId, channelId) {
        return this.selectedPairs.includes(this.pairKey(marketId, channelId));
    }

    get allSelected() {
        return this.markets.length > 0 && this.channels.length > 0
            && this.markets.every((market) => this.channels.every((channel) => this.isSelected(market.id, channel.id)));
    }

    get columnHeaders() {
        return this.channels.map((channel) => {
            const on = this.markets.length > 0 && this.markets.every((market) => this.isSelected(market.id, channel.id));
            return { id: channel.id, label: channel.label, allOn: on };
        });
    }

    get rows() {
        let lastGroup = null;
        return this.markets.map((market) => {
            const showGroupHeader = this.hasGroups && market.groupLabel !== lastGroup;
            lastGroup = market.groupLabel;
            const rowOn = this.channels.length > 0 && this.channels.every((channel) => this.isSelected(market.id, channel.id));
            return {
                id: market.id,
                label: market.label,
                groupLabel: showGroupHeader ? market.groupLabel : null,
                rowAllOn: rowOn,
                cells: this.channels.map((channel) => ({
                    key: this.pairKey(market.id, channel.id),
                    marketId: market.id,
                    channelId: channel.id,
                    on: this.isSelected(market.id, channel.id)
                }))
            };
        });
    }

    handleToggleAll() {
        if (this.disabled) {
            return;
        }
        const next = this.allSelected
            ? []
            : this.markets.flatMap((market) => this.channels.map((channel) => this.pairKey(market.id, channel.id)));
        this.emitChange(next);
    }

    handleToggleColumn(event) {
        if (this.disabled) {
            return;
        }
        const { channelid } = event.currentTarget.dataset;
        const allOn = this.markets.every((market) => this.isSelected(market.id, channelid));
        let next = this.selectedPairs.filter((pair) => pair.split('|')[1] !== channelid);
        if (!allOn) {
            next = [...next, ...this.markets.map((market) => this.pairKey(market.id, channelid))];
        }
        this.emitChange(next);
    }

    handleToggleRow(event) {
        if (this.disabled) {
            return;
        }
        const { marketid } = event.currentTarget.dataset;
        const allOn = this.channels.every((channel) => this.isSelected(marketid, channel.id));
        let next = this.selectedPairs.filter((pair) => pair.split('|')[0] !== marketid);
        if (!allOn) {
            next = [...next, ...this.channels.map((channel) => this.pairKey(marketid, channel.id))];
        }
        this.emitChange(next);
    }

    handleToggleCell(event) {
        if (this.disabled) {
            return;
        }
        const { key } = event.currentTarget.dataset;
        const next = this.selectedPairs.includes(key)
            ? this.selectedPairs.filter((pair) => pair !== key)
            : [...this.selectedPairs, key];
        this.emitChange(next);
    }

    emitChange(selectedPairs) {
        this.dispatchEvent(new CustomEvent('selectionchange', { detail: { selectedPairs } }));
    }
}
