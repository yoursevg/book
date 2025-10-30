import type { Express } from "express";
import type { Server } from "http";
import fs from "fs";
import path from "path";

// Development-only Vite middleware setup. This file is only dynamically imported in development.
export async function setupVite(app: Express, server: Server) {
    const [{ createServer: createViteServer, createLogger }, { default: viteConfig }] = await Promise.all([
        import("vite"),
        import("../vite.config.js"),
    ]);

    const viteLogger = createLogger();

    const serverOptions = {
        middlewareMode: true,
        hmr: { server },
        allowedHosts: true as const,
    };

    const vite = await createViteServer({
        ...viteConfig,
        configFile: false,
        customLogger: {
            ...viteLogger,
            error: (msg, options) => {
                viteLogger.error(msg, options);
                process.exit(1);
            },
        },
        server: serverOptions,
        appType: "custom",
    });

    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
        const url = req.originalUrl;

        try {
            const clientTemplate = path.resolve(
                import.meta.dirname,
                "..",
                "client",
                "index.html",
            );

            // always reload the index.html file from disk incase it changes
            let template = await fs.promises.readFile(clientTemplate, "utf-8");
            template = template.replace(
                `src="/src/main.tsx"`,
                `src="/src/main.tsx?v=${Date.now()}"`,
            );
            const page = await vite.transformIndexHtml(url, template);
            res.status(200).set({ "Content-Type": "text/html" }).end(page);
        } catch (e) {
            vite.ssrFixStacktrace(e as Error);
            next(e);
        }
    });
}
