import { countAbsoluteClaims, detectNumericalConflict, promptResponseAlignment, looksLikeMathPrompt, responseHasNumber } from "./heuristics.js";
export function scoreResponse(input) {
    const { prompt, response } = input;
    const t0 = performance.now();
    const alignment = promptResponseAlignment(prompt, response);
    let adjustedAlignment = alignment;
    if (looksLikeMathPrompt(prompt) && responseHasNumber(response)) {
        adjustedAlignment = Math.max(adjustedAlignment, 0.6);
    }
    const absoluteClaims = countAbsoluteClaims(response);
    const numericalConflict = detectNumericalConflict(prompt, response);
    let consistency = adjustedAlignment;
    if (numericalConflict)
        consistency -= 0.2;
    if (absoluteClaims > 2)
        consistency -= 0.1;
    consistency = Math.max(0, Math.min(1, consistency));
    const hallucinationRisk = 1 - consistency;
    let riskLevel = "low";
    if (hallucinationRisk > 0.6)
        riskLevel = "high";
    else if (hallucinationRisk > 0.3)
        riskLevel = "medium";
    let action = "accept";
    if (riskLevel === "medium")
        action = "review";
    if (riskLevel === "high")
        action = "reject";
    const latencyMs = Math.round(performance.now() - t0);
    return {
        consistency_score: Number(consistency.toFixed(2)),
        hallucination_risk: Number(hallucinationRisk.toFixed(2)),
        risk_level: riskLevel,
        recommended_action: action,
        analysis: {
            prompt_response_alignment: Number(alignment.toFixed(2)),
            prompt_response_alignment_adjusted: Number(adjustedAlignment.toFixed(2)),
            contradictions_detected: false,
            numerical_conflicts: numericalConflict,
            absolute_claims: absoluteClaims,
            latency_ms: latencyMs,
            engine_latency_ms: latencyMs,
            total_latency_ms: latencyMs,
            engine_version: "0.0.1"
        }
    };
}
