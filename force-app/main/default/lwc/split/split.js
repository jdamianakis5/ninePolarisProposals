import { LightningElement, api } from 'lwc';

const MAX_LEVELS = 3;

/**
 * One instance per split (Technical Design, c-split). Carries the split's own
 * configuration (dimensions, column driver, breakouts, unit, fixed total) as props from
 * c-splitConfigurator, and hosts c-splitDetails (the grid) and c-splitActions (the
 * toolbar) as children, passing its Group By selection, Column Driver, and %/# state down
 * to c-splitDetails whenever it changes.
 */
export default class Split extends LightningElement {
    @api id;
    @api title = '';
    @api metric = 'budget';
    @api unit = '$'; // '$' | '%' | '#'
    @api allowPercent = false; // set true by the parent for every metric except CPM/CPT
    @api dims = [];
    @api columnDriver = null; // null | 'week' | 'burst'
    @api breakouts = [];
    @api total = '';
    @api values = {};
    @api groups = {};
    @api open = false;
    @api required = false; // goal-driven: locked against removal while true
    @api disabled = false;

    @api dimensionCatalog = []; // { key, label }[], already filtered for this split's metric
    @api dimensionOptionCounts = {}; // { [dimKey]: number }
    @api dimensionOptions = {}; // { [dimKey]: { id, label }[] }
    @api dimensionLabels = {};
    @api weekColumns = [];
    @api burstColumns = [];
    @api fixedOnly = false;

    settingsOpen = false;
    breakoutsOpen = false;
    selectedRowKeys = [];
    detailsCanGroup = false;
    detailsCanUngroup = false;
    detailsHasClipboard = false;

    get chevron() {
        return this.open ? '▾' : '▸';
    }

    get bodyStyle() {
        return this.open ? 'display:block' : 'display:none';
    }

    get dimLabel() {
        return this.dims.length
            ? `by ${this.dims.map((key) => this.dimensionLabels[key] || key).join(' › ')}`
            : 'no grouping';
    }

    get canRemove() {
        return !this.required && !this.disabled;
    }

    get columns() {
        if (this.columnDriver === 'week') {
            return this.weekColumns;
        }
        if (this.columnDriver === 'burst') {
            return this.burstColumns;
        }
        return [];
    }

    get dimOptionRows() {
        const full = this.dims.length >= MAX_LEVELS;
        return this.dimensionCatalog
            .filter((dim) => !dim.fixedOnly || this.fixedOnly)
            .map((dim) => {
                const selected = this.dims.includes(dim.key);
                const count = this.dimensionOptionCounts[dim.key] || 0;
                const available = count > 0 && (selected || !full);
                return {
                    key: dim.key,
                    label: dim.label,
                    selected,
                    available,
                    disabledRow: !available,
                    note: count > 0 ? (available ? `${count} selected` : 'three level maximum') : 'none selected'
                };
            });
    }

    get levelRows() {
        const rows = [];
        if (this.columnDriver) {
            rows.push({ key: this.columnDriver, label: this.columnDriver === 'week' ? 'Week' : 'Burst period', locked: true });
        }
        this.dims.forEach((key) => rows.push({ key, label: this.dimensionLabels[key] || key, locked: false }));
        return rows.map((row, index) => ({ ...row, rank: index + 1 }));
    }

    get weekAvailable() {
        return this.weekColumns.length > 0;
    }

    get burstAvailable() {
        return this.burstColumns.length > 0;
    }

    get weekDisabled() {
        return !this.weekAvailable;
    }

    get burstDisabled() {
        return !this.burstAvailable;
    }

    get weekSelected() {
        return this.columnDriver === 'week';
    }

    get burstSelected() {
        return this.columnDriver === 'burst';
    }

    get unitOptions() {
        const options = this.allowPercent ? ['$', '%'] : ['$'];
        return options.map((symbol) => ({ symbol, selected: this.unit === symbol }));
    }

    get breakoutOptionRows() {
        return this.dimensionCatalog
            .filter((dim) => (!dim.fixedOnly || this.fixedOnly) && !this.dims.includes(dim.key))
            .map((dim) => ({ key: dim.key, label: dim.label, selected: this.breakouts.includes(dim.key) }));
    }

    get hasBreakoutOptions() {
        return this.breakoutOptionRows.length > 0;
    }

    get showRequirementBanner() {
        if (!this.required || Number(this.total)) {
            return false;
        }
        return !Object.values(this.values).some((value) => Number(value) > 0);
    }

