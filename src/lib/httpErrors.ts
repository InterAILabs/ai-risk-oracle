export function economicError(
  error: string,
  extra?: Record<string, unknown>
) {
  return {
    ok: false,
    error,
    ...(extra || {})
  }
}