import { createElement } from 'lwc';
import TopTailToggle from 'c/topTailToggle';

describe('c-top-tail-toggle', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('dispatches togglechange with the new checked state', () => {
        const element = createElement('c-top-tail-toggle', { is: TopTailToggle });
        element.checked = false;
        document.body.appendChild(element);
        const handler = jest.fn();
        element.addEventListener('togglechange', handler);

        return Promise.resolve().then(() => {
            const toggle = element.shadowRoot.querySelector('lightning-input');
            toggle.checked = true;
            toggle.dispatchEvent(new CustomEvent('change'));
            expect(handler.mock.calls[0][0].detail).toEqual({ checked: true });
        });
    });
});
