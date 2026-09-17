import { LightningElement, api } from 'lwc';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

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
 * One Burst Period row: name, start date, end date (Sunday-first custom calendar picker),
 * and its own inline validation message. The message text itself is computed by the parent
 * (burstPeriods), since overlap checking needs sibling rows; this component only renders
 * whatever `issue` string it is handed.
 */
export default class BurstPeriod extends LightningElement {
    @api burst; // { id, name, start, end }
    @api placeholder = '';
    @api planStart; // ISO yyyy-mm-dd
    @api planEnd; // ISO yyyy-mm-dd
    @api issue = '';
    @api showRemove = false;
    @api disabled = false;

    openField; // 'start' | 'end' | undefined
    pickerYear;
    pickerMonth;

    get startLabel() {
        return formatDisplay(this.burst.start);
    }

    get endLabel() {
        return formatDisplay(this.burst.end);
    }

    get showStartCalendar() {
        return this.openField === 'start';
    }

    get showEndCalendar() {
        return this.openField === 'end';
    }

    get startCalendar() {
        return this.showStartCalendar ? this.buildCalendar('start') : null;
    }

    get endCalendar() {
        return this.showEndCalendar ? this.buildCalendar('end') : null;
    }

    get hasIssue() {
        return !!this.issue;
    }

    buildCalendar(field) {
        const value = field === 'start' ? this.burst.start : this.burst.end;
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

    handleNameChange(event) {
        this.emitChange({ name: event.target.value });
    }

    handleOpenPicker(event) {
        const { field } = event.currentTarget.dataset;
        if (this.openField === field) {
            this.openField = undefined;
            return;
        }
        const value = field === 'start' ? this.burst.start : this.burst.end;
        const base = toDate(value) || toDate(this.planStart) || new Date();
        this.pickerYear = base.getFullYear();
        this.pickerMonth = base.getMonth();
        this.openField = field;
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
        if (!this.openField) {
            return;
        }
        const field = this.openField;
        const iso = event.currentTarget.dataset.date;
        this.openField = undefined;
        this.emitChange({ [field]: iso });
    }

    handleRemove() {
        this.dispatchEvent(new CustomEvent('burstremove', { detail: { id: this.burst.id } }));
    }

    emitChange(patch) {
        this.dispatchEvent(new CustomEvent('burstchange', { detail: { id: this.burst.id, patch } }));
    }
}
