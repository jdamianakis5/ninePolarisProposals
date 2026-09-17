import { LightningElement, api } from 'lwc';

const ROOT = 'root';

function parentKeyOf(key) {
    const at = key.lastIndexOf('/');
    return at === -1 ? ROOT : key.slice(0, at);
}

function pathFromKey(key) {
    return key
        .split('/')
        .filter((segment) => segment !== ROOT)
        .map((segment) => {
            const [dimension, idsPart] = segment.split(':');
            return { dimension, refIds: idsPart.split(',') };
        });
}

function largestRemainderShares(count, total) {
    if (count <= 0) {
        return [];
    }
    const base = Math.floor(total / count);
    const remainder = Math.round(total - base * count);
    return Array.from({ length: count }, (unused, index) => base + (index < remainder ? 1 : 0));
}

/**
 * The grid, and the component that actually builds the payload (Technical Design,
 * c-splitDetails). Rows come from the Group By dimensions selected on c-split, nested up
 * to three levels deep; columns come from the Column Driver (none, one per week, or one
 * per burst).
 *
 * Design decision, not fully settled by the source contract: this implementation accepts
 * one `unit` for the whole split and one entered value per leaf row (plus one fixed total
 * on the overall row for absolute splits). The contract's own worked JSON example shows a
 * level-by-level unit and an entered value above the leaf, which is a nuance to reconcile
 * with the optimiser team before build (see docs/LWC-DESIGN.md).
 */
export default class SplitDetails extends LightningElement {
    @api dims = []; // ordered dimension keys, e.g. ['market', 'channel']
    @api dimensionOptions = {}; // { [dimKey]: { id, label }[] }
    @api columnDriver = null; // null | 'week' | 'burst'
    @api columns = []; // { id, label }[], empty when columnDriver is null
    @api unit = '$'; // '$' | '%' | '#'
    @api total = ''; // fixed total, absolute splits only
    @api values = {}; // { 'rowKey::colId': string }
    @api groups = {}; // { [dimKey]: string[][] }
    @api dimensionLabels = {}; // { [dimKey]: display label }, e.g. { market: 'Market' }
    @api disabled = false;

    selectedRowKeys = [];
    collapsedRowKeys = {};
    clipboard = null;

    get effectiveColumns() {
        return this.columns.length ? this.columns : [{ id: '', label: '' }];
    }

    get dimHeaderLabel() {
        return this.dims.length ? this.dimensionLabels[this.dims[0]] || this.dims[0] : 'Overall';
    }

    formatValue(value) {
        if (this.unit === '$') {
            return `$${Math.round(value).toLocaleString('en-AU')}`;
        }
        if (this.unit === '%') {
            return `${Math.round(value * 10) / 10}%`;
        }
        return String(Math.round(value));
    }

    get displayRows() {
        const rows = this.buildRows();
        const isHidden = (key) => {
            let cursor = parentKeyOf(key);
            while (cursor !== ROOT) {
                if (this.collapsedRowKeys[cursor]) {
                    return true;
                }
                cursor = parentKeyOf(cursor);
            }
            return false;
        };
        const overall = { key: ROOT, level: 0, leaf: !this.dims.length, grouped: false, label: 'Overall' };
        const visible = [overall, ...rows.filter((row) => !isHidden(row.key))];

        return visible.map((row) => {
            const isOverall = row.key === ROOT;
            const hasChildren = this.childrenOf(row.key, rows).length > 0;
            const collapsed = !!this.collapsedRowKeys[row.key];
            const cells = this.effectiveColumns.map((col) => {
                const editable = row.leaf;
                const rollupValue = editable ? 0 : this.rollup(row.key, col.id, rows);
                return {
                    key: `${row.key}::${col.id || 'default'}`,
                    colId: col.id,
                    editable,
                    value: editable ? this.values[this.cellKey(row.key, col.id)] || '' : '',
                    display: editable ? '' : this.formatValue(rollupValue)
                };
            });
            const rowTotal = this.effectiveColumns.reduce(
                (sum, col) => sum + (isOverall ? this.overallRollup(col.id, rows) : this.rollup(row.key, col.id, rows)),
                0
            );
            return {
                key: row.key,
                indentStyle: `padding-left:${row.level * 18}px`,
                rowClass: `slds-grid split-row${this.selectedRowKeys.includes(row.key) ? ' split-row_selected' : ''}${row.grouped ? ' split-row_grouped' : ''}`,
                leaf: row.leaf,
                isOverall,
                grouped: !!row.grouped,
                label: isOverall ? 'Overall' : row.label,
                selected: this.selectedRowKeys.includes(row.key),
                hasChildren,
                collapsed,
                chevron: collapsed ? '▸' : '▾',
                cells,
                rowTotal: this.formatValue(rowTotal),
                showTotalInput: isOverall && this.unit !== '%',
                totalValue: this.total
            };
        });
    }

