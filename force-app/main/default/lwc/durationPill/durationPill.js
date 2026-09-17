import { LightningElement, api } from 'lwc';

/**
 * The chip row for Spot Durations. Renders c-pill for each option in `visibleDurations`
 * plus the Add duration picklist for extra durations (Technical Design section 3.2,
 * Level 3). Durations are sourced from Agreement Default Ratio records in the real build:
 * this component only knows the resolved `availableDurations` catalogue, not where it
 * came from.
 *
 * A duration is never removed from `visibleDurations` once shown: clicking a pill only
 * toggles `selected`, matching the source design ("Clicking a chip toggles selection.
 * Chips are not removed by clicking, only deselected.").
 */
export default class DurationPill extends LightningElement {
    @api visibleDurations = []; // durations always shown as pills: the four mains plus any added
    @api selected = []; // subset of visibleDurations currently toggled on
    @api availableDurations = []; // full catalogue, e.g. from Agreement Default Ratio
    @api disabled = false;

    get pills() {
        return this.visibleDurations.map((value) => ({
            value,
            label: value,
            selected: this.selected.includes(value)
        }));
    }

    get addOptions() {
        return this.availableDurations
            .filter((value) => !this.visibleDurations.includes(value))
            .map((value) => ({ value, label: value }));
    }

    handlePillClick(event) {
        const { value } = event.detail;
        const nextSelected = this.selected.includes(value)
            ? this.selected.filter((v) => v !== value)
            : [...this.selected, value];
        this.emitChange(this.visibleDurations, nextSelected);
    }

    handleAddDuration(event) {
        const value = event.target.value;
        if (!value) {
            return;
        }
        event.target.value = '';
        if (this.visibleDurations.includes(value)) {
            return;
        }
        this.emitChange([...this.visibleDurations, value], [...this.selected, value]);
    }

    emitChange(visibleDurations, selected) {
        this.dispatchEvent(new CustomEvent('durationschange', { detail: { visibleDurations, selected } }));
    }
}
