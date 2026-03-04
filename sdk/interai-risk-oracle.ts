export type VerifyResult = any

export async function quote(baseUrl: string, prompt: string, response: string) {
  const r = await fetch(`${baseUrl}/quote`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt, response, mode: "fast" })
  })
  if (!r.ok) throw new Error(`quote failed: ${r.status} ${await r.text()}`)
  return r.json()
}

export async function verify(baseUrl: string, paymentRef: string, prompt: string, response: string) {
  const r = await fetch(`${baseUrl}/verify`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Payment-Ref": paymentRef
    },
    body: JSON.stringify({ prompt, response, domain: "general" })
  })
  const txt = await r.text()
  let j: any
  try { j = JSON.parse(txt) } catch { j = { raw: txt } }
  if (!r.ok) throw new Error(`verify failed: ${r.status} ${JSON.stringify(j)}`)
  return j as VerifyResult
}