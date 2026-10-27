// Generated from schemas/preset-snapshot.schema.json; do not edit independently.
export const presetSnapshotSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://ui.example.com/schemas/preset-snapshot-1.0.json",
  "title": "Immutable Preset Snapshot Version 1",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "snapshotVersion",
    "id",
    "revision",
    "preset",
    "presetHash",
    "catalogRelease",
    "compilerVersion",
    "createdAt",
    "validationStatus"
  ],
  "properties": {
    "snapshotVersion": {
      "const": "1.0"
    },
    "id": {
      "type": "string",
      "minLength": 35,
      "maxLength": 35,
      "pattern": "^ps_[0-9a-f]{32}$"
    },
    "revision": {
      "const": 1
    },
    "preset": {
      "$ref": "https://ui.example.com/schemas/preset-1.0.json"
    },
    "presetHash": {
      "type": "string",
      "minLength": 64,
      "maxLength": 64,
      "pattern": "^[0-9a-f]{64}$"
    },
    "catalogRelease": {
      "const": "0.1.0"
    },
    "compilerVersion": {
      "const": "0.1.0"
    },
    "createdAt": {
      "type": "string",
      "minLength": 24,
      "maxLength": 24,
      "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$"
    },
    "validationStatus": {
      "const": "draft"
    }
  }
} as const
