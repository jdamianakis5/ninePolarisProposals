import { LightningElement, api } from 'lwc';

const BOOKABLE_SECONDS = ['5', '6', '7', '8', '10', '15', '20', '30', '45', '60', '75', '90', '120', '180'];
const BOOKABLE_LIST_TEXT = BOOKABLE_SECONDS.map((value) => `${value}s`).join(', ');

function toNumber(value) {
    const parsed = Number(String(value || '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
}

export function sumOf(set) {
    return toNumber(set.top) + (set.hasMid ? toNumber(set.mid) : 0) + toNumber(set.tail);
}

export function isBookable(set) {
    return BOOKABLE_SECONDS.includes(String(sumOf(set)));
}

/**
 * One Top/Tail (or Top/Middle/Tail) duration set. Rejects a combined total that isn't a
 * bookable duration (Technical Design section 3.2, Level 3). Duplicate-combination
 * checking spans sibling sets, so that message is computed by the parent, topTailSetParent,
 * and handed in as `issue`.
 */
export default class TopTailSetChild extends LightningElement {
    @api set; // { id, top, mid, hasMid, tail }
    @api showRemove = false;
    @api disabled = false;
    @api issue = ''; // duplicate-combination message from the parent, if any

    get sum() {
        return sumOf(this.set);
    }

    get bookable() {
        return isBookable(this.set);
    }

    get invalid() {
        return !this.bookable || !!this.issue;
    }

    get fieldWrapClass() {
        return this.invalid ? 'slds-form-element slds-has-error' : 'slds-form-element';
    }

    get midLabel() {
        return this.set.hasMid ? 'Remove middle duration' : '+ Add middle duration';
    }

    get bookableMessage() {
        if (this.issue) {
            return this.issue;
        }
        return `Top${this.set.hasMid ? ', middle' : ''} and tail add up to ${this.sum}s, which is not a bookable `
            + `duration. Adjust them to total one of: ${BOOKABLE_LIST_TEXT}.`;
    }

    get showOk() {
        return !this.invalid;
    }

    handleTopChange(event) {
        this.emitChange({ top: event.target.value });
    }

    handleMidChange(event) {
        this.emitChange({ mid: event.target.value });
    }

    handleTailChange(event) {
        this.emitChange({ tail: event.target.value });
    }

    handleMidToggle() {
        this.emitChange({ hasMid: !this.set.hasMid, mid: this.set.hasMid ? '' : '5' });
    }

    handleRemove() {
        this.dispatchEvent(new CustomEvent('toptailsetremove', { detail: { id: this.set.id } }));
    }

    emitChange(patch) {
        this.dispatchEvent(new CustomEvent('toptailsetchange', { detail: { id: this.set.id, patch } }));
    }
}
