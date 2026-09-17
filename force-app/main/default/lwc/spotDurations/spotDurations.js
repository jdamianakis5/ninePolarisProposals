import { LightningElement, api } from 'lwc';
import { labelFor } from 'c/topTailSetParent';

/**
 * Level 2 section: the toggle, duration chips, and the Top/Tail sets. Emits the full
 * duration selection upward (Technical Design section 3.2). `durations` in the emitted
 * detail is the combined list that becomes Single Duration / Combo Duration Linear
 * Parameter records: the base selected durations plus, only while Top/Tail is on, one
 * synthetic label per Top/Tail set.
 */
export default class SpotDurations extends LightningElement {
    @api visibleDurations = [];
    @api selected = [];
    @api availableDurations = [];
    @api topTail = false;
    @api topTailSets = [];
    @api fixedOnly = false;
    @api disabled = false;

    get chipLabels() {
        return this.topTail ? this.topTailSets.map((set) => labelFor(set)) : [];
    }

    /**
     * @returns {String[]} the base selected durations plus, only while Top/Tail is on, one
     * synthetic label per Top/Tail set. The same combined list emitted in
     * `spotdurationschange`, exposed so the parent can read it without re-deriving it.
     */
    @api get durations() {
        return [...this.selected, ...this.chipLabels];
    }

    get showTopTailSets() {
        return this.fixedOnly && this.topTail;
    }

    /**
     * @returns {String[]} Top/Tail validation only. Whether at least one duration is
     * selected is a page-level rule (see spotDurationsAndDayparts), since it depends on
     * dayparts too.
     */
    @api validate() {
        if (!this.showTopTailSets) {
            return [];
        }
        return this.template.querySelector('c-top-tail-set-parent').validate();
    }

    handleDurationsChange(event) {
        this.emit({ visibleDurations: event.detail.visibleDurations, selected: event.detail.selected });
    }

    handleToggleChange(event) {
        this.emit({ topTail: event.detail.checked });
    }

    handleTopTailSetsChange(event) {
        this.emit({ topTailSets: event.detail.sets });
    }

    emit(patch) {
        const next = {
            visibleDurations: this.visibleDurations,
            selected: this.selected,
            topTail: this.topTail,
            topTailSets: this.topTailSets,
            ...patch
        };
        const chipLabels = next.topTail ? next.topTailSets.map((set) => labelFor(set)) : [];
        this.dispatchEvent(new CustomEvent('spotdurationschange', {
            detail: { ...next, durations: [...next.selected, ...chipLabels] }
        }));
    }
}
