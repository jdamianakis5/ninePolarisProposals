import { createElement } from 'lwc';
import TopTailDurations from 'c/topTailDurations';

describe('c-top-tail-durations', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    function createTopTailDurations(props = {}) {
        const element = createElement('c-top-tail-durations', { is: TopTailDurations });
        Object.assign(element, { topTail: false, topTailSets: [], ...props });
        document.body.appendChild(element);
        return element;
    }

    it('seeds one default set when the toggle is switched on with no existing sets', () => {
        const element = createTopTailDurations();
        const handler = jest.fn();
        element.addEventListener('toptailchange', handler);

        return Promise.resolve().then(() => {
            const toggle = element.shadowRoot.querySelector('lightning-input');
            toggle.dispatchEvent(new CustomEvent('change'));

            expect(handler).toHaveBeenCalledTimes(1);
            const { detail } = handler.mock.calls[0][0];
            expect(detail.topTail).toBe(true);
            expect(detail.topTailSets).toEqual([{ id: expect.any(String), top: '10', mid: '', hasMid: false, tail: '5' }]);
            expect(detail.chipLabels).toEqual(['Top/Tail 10s/5s']);
        });
    });

    it('shows the success message for a set that totals a bookable duration', () => {
        const element = createTopTailDurations({
            topTail: true,
            topTailSets: [{ id: 's1', top: '10', mid: '', hasMid: false, tail: '5' }]
        });

        return Promise.resolve().then(() => {
            expect(element.shadowRoot.textContent).toContain('Totals 15s.');
            expect(element.validate()).toEqual([]);
        });
    });

    it('shows the exact detailed error and the short validate() message for a non-bookable total', () => {
        const element = createTopTailDurations({
            topTail: true,
            topTailSets: [{ id: 's1', top: '10', mid: '', hasMid: false, tail: '7' }]
        });

        return Promise.resolve().then(() => {
            expect(element.shadowRoot.textContent).toContain(
                'Top and tail add up to 17s, which is not a bookable duration. '
                + 'Adjust them to total one of: 5s, 6s, 7s, 8s, 10s, 15s, 20s, 30s, 45s, 60s, 75s, 90s, 120s, 180s.'
            );
            expect(element.validate()).toEqual(['Top/tail set 1 does not total a bookable duration.']);
        });
    });

    it('includes "middle" in the detailed error once a middle duration is added', () => {
        const element = createTopTailDurations({
            topTail: true,
            topTailSets: [{ id: 's1', top: '10', mid: '3', hasMid: true, tail: '8' }]
        });

        return Promise.resolve().then(() => {
            expect(element.shadowRoot.textContent).toContain('Top, middle and tail add up to 21s');
        });
    });

    it('hides Remove set when only one set exists, and reports validate() as empty when the toggle is off', () => {
        const element = createTopTailDurations({
            topTail: false,
            topTailSets: [{ id: 's1', top: '10', mid: '', hasMid: false, tail: '7' }]
        });

        return Promise.resolve().then(() => {
            expect(element.validate()).toEqual([]);
        });
    });

    it('removes a set and drops its chip label', () => {
        const element = createTopTailDurations({
            topTail: true,
            topTailSets: [
                { id: 's1', top: '10', mid: '', hasMid: false, tail: '5' },
                { id: 's2', top: '15', mid: '', hasMid: false, tail: '15' }
            ]
        });
        const handler = jest.fn();
        element.addEventListener('toptailchange', handler);

        return Promise.resolve().then(() => {
            const removeButtons = [...element.shadowRoot.querySelectorAll('button')].filter(
                (button) => button.textContent.trim() === 'Remove set'
            );
            removeButtons[0].click();

            const { detail } = handler.mock.calls[0][0];
            expect(detail.topTailSets).toHaveLength(1);
            expect(detail.chipLabels).toEqual(['Top/Tail 15s/15s']);
        });
    });
});
