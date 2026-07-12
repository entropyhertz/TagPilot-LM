# TagPilot-LM

**Windows-first local TagPilot fork for LM Studio vision captioning, with optional LAN access.**

TagPilot-LM is a single-file browser application designed primarily for Windows and compatible with macOS and Linux.

## Attribution

Based on and heavily modified from [TagPilot by vavo](https://github.com/vavo/TagPilot).

- Original project: [github.com/vavo/TagPilot](https://github.com/vavo/TagPilot)
- License: MIT. See [LICENSE](LICENSE).
- Original copyright: Copyright (c) 2025 Michal Vavak.

This repository is an independent Windows-first local-model fork and is not the official upstream version. The original TagPilot project remains available upstream. Users who prefer the original provider architecture should use the upstream project. The upstream author does not necessarily endorse this fork.

Additional LM Studio modifications © 2026 entropyhertz.

## What This Fork Adds

TagPilot-LM extends the original TagPilot with a Windows-first local multimodal captioning workflow designed for LM Studio running on the same PC, with optional access from another device over a private LAN.

- LM Studio as a local captioning provider with no paid API required
- same-machine Windows support using localhost by default
- optional private-LAN support from macOS, Linux, or another Windows device
- `/api/v1/models` discovery with `/v1/models` fallback
- exact model IDs returned by LM Studio instead of speculative IDs
- authoritative vision-capability detection when metadata is available
- separate connection, model-detection, and one-image verification steps
- OpenAI-compatible multimodal `/v1/chat/completions` requests
- sequential batch captioning with stop support and partial results
- caption cleanup, validation, visible per-image errors, and exact batch counts
- rejection or review warnings for JSON, tag lists, refusals, filename echoes, malformed output, trigger placeholders, and overlong output
- operator-controlled trigger insertion exactly once during export
- stronger Krea-2 character-LoRA captioning rules that separate stable identity from variable image details
- hair treated as a variable, facecrop-specific behavior, and consistent expression and framing vocabularies
- separate tagging and captioning defaults and system prompts
- existing Gemini, Grok, OpenAI, Claude, vLLM, DeepDanbooru, and WD1.4 support preserved
- upstream upload, ZIP, crop, editing, tagging, captioning, and export tools preserved

## Why This Fork Exists

The original TagPilot supports several hosted providers and broader provider workflows. This fork focuses on users who want to run a local multimodal model on their own Windows hardware without paying for a hosted API.

This focus is complementary, not a replacement for upstream. Users who prefer the original provider workflow should use [vavo/TagPilot](https://github.com/vavo/TagPilot).

## Windows Quick Start

1. Load a vision-capable model in LM Studio.
2. Open PowerShell.
3. Start the local LM Studio server:

   ```powershell
   lms server start --port 1234 --cors
   ```

4. Confirm the server is running:

   ```powershell
   lms server status
   ```

5. Navigate to the repository:

   ```powershell
   cd C:\path\to\TagPilot-LM
   ```

6. Start a local HTTP server:

   ```powershell
   py -m http.server 8765
   ```

   If `py` is unavailable, use either:

   ```powershell
   python -m http.server 8765
   python3 -m http.server 8765
   ```

   Python's HTTP server may listen on all interfaces by default. On an untrusted network, append `--bind 127.0.0.1` to the command to restrict it to this PC.

7. Open [http://127.0.0.1:8765/tagpilot.html](http://127.0.0.1:8765/tagpilot.html).
8. Leave **Connection mode** set to **Same Windows PC**.
9. Enter `http://127.0.0.1:1234` as the LM Studio URL.
10. Run **Test Connection**, **Detect Models**, **Test One Image**, and then **Caption All**.

Same-machine Windows use does not require `--bind 0.0.0.0`.

## Primary Architecture

```text
Windows browser
→ localhost
→ Windows LM Studio
→ local vision-capable model
→ caption returned to TagPilot-LM
```

Images remain on the Windows PC except for whichever provider the operator deliberately selects. The LM Studio workflow sends them only to the local LM Studio server.

## Optional LAN Mode

Use this advanced mode only when TagPilot-LM runs on a different device from the Windows LM Studio host.

```text
macOS, Linux, or another Windows device
→ private LAN
→ Windows LM Studio host
→ local vision-capable model
→ caption returned to TagPilot-LM
```

On the Windows LM Studio host, run:

```powershell
lms server start --bind 0.0.0.0 --port 1234 --cors
lms server status
ipconfig
```

In TagPilot-LM, select **Another device over LAN** and enter the Windows host IPv4 address, for example:

```text
http://192.168.1.50:1234
```

> **LAN security warning:** `--bind 0.0.0.0` exposes LM Studio to the local network, and `--cors` permits browser pages to call it. Use this only on a trusted private network. Do not expose port 1234 through the router. Stop the server when it is not needed on an untrusted network. Use authentication when available, never commit tokens, and allow port 1234 through Windows Firewall only for the intended private network.

## Optional macOS and Linux Launch

macOS and Linux can run TagPilot-LM locally in the browser:

```bash
cd /path/to/TagPilot-LM
python3 -m http.server 8765
```

Then open [http://127.0.0.1:8765/tagpilot.html](http://127.0.0.1:8765/tagpilot.html).

If LM Studio runs on another Windows PC, use the optional LAN workflow above. TagPilot-LM is not primarily a Mac-browser application; Windows same-machine use remains the default.

## In-App Workflow

1. Choose connection mode.
2. Enter the LM Studio URL.
3. Run **Test Connection**.
4. Run **Detect Models**.
5. Select the exact returned model ID.
6. Upload an image.
7. Run **Test One Image**.
8. Inspect the caption and any review warning.
9. Save settings.
10. Run **Caption All**.
11. Export the dataset.

Batch captioning remains disabled for LM Studio until one real image returns a usable caption under the current mode, URL, token, model, prompt, and word limit.

## Trigger Token Behavior

- The tagging and captioning models do not generate the identity trigger.
- The operator enters the trigger manually in TagPilot-LM.
- TagPilot-LM prepends it exactly once while exporting each text file.
- The source captions and tags remain trigger-free while editing.
- This prevents omission, misspelling, and duplication.
- Do not use a second trigger-insertion mechanism in the training pipeline unless the TagPilot-LM trigger field is left blank.

No identity trigger is hardcoded in this repository.

## Security Note

- Same-machine use with localhost is the default and safest topology.
- Python's static HTTP server may listen on all interfaces by default; add `--bind 127.0.0.1` on an untrusted network.
- `--bind 0.0.0.0` exposes LM Studio to other devices on the local network.
- `--cors` permits browser requests; permissive CORS means other pages visited in the browser may potentially call the server while it is reachable.
- Use LAN mode only on a trusted private network.
- Do not expose port 1234 through the router or public Internet.
- Windows Firewall may need a private-network rule for port 1234 in LAN mode.
- Use local authentication when available. The optional token is kept in session storage, not local storage.
- Never commit tokens, provider keys, datasets, captions, or private LAN addresses.
- Stop the server when it is not needed on an untrusted network.

## Testing Status

| Test | Result | Type | Remaining uncertainty |
|---|---|---|---|
| JavaScript syntax, HTML IDs, and stale-copy scan | Passed | Local static | Does not exercise Windows or LM Studio |
| Exact Krea-2 prompt comparison | Passed | Local static | None for source-text equality |
| UI initialization and browser console | Passed on macOS | Local browser | Windows browser behavior remains unverified |
| Same-PC and LAN URL validation | Passed | Mocked fixtures | Real browser/network policy may differ |
| Authentication, catalog ordering, and model preference | Passed | Mocked fixtures | Actual LM Studio version/schema may differ |
| Payload, MIME, response parsing, validation, and readiness | Passed | Mocked fixtures | Actual model output remains unverified |
| Sequential batches, failures, skips, and stopping | Passed | Mocked fixtures | Real inference timing remains unverified |
| Regression fixture suite | 26/26 passed | Mocked/local | No Windows end-to-end inference |
| Windows LM Studio server startup | Confirmed manually | User-provided/manual | Not reproduced in this publication session |
| Gemma 4 loaded in LM Studio | Confirmed manually | User-provided/manual | Exact returned model ID not observed here |
| Same-machine Windows browser captioning | Not run | Real | Requires a Windows browser and LM Studio host |
| Real one-image Gemma captioning | Not run | Real | Requires the actual model and hardware |
| Real multi-image batch captioning | Not run | Real | Throughput and memory behavior unknown |
| Cross-device LAN captioning | Not run | Real | Firewall, CORS, and browser LAN permissions unknown |

Mocked results are not claims of real LM Studio success.

## Known Limitations

- Windows Firewall may block port 1234, especially in LAN mode.
- Browser local-network permissions may interfere with LAN mode.
- CORS behavior varies across browsers and LM Studio versions.
- HTTPS pages may block HTTP LM Studio endpoints as mixed content.
- Older LM Studio versions may not support the expected image input format.
- `/v1/models` may not report authoritative vision metadata; one-image verification remains required.
- The `/api/v1/models` schema may vary across LM Studio versions.
- Model size and inference speed depend on hardware.
- Large Gemma models may require quantization and substantial VRAM.
- Tailwind, JSZip, Google Fonts, and CropperJS remain CDN dependencies.
- CLI server persistence across reboot is not guaranteed by this fork.
- Browser errors cannot always distinguish CORS, firewall, server, and network failures.

## Original Project

The original project is [vavo/TagPilot](https://github.com/vavo/TagPilot).

Users who prefer the original provider workflow should use the upstream project. This fork is independently maintained, is not an official TagPilot release, and does not imply upstream endorsement.

## Syncing With Upstream

The upstream default branch is `main`. This clone keeps the fork as `origin` and the original project as `upstream`.

```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

For feature work, create a branch from the refreshed `upstream/main` instead of committing directly to `main`.
