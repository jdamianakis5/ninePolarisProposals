import { createElement } from 'lwc';
import SpotDurations from 'c/spotDurations';

describe('c-spot-durations', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    function createSpotDurations(props = {}) {
        const element = createElement('c-spot-durations', { is: SpotDurations });
        Object.assign(element, {
            visibleDurations: ['15s', '30s', '45s', '60s'],
            selected: ['15s'],
            availableDurations: ['15s', '30s', '45s', '60s'],
            topTail: false,
            topTailSets: [{ id: 's1', top: '10', mid: '', hasMid: false, tail: '5' }],
            fixedOnly: true,
            ...props
        });
        document.body.appendChild(element);
        return element;
    }

    it('hides the toggle and the sets when the campaign is not fixed-only', () => {
        const element = createSpotDurations({ fixedOnly: false });
        return Promise.resolve().then(() => {
            expect(element.shadowRoot.querySelector('c-top-tail-toggle')).toBeNull();
            expect(element.shadowRoot.querySelector('c-top-tail-set-parent')).toBeNull();
        });
    });

    it('shows the sets only once fixed-only and the toggle are both on', () => {
        const element = createSpotDurations({ fixedOnly: true, topTail: true });
        return Promise.resolve().then(() => {
            expect(element.shadowRoot.querySelector('c-top-tail-set-parent')).not.toBeNull();
        });
    });

    it('durations combines the base selection with Top/Tail chip labels only while enabled', () => {
        const enabled = createSpotDurations({ topTail: true });
        const disabled = createSpotDurations({ topTail: false });
        expect(enabled.durations).toEqual(['15s', 'Top/Tail 10s/5s']);
        expect(disabled.durations).toEqual(['15s']);
    });

    it('emits spotdurationschange with the combined durations when the toggle changes', () => {
        const element = createSpotDurations({ topTail: false });
        const handler = jest.fn();
        element.addEventListener('spotdurationschange', handler);

        return Promise.resolve().then(() => {
            const toggle = element.shadowRoot.querySelector('c-top-tail-toggle');
            toggle.dispatchEvent(new CustomEvent('togglechange', { detail: { checked: true } }));
            const { detail } = handler.mock.calls[0][0];
            expect(detail.topTail).toBe(true);
            expect(detail.durations).toEqual(['15s', 'Top/Tail 10s/5s']);
        });
    });

    it('validate() delegates to topTailSetParent only while the sets are shown', () => {
        const hidden = createSpotDurations({ topTail: false });
        const shown = createSpotDurations({
            topTail: true,
            topTailSets: [{ id: 's1', top: '10', mid: '', hasMid: false, tail: '7' }]
        });
        return Promise.resolve().then(() => {
            expect(hidden.validate()).toEqual([]);
            expect(shown.validate()).toEqual(['Top/tail set 1 does not total a bookable duration.']);
        });
    });
});
