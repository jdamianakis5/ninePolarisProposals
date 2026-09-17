import { LightningElement, api } from 'lwc';

/**
 * One entry in the Proposal Builder's collapsible left navigation rail (documented
 * behaviour in docs/design-handoff/proposal-builder.md, "Navigation rail and tab
 * locking"). A locked item is not clickable and shows its lock reason as a tooltip; a
 * green tick badge marks a step that is complete once it is no longer the active tab.
 * This component owns no navigation logic itself: the page decides `selected`, `locked`,
 * `lockReason`, and `done` (typically from a shared `avail()`/`stepDone()` gate, the same
 * one already implemented in-line for Optimisation, Spot Management, and Billing
 * Installments), and reacts to `select` to change tabs.
 */
export default class NavRailItem extends LightningElement {
    @api label = '';
    @api selected = false;
    @api locked = false;
    @api lockReason = '';
    @api done = false;
    @api collapsed = false;

    get title() {
        return this.locked && this.lockReason ? `${this.label}: ${this.lockReason}` : this.label;
    }

    get showTick() {
        return this.done && !this.selected && !this.locked;
    }

    get showLabel() {
        return !this.collapsed;
    }

    get buttonClass() {
        const classes = ['nav-rail-item'];
        if (this.selected) {
            classes.push('nav-rail-item_selected');
        }
        if (this.locked) {
            classes.push('nav-rail-item_locked');
        }
        return classes.join(' ');
    }

    handleClick() {
        if (this.locked) {
            return;
        }
        this.dispatchEvent(new CustomEvent('select'));
    }
}
