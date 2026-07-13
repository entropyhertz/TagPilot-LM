import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';

class MockClassList {
    constructor(initial = '') {
        this.values = new Set(String(initial).split(/\s+/).filter(Boolean));
    }

    add(...names) { names.forEach(name => this.values.add(name)); }
    remove(...names) { names.forEach(name => this.values.delete(name)); }
    contains(name) { return this.values.has(name); }

    toggle(name, force) {
        const enabled = force === undefined ? !this.values.has(name) : force;
        if (enabled) this.values.add(name);
        else this.values.delete(name);
        return enabled;
    }
}

class MockElement {
    constructor(id = '', className = '') {
        this.id = id;
        this.value = '';
        this.textContent = '';
        this.style = {};
        this.dataset = {};
        this.disabled = false;
        this.title = '';
        this.children = [];
        this.attributes = {};
        this.classList = new MockClassList(className);
    }

    addEventListener() {}
    appendChild(child) { this.children.push(child); return child; }
    querySelector() { return new MockElement(); }
    querySelectorAll() { return []; }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    click() {}

    set innerHTML(value) {
        this._innerHTML = value;
        if (value === '') this.children = [];
    }

    get innerHTML() { return this._innerHTML || ''; }
}

class StorageMock {
    constructor(initial = {}) { this.values = new Map(Object.entries(initial)); }
    getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
    setItem(key, value) { this.values.set(key, String(value)); }
    removeItem(key) { this.values.delete(key); }
    clear() { this.values.clear(); }
}

function response(status, data) {
    return {
        ok: status >= 200 && status < 300,
        status,
        async json() { return data; },
    };
}

async function loadTagPilot({ local = {}, session = {}, fetchHandler } = {}) {
    const html = await readFile(new URL('../tagpilot.html', import.meta.url), 'utf8');
    const script = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
        .map(match => match[1])
        .find(source => source.includes('let dataset = []'));
    assert.ok(script, 'inline application script should exist');

    const elements = new Map();
    for (const match of html.matchAll(/\sid="([^"]+)"(?:\s+class="([^"]*)")?/g)) {
        elements.set(match[1], new MockElement(match[1], match[2] || ''));
    }
    const getElement = (id) => {
        if (!elements.has(id)) elements.set(id, new MockElement(id));
        return elements.get(id);
    };

    const localStorage = new StorageMock({
        openaiApiKey: 'fixture',
        geminiApiKey: 'fixture',
        grokApiKey: 'fixture',
        claudeApiKey: 'fixture',
        vllmApiKey: 'fixture',
        ...local,
    });
    const sessionStorage = new StorageMock(session);
    const fetchCalls = [];

    class FileReaderMock {
        readAsDataURL(file) {
            this.result = `data:${file.type || 'image/png'};base64,QUJD`;
            this.onload?.();
        }
    }

    class FileMock {
        constructor(parts, name, options = {}) {
            this.parts = parts;
            this.name = name;
            this.type = options.type || '';
        }

        async arrayBuffer() { return new Uint8Array([1, 2, 3]).buffer; }
    }

    class JSZipMock {
        constructor() { this.files = new Map(); }
        file(name, value) { this.files.set(name, value); return this; }
        async generateAsync() { return new Blob(['zip']); }
    }

    class FormDataMock {
        constructor() { this.entries = []; }
        append(name, value, filename) { this.entries.push({ name, value, filename }); }
    }

    class URLMock extends URL {
        static createObjectURL() { return 'blob:mock'; }
        static revokeObjectURL() {}
    }

    const context = vm.createContext({
        console: { ...console, error() {} },
        document: {
            getElementById: getElement,
            createElement: () => new MockElement('created'),
            addEventListener() {},
            querySelector(selector) {
                if (selector === 'input[name="tag-mode"]:checked') return { value: 'overwrite' };
                if (selector === 'input[name="caption-mode"]:checked') return { value: 'overwrite' };
                return new MockElement(selector);
            },
            querySelectorAll: () => [],
        },
        localStorage,
        sessionStorage,
        FileReader: FileReaderMock,
        File: FileMock,
        FormData: FormDataMock,
        Blob,
        DOMException,
        AbortController,
        crypto: globalThis.crypto,
        URL: URLMock,
        navigator: { onLine: true },
        location: { protocol: 'http:' },
        JSZip: JSZipMock,
        Cropper: class {},
        confirm: () => true,
        setTimeout: () => 0,
        clearTimeout() {},
        fetch: async (url, options = {}) => {
            fetchCalls.push({ url: String(url), ...options });
            if (fetchHandler) return fetchHandler(String(url), options);
            if (String(url).includes('/responses')) {
                return response(200, { output_text: 'alpha, beta, gamma' });
            }
            return response(200, {
                choices: [{ message: { content: 'close up portrait, a faint closed-mouth smile, black hair tied back, black collar, plain background, soft daylight.' } }],
            });
        },
    });

    vm.runInContext(`${script}
globalThis.__test = {
    DEFAULT_CAPTION_PROMPT,
    normalizeLMStudioBaseUrl,
    inferLMStudioConnectionMode,
    getLMStudioConnectionMode,
    applyLMStudioConnectionModeUI,
    handleLMStudioConnectionModeChange,
    getLMStudioConfigurationSignature,
    getLMStudioHeaders,
    normalizeLMStudioCatalog,
    getSelectableLMStudioModels,
    requestLMStudioModelCatalog,
    readLMStudioJson,
    buildLMStudioChatPayload,
    extractChatCompletionText,
    validateCaptionOutput,
    generateTags,
    testOneImageWithLMStudio,
    runBatchProcessing,
    createDatasetItem,
    withTriggerWord,
    withCaptionTriggerForExport,
    withoutCaptionTriggerPrefix,
    getTextProviderIds,
    saveSettings,
    setDataset(value) { dataset = value; ensureDatasetItemIds(); render(); },
    getDataset() { return dataset; },
    setReady(value) { lmStudioReadySignature = value; },
    setCatalog(value) { lmStudioDetectedCatalog = value; },
    getCatalog() { return lmStudioDetectedCatalog; },
    getReady() { return lmStudioReadySignature; },
    setBatchRunning(value) { isBatchProcessing = value; },
};`, context, { filename: 'tagpilot.html' });

    return { context, elements, fetchCalls, html, localStorage, sessionStorage };
}

