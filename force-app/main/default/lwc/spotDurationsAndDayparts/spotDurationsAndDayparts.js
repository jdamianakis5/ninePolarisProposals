import { LightningElement, api } from 'lwc';

/**
 * Level 1 card shell for the Optimiser Inputs page (Technical Design section 3.2). Holds
 * the working state for both sections and hands its payload to the Optimiser Inputs
 * page's shared save. Reports its own validity upward via `validate()`.
 *
 * Working state (durations, Top/Tail sets, dayparts) is seeded once from whatever the
 * page loads and owned locally from then on, the same pattern as burstsAndCustomDayparts
 * on the Brief page. `availableDurations` stays a live, page-owned prop: it is reference
 * data (Agreement Default Ratio records), not working state this component ever mutates.
 */
export default class SpotDurationsAndDayparts extends LightningElement {
    @api availableDurations = [];
    @api fixedOnly = false;
    @api disabled = false;

    _visibleDurations = ['15s', '30s', '45s', '60s'];
    _selectedDurations = [];
    _topTail = false;
    _topTailSets = [{ id: 'tt-default', top: '10', mid: '', hasMid: false, tail: '5' }];
    _selectedDayparts = ['Peak'];
    _seeded = {};

    @api
    get visibleDurations() {
        return this._visibleDurations;
    }

    set visibleDurations(value) {
        this.seedOnce('visibleDurations', value);
    }

    @api
    get selectedDurations() {
        return this._selectedDurations;
    }

    set selectedDurations(value) {
        this.seedOnce('selectedDurations', value);
    }

    @api
    get topTail() {
        return this._topTail;
    }

    set topTail(value) {
        this.seedOnce('topTail', value);
    }

    @api
    get topTailSets() {
        return this._topTailSets;
    }

    set topTailSets(value) {
        this.seedOnce('topTailSets', value);
    }

    @api
    get selectedDayparts() {
        return this._selectedDayparts;
    }

    set selectedDayparts(value) {
        this.seedOnce('selectedDayparts', value);
    }

    seedOnce(key, value) {
        if (this._seeded[key]) {
            return;
        }
        this[`_${key}`] = value;
        this._seeded[key] = true;
    }

    /**
     * @returns {String[]} Top/Tail issues, plus the two page-level gates that need both
     * sections to evaluate: at least one duration selected, at least one daypart selected
     * (Technical Design section 8.2, "Durations and dayparts").
     */
    @api validate() {
        const spotDurations = this.template.querySelector('c-spot-durations');
        const issues = [...spotDurations.validate()];
        if (!spotDurations.durations.length) {
            issues.push('At least one duration must be selected before you can proceed beyond the Optimiser Inputs page.');
        }
        if (!this._selectedDayparts.length) {
            issues.push('At least one daypart must be selected before you can proceed beyond the Optimiser Inputs page.');
        }
        return issues;
    }

    /**
     * @returns {{durations: String[], dayparts: String[]}} the current working state,
     * shaped for the Optimiser Inputs page's shared save to map into Linear Parameter
     * records (Single Duration / Combo Duration and Standard Daypart Types respectively).
     */
    @api getPayload() {
        const spotDurations = this.template.querySelector('c-spot-durations');
        return { durations: spotDurations.durations, dayparts: this._selectedDayparts };
    }

    handleSpotDurationsChange(event) {
        const { visibleDurations, selected, topTail, topTailSets } = event.detail;
        this._visibleDurations = visibleDurations;
        this._selectedDurations = selected;
        this._topTail = topTail;
        this._topTailSets = topTailSets;
    }

    handleStandardDaypartsChange(event) {
        this._selectedDayparts = event.detail.selected;
    }
}
