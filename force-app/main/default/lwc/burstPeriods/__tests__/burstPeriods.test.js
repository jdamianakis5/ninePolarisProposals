import { createElement } from 'lwc';
import BurstPeriods from 'c/burstPeriods';

describe('c-burst-periods', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    function createBurstPeriods(props = {}) {
        const element = createElement('c-burst-periods', { is: BurstPeriods });
        Object.assign(element, { bursts: [], planStart: '2026-09-07', planEnd: '2026-10-18', ...props });
        document.body.appendChild(element);
        return element;
    }

    it('renders one c-burst-period per burst', () => {
        const element = createBurstPeriods({
            bursts: [
                { id: 'b1', name: 'Burst 1', start: '2026-09-07', end: '2026-09-20' },
                { id: 'b2', name: 'Burst 2', start: '2026-09-21', end: '2026-09-28' }
            ]
        });
        return Promise.resolve().then(() => {
            expect(element.shadowRoot.querySelectorAll('c-burst-period')).toHaveLength(2);
        });
    });

    it('dispatches burstschange with a new burst when Add Burst Period is clicked', () => {
        const element = createBurstPeriods();
        const handler = jest.fn();
        element.addEventListener('burstschange', handler);

        return Promise.resolve().then(() => {
            element.shadowRoot.querySelector('button').click();
            expect(handler.mock.calls[0][0].detail.bursts).toHaveLength(1);
            expect(handler.mock.calls[0][0].detail.bursts[0].name).toBe('Burst 1');
        });
    });

    it('merges a burstchange event from a child row into the full array', () => {
        const element = createBurstPeriods({ bursts: [{ id: 'b1', name: 'Burst 1', start: '', end: '' }] });
        const handler = jest.fn();
        element.addEventListener('burstschange', handler);

        return Promise.resolve().then(() => {
            const child = element.shadowRoot.querySelector('c-burst-period');
            child.dispatchEvent(new CustomEvent('burstchange', { detail: { id: 'b1', patch: { start: '2026-09-07' } } }));
            expect(handler.mock.calls[0][0].detail.bursts[0].start).toBe('2026-09-07');
        });
    });

    it('validate() flags overlapping bursts with the exact wording', () => {
        const element = createBurstPeriods({
            bursts: [
                { id: 'b1', name: 'Burst 1', start: '2026-09-07', end: '2026-09-20' },
                { id: 'b2', name: 'Burst 2', start: '2026-09-15', end: '2026-09-25' }
            ]
        });
        return Promise.resolve().then(() => {
            expect(element.validate()).toContain('Overlaps Burst 2.');
        });
    });
});
