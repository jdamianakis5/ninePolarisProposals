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
        Object.assign(element, {
            bursts: [],
            planStart: '2026-09-07',
            planEnd: '2026-10-18',
            ...props
        });
        document.body.appendChild(element);
        return element;
    }

    it('renders one row per burst with its formatted dates', () => {
        const element = createBurstPeriods({
            bursts: [{ id: 'b1', name: 'Burst 1', start: '2026-09-07', end: '2026-09-20' }]
        });

        return Promise.resolve().then(() => {
            const dateButtons = element.shadowRoot.querySelectorAll('.date-field');
            expect(dateButtons).toHaveLength(2);
            expect(dateButtons[0].textContent.trim()).toBe('07/09/2026');
            expect(dateButtons[1].textContent.trim()).toBe('20/09/2026');
        });
    });

    it('dispatches burstschange with a new burst when Add Burst Period is clicked', () => {
        const element = createBurstPeriods();
        const handler = jest.fn();
        element.addEventListener('burstschange', handler);

        return Promise.resolve().then(() => {
            const addButton = [...element.shadowRoot.querySelectorAll('button')].find(
                (button) => button.textContent.trim() === '+ Add Burst Period'
            );
            addButton.click();

            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler.mock.calls[0][0].detail.bursts).toHaveLength(1);
            expect(handler.mock.calls[0][0].detail.bursts[0].name).toBe('Burst 1');
        });
    });

    it('flags overlapping bursts with the exact validation message', () => {
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

    it('flags a burst that starts before the campaign flight', () => {
        const element = createBurstPeriods({
            bursts: [{ id: 'b1', name: 'Burst 1', start: '2026-09-01', end: '2026-09-10' }]
        });

        return Promise.resolve().then(() => {
            expect(element.validate()).toContain('Starts before the campaign start (07/09/2026).');
        });
    });

    it('removes a burst and reports no issues once the list is empty', () => {
        const element = createBurstPeriods({
            bursts: [{ id: 'b1', name: 'Burst 1', start: '', end: '' }]
        });
        const handler = jest.fn();
        element.addEventListener('burstschange', handler);

        return Promise.resolve().then(() => {
            const removeButton = [...element.shadowRoot.querySelectorAll('button')].find(
                (button) => button.textContent.trim() === 'Remove'
            );
            removeButton.click();

            expect(handler.mock.calls[0][0].detail.bursts).toHaveLength(0);
        });
    });
});
