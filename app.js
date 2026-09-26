let loggedIn =
  localStorage.getItem("vyrox_login") === "true";


/* =========================
   LOGIN
========================= */

function login() {

  const username =
    document.getElementById("loginUser").value.trim();

  const password =
    document.getElementById("loginPass").value;

  const message =
    document.getElementById("loginMessage");


  if (
    username === VYROX_CONFIG.username &&
    password === VYROX_CONFIG.password
  ) {

    localStorage.setItem("vyrox_login", "true");

    loggedIn = true;

    document
      .getElementById("loginScreen")
      .classList.add("hidden");

    document
      .getElementById("app")
      .classList.remove("hidden");

    message.textContent = "";

    addLog("Admin logged in");

    showNotification("ورود موفق بود 🔥");

  } else {

    message.textContent =
      "نام کاربری یا رمز عبور اشتباه است.";

  }
}


/* =========================
   LOGOUT
========================= */

function logout() {

  localStorage.removeItem("vyrox_login");

  loggedIn = false;

  document
    .getElementById("app")
    .classList.add("hidden");

  document
    .getElementById("loginScreen")
    .classList.remove("hidden");

}


/* =========================
   PAGE NAVIGATION
========================= */

function openPage(id, button) {

  document
    .querySelectorAll(".page")
    .forEach(page => {
      page.classList.add("hidden");
    });


  const selected =
    document.getElementById(id);

  if (selected) {
    selected.classList.remove("hidden");
  }


  document
    .querySelectorAll(".sidebar nav button")
    .forEach(btn => {
      btn.classList.remove("active");
    });


  if (button) {
    button.classList.add("
