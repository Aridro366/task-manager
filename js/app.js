// ============================
// ELEMENTS
// ============================
const taskInput = document.getElementById("taskInput");
const form = document.querySelector(".task-input-bar");
const themeToggle = document.getElementById("themeToggle");
const notifyToggle = document.getElementById("notifyToggle");

const prioritySelect = document.getElementById("priority");
const dueDateInput = document.getElementById("dueDate");

const totalTasksEl = document.getElementById("totalTasks");
const doneTasksEl = document.getElementById("doneTasks");
const emptyState = document.getElementById("emptyState");

const todayList = document.getElementById("todayList");
const upcomingList = document.getElementById("upcomingList");
const noDateList = document.getElementById("noDateList");

const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");

// Delete modal
const overlay = document.getElementById("confirmOverlay");
const cancelDeleteBtn = document.getElementById("cancelDelete");
const confirmDeleteBtn = document.getElementById("confirmDelete");

// Install button (SAFE)
const installBtn = document.getElementById("installBtn");

// ============================
// TASK STATE (with migration)
// ============================
let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
tasks = tasks.map(t => (t.id ? t : { ...t, id: Date.now() + Math.random() }));

// ============================
// STATE
// ============================
let currentFilter = "all";
let pendingDeleteId = null;

// ============================
// THEME SYSTEM (STABLE)
// ============================
const THEME_KEY = "theme"; // light | dim | dark | null(system)
const savedTheme = localStorage.getItem(THEME_KEY);

function applyTheme(theme) {
  document.body.classList.remove("light", "dim", "dark");

  if (theme) {
    document.body.classList.add(theme);
    localStorage.setItem(THEME_KEY, theme);
  } else {
    localStorage.removeItem(THEME_KEY);
  }

  updateThemeIcon();
}

function updateThemeIcon() {
  if (document.body.classList.contains("dark")) themeToggle.textContent = "☀️";
  else if (document.body.classList.contains("dim")) themeToggle.textContent = "🌫️";
  else if (document.body.classList.contains("light")) themeToggle.textContent = "🌙";
  else themeToggle.textContent = "🖥️";
}

// Init theme
if (savedTheme) applyTheme(savedTheme);
else updateThemeIcon();

// Cycle: system → light → dim → dark → system
themeToggle.onclick = () => {
  if (!document.body.classList.contains("light") &&
      !document.body.classList.contains("dim") &&
      !document.body.classList.contains("dark")) {
    applyTheme("light");
  } else if (document.body.classList.contains("light")) {
    applyTheme("dim");
  } else if (document.body.classList.contains("dim")) {
    applyTheme("dark");
  } else {
    applyTheme(null);
  }
};

// ============================
// NOTIFICATIONS (NO SPAM)
// ============================
let notificationsEnabled = localStorage.getItem("notify") === "true";
let hourlyTimer = null;
let lastNotified = Number(localStorage.getItem("lastNotified")) || 0;
const NOTIFY_COOLDOWN = 60 * 60 * 1000;

function updateNotifyIcon() {
  notifyToggle.textContent = notificationsEnabled ? "🔔" : "🔕";
}
updateNotifyIcon();

notifyToggle.onclick = async () => {
  if (!("Notification" in window)) return alert("Notifications not supported");

  if (!notificationsEnabled) {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return;

    notificationsEnabled = true;
    localStorage.setItem("notify", "true");
    startHourlyCheck();
  } else {
    notificationsEnabled = false;
    localStorage.setItem("notify", "false");
    if (hourlyTimer) clearInterval(hourlyTimer);
  }

  updateNotifyIcon();
};

function startHourlyCheck() {
  if (hourlyTimer) clearInterval(hourlyTimer);

  hourlyTimer = setInterval(() => {
    if (!notificationsEnabled) return;

    const now = Date.now();
    if (now - lastNotified < NOTIFY_COOLDOWN) return;

    if (!tasks.some(t => !t.completed)) return;

    new Notification("⏰ Pending Tasks", {
      body: "You still have unfinished tasks."
    });

    lastNotified = now;
    localStorage.setItem("lastNotified", now);
  }, 60 * 1000);
}