    buildRows() {
        const rows = [];
        const walk = (parentKey, level) => {
            const dim = this.dims[level];
            const options = this.dimensionOptions[dim] || [];
            const merged = this.groups[dim] || [];
            const taken = new Set();
            merged.forEach((group) => group.forEach((id) => taken.add(id)));
            const entries = merged
                .map((group) => ({ ids: group, grouped: true }))
                .concat(options.filter((option) => !taken.has(option.id)).map((option) => ({ ids: [option.id], grouped: false })));
            entries.forEach((entry) => {
                const key = `${parentKey}/${dim}:${entry.ids.join(',')}`;
                const leaf = level === this.dims.length - 1;
                const label = entry.ids
                    .map((id) => (options.find((option) => option.id === id) || {}).label || id)
                    .join('; ');
                rows.push({ key, level: level + 1, leaf, grouped: entry.grouped, dim, label });
                if (!leaf) {
                    walk(key, level + 1);
                }
            });
        };
        if (this.dims.length) {
            walk(ROOT, 0);
        }
        return rows;
    }

    get rows() {
        return this.buildRows();
    }

    cellKey(rowKey, colId) {
        return `${rowKey}::${colId}`;
    }

    numOf(rowKey, colId) {
        const raw = this.values[this.cellKey(rowKey, colId)];
        const parsed = Number(raw);
        return raw !== undefined && Number.isFinite(parsed) ? parsed : 0;
    }

    childrenOf(rowKey, rows) {
        const depth = rowKey.split('/').length;
        return rows.filter((row) => row.key.indexOf(`${rowKey}/`) === 0 && row.key.split('/').length === depth + 1);
    }

    rollup(rowKey, colId, rows) {
        const row = rows.find((candidate) => candidate.key === rowKey);
        if (row && row.leaf) {
            return this.numOf(rowKey, colId);
        }
        return this.childrenOf(rowKey, rows).reduce((sum, child) => sum + this.rollup(child.key, colId, rows), 0);
    }

    overallRollup(colId, rows) {
        return this.childrenOf(ROOT, rows).reduce((sum, row) => sum + this.rollup(row.key, colId, rows), 0);
    }

    resolvedValue(rowKey, colId, rows) {
        if (this.unit !== '%') {
            return this.numOf(rowKey, colId);
        }
        const parentKey = parentKeyOf(rowKey);
        const parentBasis = parentKey === ROOT ? Number(this.total) || 0 : this.resolvedValue(parentKey, colId, rows);
        return (parentBasis * this.numOf(rowKey, colId)) / 100;
    }

    /**
     * @returns {String[]} blocking issues only: a percentage split's column not totalling
     * 100% (Technical Design contract, section 2.6: "turns its column header red and
     * blocks the run"). Off-balance rows are a warning, not a blocker (see `warnings`).
     */
    @api validate() {
        if (this.unit !== '%' || !this.dims.length) {
            return [];
        }
        const rows = this.buildRows();
        const issues = [];
        this.effectiveColumns.forEach((col) => {
            const total = this.overallRollup(col.id, rows);
            if (Math.abs(total - 100) > 0.05) {
                const label = col.label || 'This split';
                issues.push(`${label} totals ${Math.round(total * 10) / 10}%, not 100%.`);
            }
        });
        return issues;
    }