test('single-file UI exposes Windows-first connection modes and no stale GUI path', async () => {
    const html = await readFile(new URL('../tagpilot.html', import.meta.url), 'utf8');
    assert.match(html, /id="lmstudio-connection-mode"/);
    assert.match(html, />Same Windows PC</);
    assert.match(html, />Another device over LAN</);
    assert.match(html, /lms server start --port 1234 --cors/);
    assert.doesNotMatch(html, /Open Developer → Server Settings/);
    assert.doesNotMatch(html, /Enable Local LLM Service/);
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, 'HTML ids should be unique');
});

test('fresh storage defaults to same-machine mode and localhost URL', async () => {
    const { elements } = await loadTagPilot();
    assert.equal(elements.get('lmstudio-connection-mode').value, 'same-machine');
    assert.equal(elements.get('lmstudio-base-url').value, 'http://127.0.0.1:1234');
    assert.equal(elements.get('lmstudio-same-machine-setup').classList.contains('hidden'), false);
    assert.equal(elements.get('lmstudio-lan-setup').classList.contains('hidden'), true);
    assert.equal(elements.get('caption-all-button').disabled, true);
});

test('legacy saved LAN URL infers LAN mode without overwriting the URL', async () => {
    const { elements } = await loadTagPilot({ local: { lmStudioBaseUrl: 'http://192.168.1.50:1234' } });
    assert.equal(elements.get('lmstudio-connection-mode').value, 'lan');
    assert.equal(elements.get('lmstudio-base-url').value, 'http://192.168.1.50:1234');
    assert.equal(elements.get('lmstudio-lan-setup').classList.contains('hidden'), false);
});

test('same-machine mode accepts loopback and rejects non-local destinations', async () => {
    const { context } = await loadTagPilot();
    for (const url of ['http://127.0.0.1:1234', 'http://127.10.20.30:1234', 'http://localhost:1234', 'http://localhost.:1234', 'http://[::1]:1234']) {
        assert.equal(context.__test.normalizeLMStudioBaseUrl(url, 'same-machine').startsWith('http'), true, url);
    }
    for (const url of ['http://0.0.0.0:1234', 'http://192.168.1.50:1234', 'http://8.8.8.8:1234']) {
        assert.throws(() => context.__test.normalizeLMStudioBaseUrl(url, 'same-machine'));
    }
});

