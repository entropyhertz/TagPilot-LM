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

async function loadTagPilot({ selectedModel = 'openai', initialStore = {}, fetchHandler } = {}) {
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
        ['selectedModel', selectedModel],
        ['geminiApiKey', initialStore.geminiApiKey || 'test-key'],
        ['grokApiKey', initialStore.grokApiKey || 'test-key'],
        ['openaiApiKey', initialStore.openaiApiKey || 'test-key'],
        ['claudeApiKey', initialStore.claudeApiKey || 'test-key'],
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
        Cropper: class {
            destroy() {}
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
            if (fetchHandler) return fetchHandler(url, options);
            return {
                ok: true,
                status: 200,
                async json() {
                    if (url.includes('/responses')) {
                        return {
                            output: [
                                {
                                    type: 'message',
                                    content: [
                                        {
                                            type: 'output_text',
                                            text: 'alpha beta gamma delta epsilon zeta eta',
                                        },
                                    ],
                                },
                            ],
                        };
                    }
                    if (url.includes('generativelanguage.googleapis.com')) {
                        return {
                            candidates: [
                                {
                                    content: {
                                        parts: [
                                            {
                                                text: 'alpha, beta, gamma',
                                            },
                                        ],
                                    },
                                },
                            ],
                        };
                    }
                    if (url.includes('api.anthropic.com')) {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: 'alpha, beta, gamma',
                                },
                            ],
                        };
                    }
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
    openSettings,
    updateSettingsFields,
    generateTags,
    getTextProviderIds,
    autotagSingle,
    captionSingle,
    showPreview,
    cropPreviewImage,
    startBatchTagging,
    startBatchCaptioning,
    setDataset(value) { dataset = value; ensureDatasetItemIds(); },
    getDataset() { return dataset; },
};`, context);

    return { context, elements, fetchCalls, localStore };
}

function deferred() {
    let resolve;
    const promise = new Promise((done) => {
        resolve = done;
    });
    return { promise, resolve };
}

test('batch tagging sends the custom tag prompt to the selected provider', async () => {
    const { context, elements, fetchCalls } = await loadTagPilot();
    elements.get('tag-system-prompt').value = 'CUSTOM TAG PROMPT';
    elements.get('setting-max-tags').value = '12';
    context.__tagpilotTest.setDataset([{ file: { name: 'image.png', type: 'image/png' }, tags: '', type: 'tags' }]);

    await context.__tagpilotTest.startBatchTagging();

    assert.equal(fetchCalls.length, 1);
    const body = JSON.parse(fetchCalls[0].body);
    assert.equal(body.input[0].content[0].text.includes('CUSTOM TAG PROMPT'), true);
});

test('batch captioning sends the custom caption prompt and enforces max caption words', async () => {
    const { context, elements, fetchCalls } = await loadTagPilot();
    elements.get('caption-system-prompt').value = 'CUSTOM CAPTION PROMPT';
    elements.get('setting-max-caption-len').value = '5';
    context.__tagpilotTest.setDataset([{ file: { name: 'image.png', type: 'image/png' }, tags: '', type: 'tags' }]);

    await context.__tagpilotTest.startBatchCaptioning();

    assert.equal(fetchCalls.length, 1);
    const body = JSON.parse(fetchCalls[0].body);
    assert.equal(body.input[0].content[0].text.includes('CUSTOM CAPTION PROMPT'), true);
    assert.equal(context.__tagpilotTest.getDataset()[0].tags, 'alpha beta gamma delta epsilon');
});

test('OpenAI uses the current Responses API vision model', async () => {
    const { context, elements, fetchCalls } = await loadTagPilot({ selectedModel: 'openai' });
    elements.get('tag-system-prompt').value = 'OPENAI TAG PROMPT';
    context.__tagpilotTest.setDataset([{ file: { name: 'image.png', type: 'image/png' }, tags: '', type: 'tags' }]);

    await context.__tagpilotTest.startBatchTagging();

    assert.equal(fetchCalls[0].url, 'https://api.openai.com/v1/responses');
    const body = JSON.parse(fetchCalls[0].body);
    assert.equal(body.model, 'gpt-5.4-mini');
    assert.equal(body.store, false);
    assert.equal(body.input[0].content[0].type, 'input_text');
    assert.equal(body.input[0].content[1].type, 'input_image');
});

test('Grok uses the xAI Responses API with the current vision model', async () => {
    const { context, elements, fetchCalls } = await loadTagPilot({ selectedModel: 'grok' });
    elements.get('tag-system-prompt').value = 'GROK TAG PROMPT';
    context.__tagpilotTest.setDataset([{ file: { name: 'image.png', type: 'image/png' }, tags: '', type: 'tags' }]);

    await context.__tagpilotTest.startBatchTagging();

    assert.equal(fetchCalls[0].url, 'https://api.x.ai/v1/responses');
    const body = JSON.parse(fetchCalls[0].body);
    assert.equal(body.model, 'grok-4.3');
    assert.equal(body.store, false);
    assert.equal(body.input[0].content[0].type, 'input_text');
    assert.equal(body.input[0].content[1].type, 'input_image');
});

test('Gemini uses the current stable multimodal model', async () => {
    const { context, elements, fetchCalls } = await loadTagPilot({ selectedModel: 'gemini' });
    elements.get('tag-system-prompt').value = 'GEMINI TAG PROMPT';
    context.__tagpilotTest.setDataset([{ file: { name: 'image.png', type: 'image/png' }, tags: '', type: 'tags' }]);

    await context.__tagpilotTest.startBatchTagging();

    assert.equal(fetchCalls[0].url.includes('/models/gemini-3.1-flash-lite:generateContent'), true);
    const body = JSON.parse(fetchCalls[0].body);
    assert.equal(body.contents[0].parts[0].text.includes('GEMINI TAG PROMPT'), true);
});

test('Claude uses the Anthropic Messages API with browser vision support', async () => {
    const { context, elements, fetchCalls } = await loadTagPilot({ selectedModel: 'claude' });
    elements.get('tag-system-prompt').value = 'CLAUDE TAG PROMPT';
    context.__tagpilotTest.setDataset([{ file: { name: 'image.png', type: 'image/png' }, tags: '', type: 'tags' }]);

    await context.__tagpilotTest.startBatchTagging();

    assert.equal(fetchCalls[0].url, 'https://api.anthropic.com/v1/messages');
    assert.equal(fetchCalls[0].headers['x-api-key'], 'test-key');
    assert.equal(fetchCalls[0].headers['anthropic-version'], '2023-06-01');
    assert.equal(fetchCalls[0].headers['anthropic-dangerous-direct-browser-access'], 'true');
    const body = JSON.parse(fetchCalls[0].body);
    assert.equal(body.model, 'claude-sonnet-4-5-20250929');
    assert.equal(body.max_tokens, 300);
    assert.equal(body.messages[0].content[0].type, 'image');
    assert.equal(body.messages[0].content[0].source.media_type, 'image/png');
    assert.equal(body.messages[0].content[1].text.includes('CLAUDE TAG PROMPT'), true);
});

test('LLM providers are registered in one provider map', async () => {
    const { context } = await loadTagPilot();

    assert.deepEqual(Array.from(context.__tagpilotTest.getTextProviderIds()), ['gemini', 'grok', 'openai', 'claude']);
});

test('settings model switch loads the matching provider API key', async () => {
    const { context, elements } = await loadTagPilot({
        selectedModel: 'gemini',
        initialStore: {
            geminiApiKey: 'gemini-key',
            openaiApiKey: 'openai-key',
            claudeApiKey: 'claude-key',
        },
    });

    context.__tagpilotTest.openSettings();
    assert.equal(elements.get('apiKeyInput').value, 'gemini-key');

    elements.get('modelSelect').value = 'openai';
    context.__tagpilotTest.updateSettingsFields();

    assert.equal(elements.get('apiKeyInput').value, 'openai-key');

    elements.get('modelSelect').value = 'claude';
    context.__tagpilotTest.updateSettingsFields();

    assert.equal(elements.get('apiKeyInput').value, 'claude-key');
});

test('OpenAI HTTP 401 returns a useful provider error', async () => {
    const { context } = await loadTagPilot({
        selectedModel: 'openai',
        fetchHandler: async () => ({
            ok: false,
            status: 401,
            async json() {
                return { error: { message: 'Incorrect API key provided' } };
            },
        }),
    });

    await assert.rejects(
        () => context.__tagpilotTest.generateTags({ name: 'image.png', type: 'image/png' }),
        /OpenAI API error 401: Incorrect API key provided/
    );
});

test('single-image tagging shows processing state while the request is pending', async () => {
    const pending = deferred();
    const { context } = await loadTagPilot({
        fetchHandler: async () => pending.promise,
    });
    context.__tagpilotTest.setDataset([{ file: { name: 'image.png', type: 'image/png' }, tags: '', type: 'tags' }]);
    const itemId = context.__tagpilotTest.getDataset()[0].id;

    const operation = context.__tagpilotTest.autotagSingle(itemId);

    assert.equal(context.__tagpilotTest.getDataset()[0].processing, 'Tagging');

    pending.resolve({
        ok: true,
        status: 200,
        async json() {
            return { output_text: 'alpha, beta' };
        },
    });
    await operation;

    assert.equal(context.__tagpilotTest.getDataset()[0].processing, null);
});

test('single-image captioning shows processing state while the request is pending', async () => {
    const pending = deferred();
    const { context } = await loadTagPilot({
        fetchHandler: async () => pending.promise,
    });
    context.__tagpilotTest.setDataset([{ file: { name: 'image.png', type: 'image/png' }, tags: '', type: 'tags' }]);
    const itemId = context.__tagpilotTest.getDataset()[0].id;

    const operation = context.__tagpilotTest.captionSingle(itemId);

    assert.equal(context.__tagpilotTest.getDataset()[0].processing, 'Captioning');

    pending.resolve({
        ok: true,
        status: 200,
        async json() {
            return { output_text: 'alpha beta gamma' };
        },
    });
    await operation;

    assert.equal(context.__tagpilotTest.getDataset()[0].processing, null);
});

test('settings launcher is labeled and positioned at the top left', async () => {
    const html = await readFile(new URL('../tagpilot.html', import.meta.url), 'utf8');

    assert.match(html, /\.settings-icon \{[^}]*left: 10px;/s);
    assert.match(html, /id="settings-icon"[^>]*>[\s\S]*Settings[\s\S]*<\/div>/);
});

test('tag pill rendering does not interpolate tag text into innerHTML', async () => {
    const html = await readFile(new URL('../tagpilot.html', import.meta.url), 'utf8');

    assert.doesNotMatch(html, /pill\.innerHTML\s*=\s*`\$\{tag\}/);
    assert.doesNotMatch(html, /onclick="deleteTagGlobally\('\$\{tag\}'\)"/);
    assert.doesNotMatch(html, /onclick="removeTagFromImage\(\$\{index\}, \$\{ti\}\)"/);
});

