import { LightningElement, api } from 'lwc';

const METRIC_META = {
    budget: { label: 'Budget', defaultUnit: '$', allowPercent: true, defaultDim: 'market' },
    tarps: { label: 'TARPs', defaultUnit: '%', allowPercent: true, defaultDim: 'channel' },
    impressions: { label: '000s', defaultUnit: '%', allowPercent: true, defaultDim: 'market' },
    spots: { label: 'Spots', defaultUnit: '#', allowPercent: true, defaultDim: 'market' },
    cpm: { label: 'CPM', defaultUnit: '$', allowPercent: false, defaultDim: 'market' },
    cpt: { label: 'CPT', defaultUnit: '$', allowPercent: false, defaultDim: 'market' }
};
const METRIC_PILLS = ['budget', 'tarps', 'impressions', 'spots', 'cpm', 'cpt'];
const DIMENSION_CATALOG = [
    { key: 'market', label: 'Market' },
    { key: 'channel', label: 'Channel' },
    { key: 'daypart', label: 'Day Part' },
    { key: 'duration', label: 'Duration' },
    { key: 'weekday', label: 'Day' },
    { key: 'timeRange', label: 'Custom Time Period', fixedOnly: true }
];

let nextId = 0;
function generateId() {
    nextId += 1;
    return `split-${Date.now()}-${nextId}`;
}

function newSplit(metric, required) {
    const meta = METRIC_META[metric];
    return {
        id: generateId(),
        metric,
        unit: meta.defaultUnit,
        dims: [meta.defaultDim],
        columnDriver: null,
        breakouts: [],
        total: '',
        values: {},
        groups: {},
        open: true,
        required
    };
}

/**
 * Level 1 card shell (Technical Design, c-splitConfigurator). Renders the four goal
 * toggles and the six metric pills described in the source contract's "Split Creator"
 * requirements, and holds the working list of splits. Nothing here is saved directly: it
 * hands its payload to the page-level save the same way spotDurationsAndDayparts and
 * burstsAndCustomDayparts do.
 */
export default class SplitConfigurator extends LightningElement {
    @api availableMarkets = [];
    @api availableChannels = [];
    @api availableDayparts = [];
    @api availableDurations = [];
    @api availableWeekdays = [];
    @api availableCustomTimePeriods = [];
    @api availableWeeks = [];
    @api availableBursts = [];
    @api fixedOnly = false;
    @api disabled = false;

    _goals = { budget: false, price: false, audience: false, reach: false };
    _priceUnit = 'CPM';
    _audienceUnit = '000s';
    _splits = [];
    _seeded = {};

    @api
    get goals() {
        return this._goals;
    }

    set goals(value) {
        this.seedOnce('goals', value);
    }

    @api
    get priceUnit() {
        return this._priceUnit;
    }

    set priceUnit(value) {
        this.seedOnce('priceUnit', value);
    }

    @api
    get audienceUnit() {
        return this._audienceUnit;
    }

    set audienceUnit(value) {
        this.seedOnce('audienceUnit', value);
    }

    @api
    get splits() {
        return this._splits;
    }

    set splits(value) {
        this.seedOnce('splits', value);
    }

    seedOnce(key, value) {
        if (this._seeded[key]) {
            return;
        }
        this[`_${key}`] = value;
        this._seeded[key] = true;
    }

    get dimensionOptions() {
        return {
            market: this.availableMarkets,
            channel: this.availableChannels,
            daypart: this.availableDayparts,
            duration: this.availableDurations,
            weekday: this.availableWeekdays,
            timeRange: this.availableCustomTimePeriods
        };
    }

    get dimensionOptionCounts() {
        const options = this.dimensionOptions;
        const counts = {};
        DIMENSION_CATALOG.forEach((dim) => {
            counts[dim.key] = (options[dim.key] || []).length;
        });
        return counts;
    }

    get dimensionLabels() {
        const labels = {};
        DIMENSION_CATALOG.forEach((dim) => {
            labels[dim.key] = dim.label;
        });
        return labels;
    }

    get goalToggles() {
        const g = this._goals;
        return [
            { key: 'budget', label: 'Fixed Budget', on: g.budget, showSubChoice: false },
            { key: 'price', label: 'Fixed Price', on: g.price, showSubChoice: g.price, subOptions: this.priceSubOptions() },
            { key: 'audience', label: 'Fixed Audience', on: g.audience, showSubChoice: g.audience, subOptions: this.audienceSubOptions() },
            { key: 'reach', label: 'Highest Reach', on: g.reach, showSubChoice: false }
        ];
    }

    priceSubOptions() {
        return ['CPM', 'CPT'].map((value) => ({ value, selected: this._priceUnit === value }));
    }

    audienceSubOptions() {
        return ['000s', 'TARPS'].map((value) => ({ value, selected: this._audienceUnit === value }));
    }

    get metricPills() {
        return METRIC_PILLS.map((metric) => ({ metric, label: METRIC_META[metric].label }));
    }

    get splitViews() {
        const byMetric = {};
        this._splits.forEach((split) => {
            byMetric[split.metric] = (byMetric[split.metric] || 0) + 1;
        });
        const seenSoFar = {};
        return this._splits.map((split) => {
            const meta = METRIC_META[split.metric];
            seenSoFar[split.metric] = (seenSoFar[split.metric] || 0) + 1;
            const title = byMetric[split.metric] > 1 ? `${meta.label} (${seenSoFar[split.metric]})` : meta.label;
            return {
                ...split,
                title,
                allowPercent: meta.allowPercent,
                dimensionCatalog: DIMENSION_CATALOG.filter((dim) => split.metric !== 'tarps' || dim.key !== 'market')
            };
        });
    }

