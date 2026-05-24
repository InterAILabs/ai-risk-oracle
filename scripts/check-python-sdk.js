import { execFileSync } from "node:child_process"

const candidates =
  process.platform === "win32"
    ? [
        ["py", ["-3"]],
        ["python", []],
        ["python3", []]
      ]
    : [
        ["python3", []],
        ["python", []]
      ]

function findPython() {
  for (const [bin, prefixArgs] of candidates) {
    try {
      execFileSync(bin, [...prefixArgs, "--version"], { stdio: "ignore" })
      return { bin, prefixArgs }
    } catch {
      // Try the next common Python launcher.
    }
  }
  return null
}

function run(args) {
  const python = findPython()
  if (!python) {
    console.log("[SKIP] Python SDK check skipped because Python is not installed")
    return false
  }

  execFileSync(python.bin, [...python.prefixArgs, ...args], {
    stdio: "inherit",
    env: {
      ...process.env,
      PYTHONPATH: "python"
    }
  })
  return true
}

if (run(["-m", "compileall", "-q", "python", "examples/python_basic_agent.py"])) {
  run(["examples/python_basic_agent.py"])

  console.log("[OK] python SDK compiles and handles live x402 payment requirements")
}
