import { createElement } from 'lwc';
import DurationPill from 'c/durationPill';

describe('c-duration-pill', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    function createDurationPill(props = {}) {
        const element = createElement('c-duration-pill', { is: DurationPill });
        Object.assign(element, {
            visibleDurations: ['15s', '30s', '45s', '60s'],
            selected: ['15s', '30s'],
            availableDurations: ['15s', '30s', '45s', '60s', '5s', '6s', '7s', '8s', '10s', '20s', '75s', '90s', '120s', '180s'],
            ...props
        });
        document.body.appendChild(element);
        return element;
    }

    it('renders one c-pill per visible duration', () => {
        const element = createDurationPill();
        return Promise.resolve().then(() => {
            expect(element.shadowRoot.querySelectorAll('c-pill')).toHaveLength(4);
        });
    });

    it('excludes already-visible durations from the Add duration options', () => {
        const element = createDurationPill();
        return Promise.resolve().then(() => {
            const options = [...element.shadowRoot.querySelectorAll('option')].map((o) => o.value);
            expect(options).not.toContain('15s');
            expect(options).toContain('5s');
        });
    });

    it('toggles selection on pill click without changing visibleDurations', () => {
        const element = createDurationPill();
        const handler = jest.fn();
        element.addEventListener('durationschange', handler);

        return Promise.resolve().then(() => {
            const pill = element.shadowRoot.querySelector('c-pill');
            pill.dispatchEvent(new CustomEvent('pillclick', { detail: { value: '15s' } }));
            const { detail } = handler.mock.calls[0][0];
            expect(detail.selected).toEqual(['30s']);
            expect(detail.visibleDurations).toEqual(['15s', '30s', '45s', '60s']);
        });
    });

    it('adds and selects a new duration from the picker', () => {
        const element = createDurationPill();
        const handler = jest.fn();
        element.addEventListener('durationschange', handler);

        return Promise.resolve().then(() => {
            const select = element.shadowRoot.querySelector('select');
            select.value = '5s';
            select.dispatchEvent(new CustomEvent('change'));
            const { detail } = handler.mock.calls[0][0];
            expect(detail.visibleDurations).toEqual(['15s', '30s', '45s', '60s', '5s']);
            expect(detail.selected).toEqual(['15s', '30s', '5s']);
        });
    });
});