    get requirementBannerText() {
        return this.metric === 'budget'
            ? 'Fixed Budget is on. Enter a total, or an amount against at least one level below.'
            : 'Fixed Audience is on. Enter a total, or a number against at least one level below.';
    }

    /**
     * @returns {String[]} this split's own blockers: the goal-driven "no value anywhere"
     * requirement, plus whatever c-splitDetails reports (a percentage column not
     * totalling 100%).
     */
    @api validate() {
        const details = this.template.querySelector('c-split-details');
        const issues = [...details.validate()];
        if (this.required && !Number(this.total) && !details.hasAnyValue()) {
            issues.push(
                this.metric === 'budget'
                    ? 'Fixed Budget is on. Enter a total, or an amount against at least one level below.'
                    : 'Fixed Audience is on. Enter a total, or a number against at least one level below.'
            );
        }
        return issues;
    }

    /**
     * @returns {String[]} advisory-only messages (never blocks): forwarded from
     * c-splitDetails.
     */
    @api get warnings() {
        return this.template.querySelector('c-split-details').warnings;
    }

    /**
     * @returns this split's full payload, shaped per the contract's `splitConstraints[]`
     * entry: metric, required, columnDriver, ordered groupBy levels, breakouts, and
     * whatever c-splitDetails builds for total/mergedGroups/rows.
     */
    @api getPayload() {
        const details = this.template.querySelector('c-split-details');
        const built = details.getPayload();
        return {
            constraintId: this.id,
            metric: this.metric,
            required: this.required,
            columnDriver: this.columnDriver ? { type: this.columnDriver.toUpperCase() } : null,
            groupBy: this.dims.map((dimension, index) => ({ level: index + 1, dimension, unit: this.unit })),
            breakouts: this.breakouts,
            total: built.total,
            mergedGroups: built.mergedGroups,
            rows: built.rows
        };
    }

    handleToggleOpen() {
        this.emitChange({ open: !this.open });
    }

    handleToggleSettings() {
        this.settingsOpen = !this.settingsOpen;
        this.breakoutsOpen = false;
    }

    handleToggleBreakouts() {
        this.breakoutsOpen = !this.breakoutsOpen;
        this.settingsOpen = false;
    }

    handleRemove() {
        if (this.canRemove) {
            this.dispatchEvent(new CustomEvent('splitremove', { detail: { id: this.id } }));
        }
    }

    handleToggleDim(event) {
        const { key } = event.currentTarget.dataset;
        const row = this.dimOptionRows.find((option) => option.key === key);
        if (!row || !row.available) {
            return;
        }
        const nextDims = row.selected ? this.dims.filter((dim) => dim !== key) : [...this.dims, key];
        this.emitChange({ dims: nextDims });
    }

    handleToggleBreakout(event) {
        const { key } = event.currentTarget.dataset;
        const next = this.breakouts.includes(key)
            ? this.breakouts.filter((dim) => dim !== key)
            : [...this.breakouts, key];
        this.emitChange({ breakouts: next });
    }

    handleWeek() {
        if (!this.weekAvailable) {
            return;
        }
        this.emitChange({ columnDriver: this.weekSelected ? null : 'week' });
    }

    handleBurst() {
        if (!this.burstAvailable) {
            return;
        }
        this.emitChange({ columnDriver: this.burstSelected ? null : 'burst' });
    }

    handleUnit(event) {
        const { symbol } = event.currentTarget.dataset;
        this.emitChange({ unit: symbol });
    }

    handleTotalChange(event) {
        this.emitChange({ total: event.detail.total });
    }

    handleDetailsChange(event) {
        this.emitChange({ values: event.detail.values, groups: event.detail.groups });
    }

    handleRowSelectionChange(event) {
        const rows = this.template.querySelector('c-split-details').rows;
        this.selectedRowKeys = event.detail.selectedRowKeys;
        const selected = rows.filter((row) => this.selectedRowKeys.includes(row.key));
        this.detailsCanGroup = selected.length > 1 && selected.every((row) => row.dim === selected[0].dim);
        this.detailsCanUngroup = selected.some((row) => row.grouped);
    }

    handleAction(event) {
        const { name } = event.detail;
        if (name === 'copy') {
            this.detailsHasClipboard = this.selectedRowKeys.length > 0;
        }
        this.template.querySelector('c-split-details').applyAction(name);
        this.detailsCanGroup = false;
        this.detailsCanUngroup = false;
    }

    emitChange(patch) {
        this.dispatchEvent(new CustomEvent('splitchange', { detail: { id: this.id, patch } }));
    }
}
