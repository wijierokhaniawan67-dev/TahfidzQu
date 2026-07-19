import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;
const CONFIG_PATH = path.join(process.cwd(), "database-config.json");

app.use(express.json());

// Helper to read database config
function readConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading database config:", error);
  }
  return { spreadsheetId: "", appsScriptUrl: "", googleAccessToken: "" };
}

// Helper to write database config
function writeConfig(config: { spreadsheetId: string; appsScriptUrl: string; googleAccessToken?: string }) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
    return true;
  } catch (error) {
    console.error("Error writing database config:", error);
    return false;
  }
}

// API Routes
app.get("/api/config", (req, res) => {
  const config = readConfig();
  res.json(config);
});

app.post("/api/config", (req, res) => {
  const { spreadsheetId, appsScriptUrl, googleAccessToken } = req.body;
  if (typeof spreadsheetId !== "string") {
    res.status(400).json({ error: "Invalid spreadsheetId" });
    return;
  }
  const urlVal = typeof appsScriptUrl === "string" ? appsScriptUrl : "";
  const tokenVal = typeof googleAccessToken === "string" ? googleAccessToken : "";
  const success = writeConfig({ spreadsheetId, appsScriptUrl: urlVal, googleAccessToken: tokenVal });
  if (success) {
    res.json({ status: "success", spreadsheetId, appsScriptUrl: urlVal, googleAccessToken: tokenVal });
  } else {
    res.status(500).json({ error: "Failed to save configuration" });
  }
});

// Proxy Google Apps Script requests to bypass CORS
app.post("/api/apps-script", async (req, res) => {
  const { appsScriptUrl, action, payload } = req.body;
  if (!appsScriptUrl) {
    res.status(400).json({ status: "error", message: "Apps Script URL is required" });
    return;
  }

  try {
    const url = new URL(appsScriptUrl);
    url.searchParams.set("action", action);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      res.status(response.status).json({
        status: "error",
        message: `Google Apps Script returned status ${response.status}: ${response.statusText}`,
      });
      return;
    }

    const text = await response.text();
    try {
      if (text.trim().startsWith("<!DOCTYPE") || text.trim().toLowerCase().startsWith("<html")) {
        res.json({
          status: "error",
          message: "Menerima respons HTML dari Google Apps Script. Pastikan Web App Anda sudah dideploy sebagai 'Anyone' (Siapa saja) dan Anda telah menyetujui izin akses.",
        });
        return;
      }
      const data = JSON.parse(text);
      res.json(data);
    } catch (parseError) {
      res.json({ status: "success", data: text });
    }
  } catch (err: any) {
    console.error("Apps Script Proxy Error:", err);
    res.status(500).json({ status: "error", message: err.message || "Failed to fetch from Google Apps Script" });
  }
});

// Proxy Google Sheets API requests to bypass CORS and iframe restrictions
app.all("/api/sheets-proxy/*", async (req, res) => {
  const targetPath = req.path.substring("/api/sheets-proxy".length);
  const queryStr = req.url.split("?")[1] || "";
  const targetUrl = `https://sheets.googleapis.com/v4/spreadsheets${targetPath}${queryStr ? "?" + queryStr : ""}`;

  const headers: Record<string, string> = {};
  if (req.headers.authorization) {
    headers["Authorization"] = req.headers.authorization as string;
  }
  if (req.headers["content-type"]) {
    headers["Content-Type"] = req.headers["content-type"] as string;
  }

  try {
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: headers,
    };

    if (!["GET", "HEAD"].includes(req.method)) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);

    res.status(response.status);
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      res.json(data);
    } else {
      const text = await response.text();
      res.send(text);
    }
  } catch (err: any) {
    console.error("Sheets Proxy Error:", err);
    res.status(500).json({ error: err.message || "Failed to proxy request to Google Sheets API" });
  }
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
