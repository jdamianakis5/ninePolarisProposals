import { createElement } from 'lwc';
import SpotDurationsAndDayparts from 'c/spotDurationsAndDayparts';

describe('c-spot-durations-and-dayparts', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    function createShell(props = {}) {
        const element = createElement('c-spot-durations-and-dayparts', { is: SpotDurationsAndDayparts });
        Object.assign(element, {
            availableDurations: ['15s', '30s', '45s', '60s'],
            fixedOnly: true,
            ...props
        });
        document.body.appendChild(element);
        return element;
    }

    it('renders both Level 2 sections', () => {
        const element = createShell();
        return Promise.resolve().then(() => {
            expect(element.shadowRoot.querySelector('c-spot-durations')).not.toBeNull();
            expect(element.shadowRoot.querySelector('c-standard-dayparts')).not.toBeNull();
        });
    });

    it('validate() requires at least one duration and at least one daypart', () => {
        const element = createShell();
        element.selectedDurations = [];
        element.topTail = false;
        element.selectedDayparts = [];
        return Promise.resolve().then(() => {
            expect(element.validate()).toEqual([
                'At least one duration must be selected before you can proceed beyond the Optimiser Inputs page.',
                'At least one daypart must be selected before you can proceed beyond the Optimiser Inputs page.'
            ]);
        });
    });

    it('validate() passes once a duration and a daypart are selected', () => {
        const element = createShell();
        element.selectedDurations = ['15s'];
        element.selectedDayparts = ['Peak'];
        return Promise.resolve().then(() => {
            expect(element.validate()).toEqual([]);
        });
    });

    it('getPayload() reflects a change bubbled up from spotDurations', () => {
        const element = createShell();
        element.selectedDurations = ['15s'];
        element.selectedDayparts = ['Peak'];

        return Promise.resolve().then(() => {
            const spotDurations = element.shadowRoot.querySelector('c-spot-durations');
            spotDurations.dispatchEvent(new CustomEvent('spotdurationschange', {
                detail: {
                    visibleDurations: ['15s', '30s', '45s', '60s'],
                    selected: ['15s', '30s'],
                    topTail: false,
                    topTailSets: [{ id: 'tt-default', top: '10', mid: '', hasMid: false, tail: '5' }],
                    durations: ['15s', '30s']
                }
            }));
            return Promise.resolve();
        }).then(() => {
            expect(element.getPayload().durations).toEqual(['15s', '30s']);
        });
    });

    it('seeds selectedDayparts once and keeps its own copy after that', () => {
        const element = createShell();
        element.selectedDayparts = ['Peak', 'Off-Peak'];
        element.selectedDayparts = []; // a later prop write must not wipe the seeded working state
        return Promise.resolve().then(() => {
            expect(element.getPayload().dayparts).toEqual(['Peak', 'Off-Peak']);
        });
    });
});
