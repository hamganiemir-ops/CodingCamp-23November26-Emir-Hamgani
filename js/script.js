/**
 * Expense & Budget Visualizer — js/script.js
 *
 * Architecture: unidirectional data flow
 *   User Action → updateState() → saveToStorage() → renderAll()
 *
 * All state lives in the `state` object below.
 * Only relative paths are used so the app works on GitHub Pages.
 */

// ============================================================
// CONSTANTS
// ============================================================

/** LocalStorage keys */
const LS_TRANSACTIONS  = 'ebv_transactions';
const LS_LIMIT         = 'ebv_spending_limit';
const LS_THEME         = 'ebv_theme';

/** Category display names and their chart/badge colours */
const CATEGORY_COLORS = {
  Food:      '#FF6384',
  Transport: '#36A2EB',
  Fun:       '#FFCE56',
};

// ============================================================
// STATE
// ============================================================

/**
 * Central application state — single source of truth.
 * @type {{
 *   transactions: Array<{id:string, name:string, amount:number, category:string, createdAt:number}>,
 *   sortOrder: string,
 *   spendingLimit: number|null,
 *   theme: string
 * }}
 */
let state = {
  transactions:  [],
  sortOrder:     'default',   // not persisted; resets to 'default' on load
  spendingLimit: null,
  theme:         'light',
};

/** Reference to the Chart.js instance so we can destroy it before re-creating */
let chartInstance = null;

// ============================================================
// STORAGE
// ============================================================

/**
 * Load persisted state from localStorage.
 * Falls back to defaults if keys are missing or JSON is corrupt.
 * Shows a banner if localStorage is unavailable.
 */
function loadFromStorage() {
  try {
    // Transactions
    const rawTx = localStorage.getItem(LS_TRANSACTIONS);
    state.transactions = rawTx ? JSON.parse(rawTx) : [];

    // Spending limit
    const rawLimit = localStorage.getItem(LS_LIMIT);
    state.spendingLimit = rawLimit !== null ? JSON.parse(rawLimit) : null;

    // Theme
    const rawTheme = localStorage.getItem(LS_THEME);
    state.theme = rawTheme === 'dark' ? 'dark' : 'light';
  } catch (err) {
    // localStorage unavailable (e.g. private browsing quota)
    console.warn('[EBV] localStorage unavailable:', err);
    showStorageWarning();
    state.transactions  = [];
    state.spendingLimit = null;
    state.theme         = 'light';
  }
}

/**
 * Persist the entire mutable state to localStorage.
 * Silently ignores errors (storage full / unavailable).
 */
function saveToStorage() {
  try {
    localStorage.setItem(LS_TRANSACTIONS, JSON.stringify(state.transactions));
    localStorage.setItem(LS_LIMIT,        JSON.stringify(state.spendingLimit));
    localStorage.setItem(LS_THEME,        state.theme);
  } catch (err) {
    console.warn('[EBV] Could not save to localStorage:', err);
  }
}

