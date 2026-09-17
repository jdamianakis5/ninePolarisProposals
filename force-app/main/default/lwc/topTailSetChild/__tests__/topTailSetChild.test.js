import { createElement } from 'lwc';
import TopTailSetChild from 'c/topTailSetChild';

describe('c-top-tail-set-child', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    function createSet(props = {}) {
        const element = createElement('c-top-tail-set-child', { is: TopTailSetChild });
        Object.assign(element, { set: { id: 's1', top: '10', mid: '', hasMid: false, tail: '5' }, ...props });
        document.body.appendChild(element);
        return element;
    }

    it('shows the success message for a bookable total', () => {
        const element = createSet();
        return Promise.resolve().then(() => {
            expect(element.shadowRoot.textContent).toContain('Totals 15s.');
        });
    });

    it('shows the detailed error for a non-bookable total', () => {
        const element = createSet({ set: { id: 's1', top: '10', mid: '', hasMid: false, tail: '7' } });
        return Promise.resolve().then(() => {
            expect(element.shadowRoot.textContent).toContain(
                'Top and tail add up to 17s, which is not a bookable duration. '
                + 'Adjust them to total one of: 5s, 6s, 7s, 8s, 10s, 15s, 20s, 30s, 45s, 60s, 75s, 90s, 120s, 180s.'
            );
        });
    });

    it('prefers a supplied duplicate-set issue over the bookable-total message', () => {
        const element = createSet({ issue: 'Duplicates set 1.' });
        return Promise.resolve().then(() => {
            expect(element.shadowRoot.textContent).toContain('Duplicates set 1.');
            expect(element.shadowRoot.textContent).not.toContain('Totals');
        });
    });

    it('dispatches toptailsetchange with a patch', () => {
        const element = createSet();
        const handler = jest.fn();
        element.addEventListener('toptailsetchange', handler);

        return Promise.resolve().then(() => {
            const [topInput] = element.shadowRoot.querySelectorAll('input');
            topInput.value = '20';
            topInput.dispatchEvent(new CustomEvent('change'));
            expect(handler.mock.calls[0][0].detail).toEqual({ id: 's1', patch: { top: '20' } });
        });
    });

    it('dispatches toptailsetremove when Remove set is clicked', () => {
        const element = createSet({ showRemove: true });
        const handler = jest.fn();
        element.addEventListener('toptailsetremove', handler);

        return Promise.resolve().then(() => {
            [...element.shadowRoot.querySelectorAll('button')]
                .find((b) => b.textContent.trim() === 'Remove set')
                .click();
            expect(handler.mock.calls[0][0].detail).toEqual({ id: 's1' });
        });
    });
});
