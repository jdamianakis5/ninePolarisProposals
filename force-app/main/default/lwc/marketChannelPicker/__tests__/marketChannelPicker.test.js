import { createElement } from 'lwc';
import MarketChannelPicker from 'c/marketChannelPicker';

const MARKETS = [{ id: 'SYD', label: 'Sydney' }, { id: 'MEL', label: 'Melbourne' }];
const CHANNELS = [{ id: 'NINE', label: 'Nine' }, { id: 'GO', label: 'GO!' }];

describe('c-market-channel-picker', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    function createPicker(props = {}) {
        const element = createElement('c-market-channel-picker', { is: MarketChannelPicker });
        Object.assign(element, { markets: MARKETS, channels: CHANNELS, selectedPairs: [], ...props });
        document.body.appendChild(element);
        return element;
    }

    it('renders one row per market and one header per channel', () => {
        const element = createPicker();
        return Promise.resolve().then(() => {
            expect(element.shadowRoot.querySelectorAll('.row-cell')).toHaveLength(2);
            expect(element.shadowRoot.querySelectorAll('.header-cell')).toHaveLength(2);
        });
    });

    it('toggles a single cell', () => {
        const element = createPicker();
        const handler = jest.fn();
        element.addEventListener('selectionchange', handler);

        return Promise.resolve().then(() => {
            element.shadowRoot.querySelector('[data-key="SYD|NINE"]').click();
            expect(handler.mock.calls[0][0].detail.selectedPairs).toEqual(['SYD|NINE']);
        });
    });

    it('selects every channel for a market when its row header is clicked', () => {
        const element = createPicker();
        const handler = jest.fn();
        element.addEventListener('selectionchange', handler);

        return Promise.resolve().then(() => {
            element.shadowRoot.querySelector('[data-marketid="SYD"]').click();
            expect(handler.mock.calls[0][0].detail.selectedPairs.sort()).toEqual(['SYD|GO', 'SYD|NINE']);
        });
    });

    it('selects every market for a channel when its column header is clicked', () => {
        const element = createPicker();
        const handler = jest.fn();
        element.addEventListener('selectionchange', handler);

        return Promise.resolve().then(() => {
            element.shadowRoot.querySelector('[data-channelid="NINE"]').click();
            expect(handler.mock.calls[0][0].detail.selectedPairs.sort()).toEqual(['MEL|NINE', 'SYD|NINE']);
        });
    });

    it('clears everything when the corner Select All is toggled off', () => {
        const element = createPicker({ selectedPairs: ['SYD|NINE', 'SYD|GO', 'MEL|NINE', 'MEL|GO'] });
        const handler = jest.fn();
        element.addEventListener('selectionchange', handler);

        return Promise.resolve().then(() => {
            element.shadowRoot.querySelector('.corner-cell').click();
            expect(handler.mock.calls[0][0].detail.selectedPairs).toEqual([]);
        });
    });

    it('shows the group header once per group for regional markets', () => {
        const element = createPicker({
            markets: [
                { id: 'NEW', label: 'Newcastle', groupId: 'NNSW', groupLabel: 'Northern NSW' },
                { id: 'COF', label: 'Coffs Harbour', groupId: 'NNSW', groupLabel: 'Northern NSW' },
                { id: 'GRI', label: 'Griffith', groupId: 'GRI', groupLabel: 'Griffith' }
            ]
        });
        return Promise.resolve().then(() => {
            expect(element.shadowRoot.querySelectorAll('.group-header')).toHaveLength(2);
        });
    });
});
