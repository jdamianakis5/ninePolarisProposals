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
        Object.assign(element, { dayparts: [], defaultDayparts: [], ...props });
        document.body.appendChild(element);
        return element;
    }

    function updateDefaultsButton(element) {
        return [...element.shadowRoot.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Update Defaults');
    }

    it('renders one c-custom-daypart per row', () => {
        const element = createCustomDayparts({
            dayparts: [{ id: 'd1', name: 'A', start: '06:00', end: '07:00', isApplyByDefault: false }]
        });
        return Promise.resolve().then(() => {
            expect(element.shadowRoot.querySelectorAll('c-custom-daypart')).toHaveLength(1);
        });
    });

    it('validate() is empty for an empty list: custom dayparts are optional', () => {
        const element = createCustomDayparts();
        return Promise.resolve().then(() => {
            expect(element.validate()).toEqual([]);
        });
    });

    it('validate() flags overlapping dayparts', () => {
        const element = createCustomDayparts({
            dayparts: [
                { id: 'd1', name: 'Morning', start: '06:00', end: '09:00', isApplyByDefault: false },
                { id: 'd2', name: 'Breakfast', start: '08:00', end: '10:00', isApplyByDefault: false }
            ]
        });
        return Promise.resolve().then(() => {
            expect(element.validate()).toEqual(['Morning overlaps Breakfast.']);
        });
    });

    it('disables Update Defaults when the current set matches the stored default', () => {
        const element = createCustomDayparts({
            dayparts: [{ id: 'd1', name: 'Morning', start: '06:00', end: '09:00', isApplyByDefault: true }],
            defaultDayparts: [{ name: 'Morning', start: '06:00', end: '09:00' }]
        });
        return Promise.resolve().then(() => {
            expect(updateDefaultsButton(element).disabled).toBe(true);
        });
    });

    it('enables Update Defaults once a row diverges from the stored default', () => {
        const element = createCustomDayparts({
            dayparts: [{ id: 'd1', name: 'Morning', start: '06:00', end: '09:30', isApplyByDefault: false }],
            defaultDayparts: [{ name: 'Morning', start: '06:00', end: '09:00' }]
        });
        return Promise.resolve().then(() => {
            expect(updateDefaultsButton(element).disabled).toBe(false);
        });
    });

    it('dispatches updatedefaults with the current set when clicked while enabled', () => {
        const dayparts = [{ id: 'd1', name: 'Morning', start: '06:00', end: '09:30', isApplyByDefault: false }];
        const element = createCustomDayparts({ dayparts, defaultDayparts: [] });
        const handler = jest.fn();
        element.addEventListener('updatedefaults', handler);

        return Promise.resolve().then(() => {
            updateDefaultsButton(element).click();
            expect(handler.mock.calls[0][0].detail).toEqual({ dayparts });
        });
    });
});
