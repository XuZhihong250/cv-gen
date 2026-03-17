const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const publicDir = path.join(__dirname, "public");
const args = process.argv.slice(2);
const templateArg = args.find((item) => item.startsWith("--template="));
const allowedTemplates = new Set(["classic", "creative", "minimal"]);
const defaultTemplate = templateArg ? templateArg.split("=")[1] : "minimal";
const normalizedTemplate = allowedTemplates.has(defaultTemplate) ? defaultTemplate : "minimal";
const portArg = args.find((item) => item.startsWith("--port="));
const port = Number(portArg ? portArg.split("=")[1] : process.env.PORT || 3000);
const dataDir = path.join(__dirname, "data");
const defaultDraftFile = path.join(dataDir, "default.json");
const templateSettingsFile = path.join(dataDir, "template.json");
let currentTemplate = normalizedTemplate;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function sendFile(reqPath, res) {
  const safePath = reqPath === "/" ? "/index.html" : reqPath;
  const filePath = path.normalize(path.join(publicDir, safePath));
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    let payload = data;
    if (ext === ".html") {
      payload = Buffer.from(data.toString("utf-8").replace("__DEFAULT_TEMPLATE__", currentTemplate), "utf-8");
    }
    res.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Cache-Control": "no-cache"
    });
    res.end(payload);
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-cache" });
  res.end(JSON.stringify(payload));
}

function ensureTemplateSettings() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(templateSettingsFile)) {
    const initial = { template: normalizedTemplate, updatedAt: Date.now() };
    fs.writeFileSync(templateSettingsFile, JSON.stringify(initial, null, 2));
    currentTemplate = normalizedTemplate;
    return;
  }
  try {
    const raw = fs.readFileSync(templateSettingsFile, "utf-8");
    const parsed = JSON.parse(raw);
    const t = parsed && typeof parsed.template === "string" ? parsed.template : "";
    currentTemplate = allowedTemplates.has(t) ? t : normalizedTemplate;
  } catch {
    const fallback = { template: normalizedTemplate, updatedAt: Date.now() };
    fs.writeFileSync(templateSettingsFile, JSON.stringify(fallback, null, 2));
    currentTemplate = normalizedTemplate;
  }
}

function handleTemplateApi(req, res) {
  if (req.method === "GET") {
    sendJson(res, 200, { templates: Array.from(allowedTemplates), current: currentTemplate });
    return;
  }

  if (req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        const parsed = JSON.parse(body || "{}");
        const next = parsed && typeof parsed.template === "string" ? parsed.template : "";
        if (!allowedTemplates.has(next)) {
          sendJson(res, 400, { message: "invalid_template" });
          return;
        }
        currentTemplate = next;
        fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFile(templateSettingsFile, JSON.stringify({ template: next, updatedAt: Date.now() }, null, 2), (err) => {
          if (err) {
            sendJson(res, 500, { message: "template_save_failed" });
            return;
          }
          sendJson(res, 200, { message: "template_saved", current: currentTemplate });
        });
      } catch {
        sendJson(res, 400, { message: "invalid_json" });
      }
    });
    return;
  }

  sendJson(res, 405, { message: "method_not_allowed" });
}

function normalizeName(input) {
  if (!input || typeof input !== "string") {
    return null;
  }
  let name = input.trim();
  if (!name) {
    return null;
  }
  name = name.replace(/[\\/]/g, "");
  name = name.replace(/\.\./g, "");
  if (!name) {
    return null;
  }
  if (!name.toLowerCase().endsWith(".json")) {
    name += ".json";
  }
  return name;
}

function ensureDefaultDraft() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(defaultDraftFile)) {
    const defaultDraft = {
      name: "林若溪",
      title: "高级产品设计师",
      phone: "138-1234-5678",
      email: "linruoxi@mail.com",
      location: "上海",
      website: "dribbble.com/ruoxi",
      fontFamily: "Inter, 'Segoe UI', sans-serif",
      fontWeight: "400",
      headingWeight: "700",
      summary: "注重商业目标与视觉美感的统一，擅长从0到1搭建产品体验并驱动增长。",
      education: "同济大学｜工业设计｜2014-2018",
      experience: "曜石互动｜资深设计师｜2022-至今｜主导B端平台设计系统，跨团队协作提效30%\n星海科技｜产品设计师｜2019-2022｜负责移动端核心流程改版，留存提升18%",
      projects: "简历生成平台｜设计负责人｜2025｜构建三套模板并支持在线编辑与打印\n品牌官网重构｜交互设计｜2024｜统一视觉规范，转化率提升22%",
      skills: "Figma\nDesign System\nHTML/CSS\n用户研究\nAIGC",
      savedAt: Date.now()
    };
    fs.writeFileSync(defaultDraftFile, JSON.stringify(defaultDraft, null, 2));
  }
}

function listDraftFiles(callback) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.readdir(dataDir, { withFileTypes: true }, (err, entries) => {
    if (err) {
      callback(err, []);
      return;
    }
    const files = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => name.toLowerCase().endsWith(".json") && name !== "drafts.json")
      .sort((a, b) => a.localeCompare(b, "zh-CN"));
    callback(null, files);
  });
}

function handleDraftApi(req, res) {
  if (req.method === "GET") {
    const name = normalizeName(req.url && new URL(req.url, "http://localhost").searchParams.get("name"));
    const targetName = name || "default.json";
    const filePath = path.join(dataDir, targetName);
    fs.readFile(filePath, "utf-8", (err, content) => {
      if (err) {
        sendJson(res, 404, { message: "draft_not_found" });
        return;
      }
      try {
        const parsed = JSON.parse(content);
        sendJson(res, 200, parsed);
      } catch {
        sendJson(res, 500, { message: "draft_parse_error" });
      }
    });
    return;
  }

  if (req.method === "POST") {
    const name = normalizeName(req.url && new URL(req.url, "http://localhost").searchParams.get("name"));
    if (!name) {
      sendJson(res, 400, { message: "name_required" });
      return;
    }
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        const parsed = JSON.parse(body || "{}");
        fs.mkdirSync(dataDir, { recursive: true });
        const filePath = path.join(dataDir, name);
        fs.writeFile(filePath, JSON.stringify(parsed, null, 2), (writeErr) => {
          if (writeErr) {
            sendJson(res, 500, { message: "draft_save_failed" });
            return;
          }
          sendJson(res, 200, { message: "draft_saved", name });
        });
      } catch {
        sendJson(res, 400, { message: "invalid_json" });
      }
    });
    return;
  }

  sendJson(res, 405, { message: "method_not_allowed" });
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  if (requestUrl.pathname === "/api/templates") {
    handleTemplateApi(req, res);
    return;
  }
  if (requestUrl.pathname === "/api/drafts") {
    listDraftFiles((err, files) => {
      if (err) {
        sendJson(res, 500, { message: "draft_list_failed" });
        return;
      }
      sendJson(res, 200, { files });
    });
    return;
  }
  if (requestUrl.pathname === "/api/draft") {
    handleDraftApi(req, res);
    return;
  }
  sendFile(requestUrl.pathname, res);
});

ensureDefaultDraft();
ensureTemplateSettings();
server.listen(port, () => {
  console.log(`CV server 已启动: http://localhost:${port}`);
  console.log(`当前默认模板: ${currentTemplate}`);
});
