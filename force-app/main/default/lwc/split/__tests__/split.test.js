import { createElement } from 'lwc';
import Split from 'c/split';

const DIMENSION_CATALOG = [
    { key: 'market', label: 'Market' },
    { key: 'channel', label: 'Channel' }
];
const DIMENSION_OPTIONS = {
    market: [{ id: 'SYD', label: 'Sydney' }, { id: 'MEL', label: 'Melbourne' }],
    channel: [{ id: 'NINE', label: 'Nine' }]
};
const DIMENSION_LABELS = { market: 'Market', channel: 'Channel' };

describe('c-split', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    function createSplit(props = {}) {
        const element = createElement('c-split', { is: Split });
        Object.assign(element, {
            id: 'sp1',
            title: 'Budget',
            metric: 'budget',
            unit: '$',
            allowPercent: true,
            dims: ['market'],
            columnDriver: null,
            breakouts: [],
            total: '',
            values: {},
            groups: {},
            open: true,
            required: false,
            dimensionCatalog: DIMENSION_CATALOG,
            dimensionOptionCounts: { market: 2, channel: 1 },
            dimensionOptions: DIMENSION_OPTIONS,
            dimensionLabels: DIMENSION_LABELS,
            weekColumns: [],
            burstColumns: [],
            ...props
        });
        document.body.appendChild(element);
        return element;
    }

    it('renders its dim label from the ordered group-by dimensions', () => {
        const element = createSplit({ dims: ['market', 'channel'] });
        return Promise.resolve().then(() => {
            expect(element.shadowRoot.querySelector('.split-dim-label').textContent.trim()).toBe('by Market › Channel');
        });
    });

    it('disables the remove button while the split is goal-required', () => {
        const element = createSplit({ required: true });
        return Promise.resolve().then(() => {
            expect(element.shadowRoot.querySelector('.icon-button_danger').disabled).toBe(true);
        });
    });

    it('toggles a group-by dimension and emits splitchange', () => {
        const element = createSplit({ dims: [] });
        const handler = jest.fn();
        element.addEventListener('splitchange', handler);

        return Promise.resolve().then(() => {
            element.shadowRoot.querySelector('[title="Grouping dimensions"]').click();
            return Promise.resolve();
        }).then(() => {
            const marketRow = [...element.shadowRoot.querySelectorAll('.checkbox-row')].find((b) => b.textContent.includes('Market'));
            marketRow.click();
            expect(handler.mock.calls[0][0].detail).toEqual({ id: 'sp1', patch: { dims: ['market'] } });
        });
    });

    it('shows the requirement banner when required and nothing has been entered', () => {
        const element = createSplit({ required: true, total: '', values: {} });
        return Promise.resolve().then(() => {
            expect(element.shadowRoot.querySelector('.requirement-banner').textContent).toContain('Fixed Budget is on');
        });
    });

    it('hides the requirement banner once a total is entered', () => {
        const element = createSplit({ required: true, total: '500000' });
        return Promise.resolve().then(() => {
            expect(element.shadowRoot.querySelector('.requirement-banner')).toBeNull();
        });
    });

    it('validate() reports the requirement banner text as a blocking issue', () => {
        const element = createSplit({ required: true });
        return Promise.resolve().then(() => {
            expect(element.validate()).toContain(
                'Fixed Budget is on. Enter a total, or an amount against at least one level below.'
            );
        });
    });

    it('getPayload() carries the ordered groupBy levels with this split\'s unit', () => {
        const element = createSplit({ dims: ['market', 'channel'], total: '500000' });
        return Promise.resolve().then(() => {
            const payload = element.getPayload();
            expect(payload.groupBy).toEqual([
                { level: 1, dimension: 'market', unit: '$' },
                { level: 2, dimension: 'channel', unit: '$' }
            ]);
            expect(payload.total).toEqual({ value: 500000, unit: '$' });
        });
    });

    it('forwards a cell edit from c-split-details up as splitchange', () => {
        const element = createSplit();
        const handler = jest.fn();
        element.addEventListener('splitchange', handler);

        return Promise.resolve().then(() => {
            const details = element.shadowRoot.querySelector('c-split-details');
            details.dispatchEvent(new CustomEvent('detailschange', { detail: { values: { x: '1' }, groups: {} } }));
            expect(handler.mock.calls[0][0].detail).toEqual({ id: 'sp1', patch: { values: { x: '1' }, groups: {} } });
        });
    });
});
