import { LightningElement, api } from 'lwc';

let nextId = 0;

function generateId() {
    nextId += 1;
    return `daypart-${Date.now()}-${nextId}`;
}

function to12Hour(hhmm) {
    const [hourStr, minute] = hhmm.split(':');
    const hour = Number(hourStr);
    const period = hour >= 12 ? 'pm' : 'am';
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    return minute === '00' ? `${hour12}${period}` : `${hour12}:${minute}${period}`;
}

/**
 * Custom Time Period list for the Proposal Builder Brief page (Stations & Timing,
 * Dayparts section). This component is the whole "custom daypart" feature: the
 * + Custom Time Period button and the row list.
 *
 * It does not decide its own visibility. The parent (the Dayparts section, which also
 * owns the standard Peak/Off-Peak/Mid-Dawn pills) renders this component only when the
 * campaign is fixed-only:
 *
 *   <template lwc:if={isFixedOnly}>
 *       <c-custom-dayparts ranges={inputs.ranges} onDayPartRangesChange={handleRangesChange}>
 *       </c-custom-dayparts>
 *   </template>
 *
 * Unmounting this component when isFixedOnly goes false does not delete data: `ranges`
 * is owned by the parent record, so the rows simply stop rendering until the campaign
 * is fixed-only again. Confirm with the business whether that "hidden but preserved"
 * behaviour is what they want, per the open question raised in
 * design_handoff_spot_timing/README.md.
 */
export default class CustomDayparts extends LightningElement {
    @api ranges = [];
    @api disabled = false;

    get rows() {
        return this.ranges.map((range, index) => {
            const isError = !(range.start && range.end);
            return {
                id: range.id,
                name: range.name,
                placeholder: `Daypart ${index + 1}`,
                start: range.start,
                end: range.end,
                summary: this.summaryFor(range),
                summaryClass: `slds-col slds-text-body_small ${isError ? 'slds-text-color_error' : 'slds-text-color_weak'}`,
                disabled: this.disabled
            };
        });
    }

    summaryFor(range) {
        if (!range.start || !range.end) {
            return 'Set a start and an end time';
        }
        return `${to12Hour(range.start)} to ${to12Hour(range.end)}`;
    }

    /**
     * @returns {string[]} one message per row missing a start or end time, matching the
     * exact wording relied on by the Proposal Builder navigation guard.
     */
    @api validate() {
        return this.ranges
            .map((range, index) => ({ range, index }))
            .filter(({ range }) => !range.start || !range.end)
            .map(({ range, index }) => {
                const name = range.name || `Daypart ${index + 1}`;
                return `Custom time period ${name} needs both a start and an end time.`;
            });
    }

    handleAdd() {
        if (this.disabled) {
            return;
        }
        this.emitChange([...this.ranges, { id: generateId(), name: '', start: '', end: '' }]);
    }

    handleNameChange(event) {
        this.patchRange(event.currentTarget.dataset.id, { name: event.target.value });
    }

    handleStartChange(event) {
        this.patchRange(event.currentTarget.dataset.id, { start: event.target.value });
    }

    handleEndChange(event) {
        this.patchRange(event.currentTarget.dataset.id, { end: event.target.value });
    }

    handleRemove(event) {
        const { id } = event.currentTarget.dataset;
        this.emitChange(this.ranges.filter((range) => range.id !== id));
    }

    patchRange(id, patch) {
        this.emitChange(this.ranges.map((range) => (range.id === id ? { ...range, ...patch } : range)));
    }

    emitChange(ranges) {
        this.dispatchEvent(new CustomEvent('daypartrangeschange', { detail: { ranges } }));
    }
}
