import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "saidkhan2026";
const DATA_FILE = path.join(__dirname, "data", "site.js");
const DATA_JSON = path.join(__dirname, "data", "site.json");
const BACKUP_DIR = path.join(__dirname, "data", "backups");
const UPLOAD_DIR = path.join(__dirname, "assets", "images", "uploads");

// Ensure directories exist
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// MIME types dictionary
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".ico": "image/x-icon"
};

// Session tokens with disk persistence
const SESSIONS_FILE = path.join(BACKUP_DIR, "sessions.json");
const activeSessions = new Set(["saidkhan-master-token"]);

try {
  if (fs.existsSync(SESSIONS_FILE)) {
    const saved = JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8"));
    if (Array.isArray(saved)) saved.forEach(t => activeSessions.add(t));
  }
} catch (e) {}

function persistSessions() {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify([...activeSessions]), "utf-8");
  } catch (e) {}
}

// Helper: parse JSON body
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 50 * 1024 * 1024) { // 50MB limit
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

// Helper: parse raw multipart/base64 body
function parseRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

// Extract APP.data from data/site.js
function getSiteData() {
  if (fs.existsSync(DATA_JSON)) {
    try {
      return JSON.parse(fs.readFileSync(DATA_JSON, "utf-8"));
    } catch (e) {}
  }
  const content = fs.readFileSync(DATA_FILE, "utf-8");
  // Clean evaluate in sandbox
  const match = content.match(/APP\.data\s*=\s*(\{[\s\S]*\});?\s*$/);
  if (match) {
    const fn = new Function(`return ${match[1]};`);
    return fn();
  }
  throw new Error("Unable to parse APP.data from site.js");
}

// Write back to data/site.js and site.json with backup
function saveSiteData(data) {
  // 1. Create timestamped backup
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(BACKUP_DIR, `site-${timestamp}.js`);
  if (fs.existsSync(DATA_FILE)) {
    fs.copyFileSync(DATA_FILE, backupFile);
  }

  // 2. Format JS file
  const jsContent = `APP.data = ${JSON.stringify(data, null, 2)};\n`;
  fs.writeFileSync(DATA_FILE, jsContent, "utf-8");

  // 3. Keep mirrored JSON
  fs.writeFileSync(DATA_JSON, JSON.stringify(data, null, 2), "utf-8");

  return { backup: `data/backups/site-${timestamp}.js` };
}

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(urlObj.pathname);

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // --- API ROUTES ---

  // Auth: POST /api/auth
  if (pathname === "/api/auth" && req.method === "POST") {
    try {
      const { password } = await parseJsonBody(req);
      if (password === ADMIN_PASSWORD) {
        const token = `token-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        activeSessions.add(token);
        persistSessions();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, token, user: "Said Khan" }));
      } else {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "ভুল পাসওয়ার্ড! সঠিক পাসওয়ার্ড দিন।" }));
      }
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // Data: GET /api/data
  if (pathname === "/api/data" && req.method === "GET") {
    try {
      const data = getSiteData();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, data }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // Save: POST /api/save
  if (pathname === "/api/save" && req.method === "POST") {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace(/^Bearer\s+/, "");
    if (!token || !activeSessions.has(token)) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: "Unauthorized session. Please login again." }));
      return;
    }

    try {
      const { data } = await parseJsonBody(req);
      if (!data) throw new Error("No data provided");
      const result = saveSiteData(data);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, message: "ডেটা সফলভাবে ফাইলে সেভ এবং সিঙ্ক হয়েছে!", backup: result.backup }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // Upload: POST /api/upload
  if (pathname === "/api/upload" && req.method === "POST") {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace(/^Bearer\s+/, "");
    if (!token || !activeSessions.has(token)) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: "Unauthorized" }));
      return;
    }

    try {
      const { fileName, base64Data } = await parseJsonBody(req);
      if (!fileName || !base64Data) throw new Error("Missing fileName or base64Data");
      
      const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9_.-]/g, "_")}`;
      const filePath = path.join(UPLOAD_DIR, safeName);
      const buffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ""), "base64");
      
      fs.writeFileSync(filePath, buffer);
      const relativeUrl = `assets/images/uploads/${safeName}`;

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, url: relativeUrl, fileName: safeName }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // --- STATIC FILE SERVING ---
  let filePath = path.join(__dirname, pathname === "/" ? "index.html" : pathname);

  // Handle nested asset paths (e.g. /press/css/style.css -> /css/style.css)
  const assetMatch = pathname.match(/\/(css|js|libs|assets|data)\/(.+)$/);
  if (assetMatch) {
    const directAssetPath = path.join(__dirname, assetMatch[1], assetMatch[2]);
    if (fs.existsSync(directAssetPath)) {
      filePath = directAssetPath;
    }
  }

  // Alias /admin to /admin.html
  if (pathname === "/admin" || pathname === "/admin/") {
    filePath = path.join(__dirname, "admin.html");
  }

  // Security check: stay within root
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // SPA Fallback: If route has no file extension and is not an API call, serve index.html
      const hasExt = path.extname(pathname) !== "";
      if (!hasExt && !pathname.startsWith("/api/")) {
        const indexPath = path.join(__dirname, "index.html");
        fs.stat(indexPath, (idxErr, idxStats) => {
          if (idxErr || !idxStats.isFile()) {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("404 Not Found");
            return;
          }
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Content-Length": idxStats.size });
          fs.createReadStream(indexPath).pipe(res);
        });
        return;
      }

      // 404 fallback
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    // Cache control: no-cache for scripts, stylesheets, data, and html so edits appear instantly
    if (ext === ".html" || ext === ".js" || ext === ".mjs" || ext === ".css" || ext === ".json" || pathname.startsWith("/data/")) {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    } else {
      res.setHeader("Cache-Control", "public, max-age=3600");
    }

    res.writeHead(200, { "Content-Type": contentType, "Content-Length": stats.size });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`[Said Khan Studio] Backendless Server running at http://localhost:${PORT}`);
  console.log(`[Said Khan Studio] Live 3D Portfolio: http://localhost:${PORT}/`);
  console.log(`[Said Khan Studio] Visual Admin Panel: http://localhost:${PORT}/admin`);
});
