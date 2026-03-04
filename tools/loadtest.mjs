const URL = "http://localhost:3000/verify"

const TOTAL = 1000          // cantidad total de requests
const CONCURRENCY = 50      // cuántas en paralelo (subí a 100 si querés)
const TIMEOUT_MS = 8000

const payloads = [
  {
    prompt: "How many continents exist?",
    response: "There are 7 continents.",
    domain: "general"
  },
  {
    prompt: "What is the capital of France?",
    response: "Paris is the capital of France.",
    domain: "general"
  },
  {
    prompt: "Give me a 1 sentence summary of: The quick brown fox jumps over the lazy dog",
    response: "A fox jumps over a dog.",
    domain: "general"
  },
  {
    prompt: "What is 2+2?",
    response: "It is always 5 and this is guaranteed.",
    domain: "general"
  }
]

function pickPayload(i) {
  return payloads[i % payloads.length]
}

function percentile(sorted, p) {
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))]
}

async function oneRequest(i) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  const body = JSON.stringify(pickPayload(i))
  const t0 = performance.now()

  try {
    const res = await fetch(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: controller.signal
    })

    const text = await res.text()
    const ms = performance.now() - t0

    if (!res.ok) {
      return { ok: false, ms, status: res.status, err: text.slice(0, 200) }
    }

    // no parseamos JSON para que sea más rápido; pero podrías hacerlo si querés
    return { ok: true, ms, status: res.status }
  } catch (e) {
    const ms = performance.now() - t0
    return { ok: false, ms, status: 0, err: String(e).slice(0, 200) }
  } finally {
    clearTimeout(timer)
  }
}

async function run() {
  console.log(`Load test: TOTAL=${TOTAL}, CONCURRENCY=${CONCURRENCY}`)
  const tStart = performance.now()

  let inFlight = 0
  let sent = 0
  let done = 0

  const latOk = []
  const latAll = []
  let errors = 0
  const statusCounts = new Map()

  return await new Promise((resolve) => {
    const pump = () => {
      while (inFlight < CONCURRENCY && sent < TOTAL) {
        const i = sent++
        inFlight++

        oneRequest(i).then((r) => {
          inFlight--
          done++

          latAll.push(r.ms)
          statusCounts.set(r.status, (statusCounts.get(r.status) || 0) + 1)

          if (r.ok) latOk.push(r.ms)
          else errors++

          if (done === TOTAL) {
            const tEnd = performance.now()
            const totalMs = tEnd - tStart
            resolve({ totalMs, latOk, latAll, errors, statusCounts })
          } else {
            pump()
          }
        })
      }
    }

    pump()
  })
}

const result = await run()

result.latOk.sort((a, b) => a - b)
result.latAll.sort((a, b) => a - b)

const totalSec = result.totalMs / 1000
const rps = TOTAL / totalSec

const avg = (arr) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1)

console.log("")
console.log("=== Results ===")
console.log(`Total time: ${result.totalMs.toFixed(0)} ms (${totalSec.toFixed(2)} s)`)
console.log(`Throughput: ${rps.toFixed(2)} req/s`)
console.log(`Errors: ${result.errors}/${TOTAL}`)
console.log("Status counts:", Object.fromEntries(result.statusCounts.entries()))

console.log("")
console.log("Latency (OK requests):")
console.log(`count=${result.latOk.length}`)
console.log(`avg=${avg(result.latOk).toFixed(2)} ms`)
console.log(`p50=${percentile(result.latOk, 50).toFixed(2)} ms`)
console.log(`p95=${percentile(result.latOk, 95).toFixed(2)} ms`)
console.log(`p99=${percentile(result.latOk, 99).toFixed(2)} ms`)