test('LAN mode accepts only private IPv4 destinations', async () => {
    const { context } = await loadTagPilot();
    for (const url of [
        'http://10.0.0.1:1234', 'http://10.255.255.254:1234',
        'http://172.16.0.1:1234', 'http://172.31.255.254:1234',
        'http://192.168.0.1:1234', 'http://192.168.255.254:1234',
    ]) assert.equal(context.__test.normalizeLMStudioBaseUrl(url, 'lan'), url);

    for (const url of [
        'http://localhost:1234', 'http://127.0.0.1:1234', 'http://[::1]:1234',
        'http://0.0.0.0:1234', 'http://172.15.0.1:1234', 'http://172.32.0.1:1234',
        'http://169.254.1.1:1234', 'http://8.8.8.8:1234', 'http://windows-host:1234',
    ]) assert.throws(() => context.__test.normalizeLMStudioBaseUrl(url, 'lan'), url);
});

test('mode switch clears model catalog and one-image readiness', async () => {
    const { context, elements } = await loadTagPilot();
    context.__test.setCatalog({ baseUrl: 'http://127.0.0.1:1234', connectionMode: 'same-machine' });
    context.__test.setReady('ready-signature');
    elements.get('lmstudio-model-id').value = 'exact/model';
    elements.get('lmstudio-connection-mode').value = 'lan';
    context.__test.handleLMStudioConnectionModeChange();
    assert.equal(context.__test.getCatalog(), null);
    assert.equal(context.__test.getReady(), '');
    assert.equal(elements.get('lmstudio-model-id').value, '');
    assert.equal(elements.get('lmstudio-base-url').value, '');
    assert.equal(elements.get('lmstudio-lan-setup').classList.contains('hidden'), false);
});

test('readiness signature changes with connection mode', async () => {
    const { context, elements } = await loadTagPilot();
    elements.get('lmstudio-model-id').value = 'exact/model';
    const localSignature = context.__test.getLMStudioConfigurationSignature(true);
    elements.get('lmstudio-connection-mode').value = 'lan';
    elements.get('lmstudio-base-url').value = 'http://192.168.1.50:1234';
    const lanSignature = context.__test.getLMStudioConfigurationSignature(true);
    assert.notEqual(localSignature, lanSignature);
    assert.equal(JSON.parse(localSignature).connectionMode, 'same-machine');
    assert.equal(JSON.parse(lanSignature).connectionMode, 'lan');
});

test('optional LM Studio token is conditional and session-only', async () => {
    const { context, elements, localStorage, sessionStorage } = await loadTagPilot();
    assert.equal('Authorization' in context.__test.getLMStudioHeaders(true, true), false);
    elements.get('lmstudio-api-token').value = 'fixture';
    assert.equal(context.__test.getLMStudioHeaders(true, true).Authorization, 'Bearer fixture');
    context.__test.saveSettings();
    assert.equal(localStorage.getItem('lmStudioApiToken'), null);
    assert.equal(sessionStorage.getItem('lmStudioApiToken'), 'fixture');
});

test('native catalog keeps exact model keys and required preference order', async () => {
    const { context } = await loadTagPilot();
    const data = { models: [
        { type: 'llm', key: 'other/unloaded', loaded_instances: [], capabilities: { vision: true } },
        { type: 'llm', key: 'google/gemma-4-unloaded', loaded_instances: [], capabilities: { vision: true } },
        { type: 'llm', key: 'other/loaded', loaded_instances: [{ id: 'instance-a' }], capabilities: { vision: true } },
        { type: 'llm', key: 'google/gemma-4-loaded', loaded_instances: [{ id: 'instance-b' }], capabilities: { vision: true } },
        { type: 'llm', key: 'text/loaded', loaded_instances: [{}], capabilities: { vision: false } },
    ] };
    const catalog = context.__test.normalizeLMStudioCatalog(data, 'native');
    assert.deepEqual(Array.from(context.__test.getSelectableLMStudioModels(catalog), model => model.id), [
        'google/gemma-4-loaded', 'other/loaded', 'google/gemma-4-unloaded', 'other/unloaded',
    ]);
    assert.equal(catalog.models.some(model => model.id === 'instance-b'), false);
});

test('OpenAI-compatible catalog marks vision and load state unverified', async () => {
    const { context } = await loadTagPilot();
    const catalog = context.__test.normalizeLMStudioCatalog({ data: [{ id: 'exact/model' }] }, 'openai');
    assert.equal(catalog.visionMetadataAvailable, false);
    assert.equal(catalog.models[0].visionKnown, false);
    assert.equal(catalog.models[0].isLoaded, null);
});

