import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"

const npmBin = process.platform === "win32" ? "npm.cmd" : "npm"

function check(condition, message) {
  assert.ok(condition, message)
  console.log(`[OK] ${message}`)
}

function hasFile(files, path) {
  return files.includes(path) || files.includes(`package/${path}`)
}

function main() {
  const raw = execFileSync(npmBin, ["pack", "--dry-run", "--json"], {
    encoding: "utf8",
    shell: process.platform === "win32"
  })
  const [pack] = JSON.parse(raw)
  const files = pack.files.map((file) => file.path)

  const requiredFiles = [
    "package.json",
    "README.md",
    "docs/quickstart.md",
    "docs/api-reference.md",
    "docs/release-checklist.md",
    "dist/sdk/interai-risk-oracle.js",
    "dist/sdk/interai-risk-oracle.d.ts"
  ]

  for (const file of requiredFiles) {
    check(hasFile(files, file), `package includes ${file}`)
  }

  const forbiddenPatterns = [
    /^(package\/)?\.env$/,
    /^(package\/)?\.env\./,
    /^(package\/)?data\.db/,
    /^(package\/)?.*\.log$/,
    /^(package\/)?node_modules\//,
    /^(package\/)?tests\//,
    /^(package\/)?testdata\//,
    /^(package\/)?server\.(out|err)\.log$/
  ]

  const forbiddenFiles = files.filter((file) =>
    forbiddenPatterns.some((pattern) => pattern.test(file))
  )

  check(forbiddenFiles.length === 0, `package excludes unsafe local files`)

  check(pack.size > 0, "package has non-zero tarball size")
  check(pack.unpackedSize > 0, "package has non-zero unpacked size")

  console.log(`PACKAGE CHECK OK (${files.length} files, ${pack.size} bytes packed)`)
}

main()