/** Show one-time banner warning that storage is unavailable */
function showStorageWarning() {
  const banner = document.getElementById('storage-warning');
  if (banner) banner.classList.remove('hidden');
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Generate a unique transaction id.
 * Uses crypto.randomUUID() when available; falls back to Date.now().
 * @returns {string}
 */
function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/**
 * Compute the total of all transaction amounts.
 * @returns {number}
 */
function computeTotal() {
  return state.transactions.reduce((sum, tx) => sum + tx.amount, 0);
}

/**
 * Return a sorted copy of state.transactions according to state.sortOrder.
 * Never mutates the original array.
 * @returns {Array}
 */
function getSortedTransactions() {
  const copy = [...state.transactions];

  switch (state.sortOrder) {
    case 'amount-asc':
      return copy.sort((a, b) => a.amount - b.amount);
    case 'amount-desc':
      return copy.sort((a, b) => b.amount - a.amount);
    case 'category-alpha':
      return copy.sort((a, b) =>
        a.category.toLowerCase().localeCompare(b.category.toLowerCase())
      );
    case 'default':
    default:
      // Most-recently-added first (highest createdAt first)
      return copy.sort((a, b) => b.createdAt - a.createdAt);
  }
}

/**
 * Format a number as a dollar amount with two decimal places.
 * @param {number} n
 * @returns {string} e.g. "$12.50"
 */
function formatMoney(n) {
  return '$' + n.toFixed(2);
}

// ============================================================
// RENDER
// ============================================================

/** Call all render functions in layout order. */
function renderAll() {
  renderBalance();
  renderTransactionList();
  renderPieChart();
}

/**
 * Render the total balance and apply/remove over-limit highlight.
 */
function renderBalance() {
  const total      = computeTotal();
  const balanceEl  = document.getElementById('total-balance');
  const statusEl   = document.getElementById('limit-status');
  const limitInput = document.getElementById('spending-limit');

  // Update displayed total
  balanceEl.textContent = formatMoney(total);

  // Restore limit input value if it exists (don't overwrite user typing)
  if (document.activeElement !== limitInput) {
    limitInput.value = state.spendingLimit !== null ? state.spendingLimit : '';
  }

  // Over-limit logic
  if (state.spendingLimit !== null && total > state.spendingLimit) {
    balanceEl.classList.add('over-limit');
    const over = total - state.spendingLimit;
    statusEl.textContent = `Over limit by ${formatMoney(over)}`;
  } else {
    balanceEl.classList.remove('over-limit');
    statusEl.textContent = '';
  }
}

/**
 * Rebuild the transaction list <ul> from sorted state.
 * Applies over-limit highlighting to individual items whose cumulative
 * total pushes past the spending limit.
 */
function renderTransactionList() {
  const listEl      = document.getElementById('transaction-list');
  const listEmptyEl = document.getElementById('list-empty');
  const sorted      = getSortedTransactions();

  // Clear existing list
  listEl.innerHTML = '';

  if (sorted.length === 0) {
    listEmptyEl.classList.remove('hidden');
    return;
  }
  listEmptyEl.classList.add('hidden');

  // For over-limit highlighting: accumulate running total in insertion order
  // (we highlight individual items whose addition causes the total to exceed the limit)
  const total = computeTotal();
  const isOverLimit = state.spendingLimit !== null && total > state.spendingLimit;

  sorted.forEach((tx) => {
    const li = document.createElement('li');
    li.className = 'transaction-item';
    li.dataset.category = tx.category;
    li.dataset.id = tx.id;

    // If total is over limit, highlight every transaction (the whole batch exceeds the budget)
    if (isOverLimit) {
      li.classList.add('over-limit');
    }

    // Category badge
    const badgeClass = `transaction-category category-badge--${tx.category}`;
    const badgeEmoji = tx.category === 'Food' ? '🍔' : tx.category === 'Transport' ? '🚌' : '🎉';

    li.innerHTML = `
      <span class="${badgeClass}">${badgeEmoji} ${tx.category}</span>
      <div class="transaction-details">
        <p class="transaction-name">${escapeHtml(tx.name)}</p>
      </div>
      <span class="transaction-amount">${formatMoney(tx.amount)}</span>
      <button
        class="btn btn--danger"
        aria-label="Delete ${escapeHtml(tx.name)}"
        onclick="handleDelete('${tx.id}')"
      >✕</button>
    `;

    listEl.appendChild(li);
  });
}

/**
 * Render the pie chart using Chart.js.
 * Destroys any existing chart instance before creating a new one.
 */
function renderPieChart() {
  const canvas    = document.getElementById('spending-chart');
  const emptyEl   = document.getElementById('empty-state');

  // Guard: Chart.js may not have loaded (CDN failure)
  if (typeof Chart === 'undefined') {
    canvas.classList.add('hidden');
    emptyEl.textContent = 'Chart unavailable — could not load charting library.';
    emptyEl.classList.remove('hidden');
    return;
  }

  // Empty state
  if (state.transactions.length === 0) {
    canvas.classList.add('hidden');
    emptyEl.classList.remove('hidden');
    // Destroy old chart instance if present
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    return;
  }

  canvas.classList.remove('hidden');
  emptyEl.classList.add('hidden');

  // Aggregate totals per category
  const totals = {};
  state.transactions.forEach((tx) => {
    totals[tx.category] = (totals[tx.category] || 0) + tx.amount;
  });

  const labels     = Object.keys(totals);
  const data       = labels.map((cat) => parseFloat(totals[cat].toFixed(2)));
  const colors     = labels.map((cat) => CATEGORY_COLORS[cat] || '#cccccc');

  // Destroy previous Chart.js instance to prevent "canvas already in use" error
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  chartInstance = new Chart(canvas, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor:  colors,
        borderColor:      colors.map(() => 'transparent'),
        hoverOffset:      8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding:  16,
            font:     { size: 13 },
            color:    getComputedStyle(document.body).getPropertyValue('--color-text').trim() || '#1a1d23',
          },
        },
        tooltip: {
          callbacks: {
            label(context) {
              const total  = context.dataset.data.reduce((s, v) => s + v, 0);
              const value  = context.parsed;
              const pct    = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
              return ` ${context.label}: ${formatMoney(value)} (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

/**
 * Apply the current theme (data-theme attribute on <body>)
 * and update the toggle button icon.
 */
function applyTheme() {
  document.body.dataset.theme = state.theme;
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.textContent = state.theme === 'dark' ? '☀️' : '🌙';
    btn.title = state.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  }
}

// ============================================================
// EVENT HANDLERS
// ============================================================

/**
 * Handle transaction form submission.
 * Validates all fields, creates a new transaction, and re-renders.
 * @param {Event} event
 */
function handleFormSubmit(event) {
  event.preventDefault();

  const nameInput     = document.getElementById('item-name');
  const amountInput   = document.getElementById('item-amount');
  const categoryInput = document.getElementById('item-category');
  const errorEl       = document.getElementById('form-error');

  const nameVal     = nameInput.value.trim();
  const amountRaw   = amountInput.value.trim();
  const categoryVal = categoryInput.value;

  // --- Validation ---
  if (!nameVal) {
    showError(errorEl, 'Item name is required.');
    nameInput.focus();
    return;
  }
  if (!amountRaw) {
    showError(errorEl, 'Amount is required.');
    amountInput.focus();
    return;
  }
  const amountNum = parseFloat(amountRaw);
  if (isNaN(amountNum)) {
    showError(errorEl, 'Amount must be a valid number.');
    amountInput.focus();
    return;
  }
  if (amountNum <= 0) {
    showError(errorEl, 'Amount must be a positive number.');
    amountInput.focus();
    return;
  }
  if (!categoryVal) {
    showError(errorEl, 'Please select a category.');
    categoryInput.focus();
    return;
  }

  // --- Clear error ---
  clearError(errorEl);

  // --- Build transaction ---
  const tx = {
    id:        generateId(),
    name:      nameVal,
    amount:    parseFloat(amountNum.toFixed(2)),
    category:  categoryVal,
    createdAt: Date.now(),
  };

  // --- Update state ---
  state.transactions.push(tx);
  saveToStorage();
  renderAll();

  // --- Clear form ---
  nameInput.value     = '';
  amountInput.value   = '';
  categoryInput.value = '';
  nameInput.focus();
}

/**
 * Delete a transaction by id.
 * @param {string} id
 */
function handleDelete(id) {
  state.transactions = state.transactions.filter((tx) => tx.id !== id);
  saveToStorage();
  renderAll();
}

/**
 * Handle sort dropdown change.
 * @param {string} value
 */
function handleSortChange(value) {
  state.sortOrder = value;
  renderTransactionList();
}

/**
 * Handle spending limit input change.
 * Empty input clears the limit; non-numeric/negative values are ignored.
 * @param {string} value
 */
function handleSpendingLimitChange(value) {
  const trimmed = value.trim();
  if (trimmed === '') {
    state.spendingLimit = null;
  } else {
    const parsed = parseFloat(trimmed);
    if (!isNaN(parsed) && parsed >= 0) {
      state.spendingLimit = parsed;
    }
    // Silently ignore invalid values — retain previous limit
  }
  saveToStorage();
  renderBalance();
  renderTransactionList();
}

/**
 * Toggle between dark and light themes.
 */
function handleThemeToggle() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  saveToStorage();
  // Re-render chart so legend colour matches new theme
  renderPieChart();
}

// ============================================================
// UTILITY
// ============================================================

/**
 * Display an error message in the given element.
 * @param {HTMLElement} el
 * @param {string} msg
 */
function showError(el, msg) {
  el.textContent = msg;
}

/**
 * Clear the error message element.
 * @param {HTMLElement} el
 */
function clearError(el) {
  el.textContent = '';
}

/**
 * Escape HTML special characters to prevent XSS when inserting user input as innerHTML.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#039;');
}

// ============================================================
// INIT
// ============================================================

/**
 * Wire up event listeners and perform initial render.
 * Called on DOMContentLoaded.
 */
function init() {
  // Load persisted state
  loadFromStorage();

  // Apply saved theme immediately (before first paint if possible)
  applyTheme();

  // Form submission
  const form = document.getElementById('transaction-form');
  form.addEventListener('submit', handleFormSubmit);

  // Sort dropdown
  const sortSelect = document.getElementById('sort-select');
  sortSelect.addEventListener('change', (e) => handleSortChange(e.target.value));

  // Spending limit input — debounced to avoid re-render on every keystroke
  const limitInput = document.getElementById('spending-limit');
  let limitTimer;
  limitInput.addEventListener('input', (e) => {
    clearTimeout(limitTimer);
    limitTimer = setTimeout(() => handleSpendingLimitChange(e.target.value), 300);
  });
  limitInput.addEventListener('change', (e) => {
    clearTimeout(limitTimer);
    handleSpendingLimitChange(e.target.value);
  });

  // Theme toggle button
  const themeToggle = document.getElementById('theme-toggle');
  themeToggle.addEventListener('click', handleThemeToggle);

  // Initial render
  renderAll();
}

// Entry point
document.addEventListener('DOMContentLoaded', init);
