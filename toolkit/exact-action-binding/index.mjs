import { createHash } from "node:crypto";

export class ActionBindingError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ActionBindingError";
    this.code = code;
  }
}

function normalizeJson(value, path = "$") {
  if (value === null) return null;

  switch (typeof value) {
    case "string":
    case "boolean":
      return value;
    case "number":
      if (!Number.isFinite(value)) {
        throw new ActionBindingError("non_finite_number", `Non-finite number at ${path}`);
      }
      return Object.is(value, -0) ? 0 : value;
    case "object": {
      if (Array.isArray(value)) {
        return value.map((item, index) => normalizeJson(item, `${path}[${index}]`));
      }

      const prototype = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== null) {
        throw new ActionBindingError("non_plain_object", `Only plain JSON objects are supported at ${path}`);
      }

      const output = {};
      for (const key of Object.keys(value).sort()) {
        const item = value[key];
        if (item === undefined) {
          throw new ActionBindingError("undefined_value", `Undefined value at ${path}.${key}`);
        }
        output[key] = normalizeJson(item, `${path}.${key}`);
      }
      return output;
    }
    default:
      throw new ActionBindingError("unsupported_value", `Unsupported ${typeof value} value at ${path}`);
  }
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(normalizeJson(value));
}

export function snapshotJson(value) {
  return deepFreeze(normalizeJson(value));
}

export function actionDigest(action, { namespace = "interai.public-action-binding/v1" } = {}) {
  if (typeof namespace !== "string" || namespace.length === 0) {
    throw new ActionBindingError("invalid_namespace", "A non-empty binding namespace is required");
  }

  const payload = `${namespace}\n${canonicalJson(action)}`;
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

export function createActionBinding(action, options = {}) {
  const namespace = options.namespace ?? "interai.public-action-binding/v1";
  return Object.freeze({
    binding_schema: "interai-public-action-binding/v1",
    namespace,
    digest_alg: "sha256",
    digest: actionDigest(action, { namespace }),
  });
}

export function assertActionMatches(binding, action) {
  if (!binding || binding.binding_schema !== "interai-public-action-binding/v1") {
    throw new ActionBindingError("invalid_binding", "Unsupported or missing action binding");
  }
  if (binding.digest_alg !== "sha256" || typeof binding.digest !== "string") {
    throw new ActionBindingError("invalid_binding", "Malformed action binding");
  }

  const actual = actionDigest(action, { namespace: binding.namespace });
  if (actual !== binding.digest) {
    throw new ActionBindingError(
      "action_binding_mismatch",
      "The action changed after the binding was created; obtain a new decision before execution",
    );
  }
  return true;
}
