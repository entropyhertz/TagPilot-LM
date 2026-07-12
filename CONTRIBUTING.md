# Contributing

Contributions are welcome. Keep changes focused and preserve the project's safety and attribution boundaries.

- Preserve the single-file application architecture unless a split has a clear, reviewed justification.
- Keep Windows same-machine documentation before optional LAN, macOS, and Linux workflows.
- Preserve upstream attribution and the original MIT `LICENSE` file exactly.
- Do not commit private LAN addresses, tokens, API keys, datasets, generated captions, browser state, or local paths.
- Distinguish mocked tests from real LM Studio tests in code, pull requests, and documentation.
- Test with at least one vision-capable local model when possible, but never claim hardware coverage that was not performed.
- Do not hardcode identity trigger tokens.
- Preserve the separation between tagging output, captioning output, and trigger insertion during export.
- Keep tagging and captioning prompts and provider defaults separate.
- Add regression coverage for connection-mode, validation, readiness, or batch changes.

Run the no-install regression suite with:

```bash
node --test tests/prompt-settings.test.mjs
```
