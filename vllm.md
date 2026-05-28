# TagPilot vLLM Multimodal Setup

TagPilot can call vLLM through the OpenAI-compatible Chat Completions API. The important part is not the endpoint. The important part is whether the model behind vLLM can read images.

The stock Runpod vLLM template starts with `Qwen/Qwen3-8B`. That model answers text prompts, but it rejects image payloads. For TagPilot tagging and captioning, run a vision-chat model such as Qwen2.5-VL, Qwen3-VL, Gemma 3, Pixtral, or Mistral Small.

## Quick Start With Runpod

Use the official Runpod vLLM template:

https://console.runpod.io/deploy?template=pvcdqlwm9r&ref=o3idfm0n

After the pod starts, Runpod gives you a proxy URL like:

```text
https://your-pod-8000.proxy.runpod.net
```

In TagPilot Settings, choose:

```text
Default model: vLLM OpenAI compatible
vLLM endpoint URL: https://your-pod-8000.proxy.runpod.net
vLLM API key: sk-your-pod
vLLM model preset: Qwen2.5 VL 7B Instruct
```

If you set `VLLM_API_KEY` in the Runpod pod, use that value instead of `sk-your-pod`.

## Recommended Models

Start small, then move up. Bigger models cost more, take longer to download, and need more VRAM. Shocking, yes.

| Family | Model ID | Notes |
| --- | --- | --- |
| Qwen2.5-VL | `Qwen/Qwen2.5-VL-3B-Instruct` | Good first test on smaller GPUs. |
| Qwen2.5-VL | `Qwen/Qwen2.5-VL-7B-Instruct` | Best practical first pick for TagPilot. |
| Qwen3-VL | `Qwen/Qwen3-VL-4B-Instruct` | Newer Qwen vision option, smaller footprint. |
| Qwen3-VL | `Qwen/Qwen3-VL-8B-Instruct` | Stronger Qwen vision option. |
| Qwen3.5 | `Qwen/Qwen3.5-9B-Instruct` | Hybrid multimodal model in current vLLM docs. |
| Gemma 3 | `google/gemma-3-4b-it` | Small Gemma vision-capable option. |
| Gemma 3 | `google/gemma-3-12b-it` | Better quality, more memory. |
| Pixtral | `mistralai/Pixtral-12B-2409` | Mistral-format vision model. |
| Mistral Small | `mistralai/Mistral-Small-3.1-24B-Instruct-2503` | Larger, strong, needs a serious GPU. |

TagPilot keeps the model field editable. If vLLM supports another multimodal model, paste its Hugging Face model ID.

## Endpoint And Request Shape

For TagPilot, the client endpoint stays the same for most vision-chat models:

```http
POST https://your-pod-8000.proxy.runpod.net/v1/chat/completions
```

TagPilot sends one image and one text prompt:

```json
{
  "model": "Qwen/Qwen2.5-VL-7B-Instruct",
  "messages": [
    {
      "role": "user",
      "content": [
        { "type": "text", "text": "Describe this image as tags." },
        { "type": "image_url", "image_url": { "url": "data:image/png;base64,..." } }
      ]
    }
  ],
  "max_tokens": 300
}
```

The model ID changes. The endpoint usually does not.

## Server-Side Details That Matter

Most setup problems live in the vLLM server command, not in TagPilot.

- One vLLM server usually serves one loaded model. `/v1/models` lists that model.
- Change models by changing the Runpod Start CMD `--model` value, then restart the pod.
- Some models need `--trust-remote-code`.
- Some models need a lower `--max-model-len` to fit GPU memory.
- Use `--limit-mm-per-prompt image=1` for TagPilot. TagPilot sends one image per request.
- Larger models may need `--tensor-parallel-size` or a bigger GPU.
- Some older LLaVA-style models may need a chat template.
- Most Instruct/VL models already include the chat template.
- Some model families have quirks, but the endpoint still stays `/v1/chat/completions`.

## Runpod Start CMD Examples

