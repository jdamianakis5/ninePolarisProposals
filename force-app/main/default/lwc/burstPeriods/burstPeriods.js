import { LightningElement, api } from 'lwc';

let nextId = 0;

function generateId() {
    nextId += 1;
    return `burst-${Date.now()}-${nextId}`;
}

function toDate(iso) {
    if (!iso) {
        return null;
    }
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function formatDisplay(iso) {
    const date = toDate(iso);
    if (!date) {
        return 'dd/mm/yyyy';
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${date.getFullYear()}`;
}

/**
 * Level 2 section: repeats burstPeriod rows, holds the campaign-flight hint, and runs the
 * overlap check across the list (Technical Design: "Bursts and Custom Dayparts", section 3.1).
 * Controlled by its parent, burstsAndCustomDayparts: state lives one level up.
 */
export default class BurstPeriods extends LightningElement {
    @api bursts = [];
    @api planStart; // ISO yyyy-mm-dd
    @api planEnd; // ISO yyyy-mm-dd
    @api disabled = false;

    get hasBursts() {
        return this.bursts.length > 0;
    }

    get hintText() {
        return `Burst periods must sit inside the campaign flight ${formatDisplay(this.planStart)} `
            + `to ${formatDisplay(this.planEnd)} and cannot overlap each other.`;
    }

    get rows() {
        const issues = this.issuesByBurstId();
        return this.bursts.map((burst, index) => ({
            id: burst.id,
            burst,
            placeholder: `Burst ${index + 1}`,
            issue: issues[burst.id] || '',
            showRemove: this.bursts.length > 1,
            disabled: this.disabled
        }));
    }

    /**
     * @returns {String[]} one message per invalid burst.
     */
    @api validate() {
        const issues = this.issuesByBurstId();
        return this.bursts.filter((burst) => issues[burst.id]).map((burst) => issues[burst.id]);
    }

    issuesByBurstId() {
        const planStart = toDate(this.planStart);
        const planEnd = toDate(this.planEnd);
        const parsed = this.bursts.map((burst, index) => ({
            burst,
            name: burst.name || `Burst ${index + 1}`,
            start: toDate(burst.start),
            end: toDate(burst.end)
        }));

        const issues = {};
        parsed.forEach((item, index) => {
            if (!item.start || !item.end) {
                issues[item.burst.id] = 'Set both a start and an end date.';
                return;
            }
            if (item.end < item.start) {
                issues[item.burst.id] = 'The end date falls before the start date.';
                return;
            }
            if (planStart && item.start < planStart) {
                issues[item.burst.id] = `Starts before the campaign start (${formatDisplay(this.planStart)}).`;
                return;
            }
            if (planEnd && item.end > planEnd) {
                issues[item.burst.id] = `Ends after the campaign end (${formatDisplay(this.planEnd)}).`;
                return;
            }
            const clash = parsed.find((other, otherIndex) =>
                otherIndex > index && other.start && other.end && other.start <= item.end && item.start <= other.end
            );
            if (clash) {
                issues[item.burst.id] = `Overlaps ${clash.name}.`;
            }
        });
        return issues;
    }

    handleAddBurst() {
        if (this.disabled) {
            return;
        }
        this.emitChange([...this.bursts, { id: generateId(), name: `Burst ${this.bursts.length + 1}`, start: '', end: '' }]);
    }

    handleBurstChange(event) {
        const { id, patch } = event.detail;
        this.emitChange(this.bursts.map((burst) => (burst.id === id ? { ...burst, ...patch } : burst)));
    }

    handleBurstRemove(event) {
        const { id } = event.detail;
        this.emitChange(this.bursts.filter((burst) => burst.id !== id));
    }

    emitChange(bursts) {
        this.dispatchEvent(new CustomEvent('burstschange', { detail: { bursts } }));
    }
}