test('tag and caption batch flows share one runner', async () => {
    const html = await readFile(new URL('../tagpilot.html', import.meta.url), 'utf8');

    assert.match(html, /async function runBatchProcessing\(/);
    assert.match(html, /async function startBatchTagging\(\)[\s\S]*runBatchProcessing\(/);
    assert.match(html, /async function startBatchCaptioning\(\)[\s\S]*runBatchProcessing\(/);
});

test('object URLs are cached and revoked through helper functions', async () => {
    const html = await readFile(new URL('../tagpilot.html', import.meta.url), 'utf8');

    assert.match(html, /function getFileObjectUrl\(/);
    assert.match(html, /function revokeFileObjectUrl\(/);
    assert.match(html, /function clearFileObjectUrls\(/);
    assert.match(html, /URL\.revokeObjectURL/);
    assert.doesNotMatch(html, /const imageUrl = URL\.createObjectURL\(item\.file\)/);
});

test('single-image card actions are wired by stable item ids', async () => {
    const html = await readFile(new URL('../tagpilot.html', import.meta.url), 'utf8');

    assert.match(html, /function createDatasetItemId\(/);
    assert.match(html, /function findDatasetItemById\(/);
    assert.match(html, /data-id="\$\{item\.id\}"/);
    assert.doesNotMatch(html, /autotagSingle\(index\)/);
    assert.doesNotMatch(html, /captionSingle\(index\)/);
    assert.doesNotMatch(html, /openCrop\(index\)/);
    assert.doesNotMatch(html, /removeImage\(index\)/);
});

test('preview modal can start cropping the previewed image', async () => {
    const html = await readFile(new URL('../tagpilot.html', import.meta.url), 'utf8');
    assert.match(html, /id="preview-crop"/);

    const { context, elements } = await loadTagPilot();
    context.__tagpilotTest.setDataset([{ file: { name: 'image.png', type: 'image/png' }, tags: '', type: 'tags' }]);
    const itemId = context.__tagpilotTest.getDataset()[0].id;

    context.__tagpilotTest.showPreview('blob:preview', itemId);

    assert.equal(elements.get('preview-image').src, 'blob:preview');
    assert.equal(elements.get('preview-modal').style.display, 'flex');

    context.__tagpilotTest.cropPreviewImage();

    assert.equal(elements.get('preview-modal').style.display, 'none');
    assert.equal(elements.get('crop-modal').style.display, 'flex');
    assert.equal(elements.get('crop-image').src, 'blob:mock');
});
