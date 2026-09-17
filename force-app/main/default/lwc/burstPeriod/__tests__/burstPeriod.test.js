import { createElement } from 'lwc';
import BurstPeriod from 'c/burstPeriod';

describe('c-burst-period', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    function createBurstPeriod(props = {}) {
        const element = createElement('c-burst-period', { is: BurstPeriod });
        Object.assign(element, {
            burst: { id: 'b1', name: '', start: '', end: '' },
            placeholder: 'Burst 1',
            planStart: '2026-09-07',
            planEnd: '2026-10-18',
            showRemove: true,
            ...props
        });
        document.body.appendChild(element);
        return element;
    }

    it('renders the formatted start and end dates', () => {
        const element = createBurstPeriod({ burst: { id: 'b1', name: 'Burst 1', start: '2026-09-07', end: '2026-09-20' } });
        return Promise.resolve().then(() => {
            const buttons = element.shadowRoot.querySelectorAll('.date-field');
            expect(buttons[0].textContent.trim()).toBe('07/09/2026');
            expect(buttons[1].textContent.trim()).toBe('20/09/2026');
        });
    });

    it('dispatches burstchange with a patch when the name changes', () => {
        const element = createBurstPeriod();
        const handler = jest.fn();
        element.addEventListener('burstchange', handler);

        return Promise.resolve().then(() => {
            const input = element.shadowRoot.querySelector('lightning-input');
            input.value = 'Launch burst';
            input.dispatchEvent(new CustomEvent('change'));

            expect(handler.mock.calls[0][0].detail).toEqual({ id: 'b1', patch: { name: 'Launch burst' } });
        });
    });

    it('dispatches burstremove with its id', () => {
        const element = createBurstPeriod();
        const handler = jest.fn();
        element.addEventListener('burstremove', handler);

        return Promise.resolve().then(() => {
            element.shadowRoot.querySelector('.slds-button_text-destructive').click();
            expect(handler.mock.calls[0][0].detail).toEqual({ id: 'b1' });
        });
    });

    it('hides Remove when showRemove is false', () => {
        const element = createBurstPeriod({ showRemove: false });
        return Promise.resolve().then(() => {
            expect(element.shadowRoot.querySelector('.slds-button_text-destructive')).toBeNull();
        });
    });

    it('shows the issue message when one is supplied', () => {
        const element = createBurstPeriod({ issue: 'Overlaps Burst 2.' });
        return Promise.resolve().then(() => {
            expect(element.shadowRoot.querySelector('.slds-text-color_error').textContent.trim()).toBe('Overlaps Burst 2.');
        });
    });
});
