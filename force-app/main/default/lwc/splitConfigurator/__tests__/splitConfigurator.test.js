import { createElement } from 'lwc';
import SplitConfigurator from 'c/splitConfigurator';

describe('c-split-configurator', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    function createConfigurator(props = {}) {
        const element = createElement('c-split-configurator', { is: SplitConfigurator });
        Object.assign(element, {
            availableMarkets: [{ id: 'SYD', label: 'Sydney' }, { id: 'MEL', label: 'Melbourne' }],
            availableChannels: [{ id: 'NINE', label: 'Nine' }],
            availableDayparts: [],
            availableDurations: [],
            availableWeekdays: [],
            availableCustomTimePeriods: [],
            availableWeeks: [],
            availableBursts: [],
            fixedOnly: false,
            goals: { budget: false, price: false, audience: false, reach: false },
            priceUnit: 'CPM',
            audienceUnit: '000s',
            splits: [],
            ...props
        });
        document.body.appendChild(element);
        return element;
    }

    function toggleGoal(element, key) {
        const toggles = element.shadowRoot.querySelectorAll('lightning-input');
        const index = ['budget', 'price', 'audience', 'reach'].indexOf(key);
        toggles[index].checked = !toggles[index].checked;
        toggles[index].dispatchEvent(new CustomEvent('change'));
    }

    it('creates a required budget split when Fixed Budget is switched on', () => {
        const element = createConfigurator();
        return Promise.resolve().then(() => {
            toggleGoal(element, 'budget');
            return Promise.resolve();
        }).then(() => {
            const payload = element.getPayload();
            expect(payload.splitConstraints).toHaveLength(1);
            expect(payload.splitConstraints[0].metric).toBe('budget');
            expect(payload.splitConstraints[0].required).toBe(true);
        });
    });

    it('unlocks the split for removal, without deleting it, when the goal is switched off', () => {
        const element = createConfigurator();
        return Promise.resolve().then(() => {
            toggleGoal(element, 'budget');
            return Promise.resolve();
        }).then(() => {
            toggleGoal(element, 'budget');
            return Promise.resolve();
        }).then(() => {
            const payload = element.getPayload();
            expect(payload.splitConstraints).toHaveLength(1);
            expect(payload.splitConstraints[0].required).toBe(false);
        });
    });

    it('adds a new split from a metric pill', () => {
        const element = createConfigurator();
        return Promise.resolve().then(() => {
            const cpmPill = [...element.shadowRoot.querySelectorAll('.metric-pill')].find((b) => b.textContent === 'CPM');
            cpmPill.click();
            return Promise.resolve();
        }).then(() => {
            expect(element.getPayload().splitConstraints).toHaveLength(1);
            expect(element.getPayload().splitConstraints[0].metric).toBe('cpm');
        });
    });

    it('converts the required split in place when switching Fixed Price between CPM and CPT', () => {
        const element = createConfigurator();
        return Promise.resolve().then(() => {
            toggleGoal(element, 'price');
            return Promise.resolve();
        }).then(() => {
            expect(element.getPayload().splitConstraints[0].metric).toBe('cpm');
            const cptPill = [...element.shadowRoot.querySelectorAll('.sub-choice-pill')].find((b) => b.textContent === 'CPT');
            cptPill.click();
            return Promise.resolve();
        }).then(() => {
            const payload = element.getPayload();
            expect(payload.splitConstraints).toHaveLength(1);
            expect(payload.splitConstraints[0].metric).toBe('cpt');
        });
    });

    it('flags two splits of the same metric both allocating by the same lowest-level dimension', () => {
        const element = createConfigurator({
            splits: [
                { id: 's1', metric: 'budget', unit: '$', dims: ['market'], columnDriver: null, breakouts: [], total: '', values: {}, groups: {}, open: true, required: false },
                { id: 's2', metric: 'budget', unit: '%', dims: ['market'], columnDriver: null, breakouts: [], total: '', values: {}, groups: {}, open: true, required: false }
            ]
        });
        return Promise.resolve().then(() => {
            expect(element.validate()).toContain('Two Budget splits both allocate by Market. Split 1 already owns it.');
        });
    });
});
