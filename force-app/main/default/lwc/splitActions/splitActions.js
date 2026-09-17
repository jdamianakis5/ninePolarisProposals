import { LightningElement, api } from 'lwc';

/**
 * A stateless action bar (Technical Design, c-splitActions). It reads whatever
 * c-splitDetails currently has selected (via props handed down through c-split) and fires
 * named actions. It holds no data of its own and never writes to a Linear Parameter record
 * directly: c-splitDetails carries out every action against its own row and column state.
 */
export default class SplitActions extends LightningElement {
    @api selectionCount = 0;
    @api canGroup = false;
    @api canUngroup = false;
    @api hasClipboard = false;
    @api columnDriver = null; // null | 'week' | 'burst'
    @api disabled = false;

    copyMenuOpen = false;
    clearMenuOpen = false;

    get hasSelection() {
        return this.selectionCount > 0;
    }

    get selectionLabel() {
        return `${this.selectionCount} selected`;
    }

    get copyColumnsLabel() {
        return this.columnDriver === 'burst' ? 'Copy to All Bursts' : 'Copy to All Weeks';
    }

    get disableCopy() {
        return !this.hasSelection || this.disabled;
    }

    get disablePaste() {
        return !this.hasClipboard || !this.hasSelection || this.disabled;
    }

    get disableClear() {
        return !this.hasSelection || this.disabled;
    }

    get disableGroup() {
        return !this.canGroup || this.disabled;
    }

    get disableUngroup() {
        return !this.canUngroup || this.disabled;
    }

    handleToggleCopyMenu() {
        this.copyMenuOpen = !this.copyMenuOpen;
        this.clearMenuOpen = false;
    }

    handleToggleClearMenu() {
        this.clearMenuOpen = !this.clearMenuOpen;
        this.copyMenuOpen = false;
    }

    handleCopy() {
        this.fire('copy');
    }

    handleCopyToAllLevels() {
        this.copyMenuOpen = false;
        this.fire('copyToAllLevels');
    }

    handleCopyToAllColumns() {
        this.copyMenuOpen = false;
        this.fire('copyToAllColumns');
    }

    handlePaste() {
        this.fire('paste');
    }

    handleGroup() {
        if (this.canGroup && !this.disabled) {
            this.fire('group');
        }
    }

    handleUngroup() {
        if (this.canUngroup && !this.disabled) {
            this.fire('ungroup');
        }
    }

    handleEven() {
        this.fire('even');
    }

    handleClear() {
        this.fire('clear');
    }

    handleClearAll() {
        this.clearMenuOpen = false;
        this.fire('clearAll');
    }

    fire(name) {
        this.dispatchEvent(new CustomEvent('action', { detail: { name } }));
    }
}