The Runpod template already runs the official `vllm/vllm-openai:latest` image. Edit the Start CMD and replace the model.

Small first test:

```bash
--model Qwen/Qwen2.5-VL-3B-Instruct \
--limit-mm-per-prompt image=1 \
--max-model-len 8192
```

Practical default:

```bash
--model Qwen/Qwen2.5-VL-7B-Instruct \
--limit-mm-per-prompt image=1 \
--max-model-len 8192
```

Gemma:

```bash
--model google/gemma-3-4b-it \
--limit-mm-per-prompt image=1 \
--max-model-len 8192
```

Mistral/Pixtral:

```bash
--model mistralai/Pixtral-12B-2409 \
--limit-mm-per-prompt image=1 \
--max-model-len 8192
```

If the model loader complains about custom code, add:

```bash
--trust-remote-code
```

If the pod runs out of memory, lower `--max-model-len`, pick a smaller model, or use a larger GPU. If the model spans multiple GPUs, set `--tensor-parallel-size` to the GPU count.

## Local vLLM

You can also run vLLM locally if your machine has a supported NVIDIA GPU and enough VRAM.

Install vLLM in a Python environment:

```bash
pip install vllm
```

Serve a model:

```bash
vllm serve Qwen/Qwen2.5-VL-7B-Instruct \
  --host 0.0.0.0 \
  --port 8000 \
  --api-key sk-local \
  --limit-mm-per-prompt image=1 \
  --max-model-len 8192
```

Then configure TagPilot:

```text
vLLM endpoint URL: http://localhost:8000
vLLM API key: sk-local
vLLM model type: Qwen/Qwen2.5-VL-7B-Instruct
```

If your browser blocks local cross-origin requests, serve TagPilot from a local HTTP server instead of opening the file directly:

```bash
python3 -m http.server 8765
```

Then open:

```text
http://127.0.0.1:8765/tagpilot.html
```

## Verify The Server Before Using TagPilot

List the currently loaded model:

```bash
curl -H "Authorization: Bearer sk-your-key" \
  https://your-pod-8000.proxy.runpod.net/v1/models
```

Test a tiny image request:

```bash
curl -sS \
  -H "Authorization: Bearer sk-your-key" \
  -H "Content-Type: application/json" \
  https://your-pod-8000.proxy.runpod.net/v1/chat/completions \
  -d '{
    "model": "Qwen/Qwen2.5-VL-7B-Instruct",
    "messages": [{
      "role": "user",
      "content": [
        { "type": "text", "text": "Describe this image in five words." },
        { "type": "image_url", "image_url": { "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC" } }
      ]
    }],
    "max_tokens": 40
  }'
```

If the server says the model is not multimodal, you loaded a text-only model. Change `--model` and restart.

## Troubleshooting

### `model is not a multimodal model`

You loaded a text-only model. `Qwen/Qwen3-8B` does this. Use a VL, Gemma 3, Pixtral, or Mistral Small vision model.

### `model not found`

The model ID in TagPilot does not match the model served by vLLM. Check `/v1/models`, then copy the returned `id` into TagPilot.

### Browser says `Failed to fetch`

Check CORS, the pod URL, and whether the pod is still running. Runpod proxy URLs should include the `-8000.proxy.runpod.net` host. TagPilot accepts the base URL and adds `/v1/chat/completions`.

### Out of memory on startup

Use a smaller model, lower `--max-model-len`, increase GPU size, or use tensor parallelism on a multi-GPU pod.

### Model downloads forever

Increase the Runpod volume size. The model must fit in the cache volume. Hugging Face model pages show file sizes under "Files and versions"; round up generously.

## References

- vLLM supported multimodal models: https://docs.vllm.ai/en/latest/models/supported_models/
- vLLM multimodal request format: https://docs.vllm.ai/en/v0.13.0/features/multimodal_inputs/
- vLLM serve CLI options: https://docs.vllm.ai/en/latest/cli/serve/
- Runpod vLLM template: https://console.runpod.io/deploy?template=pvcdqlwm9r&ref=o3idfm0n
