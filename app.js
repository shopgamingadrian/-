let token =
  localStorage.getItem("vyrox_token");

async function api(url, options = {}) {

  options.headers = {
    "Content-Type":
      "application/json",

    ...(options.headers || {}),

    ...(token
      ? {
          Authorization:
            "Bearer " + token
        }
      : {})
  };

  const res =
    await fetch(url, options);

  if (res.status === 401) {
    logout();
    throw new Error("Unauthorized");
  }

  return res.json();
}


async function login() {

  const username =
    document.getElementById(
      "username"
    ).value;

  const password =
    document.getElementById(
      "password"
    ).value;

  const result =
    await api(
      "/api/login",
      {
        method:"POST",
        body:JSON.stringify({
          username,
          password
        })
      }
    );

  if (!result.ok) {

    document.getElementById(
      "loginError"
    ).textContent =
      result.error || "خطا";

    return;
  }

  token = result.token;

  localStorage.setItem(
    "vyrox_token",
    token
  );

  showApp();

  loadAll();
}


function showApp() {

  document
    .getElementById("login")
    .classList.add("hidden");

  document
    .getElementById("app")
    .classList.remove("hidden");
}


function logout() {

  token = null;

  localStorage.removeItem(
    "vyrox_token"
  );

  location.reload();
}


function page(id) {

  document
    .querySelectorAll(".page")
    .forEach(
      x => x.style.display =
        "none"
    );

  document.getElementById(
    id
  ).style.display = "block";

  const names = {
    dashboard:"داشبورد",
    users:"کاربران",
    groups:"گروه‌ها",
    guard:"Guard",
    ai:"AI",
    games:"Games",
    economy:"Economy",
    broadcast:"Broadcast",
    analytics:"Analytics",
    logs:"Logs",
    admins:"Admins",
    console:"Console",
    settings:"Settings"
  };

  document.getElementById(
    "pageTitle"
  ).textContent =
    names[id] || id;
}


async function loadAll() {

  try {

    const stats =
      await api(
        "/api/dashboard"
      );

    document.getElementById(
      "usersCount"
    ).textContent =
      stats.users.toLocaleString();

    document.getElementById(
      "groupsCount"
    ).textContent =
      stats.groups.toLocaleString();

    document.getElementById(
      "errorsCount"
    ).textContent =
      stats.errors;

    const users =
      await api("/api/users");

    document.getElementById(
      "usersTable"
    ).innerHTML =
      users.length
      ? users.map(u => `
        <tr>
          <td>${u.id || "-"}</td>
          <td>${u.username || "-"}</td>
          <td>${u.level || 1}</td>
          <td>${u.coins || 0}</td>
        </tr>
      `).join("")
      : `
        <tr>
          <td colspan="4">
            هنوز کاربری ثبت نشده
          </td>
        </tr>
      `;


    const groups =
      await api("/api/groups");

    document.getElementById(
      "groupsTable"
    ).innerHTML =
      groups.length
      ? groups.map(g => `
        <tr>
          <td>${g.name || "-"}</td>
          <td>${g.members || 0}</td>
          <td>${g.guard ? "ON" : "OFF"}</td>
        </tr>
      `).join("")
      : `
        <tr>
          <td colspan="3">
            هنوز گروهی ثبت نشده
          </td>
        </tr>
      `;


    const logs =
      await api("/api/logs");

    document.getElementById(
      "logs"
    ).textContent =
      logs.map(
        x =>
          `[${x.type}] ${x.time} ${x.message}`
      ).join("\n");


    const settings =
      await api("/api/settings");

    document.getElementById(
      "antiSpam"
    ).checked =
      !!settings.antiSpam;

    document.getElementById(
      "antiFlood"
    ).checked =
      !!settings.antiFlood;

    document.getElementById(
      "antiLink"
    ).checked =
      !!settings.antiLink;

    document.getElementById(
      "antiAds"
    ).checked =
      !!settings.antiAds;

    document.getElementById(
      "welcome"
    ).checked =
      !!settings.welcome;

    document.getElementById(
      "dailyCoins"
    ).value =
      settings.dailyCoins || 500;

    document.getElementById(
      "activityXP"
    ).value =
      settings.activityXP || 10;

  } catch (e) {

    console.error(e);

  }
}


async function saveGuard() {

  await api(
    "/api/settings",
    {
      method:"POST",

      body:JSON.stringify({

        antiSpam:
          document.getElementById(
            "antiSpam"
          ).checked,

        antiFlood:
          document.getElementById(
            "antiFlood"
          ).checked,

        antiLink:
          document.getElementById(
            "antiLink"
          ).checked,

        antiAds:
          document.getElementById(
            "antiAds"
          ).checked,

        welcome:
          document.getElementById(
            "welcome"
          ).checked

      })
    }
  );

  alert("Guard ذخیره شد");
}


async function saveAI() {

  await api(
    "/api/settings",
    {
      method:"POST",

      body:JSON.stringify({

        aiEnabled:
          document.getElementById(
            "aiEnabled"
          ).value === "true",

        aiPersonality:
          document.getElementById(
            "aiPersonality"
          ).value

      })
    }
  );

  alert("AI ذخیره شد");
}


async function saveEconomy() {

  await api(
    "/api/settings",
    {
      method:"POST",

      body:JSON.stringify({

        dailyCoins:
          Number(
            document.getElementById(
              "dailyCoins"
            ).value
          ),

        activityXP:
          Number(
            document.getElementById(
              "activityXP"
            ).value
          )

      })
    }
  );

  alert("Economy ذخیره شد");
}


async function broadcast() {

  const message =
    document.getElementById(
      "broadcastMessage"
    ).value.trim();

  if (!message) {

    alert("متن پیام را وارد کن");

    return;
  }

  const result =
    await api(
      "/api/broadcast",
      {
        method:"POST",
        body:JSON.stringify({
          message
        })
      }
    );

  document.getElementById(
    "broadcastStatus"
  ).textContent =
    result.ok
      ? "پیام وارد صف ارسال شد."
      : result.error;
}


async function runCommand() {

  const command =
    document.getElementById(
      "command"
    ).value.trim();

  if (!command) return;

  const result =
    await api(
      "/api/console",
      {
        method:"POST",
        body:JSON.stringify({
          command
        })
      }
    );

  document.getElementById(
    "consoleOutput"
  ).textContent +=
    `\n> ${command}\n${result.output}`;

  document.getElementById(
    "command"
  ).value = "";
}


if (token) {

  showApp();

  loadAll();

}
