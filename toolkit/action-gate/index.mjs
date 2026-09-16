import { assertActionMatches, createActionBinding, snapshotJson } from "../exact-action-binding/index.mjs";

const KNOWN_DECISIONS = new Set(["allow", "review_required", "block"]);

export class GateClosedError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = "GateClosedError";
    this.code = code;
  }
}

function readRequiredDecisionField(response, field) {
  if (!(field in response)) {
    throw new GateClosedError("missing_decision", `Required authority field ${field} is missing`);
  }
  if (typeof response[field] !== "string") {
    throw new GateClosedError("invalid_decision_response", `${field} must be a string`);
  }

  const normalized = response[field].toLowerCase();
  if (!KNOWN_DECISIONS.has(normalized)) {
    throw new GateClosedError("unknown_decision", `Unknown authority decision in ${field}`);
  }
  return normalized;
}

export function readAuthorityDecision(response) {
  if (!response || typeof response !== "object" || Array.isArray(response)) {
    throw new GateClosedError("invalid_decision_response", "Decision provider returned a non-object response");
  }

  const recommendedAction = readRequiredDecisionField(response, "recommended_action");
  const policyResult = readRequiredDecisionField(response, "policy_result");

  if (recommendedAction !== policyResult) {
    throw new GateClosedError("conflicting_decisions", "recommended_action and policy_result disagree");
  }

  return recommendedAction;
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
