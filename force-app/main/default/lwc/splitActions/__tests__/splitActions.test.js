import { createElement } from 'lwc';
import SplitActions from 'c/splitActions';

describe('c-split-actions', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    function createSplitActions(props = {}) {
        const element = createElement('c-split-actions', { is: SplitActions });
        Object.assign(element, { selectionCount: 0, canGroup: false, canUngroup: false, hasClipboard: false, ...props });
        document.body.appendChild(element);
        return element;
    }

    function findButton(element, title) {
        return [...element.shadowRoot.querySelectorAll('button')].find((b) => b.title === title);
    }

    it('disables Group and Ungroup until the parent says they are allowed', () => {
        const element = createSplitActions({ selectionCount: 2 });
        return Promise.resolve().then(() => {
            expect(findButton(element, 'Group').disabled).toBe(true);
            expect(findButton(element, 'Ungroup').disabled).toBe(true);
        });
    });

    it('enables Group once canGroup is true and fires the group action', () => {
        const element = createSplitActions({ selectionCount: 2, canGroup: true });
        const handler = jest.fn();
        element.addEventListener('action', handler);

        return Promise.resolve().then(() => {
            const button = findButton(element, 'Group');
            expect(button.disabled).toBe(false);
            button.click();
            expect(handler.mock.calls[0][0].detail).toEqual({ name: 'group' });
        });
    });

    it('disables Paste until there is both a clipboard and a selection', () => {
        const withoutClipboard = createSplitActions({ selectionCount: 1, hasClipboard: false });
        const withoutSelection = createSplitActions({ selectionCount: 0, hasClipboard: true });
        const ready = createSplitActions({ selectionCount: 1, hasClipboard: true });

        return Promise.resolve().then(() => {
            expect(findButton(withoutClipboard, 'Paste').disabled).toBe(true);
            expect(findButton(withoutSelection, 'Paste').disabled).toBe(true);
            expect(findButton(ready, 'Paste').disabled).toBe(false);
        });
    });

    it('labels the column copy option for the active column driver', () => {
        const weekDriven = createSplitActions({ columnDriver: 'week' });
        const burstDriven = createSplitActions({ columnDriver: 'burst' });

        return Promise.resolve().then(() => {
            findButton(weekDriven, 'Copy options').click();
            findButton(burstDriven, 'Copy options').click();
            return Promise.resolve();
        }).then(() => {
            expect(weekDriven.shadowRoot.textContent).toContain('Copy to All Weeks');
            expect(burstDriven.shadowRoot.textContent).toContain('Copy to All Bursts');
        });
    });

    it('fires clearAll from the clear menu', () => {
        const element = createSplitActions();
        const handler = jest.fn();
        element.addEventListener('action', handler);

        return Promise.resolve().then(() => {
            findButton(element, 'Clear options').click();
            return Promise.resolve();
        }).then(() => {
            const clearAll = [...element.shadowRoot.querySelectorAll('.menu-item')].find((b) => b.textContent.trim() === 'Clear All');
            clearAll.click();
            expect(handler.mock.calls[0][0].detail).toEqual({ name: 'clearAll' });
        });
    });
});
