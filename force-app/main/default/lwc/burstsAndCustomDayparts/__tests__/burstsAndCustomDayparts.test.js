import { createElement } from 'lwc';
import BurstsAndCustomDayparts from 'c/burstsAndCustomDayparts';

describe('c-bursts-and-custom-dayparts', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    function createShell(props = {}) {
        const element = createElement('c-bursts-and-custom-dayparts', { is: BurstsAndCustomDayparts });
        Object.assign(element, { planStart: '2026-09-07', planEnd: '2026-10-18', fixedOnly: false, ...props });
        document.body.appendChild(element);
        return element;
    }

    it('hides Custom Dayparts unless the campaign is fixed-only', () => {
        const element = createShell({ fixedOnly: false });
        return Promise.resolve().then(() => {
            expect(element.shadowRoot.querySelector('c-custom-dayparts')).toBeNull();
        });
    });

    it('shows Custom Dayparts for a fixed-only campaign', () => {
        const element = createShell({ fixedOnly: true });
        return Promise.resolve().then(() => {
            expect(element.shadowRoot.querySelector('c-custom-dayparts')).not.toBeNull();
        });
    });

    it('seeds bursts once and keeps its own copy after that', () => {
        const element = createShell();
        element.bursts = [{ id: 'b1', name: 'Burst 1', start: '', end: '' }];
        element.bursts = []; // a later prop write must not wipe the seeded working state
        return Promise.resolve().then(() => {
            expect(element.getPayload().bursts).toHaveLength(1);
        });
    });

    it('validate() only checks Custom Dayparts while fixed-only', () => {
        const element = createShell({ fixedOnly: false });
        element.bursts = [];
        element.dayparts = [{ id: 'd1', name: '', start: '', end: '', isApplyByDefault: false }];
        return Promise.resolve().then(() => {
            expect(element.validate()).toEqual([]);
        });
    });

    it('getPayload() returns the current working state', () => {
        const element = createShell({ fixedOnly: true });
        element.bursts = [{ id: 'b1', name: 'Burst 1', start: '2026-09-07', end: '2026-09-20' }];
        element.dayparts = [{ id: 'd1', name: 'Morning', start: '06:00', end: '09:00', isApplyByDefault: false }];
        return Promise.resolve().then(() => {
            expect(element.getPayload()).toEqual({
                bursts: [{ id: 'b1', name: 'Burst 1', start: '2026-09-07', end: '2026-09-20' }],
                dayparts: [{ id: 'd1', name: 'Morning', start: '06:00', end: '09:00', isApplyByDefault: false }]
            });
        });
    });

    it('re-dispatches updatedefaults from the customDayparts child', () => {
        const element = createShell({ fixedOnly: true });
        element.dayparts = [{ id: 'd1', name: 'Morning', start: '06:00', end: '09:00', isApplyByDefault: false }];
        const handler = jest.fn();
        element.addEventListener('updatedefaults', handler);

        return Promise.resolve().then(() => {
            const child = element.shadowRoot.querySelector('c-custom-dayparts');
            child.dispatchEvent(new CustomEvent('updatedefaults', { detail: { dayparts: element.dayparts } }));
            expect(handler).toHaveBeenCalledTimes(1);
        });
    });
});
