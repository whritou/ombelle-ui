# Pinned upstream registry contract

These are unmodified published shadcn registry JSON Schemas downloaded on
2026-11-15, plus the eight `PRESET_STYLES` values exported by the previously
pinned `shadcn@4.22.1`. `provenance.json` records sources and SHA-256 hashes of
UTF-8 content with LF line endings. The upstream MIT license is included.

Ajv validates the actual upstream schemas, independently of Ombelle's generated
registry output. The helper normalizes the draft-07 HTTPS meta-schema identifier
to Ajv's canonical HTTP alias and allows conditional required properties defined
in a parent schema; neither adaptation changes validation semantics.

Refresh these files deliberately from their recorded sources, review upstream
contract changes, and update their hashes. No tests fetch schemas at runtime.

The loopback registry test covers schema conformance, exact source/theme bytes
and malformed payload rejection. Genuine shadcn Vite/Next fixture tests and the
consumer builds cover installed-source compatibility. The vulnerable upstream
installer implementation is no longer executed or installed in this workspace.
