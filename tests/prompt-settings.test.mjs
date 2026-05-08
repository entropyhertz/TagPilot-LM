import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

function makeElement(id) {
    return {
        id,
        value: '',
        style: {},
        classList: {
            add() {},
            remove() {},
            toggle() {},
        },
        addEventListener() {},
        appendChild() {},
        querySelector() {
            return null;
        },
        innerHTML: '',
        textContent: '',
    };
}

async function loadTagPilot() {
    const html = await readFile(new URL('../tagpilot.html', import.meta.url), 'utf8');
    const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
    assert.ok(script, 'inline script should exist');

    const elements = new Map();
    const getElement = (id) => {
        if (!elements.has(id)) elements.set(id, makeElement(id));
        return elements.get(id);
    };

    const fetchCalls = [];
    const localStore = new Map([
        ['selectedModel', 'openai'],
        ['openaiApiKey', 'test-key'],
    ]);

    const context = {
        console,
        setTimeout: (callback) => {
            callback();
            return 0;
        },
        clearTimeout() {},
        FileReader: class {
            readAsDataURL() {
                this.result = 'data:image/png;base64,AAAA';
                this.onload();
            }
        },
        document: {
            getElementById: getElement,
            createElement: () => makeElement('created'),
            addEventListener() {},
            querySelector(selector) {
                if (selector === 'input[name="tag-mode"]:checked') return { value: 'overwrite' };
                if (selector === 'input[name="caption-mode"]:checked') return { value: 'overwrite' };
                return null;
            },
            querySelectorAll: () => [],
        },
        localStorage: {
            getItem: (key) => localStore.get(key) ?? null,
            setItem: (key, value) => localStore.set(key, value),
        },
        fetch: async (url, options = {}) => {
            fetchCalls.push({ url, ...options });
            return {
                async json() {
                    return {
                        choices: [
                            {
                                message: {
                                    content: 'alpha beta gamma delta epsilon zeta eta',
                                },
                            },
                        ],
                    };
                },
            };
        },
        confirm: () => true,
        URL: {
            createObjectURL: () => 'blob:mock',
        },
    };

    vm.createContext(context);
    vm.runInContext(`${script}
globalThis.__tagpilotTest = {
    startBatchTagging,
    startBatchCaptioning,
    setDataset(value) { dataset = value; },
    getDataset() { return dataset; },
};`, context);

    return { context, elements, fetchCalls };
}

test('batch tagging sends the custom tag prompt to the selected provider', async () => {
    const { context, elements, fetchCalls } = await loadTagPilot();
    elements.get('tag-system-prompt').value = 'CUSTOM TAG PROMPT';
    elements.get('setting-max-tags').value = '12';
    context.__tagpilotTest.setDataset([{ file: { name: 'image.png', type: 'image/png' }, tags: '', type: 'tags' }]);

    await context.__tagpilotTest.startBatchTagging();

    assert.equal(fetchCalls.length, 1);
    const body = JSON.parse(fetchCalls[0].body);
    assert.equal(body.messages[0].content[0].text.includes('CUSTOM TAG PROMPT'), true);
});

test('batch captioning sends the custom caption prompt and enforces max caption words', async () => {
    const { context, elements, fetchCalls } = await loadTagPilot();
    elements.get('caption-system-prompt').value = 'CUSTOM CAPTION PROMPT';
    elements.get('setting-max-caption-len').value = '5';
    context.__tagpilotTest.setDataset([{ file: { name: 'image.png', type: 'image/png' }, tags: '', type: 'tags' }]);

    await context.__tagpilotTest.startBatchCaptioning();

    assert.equal(fetchCalls.length, 1);
    const body = JSON.parse(fetchCalls[0].body);
    assert.equal(body.messages[0].content[0].text.includes('CUSTOM CAPTION PROMPT'), true);
    assert.equal(context.__tagpilotTest.getDataset()[0].tags, 'alpha beta gamma delta epsilon');
});
