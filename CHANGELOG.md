# Changelog

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
