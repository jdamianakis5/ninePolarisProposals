import { createElement } from 'lwc';
import TopTailSetParent from 'c/topTailSetParent';

describe('c-top-tail-set-parent', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    function createParent(props = {}) {
        const element = createElement('c-top-tail-set-parent', { is: TopTailSetParent });
        Object.assign(element, { sets: [{ id: 's1', top: '10', mid: '', hasMid: false, tail: '5' }], ...props });
        document.body.appendChild(element);
        return element;
    }

    it('renders one c-top-tail-set-child per set', () => {
        const element = createParent({
            sets: [
                { id: 's1', top: '10', mid: '', hasMid: false, tail: '5' },
                { id: 's2', top: '15', mid: '', hasMid: false, tail: '15' }
            ]
        });
        return Promise.resolve().then(() => {
            expect(element.shadowRoot.querySelectorAll('c-top-tail-set-child')).toHaveLength(2);
        });
    });

    it('dispatches toptailsetschange with chipLabels when a set is added', () => {
        const element = createParent();
        const handler = jest.fn();
        element.addEventListener('toptailsetschange', handler);

        return Promise.resolve().then(() => {
            element.shadowRoot.querySelector('button').click();
            const { detail } = handler.mock.calls[0][0];
            expect(detail.sets).toHaveLength(2);
            expect(detail.chipLabels).toEqual(['Top/Tail 10s/5s', 'Top/Tail 10s/5s']);
        });
    });

    it('validate() flags a duplicate combination between two sets', () => {
        const element = createParent({
            sets: [
                { id: 's1', top: '10', mid: '', hasMid: false, tail: '5' },
                { id: 's2', top: '10', mid: '', hasMid: false, tail: '5' }
            ]
        });
        return Promise.resolve().then(() => {
            expect(element.validate()).toEqual(['Top/tail set 2 duplicates set 1.']);
        });
    });

    it('validate() flags a non-bookable set independently of duplicates', () => {
        const element = createParent({ sets: [{ id: 's1', top: '10', mid: '', hasMid: false, tail: '7' }] });
        return Promise.resolve().then(() => {
            expect(element.validate()).toEqual(['Top/tail set 1 does not total a bookable duration.']);
        });
    });

    it('does not remove the last remaining set', () => {
        const element = createParent();
        const handler = jest.fn();
        element.addEventListener('toptailsetschange', handler);

        return Promise.resolve().then(() => {
            const child = element.shadowRoot.querySelector('c-top-tail-set-child');
            child.dispatchEvent(new CustomEvent('toptailsetremove', { detail: { id: 's1' } }));
            expect(handler).not.toHaveBeenCalled();
        });
    });
});
