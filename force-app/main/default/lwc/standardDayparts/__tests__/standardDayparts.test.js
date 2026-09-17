import { createElement } from 'lwc';
import StandardDayparts from 'c/standardDayparts';

describe('c-standard-dayparts', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('renders the three fixed options', () => {
        const element = createElement('c-standard-dayparts', { is: StandardDayparts });
        element.selected = ['Peak'];
        document.body.appendChild(element);

        return Promise.resolve().then(() => {
            const pills = element.shadowRoot.querySelectorAll('c-pill');
            expect(pills).toHaveLength(3);
            expect(pills[0].selected).toBe(true);
        });
    });

    it('adds a daypart to the selection on pill click', () => {
        const element = createElement('c-standard-dayparts', { is: StandardDayparts });
        element.selected = ['Peak'];
        document.body.appendChild(element);
        const handler = jest.fn();
        element.addEventListener('standarddaypartschange', handler);

        return Promise.resolve().then(() => {
            const pills = element.shadowRoot.querySelectorAll('c-pill');
            pills[1].dispatchEvent(new CustomEvent('pillclick', { detail: { value: 'Off-Peak' } }));
            expect(handler.mock.calls[0][0].detail.selected).toEqual(['Peak', 'Off-Peak']);
        });
    });

    it('removes a daypart from the selection when its pill is clicked again', () => {
        const element = createElement('c-standard-dayparts', { is: StandardDayparts });
        element.selected = ['Peak'];
        document.body.appendChild(element);
        const handler = jest.fn();
        element.addEventListener('standarddaypartschange', handler);

        return Promise.resolve().then(() => {
            const pills = element.shadowRoot.querySelectorAll('c-pill');
            pills[0].dispatchEvent(new CustomEvent('pillclick', { detail: { value: 'Peak' } }));
            expect(handler.mock.calls[0][0].detail.selected).toEqual([]);
        });
    });
});
