import { LightningElement, api } from 'lwc';

/**
 * The collapsible parent for the Brief page's market/channel selection (Technical
 * Design: Market/Channel Picker Enhancements and Proposal Use). Holds the current working
 * selection, hosts c-market-channel-picker, and always shows the current selection as a
 * summary underneath, whether the picker itself is expanded or collapsed.
 *
 * Save has no validation of its own (per the source design: "there are no validations
 * required on save for this feature"). The one rule that exists lives here as the
 * navigation gate: at least one market and one channel before the Optimiser Inputs page.
 */
export default class MarketChannelSelector extends LightningElement {
    @api markets = []; // { id, label, groupId, groupLabel }[]
    @api channels = []; // { id, label }[]
    @api marketType = 'metro'; // 'metro' | 'regional'
    @api disabled = false;

    _selectedPairs = [];
    _seeded = false;
    open = true;

    @api
    get selectedPairs() {
        return this._selectedPairs;
    }

    set selectedPairs(value) {
        if (!this._seeded) {
            this._selectedPairs = value || [];
            this._seeded = true;
        }
    }

    get chevron() {
        return this.open ? '▾' : '▸';
    }

    get selectedMarketIds() {
        return [...new Set(this._selectedPairs.map((pair) => pair.split('|')[0]))];
    }

    get selectedChannelIds() {
        return [...new Set(this._selectedPairs.map((pair) => pair.split('|')[1]))];
    }

    get summaryText() {
        const marketCount = this.selectedMarketIds.length;
        const channelCount = this.selectedChannelIds.length;
        if (!marketCount && !channelCount) {
            return 'Nothing selected';
        }
        return `${marketCount} market${marketCount === 1 ? '' : 's'} · ${channelCount} channel${channelCount === 1 ? '' : 's'}`;
    }

    get summaryGroups() {
        return this.selectedMarketIds.map((marketId) => {
            const market = this.markets.find((m) => m.id === marketId);
            const channelIds = this._selectedPairs
                .filter((pair) => pair.split('|')[0] === marketId)
                .map((pair) => pair.split('|')[1]);
            const channelLabels = channelIds.map((id) => (this.channels.find((c) => c.id === id) || {}).label || id);
            return { key: marketId, label: (market || {}).label || marketId, channels: channelLabels.join(', ') };
        });
    }

    get hasSelection() {
        return this._selectedPairs.length > 0;
    }

    /**
     * @returns {String[]} blocking issues: at least one market and one channel must be
     * selected before the user can navigate to the Optimiser Inputs page.
     */
    @api validate() {
        const issues = [];
        if (!this.selectedMarketIds.length) {
            issues.push('Select at least one market before moving on to the Optimiser Inputs page.');
        }
        if (!this.selectedChannelIds.length) {
            issues.push('Select at least one channel before moving on to the Optimiser Inputs page.');
        }
        return issues;
    }

    /**
     * @returns the current selection, shaped for the Brief page's shared save to map into
     * Linear Parameter records: one "Market Inclusion" record per market, one "Channel
     * Inclusion" record per selected market/channel pair.
     */
    @api getPayload() {
        return {
            marketType: this.marketType,
            markets: this.selectedMarketIds,
            channels: this.selectedChannelIds,
            pairs: this._selectedPairs
        };
    }

    handleToggleOpen() {
        this.open = !this.open;
    }

    handleSelectionChange(event) {
        this._selectedPairs = event.detail.selectedPairs;
    }
}
