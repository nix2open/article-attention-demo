import express from "express";
import cookieParser from "cookie-parser";
import multer from "multer";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createHmac, randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT || 3004);
const BASE_PATH = (process.env.BASE_PATH || "/embed-admin").replace(/\/$/, "");
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const EMBED_DIR =
  process.env.EMBED_DIR ||
  "/opt/premium-measure/public/embed/article-attention-demo-orange";
const SESSION_SECRET =
  process.env.SESSION_SECRET || process.env.EMBED_ADMIN_SECRET || "change-me";
const COOKIE_NAME = "embed_admin_session";
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

const AUTH_FILE = path.join(DATA_DIR, "auth.json");
const SECRET_FILE = path.join(DATA_DIR, "session-secret.txt");
const ARCHIVE_DIR = path.join(EMBED_DIR, "archived");
const LIVE_FILE = path.join(EMBED_DIR, "index.html");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

const app = express();
app.set("trust proxy", 1);
app.use(cookieParser());
app.use(express.json({ limit: `${MAX_UPLOAD_BYTES}b` }));

async function ensureDirs() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(EMBED_DIR, { recursive: true });
  await fs.mkdir(ARCHIVE_DIR, { recursive: true });
}

async function getSessionSecret() {
  try {
    return (await fs.readFile(SECRET_FILE, "utf8")).trim();
  } catch {
    const secret = randomBytes(32).toString("hex");
    await fs.writeFile(SECRET_FILE, secret, { mode: 0o600 });
    return secret;
  }
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}

async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = await scryptAsync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

