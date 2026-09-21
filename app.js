const STORAGE_KEY = 'daymark-tasks';

// Keep the UI state in one place so every interaction can re-render consistently.
const state = {
  tasks: JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'),
  view: 'all',
  status: 'all',
  search: ''
};

const elements = {
  form: document.querySelector('#task-form'),
  input: document.querySelector('#task-input'),
  priority: document.querySelector('#priority-input'),
  list: document.querySelector('#task-list'),
  empty: document.querySelector('#empty-state'),
  search: document.querySelector('#search-input'),
  clear: document.querySelector('#clear-completed'),
  allCount: document.querySelector('#all-count'),
  remaining: document.querySelector('#remaining-stat'),
  completed: document.querySelector('#completed-stat'),
  focus: document.querySelector('#focus-stat'),
  progressBar: document.querySelector('#progress-bar'),
  progressLabel: document.querySelector('#progress-label'),
  date: document.querySelector('#date-label')
};

const priorityStyles = {
  low: { label: 'Low', color: 'bg-slate-100 text-slate-500' },
  medium: { label: 'Medium', color: 'bg-[#e8f2e9] text-moss' },
  high: { label: 'High', color: 'bg-[#fce9d9] text-[#b45a28]' }
};

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

function formatDate(dateValue) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(dateValue));
}

function getVisibleTasks() {
  const query = state.search.trim().toLowerCase();
  // Apply the sidebar view, status filter, and search query together.
  return state.tasks.filter((task) => {
    const matchesView = state.view === 'all'
      || (state.view === 'today' && task.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10))
      || (state.view === 'important' && task.priority === 'high')
      || (state.view === 'completed' && task.completed);
    const matchesStatus = state.status === 'all' || (state.status === 'active' && !task.completed) || (state.status === 'done' && task.completed);
    const matchesSearch = !query || task.title.toLowerCase().includes(query);
    return matchesView && matchesStatus && matchesSearch;
  });
}

function renderTask(task) {
  const priority = priorityStyles[task.priority];
  return `
    <article class="group flex items-center gap-3 rounded-2xl bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lg ${task.completed ? 'opacity-65' : ''}">
      <button class="complete-task grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${task.completed ? 'border-moss bg-moss text-white' : 'border-slate-200 text-transparent hover:border-moss'} transition" data-id="${task.id}" aria-label="${task.completed ? 'Mark task active' : 'Complete task'}">✓</button>
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-bold ${task.completed ? 'text-slate-400 line-through' : 'text-ink'}">${escapeHtml(task.title)}</p>
        <div class="mt-1.5 flex items-center gap-2 text-[11px] font-semibold text-slate-400"><span class="rounded-md px-2 py-0.5 ${priority.color}">${priority.label}</span><span>Added ${formatDate(task.createdAt)}</span></div>
      </div>
      <button class="delete-task rounded-lg p-2 text-lg leading-none text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100" data-id="${task.id}" aria-label="Delete task">×</button>
    </article>`;
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

function render() {
  // Recalculate all derived values from the source task list before updating the DOM.
  const visibleTasks = getVisibleTasks();
  const completedCount = state.tasks.filter((task) => task.completed).length;
  const remainingCount = state.tasks.length - completedCount;
  const progress = state.tasks.length ? Math.round((completedCount / state.tasks.length) * 100) : 0;

  elements.list.innerHTML = visibleTasks.map(renderTask).join('');
  elements.empty.classList.toggle('hidden', visibleTasks.length > 0);
  elements.clear.classList.toggle('hidden', completedCount === 0);
  elements.allCount.textContent = state.tasks.length;
  elements.remaining.textContent = remainingCount;
  elements.completed.textContent = completedCount;
  elements.focus.textContent = state.tasks.find((task) => !task.completed)?.title || 'All clear';
  elements.progressBar.style.width = `${progress}%`;
  elements.progressLabel.textContent = `${progress}% complete`;

  document.querySelectorAll('.nav-filter').forEach((button) => {
    const active = button.dataset.filter === state.view;
    button.classList.toggle('bg-white', active);
    button.classList.toggle('shadow-sm', active);
    button.classList.toggle('text-moss', active);
    button.classList.toggle('text-slate-500', !active);
    button.setAttribute('aria-current', active ? 'page' : 'false');
  });

  document.querySelectorAll('.status-filter').forEach((button) => {
    const active = button.dataset.status === state.status;
    button.classList.toggle('bg-mint', active);
    button.classList.toggle('text-moss', active);
    button.classList.toggle('text-slate-400', !active);
    button.setAttribute('aria-selected', active);
  });
}

// Adding a task updates storage first, then refreshes the visible list.
elements.form.addEventListener('submit', (event) => {
  event.preventDefault();
  const title = elements.input.value.trim();
  if (!title) return;
  state.tasks.unshift({ id: crypto.randomUUID(), title, priority: elements.priority.value, completed: false, createdAt: new Date().toISOString() });
  save();
  elements.input.value = '';
  render();
  elements.input.focus();
});

// Event delegation keeps one listener working for all dynamically rendered tasks.
elements.list.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const task = state.tasks.find((item) => item.id === button.dataset.id);
  if (!task) return;
  if (button.classList.contains('complete-task')) task.completed = !task.completed;
  if (button.classList.contains('delete-task')) state.tasks = state.tasks.filter((item) => item.id !== task.id);
  save();
  render();
});

elements.clear.addEventListener('click', () => {
  state.tasks = state.tasks.filter((task) => !task.completed);
  save();
  render();
});

elements.search.addEventListener('input', (event) => {
  state.search = event.target.value;
  render();
});

document.querySelectorAll('.nav-filter').forEach((button) => button.addEventListener('click', () => {
  state.view = button.dataset.filter;
  render();
}));

document.querySelectorAll('.status-filter').forEach((button) => button.addEventListener('click', () => {
  state.status = button.dataset.status;
  render();
}));

elements.date.textContent = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
render();
