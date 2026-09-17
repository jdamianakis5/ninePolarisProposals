import { createElement } from 'lwc';
import MarketChannelSelector from 'c/marketChannelSelector';

const MARKETS = [{ id: 'SYD', label: 'Sydney' }, { id: 'MEL', label: 'Melbourne' }];
const CHANNELS = [{ id: 'NINE', label: 'Nine' }, { id: 'GO', label: 'GO!' }];

describe('c-market-channel-selector', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    function createSelector(props = {}) {
        const element = createElement('c-market-channel-selector', { is: MarketChannelSelector });
        Object.assign(element, { markets: MARKETS, channels: CHANNELS, marketType: 'metro', selectedPairs: [], ...props });
        document.body.appendChild(element);
        return element;
    }

    it('shows the picker by default and hides it once collapsed', () => {
        const element = createSelector();
        return Promise.resolve().then(() => {
            expect(element.shadowRoot.querySelector('c-market-channel-picker')).not.toBeNull();
            element.shadowRoot.querySelector('.chevron-button').click();
            return Promise.resolve();
        }).then(() => {
            expect(element.shadowRoot.querySelector('c-market-channel-picker')).toBeNull();
        });
    });

    it('shows the selection summary underneath even while collapsed', () => {
        const element = createSelector({ selectedPairs: ['SYD|NINE', 'SYD|GO'] });
        return Promise.resolve().then(() => {
            element.shadowRoot.querySelector('.chevron-button').click();
            return Promise.resolve();
        }).then(() => {
            const summary = element.shadowRoot.querySelector('.selection-summary');
            expect(summary.textContent).toContain('Sydney');
            expect(summary.textContent).toContain('Nine, GO!');
        });
    });

    it('validate() requires at least one market and one channel', () => {
        const element = createSelector();
        return Promise.resolve().then(() => {
            expect(element.validate()).toEqual([
                'Select at least one market before moving on to the Optimiser Inputs page.',
                'Select at least one channel before moving on to the Optimiser Inputs page.'
            ]);
        });
    });

    it('validate() passes once a market and channel are selected', () => {
        const element = createSelector({ selectedPairs: ['SYD|NINE'] });
        return Promise.resolve().then(() => {
            expect(element.validate()).toEqual([]);
        });
    });

    it('getPayload() de-duplicates markets and channels across pairs', () => {
        const element = createSelector({ selectedPairs: ['SYD|NINE', 'SYD|GO', 'MEL|NINE'] });
        return Promise.resolve().then(() => {
            const payload = element.getPayload();
            expect(payload.markets.sort()).toEqual(['MEL', 'SYD']);
            expect(payload.channels.sort()).toEqual(['GO', 'NINE']);
            expect(payload.pairs).toHaveLength(3);
        });
    });

    it('updates the selection when the picker reports a change', () => {
        const element = createSelector();
        return Promise.resolve().then(() => {
            const picker = element.shadowRoot.querySelector('c-market-channel-picker');
            picker.dispatchEvent(new CustomEvent('selectionchange', { detail: { selectedPairs: ['SYD|NINE'] } }));
            return Promise.resolve();
        }).then(() => {
            expect(element.getPayload().pairs).toEqual(['SYD|NINE']);
        });
    });
});
