const base = process.env.BASE_URL || "https://ai-risk-oracle.fly.dev";

async function main() {
  const r = await fetch(`${base}/health`);
  const t = await r.text();
  if (!r.ok) {
    console.error("health failed", r.status, t);
    process.exit(1);
  }
  console.log("health ok", r.status, t);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});