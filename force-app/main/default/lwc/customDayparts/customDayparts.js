import { LightningElement, api } from 'lwc';

let nextId = 0;

function generateId() {
    nextId += 1;
    return `daypart-${Date.now()}-${nextId}`;
}

function sameTriple(a, b) {
    return (a.name || '') === (b.name || '') && a.start === b.start && a.end === b.end;
}

/**
 * Level 2 section: repeats customDaypart rows, runs the overlap check across the list, and
 * owns the Update Defaults action (Technical Design section 2, 6.5). Visible only for
 * fixed-only campaigns, but that gate is the parent's (burstsAndCustomDayparts) decision.
 */
export default class CustomDayparts extends LightningElement {
    @api dayparts = []; // { id, name, start, end, isApplyByDefault }[]
    @api defaultDayparts = []; // the stored Account-level default set, for comparison only
    @api disabled = false;

    get rows() {
        const issues = this.issuesByDaypartId();
        return this.dayparts.map((daypart, index) => ({
            id: daypart.id,
            daypart,
            placeholder: `Daypart ${index + 1}`,
            issue: issues[daypart.id] || '',
            disabled: this.disabled
        }));
    }

    get canUpdateDefaults() {
        if (!this.dayparts.length) {
            return false;
        }
        const diverged = !this.dayparts.every((d) => d.isApplyByDefault === true)
            || this.dayparts.length !== this.defaultDayparts.length
            || !this.dayparts.every((d) => this.defaultDayparts.some((def) => sameTriple(d, def)));
        return diverged;
    }

    get updateDefaultsDisabled() {
        return this.disabled || !this.canUpdateDefaults;
    }

    /**
     * @returns {String[]} one message per row missing a time, or per overlapping pair.
     * Custom dayparts are entirely optional: an empty list is valid.
     */
    @api validate() {
        const issues = this.issuesByDaypartId();
        return this.dayparts.filter((d) => issues[d.id]).map((d) => issues[d.id]);
    }

    issuesByDaypartId() {
        const parsed = this.dayparts.map((daypart, index) => ({
            daypart,
            name: daypart.name || `Daypart ${index + 1}`
        }));
        const issues = {};
        parsed.forEach((item, index) => {
            const { start, end } = item.daypart;
            if (!start || !end) {
                issues[item.daypart.id] = `Custom time period ${item.name} needs both a start and an end time.`;
                return;
            }
            const clash = parsed.find((other, otherIndex) => {
                if (otherIndex <= index) {
                    return false;
                }
                const { start: oStart, end: oEnd } = other.daypart;
                return oStart && oEnd && oStart <= end && start <= oEnd;
            });
            if (clash) {
                issues[item.daypart.id] = `${item.name} overlaps ${clash.name}.`;
            }
        });
        return issues;
    }

    handleAdd() {
        if (this.disabled) {
            return;
        }
        this.emitChange([...this.dayparts, { id: generateId(), name: '', start: '', end: '', isApplyByDefault: false }]);
    }

    handleDaypartChange(event) {
        const { id, patch } = event.detail;
        this.emitChange(this.dayparts.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    }

    handleDaypartRemove(event) {
        const { id } = event.detail;
        this.emitChange(this.dayparts.filter((d) => d.id !== id));
    }

    handleUpdateDefaults() {
        if (this.updateDefaultsDisabled) {
            return;
        }
        this.dispatchEvent(new CustomEvent('updatedefaults', { detail: { dayparts: this.dayparts } }));
    }

    emitChange(dayparts) {
        this.dispatchEvent(new CustomEvent('customdaypartschange', { detail: { dayparts } }));
    }
}
