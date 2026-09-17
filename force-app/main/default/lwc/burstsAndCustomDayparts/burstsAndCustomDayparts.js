import { LightningElement, api } from 'lwc';

/**
 * Level 1 card shell for the Brief page (Technical Design section 3.1). Holds the working
 * state for both sections and hands its payload to the Brief page's shared save. Reports
 * its own validity upward via `validate()`.
 *
 * `bursts` and `dayparts` are seeded once from whatever the page loads (existing Linear
 * Parameter records mapped to plain rows) and owned locally from then on: this component,
 * not the page, is the source of truth while the card is open. `defaultDayparts` stays a
 * live, page-owned prop since it only ever changes as a result of Update Defaults succeeding
 * server-side.
 */
export default class BurstsAndCustomDayparts extends LightningElement {
    @api planStart; // ISO yyyy-mm-dd
    @api planEnd; // ISO yyyy-mm-dd
    @api fixedOnly = false;
    @api defaultDayparts = [];
    @api disabled = false;

    _bursts = [];
    _burstsSeeded = false;
    _dayparts = [];
    _daypartsSeeded = false;

    @api
    get bursts() {
        return this._bursts;
    }

    set bursts(value) {
        if (!this._burstsSeeded) {
            this._bursts = value || [];
            this._burstsSeeded = true;
        }
    }

    @api
    get dayparts() {
        return this._dayparts;
    }

    set dayparts(value) {
        if (!this._daypartsSeeded) {
            this._dayparts = value || [];
            this._daypartsSeeded = true;
        }
    }

    /**
     * @returns {String[]} every validation issue across both sections. Custom Dayparts is
     * only checked while the campaign is fixed-only: it isn't rendered otherwise, and its
     * data (if any survives from an earlier fixed-only state) is preserved, not re-validated.
     */
    @api validate() {
        const burstPeriods = this.template.querySelector('c-burst-periods');
        const customDayparts = this.template.querySelector('c-custom-dayparts');
        const issues = [...burstPeriods.validate()];
        if (this.fixedOnly && customDayparts) {
            issues.push(...customDayparts.validate());
        }
        return issues;
    }

    /**
     * @returns {{bursts: Array, dayparts: Array}} the current working state, shaped for the
     * Brief page's shared save to map into Linear Parameter records (Burst Period and
     * Custom Daypart Types respectively). `dayparts` is returned even when the campaign is
     * not currently fixed-only: whether data entered under an earlier fixed-only state
     * should be cleared, preserved, or flagged is an open question (see
     * docs/design-handoff/spot-timing-panel.md), so this component defaults to preserving
     * it rather than silently deleting it.
     */
    @api getPayload() {
        return { bursts: this._bursts, dayparts: this._dayparts };
    }

    handleBurstsChange(event) {
        this._bursts = event.detail.bursts;
    }

    handleDaypartsChange(event) {
        this._dayparts = event.detail.dayparts;
    }

    handleUpdateDefaults(event) {
        // Persisting the new Account-level default is an immediate action, independent of
        // the page's Save & Close save. This component does not call Apex directly: it
        // reports the intent upward so the Brief page can invoke the default-saving service
        // and, on success, pass a refreshed `defaultDayparts` back down.
        this.dispatchEvent(new CustomEvent('updatedefaults', { detail: event.detail }));
    }
}
