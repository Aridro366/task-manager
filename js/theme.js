const root = document.documentElement;
const toggle = document.getElementById("themeToggle");

const savedTheme = localStorage.getItem("theme");
const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

const theme = savedTheme || (systemDark ? "dark" : "light");
root.setAttribute("data-theme", theme);
toggle.textContent = theme === "dark" ? "☀️" : "🌙";

toggle.addEventListener("click", () => {
  const current = root.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";

  root.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
  toggle.textContent = next === "dark" ? "☀️" : "🌙";
});
