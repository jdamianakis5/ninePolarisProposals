import { createElement } from 'lwc';
import Pill from 'c/pill';

describe('c-pill', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('applies the selected class when selected is true', () => {
        const element = createElement('c-pill', { is: Pill });
        element.label = 'Peak';
        element.value = 'Peak';
        element.selected = true;
        document.body.appendChild(element);

        return Promise.resolve().then(() => {
            const button = element.shadowRoot.querySelector('button');
            expect(button.className).toContain('pill_selected');
            expect(button.textContent.trim()).toBe('Peak');
        });
    });

    it('dispatches pillclick with its value when clicked', () => {
        const element = createElement('c-pill', { is: Pill });
        element.label = 'Peak';
        element.value = 'Peak';
        document.body.appendChild(element);
        const handler = jest.fn();
        element.addEventListener('pillclick', handler);

        return Promise.resolve().then(() => {
            element.shadowRoot.querySelector('button').click();
            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler.mock.calls[0][0].detail).toEqual({ value: 'Peak' });
        });
    });

    it('does not dispatch pillclick when disabled', () => {
        const element = createElement('c-pill', { is: Pill });
        element.label = 'Peak';
        element.value = 'Peak';
        element.disabled = true;
        document.body.appendChild(element);
        const handler = jest.fn();
        element.addEventListener('pillclick', handler);

        return Promise.resolve().then(() => {
            element.shadowRoot.querySelector('button').click();
            expect(handler).not.toHaveBeenCalled();
        });
    });
});