test('model discovery stops after first valid endpoint and falls back in order', async () => {
    let calls = 0;
    const first = await loadTagPilot({ fetchHandler: async () => {
        calls++;
        return response(200, { models: [{ type: 'llm', key: 'exact/native', loaded_instances: [], capabilities: { vision: true } }] });
    } });
    await first.context.__test.requestLMStudioModelCatalog(true);
    assert.equal(calls, 1);

    const second = await loadTagPilot({ fetchHandler: async (url) => url.endsWith('/api/v1/models')
        ? response(404, { error: { message: 'not found' } })
        : response(200, { data: [{ id: 'exact/fallback' }] }) });
    const catalog = await second.context.__test.requestLMStudioModelCatalog(true);
    assert.equal(catalog.endpoint, '/v1/models');
    assert.deepEqual(second.fetchCalls.map(call => call.url), [
        'http://127.0.0.1:1234/api/v1/models',
        'http://127.0.0.1:1234/v1/models',
    ]);
});

test('LM Studio 401, 403, and successful API error objects are rejected', async () => {
    const { context } = await loadTagPilot();
    await assert.rejects(context.__test.readLMStudioJson(response(401, {})), error => error.code === 'authentication_required');
    await assert.rejects(context.__test.readLMStudioJson(response(403, {})), error => error.code === 'forbidden');
    await assert.rejects(context.__test.readLMStudioJson(response(200, { error: { message: 'bad' } })), error => error.code === 'unexpected_response');
});

test('multimodal payload uses exact model, MIME, filename, word limit, and sampling contract', async () => {
    const { context } = await loadTagPilot();
    const payload = context.__test.buildLMStudioChatPayload({
        model: 'exact/model', systemPrompt: 'SYSTEM', dataUrl: 'data:image/webp;base64,AAA',
        filename: 'facecrop.webp', maxWords: 30, taskType: 'caption',
    });
    assert.equal(payload.model, 'exact/model');
    assert.equal(payload.messages[0].content, 'SYSTEM');
    assert.equal(payload.messages[1].content[0].image_url.url, 'data:image/webp;base64,AAA');
    assert.equal(payload.messages[1].content[1].text, 'Filename: facecrop.webp\nMaximum caption length: 30 words.');
    assert.equal(payload.temperature, 0.2);
    assert.equal(payload.stream, false);
    assert.equal('top_p' in payload, false);
});

test('chat completion parser supports string and content-block arrays', async () => {
    const { context } = await loadTagPilot();
    assert.equal(context.__test.extractChatCompletionText({ choices: [{ message: { content: ' hello ' } }] }), 'hello');
    assert.equal(context.__test.extractChatCompletionText({ choices: [{ message: { content: [{ text: 'one' }, { text: 'two' }] } }] }), 'one\ntwo');
});

test('caption prompt matches the reviewed Krea-2 prompt hash', async () => {
    const { context } = await loadTagPilot();
    const hash = createHash('sha256').update(context.__test.DEFAULT_CAPTION_PROMPT).digest('hex');
    assert.equal(hash, '27a1057a809bbb3e157d837015309fccd8fa40e171ce341c31194555f2489017');
});

test('caption cleanup flags repairs and rejects malformed output', async () => {
    const { context } = await loadTagPilot();
    const cleaned = context.__test.validateCaptionOutput(
        '```text\n"Here is the caption: close up portrait, a faint closed-mouth smile, black hair tied back, plain background, soft daylight."\n```',
        { filename: 'facecrop.png', maxWords: 30 },
    );
    assert.equal(cleaned.needsReview, true);
    assert.ok(cleaned.caption.startsWith('close up portrait'));

    for (const [text, filename] of [
        ['{"caption":"x"}', 'img.png'], ['', 'img.png'], ['Sorry, I cannot caption this.', 'img.png'],
        ['Filename: img.png caption', 'img.png'], ['close up portrait, [TRIGGER]', 'img.png'],
        ['solo, 1girl, black hair, black shirt, indoors, daylight', 'img.png'],
    ]) assert.throws(() => context.__test.validateCaptionOutput(text, { filename, maxWords: 70 }));
});

test('overlong captions are flagged without destructive truncation', async () => {
    const { context } = await loadTagPilot();
    const text = Array.from({ length: 75 }, (_, index) => `word${index}`).join(' ');
    const result = context.__test.validateCaptionOutput(text, { filename: 'img.png', maxWords: 70 });
    assert.equal(result.wordCount, 75);
    assert.equal(result.caption, text);
    assert.equal(result.needsReview, true);
});