    /**
     * @returns {String[]} advisory messages only: the split's fixed total does not match
     * what is actually allocated across every leaf row. Never blocks Save & Close, Run
     * Optimiser, or navigation ("Levels do not add to their parent" is a Warning, not a
     * Blocker, per the source contract's validation table).
     */
    @api get warnings() {
        if (!this.dims.length || this.unit === '%') {
            return [];
        }
        const target = Number(this.total) || 0;
        if (!target) {
            return [];
        }
        const rows = this.buildRows();
        const allocated = this.effectiveColumns.reduce((sum, col) => sum + this.overallRollup(col.id, rows), 0);
        if (Math.abs(allocated - target) > 0.5) {
            return [`This split allocates ${this.formatValue(allocated)} against a target of ${this.formatValue(target)}.`];
        }
        return [];
    }

    /**
     * @returns {Boolean} whether any leaf cell, anywhere, carries a non-zero value.
     */
    @api hasAnyValue() {
        return Object.values(this.values).some((value) => Number(value) > 0);
    }

    /**
     * @returns the split's payload: `total`, `mergedGroups`, and one row per leaf per
     * column, shaped per the contract (docs/design-handoff, "06 - The payload").
     */
    @api getPayload() {
        const rows = this.buildRows();
        const mergedGroups = [];
        Object.keys(this.groups).forEach((dim) => {
            (this.groups[dim] || []).forEach((ids) => {
                mergedGroups.push({
                    dimension: dim,
                    groupId: `${dim}:${ids.join(',')}`,
                    label: ids.map((id) => (this.dimensionOptions[dim] || []).find((o) => o.id === id)?.label || id).join('; '),
                    memberIds: ids
                });
            });
        });

        const payloadRows = [];
        rows.filter((row) => row.leaf).forEach((row) => {
            const parentKey = parentKeyOf(row.key);
            this.effectiveColumns.forEach((col) => {
                payloadRows.push({
                    rowId: row.key,
                    level: row.level,
                    parentRowId: parentKey === ROOT ? null : parentKey,
                    path: pathFromKey(row.key),
                    column: this.columnDriver ? { type: this.columnDriver, id: col.id } : null,
                    entered: { value: this.numOf(row.key, col.id), unit: this.unit },
                    resolved: { value: this.resolvedValue(row.key, col.id, rows), unit: this.unit === '%' ? this.absoluteUnit() : this.unit }
                });
            });
        });

        return {
            total: { value: Number(this.total) || 0, unit: this.unit },
            mergedGroups,
            rows: payloadRows
        };
    }

    absoluteUnit() {
        return this.unit === '%' ? '$' : this.unit;
    }

    get selectedRows() {
        const rows = this.buildRows();
        return rows.filter((row) => this.selectedRowKeys.includes(row.key));
    }

    handleCellChange(event) {
        const { rowkey, colid } = event.currentTarget.dataset;
        const nextValues = { ...this.values, [this.cellKey(rowkey, colid)]: event.target.value };
        this.emitChange(nextValues, this.groups);
    }

    handleTotalChange(event) {
        this.dispatchEvent(new CustomEvent('totalchange', { detail: { total: event.target.value } }));
    }

    handleRowSelect(event) {
        const { rowkey } = event.currentTarget.dataset;
        this.selectedRowKeys = this.selectedRowKeys.includes(rowkey)
            ? this.selectedRowKeys.filter((key) => key !== rowkey)
            : [...this.selectedRowKeys, rowkey];
        this.dispatchEvent(new CustomEvent('rowselectionchange', { detail: { selectedRowKeys: this.selectedRowKeys } }));
    }

    handleToggleCollapse(event) {
        const { rowkey } = event.currentTarget.dataset;
        this.collapsedRowKeys = { ...this.collapsedRowKeys, [rowkey]: !this.collapsedRowKeys[rowkey] };
    }

    /**
     * Performs a toolbar action (Technical Design, c-splitActions) against the current
     * selection. Selection-independent actions (group/ungroup/even/clear/copy/paste) all
     * flow through here so c-splitActions itself stays stateless.
     */
    @api applyAction(action) {
        const rows = this.buildRows();
        const selected = this.selectedRows;
        if (action === 'group') {
            this.groupSelected(selected);
        } else if (action === 'ungroup') {
            this.ungroupSelected(selected);
        } else if (action === 'even') {
            this.evenSplitSelected(selected, rows);
        } else if (action === 'clear') {
            this.clearSelected(selected);
        } else if (action === 'clearAll') {
            this.emitChange({}, {});
            this.selectedRowKeys = [];
            return;
        } else if (action === 'copy') {
            this.clipboard = selected.length ? this.effectiveColumns.map((col) => this.values[this.cellKey(selected[0].key, col.id)] || '') : null;
        } else if (action === 'paste') {
            this.pasteToSelected(selected);
        } else if (action === 'copyToAllLevels') {
            this.copyToAllLevels(selected, rows);
        } else if (action === 'copyToAllColumns') {
            this.copyToAllColumns(selected, rows);
        }
        this.selectedRowKeys = [];
        this.dispatchEvent(new CustomEvent('rowselectionchange', { detail: { selectedRowKeys: [] } }));
    }

