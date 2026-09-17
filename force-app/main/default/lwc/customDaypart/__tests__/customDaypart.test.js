import { createElement } from 'lwc';
import CustomDaypart from 'c/customDaypart';

describe('c-custom-daypart', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    function createCustomDaypart(props = {}) {
        const element = createElement('c-custom-daypart', { is: CustomDaypart });
        Object.assign(element, {
            daypart: { id: 'd1', name: '', start: '', end: '', isApplyByDefault: false },
            placeholder: 'Daypart 1',
            ...props
        });
        document.body.appendChild(element);
        return element;
    }

    it('shows the 12-hour summary once both times are set', () => {
        const element = createCustomDaypart({ daypart: { id: 'd1', name: 'Breakfast', start: '06:00', end: '08:59' } });
        return Promise.resolve().then(() => {
            expect(element.shadowRoot.querySelector('.slds-text-body_small').textContent.trim()).toBe('6am to 8:59am');
        });
    });

    it('clears isApplyByDefault when a field is edited', () => {
        const element = createCustomDaypart({ daypart: { id: 'd1', name: 'Breakfast', start: '06:00', end: '08:59', isApplyByDefault: true } });
        const handler = jest.fn();
        element.addEventListener('customdaypartchange', handler);

        return Promise.resolve().then(() => {
            const [nameInput] = element.shadowRoot.querySelectorAll('lightning-input');
            nameInput.value = 'Early breakfast';
            nameInput.dispatchEvent(new CustomEvent('change'));

            expect(handler.mock.calls[0][0].detail).toEqual({
                id: 'd1',
                patch: { name: 'Early breakfast', isApplyByDefault: false }
            });
        });
    });

    it('dispatches customdaypartremove with its id', () => {
        const element = createCustomDaypart();
        const handler = jest.fn();
        element.addEventListener('customdaypartremove', handler);

        return Promise.resolve().then(() => {
            element.shadowRoot.querySelector('.slds-button_text-destructive').click();
            expect(handler.mock.calls[0][0].detail).toEqual({ id: 'd1' });
        });
    });
});
