import { LightningElement, api } from 'lwc';

const BOOKABLE_SECONDS = ['5', '6', '7', '8', '10', '15', '20', '30', '45', '60', '75', '90', '120', '180'];
const BOOKABLE_LIST_TEXT = BOOKABLE_SECONDS.map((value) => `${value}s`).join(', ');

let nextId = 0;

function generateId() {
    nextId += 1;
    return `tt-set-${Date.now()}-${nextId}`;
}

function newSet() {
    return { id: generateId(), top: '10', mid: '', hasMid: false, tail: '5' };
}

function toNumber(value) {
    const parsed = Number(String(value || '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
}

function sumOf(set) {
    return toNumber(set.top) + (set.hasMid ? toNumber(set.mid) : 0) + toNumber(set.tail);
}

function isValid(set) {
    return BOOKABLE_SECONDS.includes(String(sumOf(set)));
}

function labelFor(set) {
    const top = set.top || '?';
    const tail = set.tail || '?';
    return set.hasMid ? `Top/Mid/Tail ${top}s/${set.mid || '?'}s/${tail}s` : `Top/Tail ${top}s/${tail}s`;
}

/**
 * Top/Tail durations editor for the Proposal Builder Brief page (Stations & Timing,
 * Spot Durations section). Fixed-only feature: the parent renders this only when the
 * campaign is fixed-only (see composition notes in LWC-DESIGN.md), the same pattern
 * used for c-custom-dayparts.
 *
 * A duration built from a Top/Tail set also has to appear as a chip in the sibling
 * "Spot Durations" chip picker (e.g. "Top/Tail 10s/5s"). This component does not own
 * that chip list: it reports the current labels via `chipLabels` on every change event,
 * and the parent reconciles them into its own duration selection.
 */
export default class TopTailDurations extends LightningElement {
    @api topTail = false;
    @api topTailSets = [];
    @api disabled = false;

    get rows() {
        return this.topTailSets.map((set, index) => {
            const sum = sumOf(set);
            const invalid = !isValid(set);
            return {
                id: set.id,
                top: set.top,
                mid: set.mid,
                tail: set.tail,
                hasMid: set.hasMid,
                fieldWrapClass: invalid ? 'slds-form-element slds-has-error' : 'slds-form-element',
                midLabel: set.hasMid ? 'Remove middle duration' : '+ Add middle duration',
                showRemove: this.topTailSets.length > 1,
                showError: invalid,
                errorText: invalid ? this.detailedMessage(set, sum) : '',
                showOk: !invalid,
                okText: `Totals ${sum}s.`,
                disabled: this.disabled
            };
        });
    }

    detailedMessage(set, sum) {
        return `Top${set.hasMid ? ', middle' : ''} and tail add up to ${sum}s, which is not a bookable duration. `
            + `Adjust them to total one of: ${BOOKABLE_LIST_TEXT}.`;
    }

    /**
     * @returns {String[]} short-form issues, one per set that does not total a bookable
     * duration, matching the wording the Proposal Builder navigation guard already uses:
     * "Top/tail set {n} does not total a bookable duration."
     */
    @api validate() {
        if (!this.topTail) {
            return [];
        }
        return this.topTailSets
            .map((set, index) => ({ set, index }))
            .filter(({ set }) => !isValid(set))
            .map(({ index }) => `Top/tail set ${index + 1} does not total a bookable duration.`);
    }

    handleToggle() {
        if (this.disabled) {
            return;
        }
        const nextOn = !this.topTail;
        const nextSets = nextOn && this.topTailSets.length === 0 ? [newSet()] : this.topTailSets;
        this.emitChange(nextOn, nextSets);
    }

    handleAddSet() {
        if (this.disabled) {
            return;
        }
        this.emitChange(this.topTail, [...this.topTailSets, newSet()]);
    }

    handleRemoveSet(event) {
        const { id } = event.currentTarget.dataset;
        if (this.topTailSets.length <= 1) {
            return;
        }
        this.emitChange(this.topTail, this.topTailSets.filter((set) => set.id !== id));
    }

    handleMidToggle(event) {
        const { id } = event.currentTarget.dataset;
        this.emitChange(this.topTail, this.topTailSets.map((set) =>
            (set.id === id ? { ...set, hasMid: !set.hasMid, mid: set.hasMid ? '' : '5' } : set)
        ));
    }

    handleTopChange(event) {
        this.patchSet(event.currentTarget.dataset.id, { top: event.target.value });
    }

    handleMidChange(event) {
        this.patchSet(event.currentTarget.dataset.id, { mid: event.target.value });
    }

    handleTailChange(event) {
        this.patchSet(event.currentTarget.dataset.id, { tail: event.target.value });
    }

    patchSet(id, patch) {
        this.emitChange(this.topTail, this.topTailSets.map((set) => (set.id === id ? { ...set, ...patch } : set)));
    }

    emitChange(topTail, topTailSets) {
        const chipLabels = topTail ? topTailSets.map((set) => labelFor(set)) : [];
        this.dispatchEvent(new CustomEvent('toptailchange', { detail: { topTail, topTailSets, chipLabels } }));
    }
}