    /**
     * @returns {String[]} every blocking issue across every split, plus a best-effort
     * check for the "no duplicate allocation" rule (Technical Design contract, section
     * 2.5): this reports the conflict but does not grey out the affected value fields,
     * which the source design also specifies and this implementation does not build.
     */
    @api validate() {
        const issues = [];
        this.template.querySelectorAll('c-split').forEach((splitEl) => {
            issues.push(...splitEl.validate());
        });
        issues.push(...this.duplicateAllocationIssues());
        return issues;
    }

    /**
     * @returns {String[]} advisory-only messages, forwarded from every split.
     */
    @api get warnings() {
        const all = [];
        this.template.querySelectorAll('c-split').forEach((splitEl) => {
            all.push(...splitEl.warnings);
        });
        return all;
    }

    duplicateAllocationIssues() {
        const issues = [];
        const owners = {};
        this._splits.forEach((split, index) => {
            if (!split.dims.length) {
                return;
            }
            const lowest = split.dims[split.dims.length - 1];
            const key = `${split.metric}:${lowest}`;
            if (owners[key] !== undefined) {
                issues.push(
                    `Two ${METRIC_META[split.metric].label} splits both allocate by ${this.dimensionLabels[lowest]}. `
                    + `Split ${owners[key] + 1} already owns it.`
                );
            } else {
                owners[key] = index;
            }
        });
        return issues;
    }

    /**
     * @returns {{goals: Object, splitConstraints: Array}} the payload for the page-level
     * save, matching the contract's request shape.
     */
    @api getPayload() {
        const splitConstraints = [];
        this.template.querySelectorAll('c-split').forEach((splitEl) => {
            splitConstraints.push(splitEl.getPayload());
        });
        return {
            goals: {
                fixedBudget: { enabled: this._goals.budget },
                fixedPrice: { enabled: this._goals.price, unit: this._priceUnit },
                fixedAudience: { enabled: this._goals.audience, unit: this._audienceUnit },
                highestReach: { enabled: this._goals.reach }
            },
            splitConstraints
        };
    }

    handleGoalToggle(event) {
        const { key } = event.currentTarget.dataset;
        const on = !this._goals[key];
        this._goals = { ...this._goals, [key]: on };
        if (key === 'budget') {
            this.setRequiredSplit('budget', on);
        } else if (key === 'price') {
            this.setRequiredSplit(this._priceUnit.toLowerCase(), on);
        } else if (key === 'audience') {
            this.setRequiredSplit(this._audienceUnit === 'TARPS' ? 'tarps' : 'impressions', on);
        }
    }

    handleSubChoiceClick(event) {
        const { key, value } = event.currentTarget.dataset;
        if (key === 'price') {
            this.handlePriceUnit(value);
        } else if (key === 'audience') {
            this.handleAudienceUnit(value);
        }
    }

    handlePriceUnit(value) {
        if (value === this._priceUnit) {
            return;
        }
        const from = this._priceUnit.toLowerCase();
        const to = value.toLowerCase();
        this._priceUnit = value;
        if (this._goals.price) {
            this.convertRequiredSplit(from, to);
        }
    }

    handleAudienceUnit(value) {
        if (value === this._audienceUnit) {
            return;
        }
        const from = this._audienceUnit === 'TARPS' ? 'tarps' : 'impressions';
        const to = value === 'TARPS' ? 'tarps' : 'impressions';
        this._audienceUnit = value;
        if (this._goals.audience) {
            this.convertRequiredSplit(from, to, to === 'tarps');
        }
    }

    /**
     * Creates the goal-driven split the first time a goal is switched on, and re-locks it
     * (without recreating it) if the user turns the goal on again later. Turning the goal
     * off unlocks the split for removal but never deletes it automatically (Technical
     * Design, section 2.1: this is deliberately different from the Bursts/Custom Dayparts
     * deletion rule, which is a data-integrity rule, not a goal-management rule).
     */
    setRequiredSplit(metric, on) {
        const existing = this._splits.find((split) => split.metric === metric);
        if (on) {
            this._splits = existing
                ? this._splits.map((split) => (split.metric === metric ? { ...split, required: true } : split))
                : [...this._splits, newSplit(metric, true)];
        } else if (existing) {
            this._splits = this._splits.map((split) => (split.metric === metric ? { ...split, required: false } : split));
        }
    }

    convertRequiredSplit(fromMetric, toMetric, dropMarket) {
        this._splits = this._splits.map((split) => {
            if (split.metric !== fromMetric || !split.required) {
                return split;
            }
            const dims = dropMarket ? split.dims.filter((dim) => dim !== 'market') : split.dims;
            return { ...split, metric: toMetric, dims: dims.length ? dims : [METRIC_META[toMetric].defaultDim] };
        });
    }

    handleAddSplit(event) {
        const { metric } = event.currentTarget.dataset;
        this._splits = [...this._splits, newSplit(metric, false)];
    }

    handleSplitChange(event) {
        const { id, patch } = event.detail;
        this._splits = this._splits.map((split) => (split.id === id ? { ...split, ...patch } : split));
    }

    handleSplitRemove(event) {
        const { id } = event.detail;
        this._splits = this._splits.filter((split) => split.id !== id);
    }
}
