import { LightningElement, api } from 'lwc';
import { isBookable } from 'c/topTailSetChild';

let nextId = 0;

function generateId() {
    nextId += 1;
    return `tt-set-${Date.now()}-${nextId}`;
}

function newSet() {
    return { id: generateId(), top: '10', mid: '', hasMid: false, tail: '5' };
}

function labelFor(set) {
    const top = set.top || '?';
    const tail = set.tail || '?';
    return set.hasMid ? `Top/Mid/Tail ${top}s/${set.mid || '?'}s/${tail}s` : `Top/Tail ${top}s/${tail}s`;
}

function comboKey(set) {
    return set.hasMid ? `${set.top}|${set.mid}|${set.tail}` : `${set.top}||${set.tail}`;
}

/**
 * Level 3: repeats topTailSets, adds and removes them, and keeps the matching Top/Tail
 * chip in step (Technical Design section 3.2). Also owns the cross-set duplicate-
 * combination check ("No two sets can duplicate the same combination, e.g. two 10s/5s
 * Top/Tail sets"): exact message copy is unconfirmed in the source design, so the wording
 * below is a placeholder pending sign-off.
 */
export default class TopTailSetParent extends LightningElement {
    @api sets = [];
    @api disabled = false;

    get rows() {
        const duplicateIssues = this.duplicateIssuesBySetId();
        return this.sets.map((set) => ({
            id: set.id,
            set,
            issue: duplicateIssues[set.id] || '',
            showRemove: this.sets.length > 1,
            disabled: this.disabled
        }));
    }

    /**
     * @returns {String[]} one message per set that is not a bookable total, plus one per
     * set that duplicates an earlier set's combination.
     */
    @api validate() {
        const duplicateIssues = this.duplicateIssuesBySetId();
        return this.sets
            .map((set, index) => {
                if (!isBookable(set)) {
                    return `Top/tail set ${index + 1} does not total a bookable duration.`;
                }
                if (duplicateIssues[set.id]) {
                    return duplicateIssues[set.id];
                }
                return null;
            })
            .filter(Boolean);
    }

    duplicateIssuesBySetId() {
        const issues = {};
        this.sets.forEach((set, index) => {
            const firstMatchIndex = this.sets.findIndex((other) => comboKey(other) === comboKey(set));
            if (firstMatchIndex !== index) {
                issues[set.id] = `Top/tail set ${index + 1} duplicates set ${firstMatchIndex + 1}.`;
            }
        });
        return issues;
    }

    handleAddSet() {
        if (this.disabled) {
            return;
        }
        this.emitChange([...this.sets, newSet()]);
    }

    handleSetChange(event) {
        const { id, patch } = event.detail;
        this.emitChange(this.sets.map((set) => (set.id === id ? { ...set, ...patch } : set)));
    }

    handleSetRemove(event) {
        const { id } = event.detail;
        if (this.sets.length <= 1) {
            return;
        }
        this.emitChange(this.sets.filter((set) => set.id !== id));
    }

    emitChange(sets) {
        this.dispatchEvent(new CustomEvent('toptailsetschange', {
            detail: { sets, chipLabels: sets.map((set) => labelFor(set)) }
        }));
    }
}

export { newSet, labelFor };
