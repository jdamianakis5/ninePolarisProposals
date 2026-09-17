import { LightningElement, api } from 'lwc';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

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

function toIso(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
 * Burst Periods panel for the Proposal Builder Brief page (Stations & Timing).
 * Owns its own header, the burst list, the Sunday-first date picker, and the
 * per-row and flight-boundary validation. Always visible: not gated by trading model.
 *
 * Emits `bursts` as a whole array on every edit (`burstschange`) rather than mutating
 * the incoming @api prop, so the parent stays the single source of truth for the record.
 */
export default class BurstPeriods extends LightningElement {
    @api bursts = [];
    @api planStart; // ISO yyyy-mm-dd, campaign flight start
    @api planEnd; // ISO yyyy-mm-dd, campaign flight end
    @api disabled = false;

    openKey; // `${burstId}:${field}` of the open date popover, or undefined
    pickerYear;
    pickerMonth; // 0-based

    get hasBursts() {
        return this.bursts.length > 0;
    }

    get hintText() {
        return `Burst periods must sit inside the campaign flight ${formatDisplay(this.planStart)} `
            + `to ${formatDisplay(this.planEnd)} and cannot overlap each other.`;
    }

    get rows() {
        const issues = this.issuesByBurstId();
        return this.bursts.map((burst, index) => {
            const showStartPicker = this.openKey === `${burst.id}:start`;
            const showEndPicker = this.openKey === `${burst.id}:end`;
            return {
                id: burst.id,
                name: burst.name,
                placeholder: `Burst ${index + 1}`,
                startLabel: formatDisplay(burst.start),
                endLabel: formatDisplay(burst.end),
                showStartPicker,
                showEndPicker,
                startCalendar: showStartPicker ? this.buildCalendar(burst, 'start') : null,
                endCalendar: showEndPicker ? this.buildCalendar(burst, 'end') : null,
                issue: issues[burst.id] || '',
                disabled: this.disabled
            };
        });
    }

    /**
     * @returns {string[]} one message per invalid burst, in the exact wording the
     * Proposal Builder navigation guard already relies on (see design_handoff_spot_timing).
     */
    @api validate() {
        const issues = this.issuesByBurstId();
        return this.bursts
            .filter((burst) => issues[burst.id])
            .map((burst) => issues[burst.id]);
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

    buildCalendar(burst, field) {
        const value = field === 'start' ? burst.start : burst.end;
        const base = toDate(value) || toDate(this.planStart) || new Date();
        const year = this.pickerYear ?? base.getFullYear();
        const month = this.pickerMonth ?? base.getMonth();
        const first = new Date(year, month, 1);
        const gridStart = new Date(year, month, 1 - first.getDay());
        const planStart = toDate(this.planStart);
        const planEnd = toDate(this.planEnd);

        const weeks = [];
        for (let week = 0; week < 6; week += 1) {
            const days = [];
            for (let day = 0; day < 7; day += 1) {
                const cellDate = new Date(
                    gridStart.getFullYear(),
                    gridStart.getMonth(),
                    gridStart.getDate() + (week * 7) + day
                );
                const iso = toIso(cellDate);
                const inMonth = cellDate.getMonth() === month;
                const inFlight = (!planStart || cellDate >= planStart) && (!planEnd || cellDate <= planEnd);
                days.push({
                    key: iso,
                    iso,
                    label: cellDate.getDate(),
                    class: this.dayClass(inMonth, inFlight, iso === value)
                });
            }
            weeks.push({ key: `week-${week}`, days });
        }

        return { monthLabel: `${MONTH_LABELS[month]} ${year}`, dayLabels: DAY_LABELS, weeks };
    }

    dayClass(inMonth, inFlight, selected) {
        if (selected) {
            return 'day-cell day-cell_selected';
        }
        if (!inMonth) {
            return 'day-cell day-cell_outside-month';
        }
        if (!inFlight) {
            return 'day-cell day-cell_outside-flight';
        }
        return 'day-cell';
    }

    handleAddBurst() {
        if (this.disabled) {
            return;
        }
        const next = [
            ...this.bursts,
            { id: generateId(), name: `Burst ${this.bursts.length + 1}`, start: '', end: '' }
        ];
        this.emitChange(next);
    }

    handleNameChange(event) {
        const { id } = event.currentTarget.dataset;
        const name = event.target.value;
        this.emitChange(this.bursts.map((burst) => (burst.id === id ? { ...burst, name } : burst)));
    }

    handleRemove(event) {
        const { id } = event.currentTarget.dataset;
        if (this.openKey && this.openKey.startsWith(`${id}:`)) {
            this.openKey = undefined;
        }
        this.emitChange(this.bursts.filter((burst) => burst.id !== id));
    }

    handleOpenPicker(event) {
        const { id, field } = event.currentTarget.dataset;
        const key = `${id}:${field}`;
        if (this.openKey === key) {
            this.openKey = undefined;
            return;
        }
        const burst = this.bursts.find((item) => item.id === id);
        const value = field === 'start' ? burst?.start : burst?.end;
        const base = toDate(value) || toDate(this.planStart) || new Date();
        this.pickerYear = base.getFullYear();
        this.pickerMonth = base.getMonth();
        this.openKey = key;
    }

    handlePrevMonth() {
        this.shiftMonth(-1);
    }

    handleNextMonth() {
        this.shiftMonth(1);
    }

    shiftMonth(delta) {
        const date = new Date(this.pickerYear, this.pickerMonth + delta, 1);
        this.pickerYear = date.getFullYear();
        this.pickerMonth = date.getMonth();
    }

    handleSelectDay(event) {
        if (!this.openKey) {
            return;
        }
        const [id, field] = this.openKey.split(':');
        const iso = event.currentTarget.dataset.date;
        this.openKey = undefined;
        this.emitChange(this.bursts.map((burst) => (burst.id === id ? { ...burst, [field]: iso } : burst)));
    }

    emitChange(bursts) {
        this.dispatchEvent(new CustomEvent('burstschange', { detail: { bursts } }));
    }
}