test('trigger helpers apply the operator token exactly once at export', async () => {
    const { context, html } = await loadTagPilot();
    const forbiddenIdentityToken = ['ksdswoman', 'v1'].join('_');
    assert.equal(context.__test.withTriggerWord('token, alpha, beta', 'token'), 'token, alpha, beta');
    assert.equal(context.__test.withCaptionTriggerForExport('token, close up portrait', 'token'), 'token, close up portrait');
    assert.equal(context.__test.withCaptionTriggerForExport('token, token, close up portrait', 'token'), 'token, close up portrait');
    assert.equal(context.__test.withoutCaptionTriggerPrefix('token, close up portrait', 'token'), 'close up portrait');
    assert.equal(html.toLowerCase().includes(forbiddenIdentityToken), false);
    assert.doesNotMatch(html, /item\.tags = currentTriggerWord \?/);
});

test('mocked one-image request preserves MIME and unlocks LM Studio batching', async () => {
    let body;
    const { context, elements } = await loadTagPilot({ fetchHandler: async (_url, options) => {
        body = JSON.parse(options.body);
        return response(200, { choices: [{ message: { content: 'close up portrait, a faint closed-mouth smile, black hair tied back, black collar, plain background, soft daylight.' } }] });
    } });
    elements.get('lmstudio-model-id').value = 'exact/vision';
    const file = new context.File([new Uint8Array([1])], 'facecrop.webp', { type: 'image/webp' });
    context.__test.setDataset([context.__test.createDatasetItem(file)]);
    await context.__test.testOneImageWithLMStudio();
    assert.equal(body.model, 'exact/vision');
    assert.ok(body.messages[1].content[0].image_url.url.startsWith('data:image/webp;base64,'));
    assert.equal(elements.get('lmstudio-readiness-status').textContent, 'Ready for batch captioning');
    assert.equal(elements.get('caption-all-button').disabled, false);
});

test('batch processing is sequential and reports completed, failed, skipped, and stopped counts', async () => {
    const { context, elements } = await loadTagPilot();
    const file = new context.File([new Uint8Array([1])], 'img.png', { type: 'image/png' });
    context.__test.setDataset([1, 2, 3].map(() => context.__test.createDatasetItem(file)));
    let active = 0;
    let maximum = 0;
    const counts = await context.__test.runBatchProcessing({
        configPanel: elements.get('tag-settings-config'), progressPanel: elements.get('tag-settings-progress'),
        progressBar: elements.get('tag-progress-bar'), progressText: elements.get('tag-progress-text'),
        closeModal() {}, operationName: 'Fixture',
        async processItem(_item, index) {
            active++;
            maximum = Math.max(maximum, active);
            await Promise.resolve();
            active--;
            if (index === 1) return 'skipped';
            if (index === 2) throw new Error('fixture failure');
            return 'completed';
        },
    });
    assert.deepEqual({ ...counts }, { completed: 1, failed: 1, skipped: 1, stopped: 0 });
    assert.equal(maximum, 1);
});

test('batch stop leaves completed work intact and counts untouched items', async () => {
    const { context, elements } = await loadTagPilot();
    const file = new context.File([new Uint8Array([1])], 'img.png', { type: 'image/png' });
    context.__test.setDataset([1, 2, 3].map(() => context.__test.createDatasetItem(file)));
    const counts = await context.__test.runBatchProcessing({
        configPanel: elements.get('tag-settings-config'), progressPanel: elements.get('tag-settings-progress'),
        progressBar: elements.get('tag-progress-bar'), progressText: elements.get('tag-progress-text'),
        closeModal() {}, operationName: 'Stop fixture',
        async processItem() { context.__test.setBatchRunning(false); return 'completed'; },
    });
    assert.deepEqual({ ...counts }, { completed: 1, failed: 0, skipped: 0, stopped: 2 });
});

test('cloud and vLLM text providers remain registered and OpenAI request routing works', async () => {
    const { context, elements, fetchCalls } = await loadTagPilot();
    assert.deepEqual(Array.from(context.__test.getTextProviderIds()), ['lmstudio', 'gemini', 'grok', 'openai', 'claude', 'vllm']);
    elements.get('tag-default-model').value = 'openai';
    const file = new context.File([new Uint8Array([1])], 'img.png', { type: 'image/png' });
    await context.__test.generateTags(file, 12, 'openai');
    assert.equal(fetchCalls[0].url, 'https://api.openai.com/v1/responses');
    assert.equal(JSON.parse(fetchCalls[0].body).model, 'gpt-5.4-mini');
});

