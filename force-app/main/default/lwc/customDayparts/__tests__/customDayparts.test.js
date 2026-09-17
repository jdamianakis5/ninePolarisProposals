import { createElement } from 'lwc';
import CustomDayparts from 'c/customDayparts';

describe('c-custom-dayparts', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    function createCustomDayparts(props = {}) {
        const element = createElement('c-custom-dayparts', { is: CustomDayparts });
        Object.assign(element, { ranges: [], ...props });
        document.body.appendChild(element);
        return element;
    }

    it('shows the 12-hour summary once both times are set', () => {
        const element = createCustomDayparts({
            ranges: [{ id: 'r1', name: 'Breakfast', start: '06:00', end: '08:59' }]
        });

        return Promise.resolve().then(() => {
            const summary = element.shadowRoot.querySelector('.slds-text-body_small');
            expect(summary.textContent.trim()).toBe('6am to 8:59am');
        });
    });

    it('shows the error prompt when either time is missing', () => {
        const element = createCustomDayparts({
            ranges: [{ id: 'r1', name: 'Breakfast', start: '06:00', end: '' }]
        });

        return Promise.resolve().then(() => {
            const summary = element.shadowRoot.querySelector('.slds-text-color_error');
            expect(summary.textContent.trim()).toBe('Set a start and an end time');
        });
    });

    it('dispatches daypartrangeschange with a new blank row when + Custom Time Period is clicked', () => {
        const element = createCustomDayparts();
        const handler = jest.fn();
        element.addEventListener('daypartrangeschange', handler);

        return Promise.resolve().then(() => {
            const addButton = [...element.shadowRoot.querySelectorAll('button')].find(
                (button) => button.textContent.trim() === '+ Custom Time Period'
            );
            addButton.click();

            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler.mock.calls[0][0].detail.ranges).toHaveLength(1);
        });
    });

    it('validate() names an unnamed row by its position in the full list', () => {
        const element = createCustomDayparts({
            ranges: [
                { id: 'r1', name: 'Breakfast', start: '06:00', end: '08:59' },
                { id: 'r2', name: '', start: '09:00', end: '' }
            ]
        });

        return Promise.resolve().then(() => {
            expect(element.validate()).toEqual([
                'Custom time period Daypart 2 needs both a start and an end time.'
            ]);
        });
    });
});
