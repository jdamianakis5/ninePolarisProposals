import { LightningElement, api } from 'lwc';

/**
 * The "Enable Top/Tail durations" toggle. A thin, dumb control: turning it off dropping
 * every Top/Tail chip and hiding the sets below is spotDurations' responsibility, not
 * this component's (Technical Design section 3.2, Level 3).
 */
export default class TopTailToggle extends LightningElement {
    @api checked = false;
    @api disabled = false;

    handleChange(event) {
        this.dispatchEvent(new CustomEvent('togglechange', { detail: { checked: event.target.checked } }));
    }
}
