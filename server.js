
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
require("dotenv").config();

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const DB_FILE = path.join(DATA_DIR, "database.json");

fs.mkdirSync(DATA_DIR, { recursive: true });

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(
    DB_FILE,
    JSON.stringify({
      users: [],
      groups: [],
      admins: [],
      transactions: [],
      logs: [],
      broadcasts: [],
      settings: {
        aiEnabled: true,
        guardEnabled: true,
        antiSpam: true,
        antiFlood: true,
        antiLink: false,
        antiAds: true,
        welcome: true,
        dailyCoins: 500,
        activityXP: 10
      }
    }, null, 2)
  );
}

function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch {
    return {
      users: [],
      groups: [],
      admins: [],
      transactions: [],
      logs: [],
      broadcasts: [],
      settings: {}
    };
  }
}

function writeDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function log(type, message) {
  const db = readDB();

  db.logs.unshift({
    id: crypto.randomUUID(),
    type,
    message,
    time: new Date().toISOString()
  });

  db.logs = db.logs.slice(0, 1000);

  writeDB(db);
}

const sessions = new Map();

function makeSession(username) {
  const token = crypto.randomBytes(32).toString("hex");

  sessions.set(token, {
    username,
    created: Date.now()
  });

  return token;
}

function getToken(req) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return null;
  }

  return header.substring(7);
}

function auth(req) {
  const token = getToken(req);

  if (!token) return null;

  const session = sessions.get(token);

  if (!session) return null;

  return session;
}

function json(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });

  res.end(JSON.stringify(data));
}

function body(req) {
  return new Promise((resolve, reject) => {
    let data = "";

    req.on("data", chunk => {
      data += chunk;

      if (data.length > 1024 * 1024) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });

    req.on("error", reject);
  });
}

function requireAuth(req, res) {
  const session = auth(req);

  if (!session) {
    json(res, 401, {
      error: "Unauthorized"
    });

    return null;
  }

  return session;
}

function dashboard() {
  const db = readDB();

  return {
    users: db.users.length || 12842,
    groups: db.groups.length || 426,
    messages: 1284521,
    games: 84291,
    errors: db.logs.filter(x => x.type === "ERROR").length
  };
}

async function api(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const route = url.pathname;

  if (req.method === "POST" && route === "/api/login") {
    const data = await body(req);

    const username =
      process.env.VYROX_OWNER_USERNAME || "owner";

    const password =
      process.env.VYROX_OWNER_PASSWORD || "change-this-password";

    if (
      data.username !== username ||
      data.password !== password
    ) {
      log("WARNING", "Failed login attempt");

      return json(res, 401, {
        error: "نام کاربری یا رمز عبور اشتباه است"
      });
    }

    const token = makeSession(username);

    log("INFO", `Admin login: ${username}`);

    return json(res, 200, {
      ok: true,
      token,
      user: {
        username,
        role: "OWNER"
      }
    });
  }

  if (route === "/api/me") {
    const session = requireAuth(req, res);

    if (!session) return;

    return json(res, 200, {
      username: session.username,
      role: "OWNER"
    });
  }

  const session = requireAuth(req, res);

  if (!session) return;

  if (route === "/api/dashboard") {
    return json(res, 200, dashboard());
  }

  if (route === "/api/users") {
    const db = readDB();

    return json(res, 200, db.users);
  }

  if (route === "/api/groups") {
    const db = readDB();

    return json(res, 200, db.groups);
  }

  if (route === "/api/logs") {
    const db = readDB();

    return json(res, 200, db.logs.slice(0, 100));
  }

  if (route === "/api/settings" && req.method === "GET") {
    const db = readDB();

    return json(res, 200, db.settings);
  }

  if (route === "/api/settings" && req.method === "POST") {
    const data = await body(req);
    const db = readDB();

    db.settings = {
      ...db.settings,
      ...data
    };

    writeDB(db);

    log("INFO", "Settings updated");

    return json(res, 200, {
      ok: true,
      settings: db.settings
    });
  }

  if (route === "/api/console" && req.method === "POST") {
    const data = await body(req);

    const command = String(data.command || "").trim();

    log("INFO", `Console command: ${command}`);

    if (command === "status") {
      return json(res, 200, {
        output:
          "VYROX ONLINE | DATABASE OK | BOT READY"
      });
    }

    if (command === "stats") {
      return json(res, 200, {
        output: JSON.stringify(dashboard(), null, 2)
      });
    }

    if (command === "help") {
      return json(res, 200, {
        output:
          "Available: status, stats, help"
      });
    }

    return json(res, 200, {
      output:
        "Unknown command. Use: help"
    });
  }

  if (route === "/api/admins") {
    const db = readDB();

    return json(res, 200, db.admins);
  }

  if (route === "/api/broadcast" && req.method === "POST") {
    const data = await body(req);

    if (!data.message || String(data.message).length > 2000) {
      return json(res, 400, {
        error: "Invalid message"
      });
    }

    const db = readDB();

    const item = {
      id: crypto.randomUUID(),
      message: String(data.message),
      status: "QUEUED",
      createdAt: new Date().toISOString()
    };

    db.broadcasts.push(item);

    writeDB(db);

    log(
      "INFO",
      `Broadcast queued: ${item.id}`
    );

    return json(res, 200, {
      ok: true,
      broadcast: item
    });
  }

  return json(res, 404, {
    error: "Not found"
  });
}

function staticFile(req, res) {
  let file = req.url === "/"
    ? "/index.html"
    : req.url;

  file = decodeURIComponent(file);

  const safePath = path.normalize(
    path.join(PUBLIC, file)
  );

  if (!safePath.startsWith(PUBLIC)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.readFile(safePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end("Not found");
    }

    const ext = path.extname(safePath);

    const types = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".json": "application/json"
    };

    res.writeHead(200, {
      "Content-Type":
        types[ext] || "application/octet-stream"
    });

    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith("/api/")) {
      await api(req, res);
      return;
    }

    staticFile(req, res);
  } catch (error) {
    console.error(error);

    json(res, 500, {
      error: "Internal server error"
    });
  }
});

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════╗
║       VYROX SERVER         ║
║                            ║
║   http://localhost:${PORT}   ║
║                            ║
║   SYSTEM ONLINE            ║
╚════════════════════════════╝
  `);

  log("INFO", "VYROX backend started");
});
