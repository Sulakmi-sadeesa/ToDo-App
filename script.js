const STORAGE_KEY = 'taskflow.tasks.v1';
const THEME_KEY = 'taskflow.theme';

let tasks = [];
let currentFilter = 'all';

const taskInput = document.getElementById('taskInput');
const prioritySelect = document.getElementById('priority');
const deadlineInput = document.getElementById('deadline');
const addBtn = document.getElementById('addBtn');
const taskList = document.getElementById('taskList');
const totalCount = document.getElementById('totalCount');
const pendingCount = document.getElementById('pendingCount');
const completedCount = document.getElementById('completedCount');
const themeToggle = document.getElementById('themeToggle');
const tabs = document.querySelectorAll('.tab');

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T00:00:00');
  return d < today;
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    tasks = raw ? JSON.parse(raw) : [];
  } catch (e) {
    tasks = [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'light';
  setTheme(saved);
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem(THEME_KEY, theme);
}

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  setTheme(current === 'dark' ? 'light' : 'dark');
});

function addTask() {
  const title = taskInput.value.trim();
  if (!title) {
    taskInput.focus();
    return;
  }

  tasks.unshift({
    id: uid(),
    title,
    priority: prioritySelect.value,
    deadline: deadlineInput.value || '',
    completed: false,
    createdAt: Date.now()
  });

  saveTasks();
  render();

  taskInput.value = '';
  deadlineInput.value = '';
  prioritySelect.value = 'medium';
  taskInput.focus();
}

function deleteTask(id) {
  const el = document.querySelector(`[data-id="${id}"]`);
  if (el) {
    el.style.opacity = '0';
    el.style.transform = 'translateX(40px)';
    setTimeout(() => {
      tasks = tasks.filter(t => t.id !== id);
      saveTasks();
      render();
    }, 180);
  } else {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    render();
  }
}

function toggleComplete(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    saveTasks();
    render();
  }
}

function editTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  const contentEl = document.querySelector(`[data-id="${id}"] .task-content`);
  if (!contentEl) return;

  const original = task.title;

  contentEl.innerHTML = `<input class="edit-input" id="edit-${id}" maxlength="120" value="${escapeHtml(original)}" />`;

  const input = document.getElementById(`edit-${id}`);
  input.focus();
  input.select();

  const commit = () => {
    const val = input.value.trim();
    if (val && val !== original) {
      task.title = val;
      saveTasks();
    }
    render();
  };

  input.addEventListener('blur', commit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') input.blur();
    if (e.key === 'Escape') {
      input.value = original;
      input.blur();
    }
  });
}

function getFiltered() {
  if (currentFilter === 'pending') return tasks.filter(t => !t.completed);
  if (currentFilter === 'completed') return tasks.filter(t => t.completed);
  return tasks;
}

function updateStats() {
  totalCount.textContent = tasks.length;
  pendingCount.textContent = tasks.filter(t => !t.completed).length;
  completedCount.textContent = tasks.filter(t => t.completed).length;
}

function render() {
  updateStats();

  const list = getFiltered();

  if (list.length === 0) {
    const msgs = {
      all: { icon: '🌸', text: 'No tasks yet. Add one above!' },
      pending: { icon: '🎉', text: 'All caught up!' },
      completed: { icon: '📭', text: 'Nothing completed yet.' }
    };
    taskList.innerHTML = `
      <div class="empty">
        <span class="big">${msgs[currentFilter].icon}</span>
        ${msgs[currentFilter].text}
      </div>`;
    return;
  }

  taskList.innerHTML = list.map(task => {
    const overdue = !task.completed && isOverdue(task.deadline);
    return `
      <div class="task-item priority-${task.priority} ${task.completed ? 'completed' : ''}" data-id="${task.id}">
        <input type="checkbox" class="check" ${task.completed ? 'checked' : ''} onchange="toggleComplete('${task.id}')" />
        <div class="task-content">
          <div class="task-title">${escapeHtml(task.title)}</div>
          <div class="task-meta">
            <span class="tag tag-${task.priority}">${task.priority}</span>
            ${task.deadline ? `<span class="tag tag-date ${overdue ? 'overdue' : ''}">${formatDate(task.deadline)}${overdue ? ' · overdue' : ''}</span>` : ''}
          </div>
        </div>
        <div class="task-actions">
          <button class="icon-btn" onclick="editTask('${task.id}')" title="Edit">✏️</button>
          <button class="icon-btn del" onclick="deleteTask('${task.id}')" title="Delete">✕</button>
        </div>
      </div>`;
  }).join('');
}

addBtn.addEventListener('click', addTask);

taskInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') addTask();
});

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.filter;
    render();
  });
});

window.toggleComplete = toggleComplete;
window.deleteTask = deleteTask;
window.editTask = editTask;

loadTheme();
loadTasks();
render();
taskInput.focus();