test('preserved vLLM provider saves settings and sends its exact model ID', async () => {
    const { context, elements, fetchCalls, localStorage } = await loadTagPilot({
        local: {
            vllmApiKey: 'fixture',
            vllmEndpoint: 'https://vllm.example.test',
            vllmModelType: 'publisher/vision-model',
        },
    });
    elements.get('vllm-endpoint').value = 'https://updated.example.test/v1';
    elements.get('vllm-model-type').value = 'publisher/updated-vision-model';
    context.__test.saveSettings();
    assert.equal(localStorage.getItem('vllmEndpoint'), 'https://updated.example.test/v1');
    assert.equal(localStorage.getItem('vllmModelType'), 'publisher/updated-vision-model');

    const file = new context.File([new Uint8Array([1])], 'img.png', { type: 'image/png' });
    await context.__test.generateTags(file, 12, 'vllm');
    assert.equal(fetchCalls[0].url, 'https://updated.example.test/v1/chat/completions');
    const body = JSON.parse(fetchCalls[0].body);
    assert.equal(body.model, 'publisher/updated-vision-model');
    assert.equal(body.messages[0].content[1].image_url.url, 'data:image/png;base64,QUJD');
});

test('DeepDanbooru preserves the upstream Hugging Face Gradio flow', async () => {
    const { context, fetchCalls } = await loadTagPilot({
        local: { ddThreshold: '0.6' },
        fetchHandler: async (url) => {
            if (url.endsWith('/upload')) return response(200, ['/tmp/gradio/uploaded/image.png']);
            if (url.endsWith('/call/v2/predict')) return response(200, { event_id: 'event-123' });
            if (url.endsWith('/call/predict/event-123')) {
                return {
                    ok: true,
                    status: 200,
                    async text() {
                        return 'event: complete\ndata: [{"label":"solo","confidences":[{"label":"solo","confidence":0.9},{"label":"low_score","confidence":0.4}]},{"solo":0.9,"low_score":0.4},"solo, low_score"]\n\n';
                    },
                };
            }
            throw new Error(`Unexpected URL: ${url}`);
        },
    });
    const file = new context.File([new Uint8Array([1])], 'image.png', { type: 'image/png' });
    assert.equal(await context.__test.generateTags(file, 12, 'deepdanbooru'), 'solo');
    assert.equal(fetchCalls[0].url, 'https://hysts-deepdanbooru.hf.space/gradio_api/upload');
    assert.equal(fetchCalls[0].method, 'POST');
    assert.equal(fetchCalls[0].body.entries[0].filename, 'image.png');
    assert.equal(fetchCalls[1].url, 'https://hysts-deepdanbooru.hf.space/gradio_api/call/v2/predict');
    assert.equal(JSON.parse(fetchCalls[1].body).score_threshold, 0.6);
    assert.equal(fetchCalls[2].url, 'https://hysts-deepdanbooru.hf.space/gradio_api/call/predict/event-123');
});

test('README keeps required Windows-first section order and attribution', async () => {
    const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
    const headings = [
        '## Attribution', '## What This Fork Adds', '## Why This Fork Exists', '## Windows Quick Start',
        '## Primary Architecture', '## Optional LAN Mode', '## Optional macOS and Linux Launch',
        '## In-App Workflow', '## Trigger Token Behavior', '## Security Note', '## Testing Status',
        '## Known Limitations', '## Original Project', '## Syncing With Upstream',
    ];
    let previous = -1;
    for (const heading of headings) {
        const index = readme.indexOf(heading);
        assert.ok(index > previous, `${heading} should be present in order`);
        previous = index;
    }
    assert.match(readme, /Based on and heavily modified from \[TagPilot by vavo\]/);
    assert.match(readme, /not the official upstream version/);
});

test('MIT license retains the exact upstream copyright notice', async () => {
    const license = await readFile(new URL('../LICENSE', import.meta.url), 'utf8');
    assert.match(license, /^MIT License\n\nCopyright \(c\) 2025 Michal Vavak\n/);
    assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(license)}\0${license}`).digest('hex'), 'd027dba0f6d5e71f485e00925f9dbcadb7224b53');
});