// ============================
// HELPERS
// ============================
function isToday(d) {
  const t = new Date();
  const x = new Date(d);
  return x.toDateString() === t.toDateString();
}
function isUpcoming(d) {
  return new Date(d) > new Date();
}

// ============================
// RENDER
// ============================
function render() {
  todayList.innerHTML = "";
  upcomingList.innerHTML = "";
  noDateList.innerHTML = "";

  const visible = tasks.filter(t =>
    currentFilter === "all" ||
    (currentFilter === "active" && !t.completed) ||
    (currentFilter === "done" && t.completed)
  );

  visible.forEach(task => {
    const li = document.createElement("li");
    li.className = `task-item ${task.priority}${task.completed ? " completed" : ""}`;

    const span = document.createElement("span");
    span.textContent = task.text;
    span.onclick = () => startEdit(span, task.id);

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const toggle = document.createElement("button");
    toggle.textContent = "✔";
    toggle.onclick = () => toggleTask(task.id);

    const del = document.createElement("button");
    del.textContent = "✖";
    del.onclick = () => openDeleteModal(task.id);

    actions.append(toggle, del);
    li.append(span, actions);

    if (!task.dueDate) noDateList.appendChild(li);
    else if (isToday(task.dueDate)) todayList.appendChild(li);
    else if (isUpcoming(task.dueDate)) upcomingList.appendChild(li);
    else noDateList.appendChild(li);
  });

  totalTasksEl.textContent = `${tasks.length} Tasks`;
  doneTasksEl.textContent = `${tasks.filter(t => t.completed).length} Done`;

  const pct = tasks.length ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) : 0;
  progressFill.style.width = pct + "%";
  progressText.textContent = `${pct}% completed`;

  emptyState.style.display = tasks.length ? "none" : "block";
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

// ============================
// INLINE EDIT
// ============================
function startEdit(span, id) {
  const input = document.createElement("input");
  input.className = "task-edit-input";
  input.value = span.textContent;
  span.replaceWith(input);
  input.focus();

  input.onblur = () => {
    const t = tasks.find(x => x.id === id);
    if (t && input.value.trim()) t.text = input.value.trim();
    render();
  };

  input.onkeydown = e => {
    if (e.key === "Enter") input.blur();
    if (e.key === "Escape") render();
  };
}

// ============================
// TASK ACTIONS
// ============================
function addTask(text, priority, dueDate) {
  tasks.push({ id: Date.now() + Math.random(), text, completed: false, priority, dueDate });
  render();
}
function toggleTask(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  t.completed = !t.completed;
  lastNotified = 0;
  localStorage.removeItem("lastNotified");
  render();
}

// ============================
// DELETE MODAL
// ============================
function openDeleteModal(id) {
  pendingDeleteId = id;
  overlay.classList.remove("hidden");
}
cancelDeleteBtn.onclick = () => overlay.classList.add("hidden");
confirmDeleteBtn.onclick = () => {
  tasks = tasks.filter(t => t.id !== pendingDeleteId);
  overlay.classList.add("hidden");
  render();
};

// ============================
// FORM + FILTERS
// ============================
form.onsubmit = e => {
  e.preventDefault();
  if (!taskInput.value.trim()) return;
  addTask(taskInput.value.trim(), prioritySelect.value, dueDateInput.value);
  taskInput.value = "";
  dueDateInput.value = "";
};

document.querySelectorAll(".filters button").forEach(b => {
  b.onclick = () => {
    document.querySelector(".filters .active").classList.remove("active");
    b.classList.add("active");
    currentFilter = b.dataset.filter;
    render();
  };
});

// ============================
// PWA INSTALL (SAFE)
// ============================
let deferredPrompt = null;

if (installBtn) {
  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.hidden = false;
  });

  installBtn.onclick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt = null;
    installBtn.hidden = true;
  };
}

// ============================
// INIT
// ============================
render();
if (notificationsEnabled && "Notification" in window && Notification.permission === "granted") {
  startHourlyCheck();
}