    groupSelected(selected) {
        if (selected.length < 2) {
            return;
        }
        const dim = selected[0].dim;
        if (!selected.every((row) => row.dim === dim && parentKeyOf(row.key) === parentKeyOf(selected[0].key))) {
            return;
        }
        const memberIds = [];
        selected.forEach((row) => {
            row.key
                .split('/')
                .pop()
                .split(':')[1]
                .split(',')
                .forEach((id) => memberIds.push(id));
        });
        const existing = (this.groups[dim] || []).filter((group) => !group.some((id) => memberIds.includes(id)));
        this.emitChange(this.values, { ...this.groups, [dim]: [...existing, memberIds] });
    }

    ungroupSelected(selected) {
        const grouped = selected.filter((row) => row.grouped);
        if (!grouped.length) {
            return;
        }
        const nextGroups = { ...this.groups };
        grouped.forEach((row) => {
            const ids = row.key.split('/').pop().split(':')[1].split(',');
            nextGroups[row.dim] = (nextGroups[row.dim] || []).filter((group) => group.join(',') !== ids.join(','));
        });
        this.emitChange(this.values, nextGroups);
    }

    evenSplitSelected(selected, rows) {
        const parentKey = selected.length ? parentKeyOf(selected[0].key) : ROOT;
        const siblings = this.childrenOf(parentKey, rows);
        if (!siblings.length) {
            return;
        }
        const nextValues = { ...this.values };
        this.effectiveColumns.forEach((col) => {
            const colBasis = this.unit === '%' ? 100 : parentKey === ROOT ? Number(this.total) || 0 : this.rollup(parentKey, col.id, rows);
            const shares = largestRemainderShares(siblings.length, colBasis);
            siblings.forEach((sibling, index) => {
                nextValues[this.cellKey(sibling.key, col.id)] = String(shares[index]);
            });
        });
        this.emitChange(nextValues, this.groups);
    }

    clearSelected(selected) {
        if (!selected.length) {
            return;
        }
        const nextValues = { ...this.values };
        selected.forEach((row) => {
            this.effectiveColumns.forEach((col) => {
                delete nextValues[this.cellKey(row.key, col.id)];
            });
        });
        this.emitChange(nextValues, this.groups);
    }

    pasteToSelected(selected) {
        if (!this.clipboard || !selected.length) {
            return;
        }
        const nextValues = { ...this.values };
        selected.forEach((row) => {
            this.effectiveColumns.forEach((col, index) => {
                nextValues[this.cellKey(row.key, col.id)] = this.clipboard[index] || '';
            });
        });
        this.emitChange(nextValues, this.groups);
    }

    copyToAllLevels(selected, rows) {
        const source = selected[0] || rows.find((row) => row.leaf);
        if (!source) {
            return;
        }
        const nextValues = { ...this.values };
        const leafRows = rows.filter((row) => row.leaf);
        this.effectiveColumns.forEach((col) => {
            const value = this.values[this.cellKey(source.key, col.id)] || '';
            leafRows.forEach((row) => {
                nextValues[this.cellKey(row.key, col.id)] = value;
            });
        });
        this.emitChange(nextValues, this.groups);
    }

    copyToAllColumns(selected, rows) {
        const targets = selected.length ? selected : rows.filter((row) => row.leaf);
        const nextValues = { ...this.values };
        targets.forEach((row) => {
            const value = this.values[this.cellKey(row.key, this.effectiveColumns[0].id)] || '';
            this.effectiveColumns.forEach((col) => {
                nextValues[this.cellKey(row.key, col.id)] = value;
            });
        });
        this.emitChange(nextValues, this.groups);
    }

    emitChange(values, groups) {
        this.dispatchEvent(new CustomEvent('detailschange', { detail: { values, groups } }));
    }
}
