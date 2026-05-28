# **TagPilot v2.0 ✈️ (Your Co-Pilot for LoRA Dataset Domination)**

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-vavo-5F7FFF?style=for-the-badge&logo=buy-me-a-coffee&logoColor=white)](https://www.buymeacoffee.com/vavo)
[![Sponsor on GitHub](https://img.shields.io/badge/Sponsor%20on-GitHub-24292F?style=for-the-badge&logo=github)](https://github.com/sponsors/vavo)
[![Support on Patreon](https://img.shields.io/badge/Support%20on-Patreon-F96854?style=for-the-badge&logo=patreon&logoColor=white)](https://www.patreon.com/vavo)

**The browser-based beast that turns chaotic image piles into perfectly tagged, ready-to-train datasets – faster than you can say "trigger word activated!"**

![TagPilot UI](https://i.ibb.co/fd1SPf2w/tagpilot20.png)

Tired of wrestling with folders full of untagged images like a digital archaeologist? TagPilot swoops in like a supersonic jet, handling everything client-side so your precious data never leaves your machine (except when you politely ask an AI provider to peek for tagging magic). Private-ish, local-first, and zero server drama.

### **Why TagPilot Will Make You Smile (and Your LoRAs Shine)**

- **Upload Shenanigans**: Drag in single pics, or drop a whole ZIP bomb – it even pairs existing .txt tags like a pro matchmaker. Add more anytime; no commitment issues here.
- **Trigger Word Superpower**: Type your magic word once (e.g., "ohwx woman") and watch it glue itself as the VIP first tag on *every* image. Boom – consistent activation guaranteed.
- **AI Tagging Turbo**: Powered by Gemini 3.1 Flash Lite, Claude Sonnet 4.5, Grok 4.3, OpenAI GPT-5.4 Mini, vLLM OpenAI-compatible endpoints, DeepDanbooru, or WD1.4 – because why settle for one engine when you can have a fleet?
  - Batch modes: **Ignore** (I'm good, thanks), **Append** (more tags pls), or **Overwrite** (out with the old!).
  - Progress bar + emergency "Stop" button for when the API gets stage fright.
- **Separate Tagging and Captioning Defaults**: Set one default model for tags and another for captions. Tag with WD1.4, caption with Claude, or mix providers however your dataset pipeline demands.
- **Proper Settings Cockpit**: The top-left **Settings** panel now has dedicated **Tagging Options**, **Captioning Options**, and **Crop Options** sections for default models, output limits, editable system prompts, crop ratio, and crop width.
- **Provider Key Table**: Gemini, Grok, OpenAI, Claude, vLLM, DeepDanbooru, and WD1.4 sit in one key/status table, so you can see which providers are ready instead of playing API-key hide-and-seek like it is 2009.
- **Tag Viewer Cockpit**: Collapsible dashboard showing every tag's popularity. Click the little × to yeet a bad tag from the *entire* dataset. Global cleanup has never felt so satisfying.
- **Per-Image Playground**: Clickable pills for tags, free-text captions, add/remove on the fly. Toggle between tag-mode and caption-mode like switching altitudes. Single-image Tag/Caption actions now show a tiny processing indicator, because silent buttons are rude.
- **Crop & Conquer**: Free-form cropping, preset LoRA-friendly ratios (1:1, 16:9, 3:2, 4:3, 21:9, 9:16, 2:3, 3:4), and a configurable output width. No more awkward compositions ruining your training.
- **Duplicate Radar**: 100% local hash detection – skips clones quietly, no false alarms from sneaky filename changes.
- **Export Glory**: One click → pristine ZIP with images + .txt files, ready for kohya_ss or your trainer of choice.
- **Privacy First**: Everything runs in your browser. API keys stay in your browser's local storage. Images are only sent to the AI provider you choose for tagging/captioning.

### **Getting Airborne (Setup in 30 Seconds)**

No servers, no npm drama – just pure single-file HTML bliss.

1. Clone or download: `git clone https://github.com/vavo/TagPilot.git`
2. Open `tagpilot.html` in your browser. Done! 🚀

(Pro tip: For a fancy local server, run `python -m http.server 8000` and hit localhost:8000.)

### **Flight Plan (How to Crush It)**

1. **Load Cargo**: Upload images or ZIP – duplicates auto-skipped.
2. **Set Trigger**: Your secret activation phrase goes here.
3. **Name Your Mission**: Dataset prefix for clean exports.
4. **Configure Defaults**: Use top-left Settings to choose default tag/caption models, prompts, limits, crop size, crop width, and provider keys.
   - For Runpod's vLLM template, use the pod proxy URL such as `https://pod-id-8000.proxy.runpod.net`, API key such as `sk-pod-id`, and model type `Qwen/Qwen3-8B`.
   - vLLM settings include presets for Qwen2.5-VL, Qwen3-VL, Qwen3.5, Gemma 3, Pixtral, and Mistral Small. The model type field stays editable for any other compatible model ID.
   - See [vllm.md](vllm.md) for Runpod and local multimodal vLLM setup.
5. **Tag/Caption All**: Hit the button, choose how to handle existing text, and let the progress bar do its suspiciously useful job.
6. **Fine-Tune**: Crop, manual edit, nuke bad tags globally.
7. **Deploy**: Export ZIP and watch your LoRA soar.

### **Under the Hood (Cool Tech Stuff)**

- Vanilla JS + Tailwind (fast & beautiful)
- JSZip for ZIP wizardry
- Cropper.js for precision framing
- Web Crypto for local duplicate detection
- Multiple AI backends: Gemini, Claude, Grok, OpenAI, vLLM OpenAI-compatible, DeepDanbooru, and WD1.4
- Current cloud defaults: `gemini-3.1-flash-lite`, `claude-sonnet-4-5-20250929`, `grok-4.3`, and `gpt-5.4-mini`
- Current local vLLM default: `Qwen/Qwen3-8B` through `/v1/chat/completions`
- vLLM preset families: Qwen2.5-VL, Qwen3-VL, Qwen3.5, Gemma 3, Pixtral, and Mistral Small.
- For image tagging/captioning, the model served behind vLLM must accept OpenAI `image_url` content; the stock Runpod `Qwen/Qwen3-8B` template responds to text but rejects images.
- Tiny no-install Node test harness for provider payload sanity checks
- v2.0 refactors keep the single-file app intact while cleaning up provider calls, safe tag rendering, batch processing, object URL cleanup, stable image IDs, and shared tag utilities.

### **Changelog**

See [CHANGELOG.md](CHANGELOG.md) for the release notes.

Got ideas, bugs, or want to contribute? Open an issue or PR – let's make dataset prep ridiculously awesome together!

**Happy training, pilots! ✈️**
