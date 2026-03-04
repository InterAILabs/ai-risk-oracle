export function countAbsoluteClaims(text) {
    const patterns = ["always", "never", "impossible", "guaranteed", "everyone", "no one"];
    const lower = text.toLowerCase();
    return patterns.reduce((count, word) => {
        if (lower.includes(word))
            return count + 1;
        return count;
    }, 0);
}
export function looksLikeMathPrompt(prompt) {
    return /[\+\-\*\/=]/.test(prompt) || /\d/.test(prompt);
}
export function responseHasNumber(response) {
    return /\d/.test(response);
}
export function detectNumericalConflict(prompt, response) {
    const numbersPrompt = prompt.match(/\d+/g) ?? [];
    const numbersResp = response.match(/\d+/g) ?? [];
    // Si es un prompt matemático (operación), no marcamos conflicto por "no repetir números"
    // Ej: "2+2" -> respuesta "4" es válida aunque no repita "2"
    const looksMath = /[\+\-\*\/=]/.test(prompt);
    if (looksMath)
        return false;
    // Si el prompt no tiene números, no hay conflicto
    if (numbersPrompt.length === 0)
        return false;
    // Heurística original: si el prompt trae números y la respuesta no los menciona, posible conflicto
    for (const n of numbersPrompt) {
        if (!numbersResp.includes(n))
            return true;
    }
    return false;
}
export function promptResponseAlignment(prompt, response) {
    const promptWords = new Set(prompt.toLowerCase().split(/\W+/).filter(Boolean));
    const respWords = response.toLowerCase().split(/\W+/).filter(Boolean);
    let matches = 0;
    for (const w of respWords) {
        if (promptWords.has(w))
            matches++;
    }
    return matches / (respWords.length || 1);
}
