# Changelog

## Unreleased

- Added a **vLLM OpenAI compatible** provider for local/Runpod models.
- Added Settings fields for vLLM endpoint URL, model type, and API key.
- Defaulted the vLLM model type to `Qwen/Qwen3-8B` and normalized Runpod base URLs to `/v1/chat/completions`.
- Added a vLLM model preset dropdown for Qwen2.5-VL, Qwen3-VL, Qwen3.5, Gemma 3, Pixtral, and Mistral Small models.
- Added `vllm.md` with Runpod and local multimodal vLLM setup notes.

## v2.0 - 2026-05-10

- Reworked Settings into dedicated **Tagging Options** and **Captioning Options** sections.
- Added separate default models for tagging and captioning.
- Moved max tags, max caption length, and editable system prompts into Settings instead of hiding them in the batch modals.
- Added **Crop Options** with free-form mode, common aspect-ratio presets, and configurable crop output width.
- Crops now use the selected aspect ratio and resize output from the saved crop width.
- Replaced the single model/API-key picker with a provider API key table for Gemini, Grok, OpenAI, Claude, DeepDanbooru, and WD1.4.
- Added visible key status per provider so saved-key state is obvious.
- Hid the inline trigger-word and dataset-name labels while users are typing, because text overlap is not a feature.
- Added a bottom-right **Part of Lora Pilot family** link to the LoRA Pilot GitHub repository.
- Kept TagPilot as a single static `tagpilot.html` file with no install/build step. Miracles happen, occasionally.
- Refactored provider calls into a provider registry.
- Rendered tag pills without interpolating tag text into HTML.
- Shared the batch processing runner between tagging and captioning.
- Added object URL lifecycle cleanup for previews, crops, exports, removals, and resets.
- Switched image-card actions to stable item IDs instead of shifting array indexes.
- Extracted shared tag parsing, formatting, merge, and trigger-word helpers.
- Expanded the no-install Node regression harness to cover settings, provider routing, refactor seams, and UI-state behavior.

## v1.6 - 2026-05-08

- Added Claude support through Anthropic's browser-direct Messages API using `claude-sonnet-4-5-20250929`.
- Updated cloud provider defaults to current request shapes: Gemini 3.1 Flash Lite, Grok 4.3 via xAI Responses, and OpenAI GPT-5.4 Mini via Responses.
- Wired custom tag and caption prompts into provider requests instead of leaving the UI knobs there for decoration.
- Enforced the caption word limit after generation and included it in caption prompts.
- Moved Settings to the top-left corner and added a visible Settings label next to the icon.
- Fixed provider API key switching so Gemini, Claude, Grok, and OpenAI each reload their own saved key.
- Added clearer provider HTTP errors, including useful OpenAI 401 messages.
- Added a per-image processing indicator for single-image Tag and Caption actions.
- Added a Crop button directly inside the image preview modal.
- Added a no-install Node test harness for provider payloads and UI-state regressions.

## v1.5

- Added ZIP/image dataset loading with paired `.txt` captions.
- Added trigger-word management, global tag cleanup, per-image tag/caption editing, duplicate detection, cropping, and ZIP export.
- Added multiple tagging backends: Gemini, Grok, OpenAI, DeepDanbooru, and WD1.4.
