import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import path from "path";
import dotenv from "dotenv";

const ENV = process.env.NODE_ENV || "development";
dotenv.config({ path: path.resolve(__dirname, "../env", `.env.${ENV}`) });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const PORT = parseInt(process.env.NODE_SERVER_PORT || "4000", 10);
const SHELL_SERVICES_URL =
  process.env.SHELL_SERVICES_URL || "http://localhost:8000";

// Proxy /api/auth/* -> shell-services
// Express strips the mount path in req.url, so we re-prepend /api/auth.
app.use(
  "/api/auth",
  createProxyMiddleware({
    target: SHELL_SERVICES_URL,
    changeOrigin: true,
    pathRewrite: (path) => `/api/auth${path}`,
    on: {
      error: (_err: Error, _req: express.Request, res: express.Response) => {
        (res as express.Response)
          .status(502)
          .json({ error: "Auth service unavailable" });
      },
    },
  }),
);

// Proxy /api/payments/* → shell-services
app.use(
  "/api/payments",
  createProxyMiddleware({
    target: SHELL_SERVICES_URL,
    changeOrigin: true,
    pathRewrite: (path) => `/api/payments${path}`,
    on: {
      error: (_err: Error, _req: express.Request, res: express.Response) => {
        (res as express.Response)
          .status(502)
          .json({ error: "Payments service unavailable" });
      },
    },
  }),
);

// Proxy /api/jobs/* → jobs-services (jobs MFE runs inside shell)
const JOBS_SERVICES_URL =
  process.env.JOBS_SERVICES_URL || "http://localhost:8001";
app.use(
  "/api/jobs",
  createProxyMiddleware({
    target: JOBS_SERVICES_URL,
    changeOrigin: true,
    pathRewrite: (path) => `/api/jobs${path}`,
    on: {
      error: (_err: Error, _req: express.Request, res: express.Response) => {
        (res as express.Response)
          .status(502)
          .json({ error: "Jobs service unavailable" });
      },
    },
  }),
);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "matchdb-shell-ui-server",
    port: PORT,
    authService: SHELL_SERVICES_URL,
  });
});

// Serve static files from webpack build
const distPath = path.resolve(__dirname, "../dist");
app.use(express.static(distPath));

// SPA fallback — serve index.html for all non-API routes
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(
    `[matchdb-shell-ui] Node server running on port ${PORT} (${ENV})`,
  );
  console.log(
    `[matchdb-shell-ui] Proxying /api/auth + /api/payments → ${SHELL_SERVICES_URL}`,
  );
  console.log(`[matchdb-shell-ui] Proxying /api/jobs → ${JOBS_SERVICES_URL}`);
  console.log(`[matchdb-shell-ui] Serving static files from ${distPath}`);
});