async function readAuth() {
  try {
    const raw = await fs.readFile(AUTH_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeAuth(data) {
  await fs.writeFile(AUTH_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
}

function signSession(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifySession(token, secret) {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function setSessionCookie(res, secret) {
  const token = signSession({ exp: Date.now() + SESSION_MS, iat: Date.now() }, secret);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    maxAge: SESSION_MS,
    path: BASE_PATH || "/",
  });
}

function clearSessionCookie(res) {
  res.cookie(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    maxAge: 0,
    path: BASE_PATH || "/",
  });
}

async function requireAuth(req, res, next) {
  const secret = await getSessionSecret();
  const payload = verifySession(req.cookies?.[COOKIE_NAME], secret);
  if (!payload) {
    return res.status(401).json({ error: "Требуется вход" });
  }
  next();
}

function utcArchiveName() {
  return `index-archived-${new Date().toISOString().replace(/[:.]/g, "-")}.html`;
}

async function archiveCurrentLive() {
  try {
    await fs.access(LIVE_FILE);
  } catch {
    return null;
  }
  const archiveName = utcArchiveName();
  const archivePath = path.join(ARCHIVE_DIR, archiveName);
  await fs.copyFile(LIVE_FILE, archivePath);
  return archiveName;
}

async function listArchives() {
  try {
    const files = await fs.readdir(ARCHIVE_DIR);
    return files
      .filter((name) => name.startsWith("index-archived-") && name.endsWith(".html"))
      .sort()
      .reverse()
      .slice(0, 20);
  } catch {
    return [];
  }
}

async function liveInfo() {
  try {
    const stat = await fs.stat(LIVE_FILE);
    return { exists: true, updatedAt: stat.mtime.toISOString(), size: stat.size };
  } catch {
    return { exists: false, updatedAt: null, size: 0 };
  }
}

function validateHtml(buffer) {
  const head = buffer.slice(0, 4096).toString("utf8").trim().toLowerCase();
  return head.startsWith("<!doctype html") || head.startsWith("<html");
}

async function readLiveHtml() {
  try {
    return await fs.readFile(LIVE_FILE, "utf8");
  } catch {
    return null;
  }
}

async function publishHtml(content) {
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");
  if (buffer.length > MAX_UPLOAD_BYTES) {
    const err = new Error(`Файл больше ${MAX_UPLOAD_BYTES / (1024 * 1024)} МБ`);
    err.status = 400;
    throw err;
  }
  if (!validateHtml(buffer)) {
    const err = new Error("Файл не похож на HTML-страницу");
    err.status = 400;
    throw err;
  }
  const archivedAs = await archiveCurrentLive();
  await fs.writeFile(LIVE_FILE, buffer);
  const live = await liveInfo();
  return {
    archivedAs,
    live,
    message: archivedAs
      ? `Страница обновлена. Предыдущая версия: archived/${archivedAs}`
      : "Страница опубликована (архивировать было нечего)",
  };
}

const api = express.Router();

api.get("/auth/status", async (_req, res) => {
  const auth = await readAuth();
  const secret = await getSessionSecret();
  const session = verifySession(_req.cookies?.[COOKIE_NAME], secret);
  res.json({
    configured: Boolean(auth?.passwordHash),
    authenticated: Boolean(session),
  });
});

api.post("/auth/setup", async (req, res) => {
  const auth = await readAuth();
  if (auth?.passwordHash) {
    return res.status(409).json({ error: "Пароль уже задан. Используйте вход." });
  }
  const password = String(req.body?.password || "");
  const confirm = String(req.body?.confirm || "");
  if (password.length < 8) {
    return res.status(400).json({ error: "Пароль не короче 8 символов" });
  }
  if (password !== confirm) {
    return res.status(400).json({ error: "Пароли не совпадают" });
  }
  const passwordHash = await hashPassword(password);
  await writeAuth({
    passwordHash,
    createdAt: new Date().toISOString(),
  });
  const secret = await getSessionSecret();
  setSessionCookie(res, secret);
  res.json({ ok: true });
});

api.post("/auth/login", async (req, res) => {
  const auth = await readAuth();
  if (!auth?.passwordHash) {
    return res.status(400).json({ error: "Сначала задайте пароль на первом входе" });
  }
  const password = String(req.body?.password || "");
  const ok = await verifyPassword(password, auth.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Неверный пароль" });
  }
  const secret = await getSessionSecret();
  setSessionCookie(res, secret);
  res.json({ ok: true });
});

api.post("/auth/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

api.get("/info", requireAuth, async (_req, res) => {
  const live = await liveInfo();
  const archives = await listArchives();
  res.json({
    liveUrl: "https://measure.geniusgroup.cc/embed/article-attention-demo-orange/",
    embedDir: EMBED_DIR,
    live,
    archives,
  });
});

api.get("/download", requireAuth, async (_req, res) => {
  try {
    await fs.access(LIVE_FILE);
  } catch {
    return res.status(404).json({ error: "Актуальный файл не найден" });
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="index.html"');
  res.sendFile(LIVE_FILE);
});

api.get("/source", requireAuth, async (_req, res) => {
  const html = await readLiveHtml();
  if (html === null) {
    return res.status(404).json({ error: "Актуальный файл не найден" });
  }
  const live = await liveInfo();
  res.json({ html, live });
});

api.post("/save", requireAuth, async (req, res) => {
  const html = String(req.body?.html ?? "");
  if (!html.trim()) {
    return res.status(400).json({ error: "Пустой HTML" });
  }
  try {
    const result = await publishHtml(html);
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || "Ошибка сохранения" });
  }
});

api.post("/upload", requireAuth, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Файл не получен" });
  }
  const original = String(req.file.originalname || "").toLowerCase();
  if (!original.endsWith(".html") && req.file.mimetype !== "text/html") {
    return res.status(400).json({ error: "Нужен файл .html" });
  }
  try {
    const result = await publishHtml(req.file.buffer);
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || "Ошибка загрузки" });
  }
});

app.use(`${BASE_PATH}/api`, api);
app.use(BASE_PATH, express.static(path.join(__dirname, "public"), { index: "index.html" }));
app.get(BASE_PATH, (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

await ensureDirs();
app.listen(PORT, "127.0.0.1", () => {
  console.log(`embed-orange-admin on 127.0.0.1:${PORT}${BASE_PATH}`);
});
