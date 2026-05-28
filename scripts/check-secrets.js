import { execFileSync } from "node:child_process"
import fs from "node:fs"

const trackedFiles = execFileSync("git", ["ls-files"], {
  encoding: "utf8"
})
  .split(/\r?\n/)
  .filter(Boolean)

const allowedEnvValues = new Set([
  "",
  "change-me",
  "YOUR_API_KEY",
  "YOUR_ADMIN_TOKEN",
  "YOUR_BASE_USDC_TX_HASH",
  "local-test-signing-secret",
  "test-admin-token",
  "0x...",
  "https://..."
])

const secretNamePattern =
  /(?:SECRET|TOKEN|PASSWORD|PRIVATE_KEY|API_KEY|ADMIN_TOKEN|SIGNING_SECRET|BASE_RPC_URL)/i

const tokenPatterns = [
  {
    name: "private key block",
    pattern: /-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/
  },
  {
    name: "OpenAI key",
    pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/
  },
  {
    name: "GitHub token",
    pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b/
  },
  {
    name: "GitHub fine-grained token",
    pattern: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/
  },
  {
    name: "AWS access key",
    pattern: /\bAKIA[0-9A-Z]{16}\b/
  }
]

function isAllowedPlaceholder(value) {
  const trimmed = value.trim().replace(/^['"]|['"]$/g, "")
  if (allowedEnvValues.has(trimmed)) return true
  if (trimmed.startsWith("YOUR_")) return true
  if (trimmed.endsWith("...")) return true
  if (trimmed === "true" || trimmed === "false") return true
  return false
}

function scanEnvAssignment(file, line, lineNumber, findings) {
  const match = line.match(/^\s*([A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PRIVATE_KEY|API_KEY|ADMIN_TOKEN|SIGNING_SECRET|BASE_RPC_URL)[A-Z0-9_]*)\s*=\s*(.*)$/)
  if (!match) return

  const [, name, rawValue] = match
  const value = rawValue.trim()
  if (!secretNamePattern.test(name)) return
  if (isAllowedPlaceholder(value)) return

  findings.push({
    file,
    lineNumber,
    type: "non-placeholder secret-like env assignment",
    sample: `${name}=<redacted>`
  })
}

const findings = []

for (const file of trackedFiles) {
  if (file === ".env.example") {
    // Still scan explicit token patterns, but allow empty env declarations below.
  }

  const text = fs.readFileSync(file, "utf8")

  for (const { name, pattern } of tokenPatterns) {
    const match = text.match(pattern)
    if (match) {
      findings.push({
        file,
        lineNumber: text.slice(0, match.index).split(/\r?\n/).length,
        type: name,
        sample: "<redacted>"
      })
    }
  }

  text.split(/\r?\n/).forEach((line, index) => {
    scanEnvAssignment(file, line, index + 1, findings)
  })
}

if (findings.length > 0) {
  console.error("SECRET CHECK FAILED")
  for (const finding of findings) {
    console.error(
      `[${finding.type}] ${finding.file}:${finding.lineNumber} ${finding.sample}`
    )
  }
  process.exit(1)
}

console.log(`SECRET CHECK OK (${trackedFiles.length} tracked files scanned)`)
