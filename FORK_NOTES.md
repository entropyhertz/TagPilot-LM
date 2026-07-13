# Fork Notes

## Purpose

TagPilot-LM is an independent Windows-first fork of [vavo/TagPilot](https://github.com/vavo/TagPilot). It focuses on local multimodal captioning through LM Studio without replacing the upstream project's hosted-provider workflow or claiming official status.

Additional LM Studio modifications © 2026 entropyhertz. The original MIT notice remains unchanged in [LICENSE](LICENSE).

## Windows-First Architecture

The primary topology is:

```text
Windows browser → localhost → Windows LM Studio → local vision model → TagPilot-LM
```

Same-machine mode uses `http://127.0.0.1:1234` by default and starts LM Studio with:

```powershell
lms server start --port 1234 --cors
```

Loopback is correct in this mode because the browser and LM Studio share one Windows PC.

## Optional LAN Architecture

The advanced topology is:

```text
another device → trusted private LAN → Windows LM Studio host → local vision model → TagPilot-LM
```

LAN mode requires a private Windows host IPv4 address and may start LM Studio with:

```powershell
lms server start --bind 0.0.0.0 --port 1234 --cors
```

`0.0.0.0` is only a server bind address. It is never a usable browser destination. LAN mode rejects loopback, unspecified, public, link-local, and hostname destinations; it accepts only private IPv4 ranges.

## Main Implementation Decisions

- Preserve the single `tagpilot.html` architecture and upstream dataset tools.
- Prefer `GET /api/v1/models`; fall back to `GET /v1/models` only when needed.
- Use exact model keys returned by the server instead of hardcoded repository guesses.
- Trust `capabilities.vision` only when the native catalog supplies it.
- Mark OpenAI-compatible catalog entries as vision-unverified.
- Require one successful image caption before enabling an LM Studio caption batch.
- Include connection mode, URL, token, model, prompt, and word limit in the readiness signature.
- Send captions sequentially so large local models are not flooded with concurrent images.
- Keep the optional LM Studio token in session storage only.
- Preserve hosted and vLLM providers, uploading, ZIP import/export, cropping, editing, tagging, and captioning.

## Trigger Insertion at Export

Tagging and captioning models return trigger-free text. The operator supplies the trigger in the UI, and TagPilot-LM applies it exactly once while writing exported text files. This keeps editable source text clean and prevents omission, misspelling, or duplicate insertion.

No identity trigger is hardcoded in the application.

## Model Discovery Instead of Hardcoding

LM Studio model identifiers can differ from a model's Hugging Face repository name. Discovery prevents speculative IDs from being sent to the server and preserves the exact identifier LM Studio reports. When only `/v1/models` is available, the app labels vision support unverified and relies on the one-image test.

## Testing Boundary

Static parsing, prompt equality, mode-aware URL validation, catalog handling, request construction, response validation, readiness, and sequential batch state have local or mocked coverage. The interface has been initialized in a local macOS browser without console errors.

The publication process does not claim real same-machine Windows captioning, real Gemma image output, a real multi-image batch, or cross-device LAN success. Those require the actual Windows host, model, browser, firewall, and network.

## Known Risks

- LM Studio API schemas and CORS behavior may vary by version.
- Browser security policies can block HTTP or private-network requests.
- Windows Firewall may block LAN connections.
- Large local models can require significant VRAM and may run slowly.
- CDN dependencies require Internet access unless separately cached.
- Python's static HTTP server can listen on all interfaces unless restricted with `--bind 127.0.0.1`.
- `/v1/models` does not provide authoritative vision metadata.
- Server persistence across Windows restarts is outside this fork's guarantees.

## Upstream Attribution

Original project: [TagPilot by vavo](https://github.com/vavo/TagPilot)

License: MIT. See [LICENSE](LICENSE).

Original notice: Copyright (c) 2025 Michal Vavak.

This fork is independent, is not the official upstream version, and does not imply endorsement by the upstream author.

## Draft Release Notes

Suggested tag: `v1.0.0-lmstudio-local`

Suggested title: `TagPilot-LM v1.0.0`

TagPilot-LM introduces Windows-first local vision captioning through LM Studio. It adds a safe localhost default, optional private-LAN mode, exact model discovery, authoritative vision metadata when available, one-image verification before batching, sequential caption batches, stricter Krea-2 character-LoRA caption validation, and operator-controlled trigger insertion during export. Existing cloud and vLLM providers and dataset tools remain available.

LAN mode binds LM Studio to the local network and must be used only on a trusted private network with appropriate firewall and authentication controls. Actual performance and model compatibility depend on LM Studio version, quantization, VRAM, browser policy, and the selected model.

This work is based on TagPilot by vavo and remains available under the upstream MIT License. No tag or release is created by the publication pull request.
