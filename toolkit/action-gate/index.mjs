import { assertActionMatches, createActionBinding, snapshotJson } from "../exact-action-binding/index.mjs";

const AUTHORITY_FIELDS = ["recommended_action", "policy_result", "final_decision", "decision"];
const KNOWN_DECISIONS = new Set(["allow", "review_required", "block"]);

export class GateClosedError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = "GateClosedError";
    this.code = code;
  }
}

export function readAuthorityDecision(response) {
  if (!response || typeof response !== "object") {
    throw new GateClosedError("invalid_decision_response", "Decision provider returned a non-object response");
  }

  const values = [];
  for (const field of AUTHORITY_FIELDS) {
    if (response[field] == null) continue;
    if (typeof response[field] !== "string") {
      throw new GateClosedError("invalid_decision_response", `${field} must be a string`);
    }
    const normalized = response[field].toLowerCase();
    if (!KNOWN_DECISIONS.has(normalized)) {
      throw new GateClosedError("unknown_decision", `Unknown authority decision in ${field}`);
    }
    values.push(normalized);
  }

  if (values.length === 0) {
    throw new GateClosedError("missing_decision", "No authority decision field was present");
  }

  if (new Set(values).size !== 1) {
    throw new GateClosedError("conflicting_decisions", "Authority decision fields disagree");
  }

  return values[0];
}

async function callWithTimeout(decide, actionSnapshot, binding, timeoutMs) {
  const controller = new AbortController();
  let timeout;
  try {
    const timeoutPromise = new Promise((_, reject) => {
      timeout = setTimeout(() => {
        controller.abort();
        reject(new GateClosedError("decision_timeout", `Decision provider exceeded ${timeoutMs} ms`));
      }, timeoutMs);
    });

    return await Promise.race([
      Promise.resolve().then(() => decide(actionSnapshot, { binding, signal: controller.signal })),
      timeoutPromise,
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

export async function runActionGate({ action, decide, execute, timeoutMs = 5000 }) {
  if (typeof decide !== "function" || typeof execute !== "function") {
    throw new TypeError("runActionGate requires decide and execute functions");
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new TypeError("timeoutMs must be a positive finite number");
  }

  const actionSnapshot = snapshotJson(action);
  const binding = createActionBinding(actionSnapshot);

  let response;
  try {
    response = await callWithTimeout(decide, actionSnapshot, binding, timeoutMs);
  } catch (error) {
    if (error instanceof GateClosedError) throw error;
    throw new GateClosedError("decision_provider_failed", "Decision provider failed; execution remains closed", {
      cause: error,
    });
  }

  const decision = readAuthorityDecision(response);
  if (decision !== "allow") {
    return Object.freeze({ executed: false, decision, binding, decision_response: response });
  }

  try {
    assertActionMatches(binding, action);
  } catch (error) {
    throw new GateClosedError("action_changed", "Action changed after decision; execution remains closed", {
      cause: error,
    });
  }

  const execution_result = await execute(actionSnapshot, { binding, decision_response: response });
  return Object.freeze({ executed: true, decision, binding, decision_response: response, execution_result });
}
