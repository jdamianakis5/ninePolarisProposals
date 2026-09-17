import { LightningElement, api } from 'lwc';

const OPTIONS = ['Peak', 'Off-Peak', 'Mid-Dawn'];

/**
 * Level 2 section: standard daypart selection. No longer needs a wrapper shared with
 * custom dayparts, since custom dayparts moved to the Brief page; renders c-pill directly
 * rather than through a Level 3 child (Technical Design section 3.2).
 */
export default class StandardDayparts extends LightningElement {
    @api selected = [];
    @api disabled = false;

    get pills() {
        return OPTIONS.map((value) => ({ value, label: value, selected: this.selected.includes(value) }));
    }

    handlePillClick(event) {
        const { value } = event.detail;
        const next = this.selected.includes(value)
            ? this.selected.filter((v) => v !== value)
            : [...this.selected, value];
        this.dispatchEvent(new CustomEvent('standarddaypartschange', { detail: { selected: next } }));
    }
}
