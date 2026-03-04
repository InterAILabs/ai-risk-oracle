export async function healthRoute(app) {
    app.get("/health", async () => {
        return { ok: true, service: "ai-risk-oracle", version: "0.0.1" };
    });
}
