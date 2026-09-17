import { createElement } from 'lwc';
import SplitDetails from 'c/splitDetails';

const MARKET_OPTIONS = [
    { id: 'SYD', label: 'Sydney' },
    { id: 'MEL', label: 'Melbourne' }
];
const CHANNEL_OPTIONS = [
    { id: 'NINE', label: 'Nine' },
    { id: 'GO', label: 'GO!' }
];

describe('c-split-details', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    function createSplitDetails(props = {}) {
        const element = createElement('c-split-details', { is: SplitDetails });
        Object.assign(element, {
            dims: ['market'],
            dimensionOptions: { market: MARKET_OPTIONS, channel: CHANNEL_OPTIONS },
            columnDriver: null,
            columns: [],
            unit: '$',
            total: '1000000',
            values: {},
            groups: {},
            ...props
        });
        document.body.appendChild(element);
        return element;
    }

    it('renders one leaf row per dimension option, plus the Overall row', () => {
        const element = createSplitDetails();
        return Promise.resolve().then(() => {
            const labels = [...element.shadowRoot.querySelectorAll('.row-label')].map((el) => el.textContent.trim());
            expect(labels).toEqual(['Overall', 'Sydney', 'Melbourne']);
        });
    });

    it('dispatches detailschange with the new value when a leaf cell is edited', () => {
        const element = createSplitDetails();
        const handler = jest.fn();
        element.addEventListener('detailschange', handler);

        return Promise.resolve().then(() => {
            const rows = element.shadowRoot.querySelectorAll('.split-row');
            const input = rows[1].querySelector('.cell-input');
            input.value = '400000';
            input.dispatchEvent(new CustomEvent('change'));
            const { detail } = handler.mock.calls[0][0];
            expect(detail.values['root/market:SYD::']).toBe('400000');
        });
    });

    it('hasAnyValue() reflects entered cell values', () => {
        const element = createSplitDetails({ values: { 'root/market:SYD::': '400000' } });
        return Promise.resolve().then(() => {
            expect(element.hasAnyValue()).toBe(true);
        });
    });

    it('validate() flags a percentage column that does not total 100%', () => {
        const element = createSplitDetails({
            unit: '%',
            values: { 'root/market:SYD::': '40', 'root/market:MEL::': '40' }
        });
        return Promise.resolve().then(() => {
            expect(element.validate()).toEqual(['This split totals 80%, not 100%.']);
        });
    });

    it('validate() passes a percentage split whose column totals 100%', () => {
        const element = createSplitDetails({
            unit: '%',
            values: { 'root/market:SYD::': '60', 'root/market:MEL::': '40' }
        });
        return Promise.resolve().then(() => {
            expect(element.validate()).toEqual([]);
        });
    });

    it('warnings flags an absolute split whose fixed total does not match what is allocated', () => {
        const element = createSplitDetails({
            total: '1000000',
            values: { 'root/market:SYD::': '400000', 'root/market:MEL::': '400000' }
        });
        return Promise.resolve().then(() => {
            expect(element.warnings).toEqual(['This split allocates $800,000 against a target of $1,000,000.']);
        });
    });

    it('warnings is empty once the fixed total matches what is allocated', () => {
        const element = createSplitDetails({
            total: '1000000',
            values: { 'root/market:SYD::': '600000', 'root/market:MEL::': '400000' }
        });
        return Promise.resolve().then(() => {
            expect(element.warnings).toEqual([]);
        });
    });

    it('applyAction("group") merges the selected rows of the same dimension and parent', () => {
        const element = createSplitDetails();
        const handler = jest.fn();
        element.addEventListener('detailschange', handler);

        return Promise.resolve().then(() => {
            const checkboxes = element.shadowRoot.querySelectorAll('.row-checkbox');
            checkboxes[0].click();
            checkboxes[1].click();
            element.applyAction('group');
            const { detail } = handler.mock.calls[handler.mock.calls.length - 1][0];
            expect(detail.groups.market).toEqual([['SYD', 'MEL']]);
        });
    });

    it('getPayload() returns one row per leaf with its entered and resolved value', () => {
        const element = createSplitDetails({ values: { 'root/market:SYD::': '400000' } });
        return Promise.resolve().then(() => {
            const payload = element.getPayload();
            expect(payload.total).toEqual({ value: 1000000, unit: '$' });
            const sydRow = payload.rows.find((row) => row.rowId === 'root/market:SYD');
            expect(sydRow.entered).toEqual({ value: 400000, unit: '$' });
            expect(sydRow.path).toEqual([{ dimension: 'market', refIds: ['SYD'] }]);
        });
    });
});
