import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const toolkitRoot = new URL("./", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("sources.json", toolkitRoot), "utf8"));

function gitBlobSha(buffer) {
  const header = Buffer.from(`blob ${buffer.length}\0`, "utf8");
  return createHash("sha1").update(header).update(buffer).digest("hex");
}

let failures = 0;

for (const [toolName, tool] of Object.entries(manifest.tools ?? {})) {
  if (typeof tool.canonical_repository !== "string" || typeof tool.canonical_commit !== "string") {
    console.error(`[${toolName}] missing canonical repository or commit`);
    failures += 1;
    continue;
  }

  for (const [relativePath, expectedBlob] of Object.entries(tool.hub_files ?? {})) {
    const file = new URL(relativePath, toolkitRoot);
    const content = await readFile(file);
    const actualBlob = gitBlobSha(content);
    if (actualBlob !== expectedBlob) {
      console.error(
        `[${toolName}] compatibility snapshot drift: ${relativePath}\n` +
          `  expected ${expectedBlob}\n` +
          `  actual   ${actualBlob}\n` +
          `Synchronize from ${tool.canonical_repository}@${tool.canonical_commit} and update toolkit/sources.json deliberately.`,
      );
      failures += 1;
    }
  }
}

if (failures > 0) process.exit(1);
console.log("Toolkit compatibility snapshot provenance OK");
