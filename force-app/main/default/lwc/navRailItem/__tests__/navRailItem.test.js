import { createElement } from 'lwc';
import NavRailItem from 'c/navRailItem';

describe('c-nav-rail-item', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    function createItem(props = {}) {
        const element = createElement('c-nav-rail-item', { is: NavRailItem });
        Object.assign(element, { label: 'Optimisation', ...props });
        document.body.appendChild(element);
        return element;
    }

    it('fires select when clicked while unlocked', () => {
        const element = createItem();
        const handler = jest.fn();
        element.addEventListener('select', handler);

        return Promise.resolve().then(() => {
            element.shadowRoot.querySelector('button').click();
            expect(handler).toHaveBeenCalledTimes(1);
        });
    });

    it('does not fire select while locked, and shows the reason in the title', () => {
        const element = createItem({ locked: true, lockReason: 'Set a demographic on Brief.' });
        const handler = jest.fn();
        element.addEventListener('select', handler);

        return Promise.resolve().then(() => {
            const button = element.shadowRoot.querySelector('button');
            expect(button.disabled).toBe(true);
            expect(button.title).toBe('Optimisation: Set a demographic on Brief.');
            button.click();
            expect(handler).not.toHaveBeenCalled();
        });
    });

    it('shows the tick badge only when done, not selected, and not locked', () => {
        const done = createItem({ done: true });
        const doneButSelected = createItem({ done: true, selected: true });
        const doneButLocked = createItem({ done: true, locked: true });

        return Promise.resolve().then(() => {
            expect(done.shadowRoot.querySelector('.nav-rail-item__tick')).not.toBeNull();
            expect(doneButSelected.shadowRoot.querySelector('.nav-rail-item__tick')).toBeNull();
            expect(doneButLocked.shadowRoot.querySelector('.nav-rail-item__tick')).toBeNull();
        });
    });

    it('hides the label when the rail is collapsed', () => {
        const element = createItem({ collapsed: true });
        return Promise.resolve().then(() => {
            expect(element.shadowRoot.querySelector('.nav-rail-item__label')).toBeNull();
        });
    });
});
