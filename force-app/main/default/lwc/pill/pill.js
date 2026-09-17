import { LightningElement, api } from 'lwc';

/**
 * A single selectable chip. Shared, presentational leaf used by durationPill (one per
 * duration option) and standardDayparts (one per Peak/Off-Peak/Mid-Dawn option).
 * Owns no business logic: the parent decides what "selected" means for its own list.
 */
export default class Pill extends LightningElement {
    @api label;
    @api value;
    @api selected = false;
    @api disabled = false;

    get pillClass() {
        return this.selected ? 'pill pill_selected' : 'pill';
    }

    handleClick() {
        if (this.disabled) {
            return;
        }
        this.dispatchEvent(new CustomEvent('pillclick', { detail: { value: this.value } }));
    }
}
