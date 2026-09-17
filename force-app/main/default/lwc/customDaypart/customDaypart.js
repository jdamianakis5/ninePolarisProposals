import { LightningElement, api } from 'lwc';

function to12Hour(hhmm) {
    const [hourStr, minute] = hhmm.split(':');
    const hour = Number(hourStr);
    const period = hour >= 12 ? 'pm' : 'am';
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    return minute === '00' ? `${hour12}${period}` : `${hour12}:${minute}${period}`;
}

/**
 * One Custom Daypart row: name, start time, end time, and its own inline validation
 * message. Overlap checking needs sibling rows, so the message text is computed by the
 * parent (customDayparts) and handed in as `issue`.
 */
export default class CustomDaypart extends LightningElement {
    @api daypart; // { id, name, start, end, isApplyByDefault }
    @api placeholder = '';
    @api issue = '';
    @api disabled = false;

    get summary() {
        const { start, end } = this.daypart;
        if (!start || !end) {
            return 'Set a start and an end time';
        }
        return `${to12Hour(start)} to ${to12Hour(end)}`;
    }

    get summaryClass() {
        const isError = !(this.daypart.start && this.daypart.end);
        return `slds-col slds-text-body_small ${isError ? 'slds-text-color_error' : 'slds-text-color_weak'}`;
    }

    get hasIssue() {
        return !!this.issue;
    }

    handleNameChange(event) {
        this.emitChange({ name: event.target.value });
    }

    handleStartChange(event) {
        this.emitChange({ start: event.target.value });
    }

    handleEndChange(event) {
        this.emitChange({ end: event.target.value });
    }

    handleRemove() {
        this.dispatchEvent(new CustomEvent('customdaypartremove', { detail: { id: this.daypart.id } }));
    }

    /**
     * Editing any field clears IsApplyByDefault, matching how an edited copied-in
     * Program/Program Group exclusion clears its own default flag.
     */
    emitChange(patch) {
        this.dispatchEvent(new CustomEvent('customdaypartchange', {
            detail: { id: this.daypart.id, patch: { ...patch, isApplyByDefault: false } }
        }));
    }
}
