
'use strict';

const STORAGE_KEYS = {
  transactions: 'spendwise-transactions-v1',
  budget: 'spendwise-budget-v1',
  theme: 'spendwise-theme-v1',
  categories: 'spendwise-categories-v1',
  budgetWasSet: 'spendwise-budget-was-set-v1',
};
const EXPENSE_CATEGORIES = ['Food & Dining', 'Transportation', 'Education', 'Shopping', 'Entertainment', 'Bills & Utilities', 'Hostel & Rent', 'Healthcare', 'Other'];
const INCOME_CATEGORIES = ['Allowance', 'Scholarship', 'Part-time Work', 'Gift', 'Refund', 'Other Income'];
const PAYMENT_METHODS = ['UPI', 'Cash', 'Debit Card', 'Credit Card', 'Bank Transfer', 'Other'];
const CATEGORY_META = {
  'Food & Dining': { icon: '🍜', color: '#F59E0B' },
  Transportation: { icon: '🚌', color: '#0EA5E9' },
  Education: { icon: '📚', color: '#7C3AED' },
  Shopping: { icon: '🛍️', color: '#EC4899' },
  Entertainment: { icon: '🎬', color: '#8B5CF6' },
  'Bills & Utilities': { icon: '🧾', color: '#64748B' },
  'Hostel & Rent': { icon: '🏠', color: '#14B8A6' },
  Healthcare: { icon: '🩺', color: '#EF4444' },
  Other: { icon: '✨', color: '#94A3B8' },
  Allowance: { icon: '💸', color: '#16A34A' },
  Scholarship: { icon: '🎓', color: '#0D9488' },
  'Part-time Work': { icon: '💼', color: '#2563EB' },
  Gift: { icon: '🎁', color: '#DB2777' },
  Refund: { icon: '↩️', color: '#0891B2' },
  'Other Income': { icon: '➕', color: '#64748B' },
};
const VIEW_META = {
  dashboard: { title: 'Dashboard', eyebrow: 'YOUR MONEY, MORE CLEARLY' },
  transactions: { title: 'Transactions', eyebrow: 'EVERY RUPEE, ACCOUNTED FOR' },
  budget: { title: 'Budget planner', eyebrow: 'MAKE YOUR MONEY GO FURTHER' },
  analytics: { title: 'Spending analytics', eyebrow: 'UNDERSTAND YOUR HABITS' },
  settings: { title: 'Settings', eyebrow: 'MAKE SPENDWISE YOUR OWN' },
};

const state = {
  activeView: 'dashboard',
  mobileOpen: false,
  transactions: readTransactions(),
  budget: readBudget(),
  budgetDraft: readBudget() > 0 ? String(readBudget()) : '',
  theme: readTheme(),
  categories: readCategories(),
  categoryType: 'expense',
  categoryFeedback: '',
  pendingTransaction: null,
  pendingBudget: null,
  pendingCategory: null,
  editingId: null,
  search: '',
  typeFilter: 'all',
  categoryFilter: 'all',
  monthFilter: 'all',
  budgetFeedback: '',
  settingsFeedback: '',
  formMessage: { text: '', kind: '' },
  formDraft: blankForm(),
};

const appView = document.getElementById('app-view');
const siteNav = document.getElementById('site-nav');
const topbar = document.querySelector('.topbar');
const mobileNavBackdrop = document.getElementById('mobile-nav-backdrop');
const toast = document.getElementById('toast');
let toastTimer = null;

function blankForm() {
  return { type: 'expense', amount: '', category: EXPENSE_CATEGORIES[0], date: localDateISO(), description: '', paymentMethod: 'UPI' };
}
function localDateISO(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
function currentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
function money(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number.isFinite(Number(value)) ? Number(value) : 0);
}
function formatDate(dateValue) {
  if (!dateValue) return '—';
  const date = new Date(`${dateValue}T00:00:00`);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatMonth(monthValue) {
  if (!monthValue) return 'All months';
  const date = new Date(`${monthValue}-01T00:00:00`);
  return Number.isNaN(date.getTime()) ? monthValue : date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}
function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}
function safeTransactions(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item === 'object'
    && (item.type === 'income' || item.type === 'expense')
    && Number.isFinite(Number(item.amount)) && Number(item.amount) > 0
    && typeof item.date === 'string' && typeof item.description === 'string')
    .map((item, index) => ({
      id: String(item.id || `restored-${index}-${Date.now()}`),
      type: item.type,
      amount: Number(item.amount),
      category: String(item.category || 'Other'),
      date: item.date,
      description: item.description.slice(0, 80),
      paymentMethod: String(item.paymentMethod || 'Other'),
    }));
}

function readTransactions() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.transactions);
    return saved ? safeTransactions(JSON.parse(saved)) : [];
  } catch (error) {
    console.warn('SpendWise could not read saved transactions.', error);
    return [];
  }
}
function readBudget() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.budget);
    if (saved === null) return 0;

    const budget = Number(saved);
    if (!Number.isFinite(budget) || budget < 0) return 0;

    const noTransactionsSaved = localStorage.getItem(STORAGE_KEYS.transactions) === null;
    const wasSetByUser = localStorage.getItem(STORAGE_KEYS.budgetWasSet) === 'yes';
    if (budget === 10000 && noTransactionsSaved && !wasSetByUser) {
      localStorage.setItem(STORAGE_KEYS.budget, '0');
      return 0;
    }
    return budget;
  } catch (error) {
    console.warn('SpendWise could not read the saved budget.', error);
    return 0;
  }
}
function cleanCategoryList(savedList, defaultList) {
  
  if (!Array.isArray(savedList)) return defaultList.slice();

  const categories = [];
  for (let i = 0; i < savedList.length; i++) {
    const name = String(savedList[i] || '').trim().slice(0, 24);
    const alreadyExists = categories.some((item) => item.toLowerCase() === name.toLowerCase());
    if (name && !alreadyExists) categories.push(name);
  }

 
  return categories.length ? categories : defaultList.slice();
}
function readCategories() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.categories) || '{}');
    return {
      expense: cleanCategoryList(saved.expense, EXPENSE_CATEGORIES),
      income: cleanCategoryList(saved.income, INCOME_CATEGORIES),
    };
  } catch (error) {
    console.warn('SpendWise could not read saved categories.', error);
    return { expense: EXPENSE_CATEGORIES.slice(), income: INCOME_CATEGORIES.slice() };
  }
}
function readTheme() {
  try {
    return localStorage.getItem(STORAGE_KEYS.theme) === 'dark' ? 'dark' : 'light';
  } catch (error) {
    console.warn('SpendWise could not read the saved theme.', error);
    return 'light';
  }
}
function persist(key, value) {
  try { localStorage.setItem(STORAGE_KEYS[key], typeof value === 'string' ? value : JSON.stringify(value)); return true; }
  catch (error) { console.warn(`SpendWise could not save ${key}.`, error); return false; }
}
function setTheme(theme) {
  state.theme = theme;
  document.documentElement.dataset.theme = theme;
  persist('theme', theme);
  updateThemeButton();
}
function updateThemeButton() {
  const button = document.getElementById('theme-toggle');
  if (!button) return;
  button.innerHTML = `<span aria-hidden="true">${state.theme === 'light' ? '☾' : '☀'}</span>`;
  button.setAttribute('aria-label', `Switch to ${state.theme === 'light' ? 'dark' : 'light'} mode`);
  button.title = `Switch to ${state.theme === 'light' ? 'dark' : 'light'} mode`;
}
function getMonthTransactions(transactions, month = currentMonthKey()) {
  return transactions.filter((transaction) => String(transaction.date || '').slice(0, 7) === month);
}

function calculateTotals(transactions) {
  const totals = { income: 0, expenses: 0 };

  for (let i = 0; i < transactions.length; i++) {
    const transaction = transactions[i];
    const amount = Number(transaction.amount) || 0;

    if (transaction.type === 'income') {
      totals.income += amount;
    } else if (transaction.type === 'expense') {
      totals.expenses += amount;
    }
  }

  return totals;
}
function sumByCategory(transactions) {
  const grouped = {};

  for (let i = 0; i < transactions.length; i++) {
    const transaction = transactions[i];
    if (transaction.type !== 'expense') continue;
    if (!grouped[transaction.category]) grouped[transaction.category] = 0;
    grouped[transaction.category] += Number(transaction.amount) || 0;
  }

  const result = [];
  for (const category in grouped) {
    const meta = CATEGORY_META[category] || { icon: '🏷️', color: '#64748B' };
    result.push({ category, amount: grouped[category], icon: meta.icon, color: meta.color });
  }
  result.sort((a, b) => b.amount - a.amount);
  return result;
}
function budgetStatus(expenses, budget) {
  if (!(Number(budget) > 0)) return { label: 'No budget set', detail: 'Set a monthly limit to track your spending.', tone: 'neutral', percent: 0 };
  const rawPercent = (Number(expenses) / Number(budget)) * 100;
  const percent = Math.round(rawPercent);
  if (rawPercent > 100) return { label: 'Budget exceeded', detail: 'Your recorded spending is above the monthly limit.', tone: 'danger', percent };
  if (rawPercent >= 100) return { label: 'Budget fully used', detail: 'Your monthly limit has been reached. Increase it before recording another expense.', tone: 'danger', percent };
  if (rawPercent >= 75) return { label: 'Approaching limit', detail: 'You have used most of your budget. Review the next expense before adding it.', tone: 'warning', percent };
  return { label: 'On track', detail: 'You are currently within your monthly budget.', tone: 'success', percent };
}
function createDemoTransactions() {
  const today = new Date();
  const dayOffset = (offset) => localDateISO(new Date(today.getFullYear(), today.getMonth(), Math.max(1, today.getDate() - offset)));
  const seed = [
    { type: 'income', amount: 12000, category: 'Allowance', description: 'Monthly allowance', paymentMethod: 'Bank Transfer', offset: 8 },
    { type: 'expense', amount: 180, category: 'Food & Dining', description: 'Lunch at campus', paymentMethod: 'UPI', offset: 0 },
    { type: 'expense', amount: 60, category: 'Transportation', description: 'Auto to university', paymentMethod: 'UPI', offset: 1 },
    { type: 'expense', amount: 420, category: 'Education', description: 'Lab notebook and stationery', paymentMethod: 'Cash', offset: 2 },
    { type: 'expense', amount: 350, category: 'Food & Dining', description: 'Groceries and snacks', paymentMethod: 'UPI', offset: 3 },
    { type: 'expense', amount: 799, category: 'Shopping', description: 'Everyday essentials', paymentMethod: 'Debit Card', offset: 4 },
    { type: 'expense', amount: 150, category: 'Entertainment', description: 'Movie subscription', paymentMethod: 'UPI', offset: 5 },
    { type: 'income', amount: 1500, category: 'Part-time Work', description: 'Freelance project', paymentMethod: 'Bank Transfer', offset: 6 },
  ];
  return seed.map((item, index) => ({ id: `demo-${Date.now()}-${index}`, type: item.type, amount: item.amount, category: item.category, date: dayOffset(item.offset), description: item.description, paymentMethod: item.paymentMethod }));
}
function sortedTransactions() {
  return [...state.transactions].sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.id).localeCompare(String(a.id)));
}
function currentData() {
  const month = currentMonthKey();
  const monthTransactions = getMonthTransactions(state.transactions, month);
  const totals = calculateTotals(monthTransactions);
  const categoryTotals = sumByCategory(monthTransactions);
  const budgetPercent = state.budget > 0 ? (totals.expenses / state.budget) * 100 : 0;
  return { month, monthTransactions, totals, categoryTotals, balance: totals.income - totals.expenses, budgetPercent, budgetStatus: budgetStatus(totals.expenses, state.budget) };
}
function persistTransactions() { persist('transactions', state.transactions); }
function notify(message, kind = 'success') {
  toast.textContent = message;
  toast.className = `toast toast-visible ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = 'toast'; }, 2800);
}
function navigate(view) {
  if (!VIEW_META[view]) return;
  state.activeView = view;
  if (view !== 'transactions') state.editingId = null;
  state.mobileOpen = false;
  render();
}
function viewAllTransactions() {
  
  state.search = '';
  state.typeFilter = 'all';
  state.categoryFilter = 'all';
  state.monthFilter = 'all';
  navigate('transactions');
}

function beginAddTransaction() {
  state.editingId = null;
  state.formDraft = blankForm();
  
  state.formDraft.category = state.categories.expense[0];
  state.formMessage = { text: '', kind: '' };
  state.activeView = 'transactions';
  state.mobileOpen = false;
  render();
  document.getElementById('transaction-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function getEditingTransaction() { return state.transactions.find((item) => item.id === state.editingId) || null; }
function getFilteredTransactions() {
  const query = state.search.trim().toLowerCase();
  return sortedTransactions().filter((transaction) => {
    const searchable = `${transaction.description} ${transaction.category} ${transaction.paymentMethod || ''}`.toLowerCase();
    return searchable.includes(query)
      && (state.typeFilter === 'all' || transaction.type === state.typeFilter)
      && (state.categoryFilter === 'all' || transaction.category === state.categoryFilter)
      && (state.monthFilter === 'all' || transaction.date.slice(0, 7) === state.monthFilter);
  });
}
function categoryMeta(category) {
  return CATEGORY_META[category] || { icon: '🏷️', color: '#64748B' };
}
function renderSummaryCard({ label, value, helper, icon, tone = 'navy', badge = '' }) {
  return `<article class="summary-card summary-${tone}"><div class="summary-topline"><span class="summary-icon icon-${tone}" aria-hidden="true">${icon}</span>${badge ? `<span class="summary-badge ${tone === 'expense' ? 'badge-red' : ''}">${badge}</span>` : ''}</div><p class="summary-label">${label}</p><p class="summary-value">${value}</p><p class="summary-helper">${helper}</p></article>`;
}

function renderTransactionRows(transactions, compact = false) {
  if (!transactions.length) {
    return `<div class="empty-state"><span class="empty-illustration" aria-hidden="true">₹</span><strong>${compact ? 'Your activity starts here' : 'No transactions found'}</strong><p>${compact ? 'Add your first transaction to see where your money goes.' : 'Try another search or filter, or add a new transaction.'}</p>${compact ? `<button class="button button-primary" type="button" data-action="add-transaction">＋ Add your first transaction</button>` : ''}</div>`;
  }
  return transactions.map((transaction) => {
    const meta = categoryMeta(transaction.category);
    return `<div class="transaction-row">
      <span class="category-icon" style="--category-color:${meta.color}" aria-hidden="true">${meta.icon}</span>
      <div class="transaction-main"><strong title="${escapeHTML(transaction.description)}">${escapeHTML(transaction.description)}</strong><span>${escapeHTML(transaction.category)} <i>·</i> ${formatDate(transaction.date)}</span></div>
      <div class="transaction-side"><strong class="transaction-money ${transaction.type}">${transaction.type === 'income' ? '+' : '−'}${money(transaction.amount)}</strong><span>${escapeHTML(transaction.paymentMethod || 'Other')}</span></div>
      ${compact ? '' : `<div class="row-actions"><button type="button" class="row-action" data-action="edit" data-id="${escapeHTML(transaction.id)}" aria-label="Edit ${escapeHTML(transaction.description)}" title="Edit transaction">✎</button><button type="button" class="row-action delete-action" data-action="delete" data-id="${escapeHTML(transaction.id)}" aria-label="Delete ${escapeHTML(transaction.description)}" title="Delete transaction">×</button></div>`}
    </div>`;
  }).join('');
}

function renderTransactionPanel({ transactions, compact = false, filters = false }) {
  const categories = state.categories.expense.concat(state.categories.income);
  const months = [];
  for (let i = 0; i < state.transactions.length; i++) {
    const category = state.transactions[i].category;
    const month = state.transactions[i].date.slice(0, 7);
    if (!categories.includes(category)) categories.push(category);
    if (month && !months.includes(month)) months.push(month);
  }
  categories.sort();
  months.sort().reverse();
  return `<article class="panel transaction-list-panel ${compact ? 'compact-list-panel' : ''}">
    <div class="panel-heading transaction-list-heading"><div><span class="section-kicker">YOUR ACTIVITY</span><h2>${compact ? 'Recent transactions' : 'All transactions'}</h2><p>${compact ? 'A quick look at your latest activity.' : `${transactions.length} ${transactions.length === 1 ? 'record' : 'records'} matching your filters.`}</p></div></div>
    ${filters ? `<div class="transaction-filters">
      <label class="search-control"><span aria-hidden="true">⌕</span><input id="transaction-search" type="search" placeholder="Search transactions..." value="${escapeHTML(state.search)}" aria-label="Search transactions"></label>
      <select id="type-filter" aria-label="Filter by transaction type"><option value="all" ${state.typeFilter === 'all' ? 'selected' : ''}>All types</option><option value="expense" ${state.typeFilter === 'expense' ? 'selected' : ''}>Expenses</option><option value="income" ${state.typeFilter === 'income' ? 'selected' : ''}>Income</option></select>
      <select id="category-filter" aria-label="Filter by category"><option value="all">All categories</option>${categories.map((category) => `<option value="${escapeHTML(category)}" ${state.categoryFilter === category ? 'selected' : ''}>${escapeHTML(category)}</option>`).join('')}</select>
      <select id="month-filter" aria-label="Filter by month"><option value="all" ${state.monthFilter === 'all' ? 'selected' : ''}>All months</option>${months.map((month) => `<option value="${month}" ${state.monthFilter === month ? 'selected' : ''}>${formatMonth(month)}</option>`).join('')}</select>
    </div>` : ''}
    <div class="transaction-list" id="transaction-list-results">${renderTransactionRows(transactions, compact)}</div>
    ${compact ? `<div class="transaction-panel-footer"><span>${transactions.length ? `Showing the latest ${transactions.length} ${transactions.length === 1 ? 'transaction' : 'transactions'}` : 'Your latest activity will appear here'}</span><button class="text-button" type="button" data-action="view-all-transactions">View all transactions <span aria-hidden="true">→</span></button></div>` : ''}
  </article>`;
}
function renderBudgetOverview(expenses, budget, expanded = false, onManage = false) {
  const status = budgetStatus(expenses, budget);
  const percent = budget > 0 ? (expenses / budget) * 100 : 0;
  const visualPercent = Math.min(Math.max(percent, 0), 100);
  const hasBudget = Number(budget) > 0;
  const remaining = hasBudget ? budget - expenses : 0;
  const radius = 55;
  const circumference = 2 * Math.PI * radius;
  const dash = budget > 0 ? circumference * (1 - visualPercent / 100) : circumference;
  return `<article class="panel budget-panel ${expanded ? 'budget-panel-expanded' : ''}">
    <div class="panel-heading"><div><span class="section-kicker">SPENDING LIMIT</span><h2>${expanded ? 'Your monthly budget' : 'Monthly budget'}</h2><p>${expanded ? 'A little awareness can go a long way.' : 'Keep your spending on track.'}</p></div><span class="panel-heading-icon" aria-hidden="true" title="Budget planner">▦</span></div>
    <div class="budget-visual"><svg class="budget-ring" viewBox="0 0 140 140" role="img" aria-label="${status.percent}% budget used"><circle cx="70" cy="70" r="${radius}" class="ring-track"/><circle cx="70" cy="70" r="${radius}" class="ring-progress ${status.tone}" stroke-dasharray="${circumference} ${circumference}" stroke-dashoffset="${dash}" transform="rotate(-90 70 70)"/></svg><div class="ring-label"><span>${hasBudget ? `${Math.round(percent)}%` : '—'}</span><strong>${money(expenses)}</strong><small>${hasBudget ? `of ${money(budget)}` : 'monthly limit not set'}</small></div></div>
    <div class="budget-remaining-line"><span>${!hasBudget ? 'Monthly budget' : remaining >= 0 ? 'Remaining this month' : 'Over budget by'}</span><strong class="${hasBudget && remaining < 0 ? 'negative-value' : ''}">${hasBudget ? money(Math.abs(remaining)) : 'Not set'}</strong></div>
    <div class="budget-progress-track"><div class="budget-progress-fill ${status.tone}" style="width:${visualPercent}%"></div></div>
    <div class="budget-status-note ${status.tone}"><span class="status-dot"></span><div><strong>${status.label}</strong><p>${status.detail}</p></div></div>
    ${onManage ? `<button class="button button-outline budget-manage" type="button" data-view="budget">Manage budget <span aria-hidden="true">→</span></button>` : ''}
  </article>`;
}
function renderDashboard() {
  const data = currentData();
  const budgetHelper = state.budget > 0 ? `${money(Math.max(state.budget - data.totals.expenses, 0))} left in your plan` : 'Choose a monthly spending limit';
  const categoryPreview = data.categoryTotals.length ? `<div class="category-preview-list">${data.categoryTotals.slice(0, 4).map((item) => `<div class="category-preview-row"><span class="category-icon" style="--category-color:${item.color}" aria-hidden="true">${item.icon}</span><span class="category-name">${escapeHTML(item.category)}</span><div class="mini-category-track"><span style="width:${data.totals.expenses ? (item.amount / data.totals.expenses) * 100 : 0}%;background:${item.color}"></span></div><strong>${money(item.amount)}</strong></div>`).join('')}</div>` : `<div class="inline-empty"><span class="empty-illustration" aria-hidden="true">▥</span><div><strong>Your categories will appear here</strong><p>Add an expense to start your spending breakdown.</p></div></div>`;
  const todayLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const topCategory = data.categoryTotals[0]?.category || 'Add an expense to begin';
  return `<section class="dashboard-hero" aria-label="SpendWise introduction">
      <div class="hero-grid-glow" aria-hidden="true"></div><div class="hero-orb hero-orb-one" aria-hidden="true"></div><div class="hero-orb hero-orb-two" aria-hidden="true"></div>
      <div class="hero-copy">
        <div class="hero-meta"><span class="hero-live-dot"></span><span>YOUR MONEY, IN ONE PLACE</span><span class="hero-meta-divider"></span><span>${todayLabel}</span></div>
        <h2>Make your money<br><span>move with meaning.</span></h2>
        <p>Track the little things. Understand the bigger picture.</p>
        <div class="hero-actions"><button class="hero-primary-action" type="button" data-view="analytics">Explore my spending <span aria-hidden="true">↗</span></button></div>
        <div class="hero-trust"><span aria-hidden="true">✦</span> Your money, more clearly <i></i> Small steps. Clearer choices.</div>
      </div>
      <div class="hero-visual" aria-hidden="true">
        <div class="hero-orbit hero-orbit-large"></div><div class="hero-orbit hero-orbit-small"></div>
        <div class="hero-glass-card">
          <div class="hero-glass-heading"><span class="hero-card-mark">S</span><span><small>YOUR MONTHLY SNAPSHOT</small><strong>Money in motion</strong></span><span class="hero-card-menu">•••</span></div>
          <div class="hero-balance-label">Available balance</div><div class="hero-balance-value">${money(data.balance)}</div>
          <div class="hero-balance-caption"><span class="hero-balance-dot"></span> What remains after this month’s spending</div>
          <div class="hero-visual-chart"><div class="hero-chart-glow"></div><svg viewBox="0 0 320 92" preserveAspectRatio="none"><defs><linearGradient id="heroChartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#A78BFA" stop-opacity=".36"/><stop offset="100%" stop-color="#A78BFA" stop-opacity="0"/></linearGradient><linearGradient id="heroChartLine" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#C4B5FD"/><stop offset="100%" stop-color="#F0ABFC"/></linearGradient></defs><path d="M0 73 C24 70 28 48 54 57 S92 76 116 48 S154 62 177 35 S213 48 235 25 S281 33 320 9 L320 92 L0 92 Z" fill="url(#heroChartFill)"/><path d="M0 73 C24 70 28 48 54 57 S92 76 116 48 S154 62 177 35 S213 48 235 25 S281 33 320 9" fill="none" stroke="url(#heroChartLine)" stroke-width="2.8" stroke-linecap="round"/><circle cx="235" cy="25" r="4.5" fill="#FFFFFF" stroke="#C4B5FD" stroke-width="3"/></svg></div>
          <div class="hero-glass-stats"><div><span class="hero-stat-dot hero-stat-income"></span><small>Income</small><strong>${money(data.totals.income)}</strong></div><div><span class="hero-stat-dot hero-stat-expense"></span><small>Expenses</small><strong>${money(data.totals.expenses)}</strong></div></div>
        </div>
        <div class="hero-floating-pill hero-pill-top"><span class="hero-pill-icon income-pill-icon">↗</span><span><small>MONEY RECEIVED</small><strong>${money(data.totals.income)}</strong></span></div>
        <div class="hero-floating-pill hero-pill-bottom"><span class="hero-pill-icon insight-pill-icon">✦</span><span><small>TOP SPENDING CATEGORY</small><strong>${escapeHTML(topCategory)}</strong></span><span class="hero-pill-arrow">↗</span></div>
        <span class="hero-star hero-star-one">✦</span><span class="hero-star hero-star-two">✧</span>
      </div>
    </section>
    <section class="summary-grid" aria-label="Monthly summary">
      ${renderSummaryCard({ label: 'INCOME THIS MONTH', value: money(data.totals.income), helper: 'From the income you have recorded', icon: '↗', tone: 'income' })}
      ${renderSummaryCard({ label: 'EXPENSES THIS MONTH', value: money(data.totals.expenses), helper: 'Across your recorded purchases', icon: '↘', tone: 'expense' })}
      ${renderSummaryCard({ label: 'AVAILABLE BALANCE', value: money(data.balance), helper: 'What remains after monthly spending', icon: '₹', tone: 'navy' })}
      ${renderSummaryCard({ label: 'BUDGET USED', value: state.budget > 0 ? `${Math.round(data.budgetPercent)}%` : '—', helper: budgetHelper, icon: '◷', tone: 'purple', badge: data.budgetPercent >= 100 && state.budget > 0 ? 'Limit reached' : '' })}
    </section>
    <section class="dashboard-main-grid">${renderTransactionPanel({ transactions: sortedTransactions().slice(0, 5), compact: true })}${renderBudgetOverview(data.totals.expenses, state.budget, false, true)}</section>
    <section class="dashboard-bottom-grid"><article class="panel category-preview-panel"><div class="panel-heading"><div><span class="section-kicker">SPENDING BREAKDOWN</span><h2>Where your money goes</h2><p>Your expense categories this month.</p></div></div>${categoryPreview}</article>
    <article class="panel tip-panel"><div class="tip-art" aria-hidden="true"><span class="tip-spark spark-one">✦</span><span class="tip-coin">₹</span><span class="tip-spark spark-two">✧</span></div><span class="section-kicker">A LITTLE REMINDER</span><h2>Small steps count.</h2><p>Tracking even your smallest purchases can help you spot patterns and make your budget work harder.</p></article></section>`;
}
function categoryOptions(selected, type) {
  const list = state.categories[type];
  const selectedCategory = list.includes(selected) ? selected : list[0];
  return list.map((category) => `<option value="${escapeHTML(category)}" ${selectedCategory === category ? 'selected' : ''}>${escapeHTML(category)}</option>`).join('');
}
function renderTransactionForm() {
  const editing = getEditingTransaction();
  const form = state.formDraft;
  return `<article class="panel form-panel" id="transaction-editor"><div class="panel-heading form-panel-heading"><div><span class="section-kicker">TRANSACTION DETAILS</span><h2>${editing ? 'Edit transaction' : 'Add a transaction'}</h2><p>Keep each entry clear and easy to recognize.</p></div></div>
    <form class="transaction-form" id="transaction-form" novalidate>
      <div class="type-switch" role="group" aria-label="Transaction type"><button type="button" data-form-type="expense" class="${form.type === 'expense' ? 'selected expense-selected' : ''}"><span>↘</span> Expense</button><button type="button" data-form-type="income" class="${form.type === 'income' ? 'selected income-selected' : ''}"><span>↗</span> Income</button></div>
      <div class="form-grid">
        <label class="field full-field"><span>Amount <b>*</b></span><div class="currency-input"><span>₹</span><input name="amount" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="0.00" value="${escapeHTML(form.amount)}" required></div></label>
        <label class="field"><span>Category <b>*</b></span><select name="category" required>${categoryOptions(form.category, form.type)}</select></label>
        <label class="field"><span>Date <b>*</b></span><input name="date" type="date" value="${escapeHTML(form.date)}" required></label>
        <label class="field full-field"><span>Description <b>*</b></span><input name="description" type="text" maxlength="80" placeholder="e.g. Lunch at campus" value="${escapeHTML(form.description)}" required></label>
        <label class="field full-field"><span>Payment method</span><select name="paymentMethod">${PAYMENT_METHODS.map((method) => `<option value="${escapeHTML(method)}" ${form.paymentMethod === method ? 'selected' : ''}>${escapeHTML(method)}</option>`).join('')}</select></label>
      </div>
      <p class="form-note">Expense entries are checked against your recorded income and monthly budget.</p>
      ${state.formMessage.text ? `<p class="form-feedback ${state.formMessage.kind}" role="status" aria-live="polite">${escapeHTML(state.formMessage.text)}</p>` : ''}
      <div class="form-actions">${editing ? '<button type="button" class="button button-quiet" data-action="cancel-edit">Cancel</button>' : ''}<button type="submit" class="button button-primary form-submit">${editing ? 'Save changes' : '＋ Add transaction'}</button></div>
    </form></article>`;
}
function renderTransactions() {
  const filtered = getFilteredTransactions();
  return `<section class="section-intro"><div><h2>Every rupee, accounted for.</h2><p>Record income and expenses, then search or filter your history.</p></div><div class="section-pill"><span class="live-dot"></span> ${state.transactions.length} total records</div></section>
    <section class="transactions-page-grid">${renderTransactionForm()}${renderTransactionPanel({ transactions: filtered, filters: true })}</section>`;
}
function renderBudgetPage() {
  const data = currentData();
  const status = data.budgetStatus;
  return `<section class="section-intro"><div><h2>Give every rupee a purpose.</h2><p>Set a monthly limit and see how much room you have left.</p></div><div class="section-pill"><span class="live-dot"></span> ${formatMonth(data.month)}</div></section>
    <section class="budget-page-grid">${renderBudgetOverview(data.totals.expenses, state.budget, true, false)}
      <article class="panel budget-edit-panel"><span class="section-kicker">YOUR SPENDING PLAN</span><h2>Set your monthly budget</h2><p class="panel-description">Choose an amount that feels realistic for your student life. You can change it whenever you need.</p>
        <form class="budget-edit-form" id="budget-form"><label for="budget-input">Monthly budget (INR)</label><div class="currency-input budget-input"><span>₹</span><input id="budget-input" name="budget" type="number" min="0" step="1" placeholder="e.g. 10000" value="${escapeHTML(state.budgetDraft)}" required></div>
        <div class="budget-presets"><span>Quick set:</span>${[3000, 5000, 10000, 15000, 20000].map((value) => `<button type="button" data-budget-preset="${value}" class="${Number(state.budgetDraft) === value ? 'preset-active' : ''}">${money(value)}</button>`).join('')}</div>
        <button class="button button-primary" type="submit">Review budget change</button>${state.budgetFeedback ? `<p class="form-feedback ${state.budgetFeedback.startsWith('Enter') ? 'error' : 'success'}" role="status">${escapeHTML(state.budgetFeedback)}</p>` : ''}</form>
        <div class="budget-explainer"><span aria-hidden="true">✦</span><div><strong>How does SpendWise protect your plan?</strong><p>New expense entries are checked against your recorded income and monthly budget. This keeps the records within your plan; it cannot stop payments made outside this app.</p></div></div>
      </article></section>
      <section class="panel budget-advice-panel"><div class="advice-icon" aria-hidden="true">◎</div><div><h2>${status.label}</h2><p>${state.budget <= 0 ? 'Set a budget to begin monitoring monthly expenses.' : data.budgetPercent >= 100 ? 'Your recorded expenses are at or above your budget. Review your category breakdown to understand the biggest costs.' : data.budgetPercent >= 75 ? 'You have used most of this month’s budget. Consider reviewing optional spending before your next purchase.' : 'Keep recording purchases as they happen so your dashboard stays useful.'}</p></div></section>`;
}
function renderAnalytics() {
  const data = currentData();
  const expenses = data.monthTransactions.filter((item) => item.type === 'expense');
  let largest = null;
  for (let i = 0; i < expenses.length; i++) {
    if (!largest || expenses[i].amount > largest.amount) largest = expenses[i];
  }
  const average = data.totals.expenses / Math.max(1, new Date().getDate());
  const highest = data.categoryTotals[0];
  let maxAmount = 1;
  for (let i = 0; i < data.categoryTotals.length; i++) {
    if (data.categoryTotals[i].amount > maxAmount) maxAmount = data.categoryTotals[i].amount;
  }
  const categoryContent = data.categoryTotals.length ? `<div class="category-bar-list">${data.categoryTotals.map((item) => `<div class="category-bar-row"><div class="category-bar-title"><span class="category-icon small-category-icon" style="--category-color:${item.color}" aria-hidden="true">${item.icon}</span><strong>${escapeHTML(item.category)}</strong><span class="category-bar-amount">${money(item.amount)}</span></div><div class="category-track"><div class="category-fill" style="width:${(item.amount / maxAmount) * 100}%;background:${item.color}"></div></div><span class="category-share">${data.totals.expenses > 0 ? Math.round((item.amount / data.totals.expenses) * 100) : 0}% of spending</span></div>`).join('')}</div>` : `<div class="empty-state analytics-empty"><span class="empty-illustration" aria-hidden="true">▥</span><strong>No spending data yet</strong><p>Add a few expenses to see how your spending is divided.</p><button type="button" class="button button-primary" data-action="add-transaction">＋ Add transaction</button></div>`;
  return `<section class="section-intro"><div><h2>Know your spending habits.</h2><p>Simple insights based on the transactions you've recorded.</p></div><div class="section-pill">${formatMonth(data.month)}</div></section>
    <div class="analytics-stack"><div class="analytics-stat-grid">
      <article class="panel analytics-stat"><span class="analytics-stat-icon purple-soft">▥</span><span class="analytics-stat-label">Transactions this month</span><strong>${data.monthTransactions.length}</strong><small>Income and expenses combined</small></article>
      <article class="panel analytics-stat"><span class="analytics-stat-icon green-soft">↗</span><span class="analytics-stat-label">Average daily spend</span><strong>${money(average)}</strong><small>Expenses divided by elapsed days</small></article>
      <article class="panel analytics-stat"><span class="analytics-stat-icon amber-soft">✦</span><span class="analytics-stat-label">Top spending category</span><strong class="stat-category">${escapeHTML(highest?.category || '—')}</strong><small>${highest ? money(highest.amount) : 'Add an expense to begin'}</small></article>
      <article class="panel analytics-stat"><span class="analytics-stat-icon red-soft">↘</span><span class="analytics-stat-label">Largest expense</span><strong>${money(largest ? largest.amount : 0)}</strong><small class="truncate-text">${escapeHTML(largest?.description || 'No expenses this month')}</small></article>
    </div>
    <article class="panel category-analytics-panel"><div class="panel-heading"><div><span class="section-kicker">WHERE IT GOES</span><h2>Spending by category</h2><p>Expense breakdown for ${formatMonth(data.month)}.</p></div><span class="analytics-total">${money(data.totals.expenses)} <small>total spent</small></span></div>${categoryContent}</article></div>`;
}
function renderCategoryManager() {
  const type = state.categoryType;
  const defaults = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const categories = state.categories[type];
  return `<article class="panel category-manager-panel">
    <div class="panel-heading"><div><span class="section-kicker">MAKE IT YOURS</span><h2>Manage categories</h2><p>Add or remove labels to match the way you use your money.</p></div><span class="panel-heading-icon" aria-hidden="true" title="Manage categories">▤</span></div>
    <div class="category-type-switch"><button type="button" data-category-type="expense" class="${type === 'expense' ? 'selected' : ''}">Expense categories</button><button type="button" data-category-type="income" class="${type === 'income' ? 'selected' : ''}">Income categories</button></div>
    <form id="category-form" class="category-add-form"><label class="field"><span>New category name</span><input name="categoryName" type="text" maxlength="24" placeholder="e.g. Coffee runs" required></label><button type="submit" class="button button-primary">Add category</button></form>
    ${state.categoryFeedback ? `<p class="form-feedback ${state.categoryFeedback.startsWith('Added') || state.categoryFeedback.startsWith('Removed') ? 'success' : 'error'}" role="status">${escapeHTML(state.categoryFeedback)}</p>` : ''}
    <div class="category-chip-list">${categories.map((category) => `<span class="managed-category-chip"><span>${escapeHTML(category)}</span>${defaults.includes(category) ? '<small>Default</small>' : '<small>Custom</small>'}<button type="button" data-action="remove-category" data-category="${escapeHTML(category)}" aria-label="Remove ${escapeHTML(category)} category" title="Remove ${escapeHTML(category)}"><span aria-hidden="true">×</span></button></span>`).join('')}</div>
    <p class="category-manager-hint"><strong>Remove a category:</strong> Select the × beside any category. Categories used by saved transactions must be cleared from those transactions first. Keep at least one category in each list.</p>
  </article>`;
}
function renderSettings() {
  return `<section class="section-intro"><div><h2>Make SpendWise yours.</h2><p>Choose how you organise and view your money.</p></div></section>
    <div class="settings-stack">
      <article class="panel setting-row-panel"><div class="setting-icon purple-soft" aria-hidden="true">◐</div><div class="setting-copy"><h2>Appearance</h2><p>Choose a look that's comfortable for you. Your preference is saved in this browser.</p></div><button type="button" class="theme-choice ${state.theme === 'dark' ? 'theme-choice-dark' : ''}" data-action="toggle-theme"><span aria-hidden="true">${state.theme === 'light' ? '☾' : '☀'}</span>${state.theme === 'light' ? 'Switch to dark' : 'Switch to light'}</button></article>
      ${renderCategoryManager()}
      <article class="panel setting-row-panel"><div class="setting-icon blue-soft" aria-hidden="true">⇩</div><div class="setting-copy"><h2>Export your transactions</h2><p>Download your saved records as a CSV file that opens in spreadsheet apps.</p></div><button type="button" class="button button-outline" data-action="export-csv">Download CSV</button></article>
      <article class="panel setting-row-panel"><div class="setting-icon green-soft" aria-hidden="true">✦</div><div class="setting-copy"><h2>Explore sample activity</h2><p>Load example income and expenses to see how the dashboard and spending summaries work.</p></div><button type="button" class="button button-outline" data-action="load-demo">Load sample data</button></article>
      <article class="panel setting-row-panel danger-setting"><div class="setting-icon red-soft" aria-hidden="true">⌫</div><div class="setting-copy"><h2>Clear saved data</h2><p>Remove transactions, custom categories and budget preferences. The appearance will return to light mode.</p></div><button type="button" class="button button-danger-outline" data-action="clear-data">Clear all data</button></article>
      ${state.settingsFeedback ? `<p class="settings-feedback" role="status">${escapeHTML(state.settingsFeedback)}</p>` : ''}
      <article class="panel about-panel"><div class="about-logo">S<span>.</span></div><div><span class="section-kicker">A LITTLE ABOUT SPENDWISE</span><h2>Money, made easier to understand.</h2><p>SpendWise is a simple money companion for student life. Keep everyday income and purchases together, organise them into categories, set a monthly spending plan and see where your money goes. Your entries are saved in this browser, so you can return to your records on this device without creating an account.</p><div class="technology-chips"><span>Everyday tracking</span><span>Monthly planning</span><span>Spending insights</span><span>Saved on this device</span></div></div></article>
    </div>`;
}
function renderConfirmationModal() {
  if (state.pendingTransaction) {
    const item = state.pendingTransaction;
    return `<div class="confirm-backdrop" data-modal-backdrop><section class="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><span class="confirm-icon ${item.type === 'income' ? 'green-soft' : 'purple-soft'}">${item.type === 'income' ? '↗' : '↘'}</span><span class="section-kicker">PLEASE CHECK THE DETAILS</span><h2 id="confirm-title">${item.isEdit ? 'Confirm your changes' : 'Confirm this transaction'}</h2><p class="confirm-description">Make sure the details are correct before saving.</p><div class="confirm-details"><div><span>Type</span><strong>${item.type === 'income' ? 'Income' : 'Expense'}</strong></div><div><span>Amount</span><strong class="${item.type}">${money(item.amount)}</strong></div><div><span>Category</span><strong>${escapeHTML(item.category)}</strong></div><div><span>Description</span><strong>${escapeHTML(item.description)}</strong></div><div><span>Date</span><strong>${formatDate(item.date)}</strong></div><div><span>Payment method</span><strong>${escapeHTML(item.paymentMethod)}</strong></div></div>${item.warning ? `<p class="confirm-warning">⚠ ${escapeHTML(item.warning)}</p>` : ''}<div class="confirm-actions"><button type="button" class="button button-quiet" data-action="cancel-confirmation">Go back</button><button type="button" class="button button-primary" data-action="confirm-transaction">Confirm and save</button></div></section></div>`;
  }
  if (state.pendingBudget !== null) {
    const value = state.pendingBudget;
    const spends = currentData().totals.expenses;
    const warning = value > 0 && value < spends ? 'This new limit is lower than the expenses already recorded this month. New expense entries will be paused until the limit is increased.' : value === 0 ? 'Your monthly budget will be removed. You can set another one at any time.' : 'Your monthly spending indicator will use this amount as its limit.';
    return `<div class="confirm-backdrop" data-modal-backdrop><section class="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-budget-title"><span class="confirm-icon purple-soft">▦</span><span class="section-kicker">BUDGET REVIEW</span><h2 id="confirm-budget-title">Confirm budget change</h2><p class="confirm-description">You are setting your monthly spending limit to:</p><div class="confirm-budget-amount">${value > 0 ? money(value) : 'No budget'}</div><p class="confirm-warning">${escapeHTML(warning)}</p><div class="confirm-actions"><button type="button" class="button button-quiet" data-action="cancel-confirmation">Go back</button><button type="button" class="button button-primary" data-action="confirm-budget">Confirm budget</button></div></section></div>`;
  }
  if (state.pendingCategory) {
    const item = state.pendingCategory;
    const isAdding = item.action === 'add';
    return `<div class="confirm-backdrop" data-modal-backdrop><section class="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-category-title"><span class="confirm-icon ${isAdding ? 'purple-soft' : 'red-soft'}">${isAdding ? '🏷' : '×'}</span><span class="section-kicker">CATEGORY REVIEW</span><h2 id="confirm-category-title">${isAdding ? 'Add this category?' : 'Remove this category?'}</h2><p class="confirm-description">${isAdding ? 'Check the category details before adding it to your list.' : 'This category will no longer be available when recording new transactions.'}</p><div class="confirm-details"><div><span>Category</span><strong>${escapeHTML(item.name)}</strong></div><div><span>Applies to</span><strong>${item.type === 'expense' ? 'Expenses' : 'Income'}</strong></div></div>${!isAdding ? '<p class="confirm-warning">Existing transactions are not changed. You can only remove a category when no saved transaction is using it.</p>' : '<p class="confirm-description category-confirm-note">You can remove it later from Settings if you no longer need it.</p>'}<div class="confirm-actions"><button type="button" class="button button-quiet" data-action="cancel-confirmation">Cancel</button><button type="button" class="button ${isAdding ? 'button-primary' : 'button-danger-outline'}" data-action="confirm-category">${isAdding ? 'Add category' : 'Remove category'}</button></div></section></div>`;
  }
  return '';
}
function render() {
  const meta = VIEW_META[state.activeView] || VIEW_META.dashboard;
  document.getElementById('page-title').textContent = meta.title;
  document.getElementById('page-eyebrow').textContent = meta.eyebrow;
  document.getElementById('topbar-date').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  document.querySelectorAll('.site-nav [data-view]').forEach((button) => {
    const active = button.dataset.view === state.activeView;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  siteNav.classList.toggle('nav-open', state.mobileOpen);
  topbar.classList.toggle('topbar-menu-open', state.mobileOpen);
  mobileNavBackdrop.classList.toggle('is-visible', state.mobileOpen);
  mobileNavBackdrop.setAttribute('aria-hidden', String(!state.mobileOpen));
  document.body.classList.toggle('nav-drawer-open', state.mobileOpen);
  const menuButton = document.getElementById('mobile-menu-button');
  menuButton.setAttribute('aria-expanded', String(state.mobileOpen));
  menuButton.setAttribute('aria-label', state.mobileOpen ? 'Close navigation' : 'Open navigation');
  document.documentElement.dataset.theme = state.theme;
  updateThemeButton();
  const viewRenderers = { dashboard: renderDashboard, transactions: renderTransactions, budget: renderBudgetPage, analytics: renderAnalytics, settings: renderSettings };
  appView.innerHTML = `${viewRenderers[state.activeView]()}<footer class="app-footer"><span>SpendWise</span><span>Your money, more clearly.</span><span>Plan thoughtfully · Spend confidently</span></footer>${renderConfirmationModal()}`;
  if (state.activeView === 'transactions' && state.editingId) document.getElementById('transaction-editor')?.scrollIntoView({ block: 'nearest' });
}
function saveDraftFromForm(form) {
  const formData = new FormData(form);
  state.formDraft = {
    ...state.formDraft,
    amount: String(formData.get('amount') ?? ''),
    category: String(formData.get('category') ?? state.formDraft.category),
    date: String(formData.get('date') ?? state.formDraft.date),
    description: String(formData.get('description') ?? ''),
    paymentMethod: String(formData.get('paymentMethod') ?? 'Other'),
  };
}
function validateTransaction(formData) {
  const oldTransaction = getEditingTransaction();
  const targetMonth = formData.date.slice(0, 7);
  const newTransaction = {
    ...formData,
    id: oldTransaction ? oldTransaction.id : 'new-transaction',
  };

  const updatedTransactions = oldTransaction
    ? state.transactions.map((item) => item.id === oldTransaction.id ? newTransaction : item)
    : [...state.transactions, newTransaction];


  if (formData.type === 'expense') {
    const previousTransactions = state.transactions.filter((item) => {
      const isBeingEdited = oldTransaction && item.id === oldTransaction.id;
      const isSameMonth = String(item.date || '').slice(0, 7) === targetMonth;
      return !isBeingEdited && isSameMonth;
    });
    const previousTotals = calculateTotals(previousTransactions);
    const availableBalance = previousTotals.income - previousTotals.expenses;

    if (Number(formData.amount) > availableBalance) {
      return {
        ok: false,
        message: `Not enough balance. You have ${money(Math.max(availableBalance, 0))} available for ${formatMonth(targetMonth)}, but this expense is ${money(formData.amount)}. Add income or reduce the expense amount.`,
      };
    }
  }


  const monthsToCheck = [targetMonth];
  if (oldTransaction) {
    const oldMonth = oldTransaction.date.slice(0, 7);
    if (oldMonth !== targetMonth) monthsToCheck.push(oldMonth);
  }

  for (const month of monthsToCheck) {
    const monthTotals = calculateTotals(getMonthTransactions(updatedTransactions, month));
    if (monthTotals.expenses > monthTotals.income) {
      return {
        ok: false,
        message: `This change would leave ${formatMonth(month)} with more expenses than recorded income. Add income or reduce the expenses first.`,
      };
    }
  }


  let warning = '';
  if (formData.type === 'expense' && targetMonth === currentMonthKey() && state.budget > 0) {
    const monthTotals = calculateTotals(getMonthTransactions(updatedTransactions, currentMonthKey()));

    if (monthTotals.expenses > state.budget) {
      return {
        ok: false,
        message: `This expense would exceed your monthly budget by ${money(monthTotals.expenses - state.budget)}. Increase your budget first if the new limit is intentional.`,
      };
    }

    if (monthTotals.expenses >= state.budget * 0.75) {
      warning = monthTotals.expenses >= state.budget
        ? 'This entry will use the full monthly budget. Further expense entries will be paused until you increase the budget.'
        : `After this entry, you will have used ${Math.round((monthTotals.expenses / state.budget) * 100)}% of your monthly budget.`;
    }
  }

  return { ok: true, warning };
}
function handleTransactionSubmit(form) {
  saveDraftFromForm(form);
  const amount = Number(state.formDraft.amount);
  const description = state.formDraft.description.trim();
  if (!Number.isFinite(amount) || amount <= 0) {
    state.formMessage = { text: 'Enter an amount greater than ₹0.', kind: 'error' };
    render(); return;
  }
  if (!description) {
    state.formMessage = { text: 'Add a short description for this transaction.', kind: 'error' };
    render(); return;
  }
  if (!state.formDraft.date) {
    state.formMessage = { text: 'Choose a transaction date.', kind: 'error' };
    render(); return;
  }

  const formData = { ...state.formDraft, amount, description };
  const validation = validateTransaction(formData);
  if (!validation.ok) {
    state.formMessage = { text: validation.message, kind: 'error' };
    render();
    notify(validation.message, 'error');
    return;
  }

  state.pendingTransaction = {
    ...formData,
    isEdit: Boolean(state.editingId),
    warning: validation.warning,
  };
  render();
}
function confirmTransaction() {
  if (!state.pendingTransaction) return;
  const formData = { ...state.pendingTransaction };
  delete formData.isEdit;
  delete formData.warning;


  const validation = validateTransaction(formData);
  if (!validation.ok) {
    state.pendingTransaction = null;
    state.formMessage = { text: validation.message, kind: 'error' };
    render();
    return;
  }

  if (state.editingId) {
    state.transactions = state.transactions.map((item) => item.id === state.editingId ? { ...item, ...formData } : item);
    state.editingId = null;
    notify('Transaction updated successfully.');
  } else {
    const id = `tx-${Date.now()}-${state.transactions.length + 1}`;
    state.transactions.unshift({ ...formData, id });
    notify('Transaction added successfully.');
  }
  persistTransactions();
  state.pendingTransaction = null;
  state.formDraft = blankForm();
  state.formMessage = { text: '', kind: '' };
  render();
}
function handleBudgetSubmit(form) {
  const rawValue = new FormData(form).get('budget');
  const value = Number(rawValue);
  if (!String(rawValue).trim() || !Number.isFinite(value) || value < 0) {
    state.budgetFeedback = 'Enter a valid monthly budget of ₹0 or more.';
    render();
    return;
  }
  state.pendingBudget = value;
  render();
}
function confirmBudgetChange() {
  if (state.pendingBudget === null) return;
  state.budget = state.pendingBudget;
  state.budgetDraft = state.budget > 0 ? String(state.budget) : '';
  persist('budget', String(state.budget));
  persist('budgetWasSet', 'yes');
  state.pendingBudget = null;
  state.budgetFeedback = state.budget > 0 ? 'Your monthly spending limit has been updated.' : 'Your monthly budget has been removed.';
  render();
  notify(state.budget > 0 ? 'Monthly budget saved.' : 'Monthly budget removed.');
}
function saveCategory(form) {
  const name = String(new FormData(form).get('categoryName') || '').trim();
  if (name.length < 2) {
    state.categoryFeedback = 'Enter a category name with at least two characters.';
    render(); return;
  }
  const list = state.categories[state.categoryType];
  if (list.some((item) => item.toLowerCase() === name.toLowerCase())) {
    state.categoryFeedback = 'That category already exists.';
    render(); return;
  }

  state.pendingCategory = { action: 'add', name, type: state.categoryType };
  render();
}
function removeCategory(name) {
  const list = state.categories[state.categoryType];
  const inUse = state.transactions.some((item) => item.type === state.categoryType && item.category === name);

  if (inUse) {
    state.categoryFeedback = `“${name}” is used by a saved transaction. Edit or remove that transaction before deleting this category.`;
    render();
    return;
  }

  if (list.length <= 1) {
    state.categoryFeedback = 'Keep at least one category in this list.';
    render();
    return;
  }

  
  state.pendingCategory = { action: 'remove', name, type: state.categoryType };
  render();
}
function confirmCategoryChange() {
  const item = state.pendingCategory;
  if (!item) return;

  const list = state.categories[item.type];
  if (item.action === 'add') {

    if (list.some((category) => category.toLowerCase() === item.name.toLowerCase())) {
      state.categoryFeedback = 'That category already exists.';
      state.pendingCategory = null;
      render();
      return;
    }
    list.push(item.name);
    persist('categories', state.categories);
    state.categoryFeedback = `Added “${item.name}” to your ${item.type} categories.`;
    state.pendingCategory = null;
    render();
    notify('Category added.');
    return;
  }

  
  const inUse = state.transactions.some((transaction) => transaction.type === item.type && transaction.category === item.name);
  if (inUse || list.length <= 1) {
    state.categoryFeedback = inUse
      ? `“${item.name}” is used by a saved transaction. Edit or remove that transaction first.`
      : 'Keep at least one category in this list.';
    state.pendingCategory = null;
    render();
    return;
  }

  state.categories[item.type] = list.filter((category) => category !== item.name);
  persist('categories', state.categories);

  if (state.formDraft.type === item.type && state.formDraft.category === item.name) {
    state.formDraft.category = state.categories[item.type][0];
  }
  if (state.categoryFilter === item.name) state.categoryFilter = 'all';

  state.categoryFeedback = `Removed “${item.name}”.`;
  state.pendingCategory = null;
  render();
  notify('Category removed.');
}
function downloadTransactionsCSV() {
  if (!state.transactions.length) {
    notify('There are no transactions to export.', 'info');
    return;
  }
  const columns = ['Date', 'Type', 'Description', 'Category', 'Payment method', 'Amount'];
  const rows = state.transactions.map((item) => [item.date, item.type, item.description, item.category, item.paymentMethod, item.amount]);
  const csvCell = (value) => {
    let text = String(value ?? '');
    if (/^[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const csv = [columns, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
  const file = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'spendwise-transactions.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify('Your transaction file is ready.');
}
function openEdit(id) {
  const transaction = state.transactions.find((item) => item.id === id);
  if (!transaction) return;
  state.editingId = id;
  const availableCategories = state.categories[transaction.type];
  state.formDraft = { type: transaction.type, amount: String(transaction.amount), category: availableCategories.includes(transaction.category) ? transaction.category : availableCategories[0], date: transaction.date, description: transaction.description, paymentMethod: transaction.paymentMethod || 'Other' };
  state.formMessage = { text: 'Editing existing transaction', kind: 'info' };
  state.activeView = 'transactions';
  state.mobileOpen = false;
  render();
  document.getElementById('transaction-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function deleteTransaction(id) {
  const transaction = state.transactions.find((item) => item.id === id);
  if (!transaction) return;
  const remainingTransactions = state.transactions.filter((item) => item.id !== id);
  const month = transaction.date.slice(0, 7);
  const monthTotals = calculateTotals(getMonthTransactions(remainingTransactions, month));
  if (monthTotals.expenses > monthTotals.income) {
    notify('This income is supporting recorded expenses. Edit or remove those expenses before deleting it.', 'error');
    return;
  }
  if (!window.confirm(`Delete “${transaction.description}”? This action cannot be undone.`)) return;
  state.transactions = remainingTransactions;
  persistTransactions();
  if (state.editingId === id) {
    state.editingId = null;
    state.formDraft = blankForm();
    state.formDraft.category = state.categories.expense[0];
  }
  render();
  notify('Transaction deleted.');
}
function loadDemoData() {
  const message = state.transactions.length ? 'Replace your current transactions with demonstration data?' : 'Load sample transactions to explore SpendWise?';
  if (!window.confirm(message)) return;
  state.transactions = createDemoTransactions();
  state.budget = 10000;
  state.budgetDraft = '10000';
  persistTransactions(); persist('budget', '10000'); persist('budgetWasSet', 'yes');
  state.settingsFeedback = 'Demo data loaded. Explore the dashboard, transactions and analytics.';
  render();
  notify('Demo data loaded.');
}
function clearAllData() {
  if (!window.confirm('Clear all transactions, budget and saved theme preference? This cannot be undone.')) return;
  try { Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key)); } catch (error) { console.warn('Unable to clear stored data.', error); }
  state.transactions = [];
  state.budget = 0;
  state.budgetDraft = '';
  state.categories = { expense: [...EXPENSE_CATEGORIES], income: [...INCOME_CATEGORIES] };
  state.pendingTransaction = null;
  state.pendingBudget = null;
  state.categoryFeedback = '';
  state.budgetFeedback = '';
  state.categoryType = 'expense';
  state.theme = 'light';
  state.editingId = null;
  state.search = '';
  state.typeFilter = 'all';
  state.categoryFilter = 'all';
  state.monthFilter = 'all';
  state.formDraft = blankForm();
  state.formMessage = { text: '', kind: '' };
  state.settingsFeedback = 'All saved data has been cleared.';
  state.activeView = 'dashboard';
  setTheme('light');
  render();
  notify('Saved data cleared.');
}
function updateSearchResults() {
  const results = document.getElementById('transaction-list-results');
  if (!results) return;

  const filtered = getFilteredTransactions();
  results.innerHTML = renderTransactionRows(filtered, false);

  const heading = document.querySelector('.transaction-list-heading p');
  if (heading) {
    const count = filtered.length;
    heading.textContent = `${count} ${count === 1 ? 'record' : 'records'} matching your filters.`;
  }
}

document.addEventListener('click', (event) => {
  if (event.target.matches('[data-modal-backdrop]')) {
    state.pendingTransaction = null;
    state.pendingBudget = null;
    state.pendingCategory = null;
    render();
    return;
  }
  const viewButton = event.target.closest('[data-view]');
  if (viewButton) { navigate(viewButton.dataset.view); return; }
  const formTypeButton = event.target.closest('[data-form-type]');
  if (formTypeButton) {
    saveDraftFromForm(document.getElementById('transaction-form'));
    state.formDraft.type = formTypeButton.dataset.formType;
    const categories = state.categories[state.formDraft.type];
    if (!categories.includes(state.formDraft.category)) state.formDraft.category = categories[0];
    state.formMessage = { text: '', kind: '' };
    render(); return;
  }
  const categoryTypeButton = event.target.closest('[data-category-type]');
  if (categoryTypeButton) {
    state.categoryType = categoryTypeButton.dataset.categoryType;
    state.categoryFeedback = '';
    render(); return;
  }
  const preset = event.target.closest('[data-budget-preset]');
  if (preset) {
    state.budgetDraft = String(Number(preset.dataset.budgetPreset));
    state.budgetFeedback = 'Budget preset selected. Save to apply it.';
    render(); return;
  }
  const actionButton = event.target.closest('[data-action]');
  if (actionButton) {
    const action = actionButton.dataset.action;
    if (action === 'add-transaction') beginAddTransaction();
    else if (action === 'view-all-transactions') viewAllTransactions();
    else if (action === 'toggle-theme') { setTheme(state.theme === 'light' ? 'dark' : 'light'); render(); }
    else if (action === 'edit') openEdit(actionButton.dataset.id);
    else if (action === 'delete') deleteTransaction(actionButton.dataset.id);
    else if (action === 'cancel-edit') { state.editingId = null; state.formDraft = blankForm(); state.formMessage = { text: '', kind: '' }; render(); }
    else if (action === 'load-demo') loadDemoData();
    else if (action === 'clear-data') clearAllData();
    else if (action === 'confirm-transaction') confirmTransaction();
    else if (action === 'confirm-budget') confirmBudgetChange();
    else if (action === 'confirm-category') confirmCategoryChange();
    else if (action === 'cancel-confirmation') { state.pendingTransaction = null; state.pendingBudget = null; state.pendingCategory = null; render(); }
    else if (action === 'remove-category') removeCategory(actionButton.dataset.category);
    else if (action === 'export-csv') downloadTransactionsCSV();
    return;
  }
  if (event.target.closest('#theme-toggle')) { state.mobileOpen = false; setTheme(state.theme === 'light' ? 'dark' : 'light'); render(); return; }
  if (event.target.closest('#mobile-menu-button')) { state.mobileOpen = !state.mobileOpen; render(); return; }

  if (state.mobileOpen && !event.target.closest('.topbar')) {
    state.mobileOpen = false;
    render();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && (state.pendingTransaction || state.pendingBudget || state.pendingCategory)) {
    state.pendingTransaction = null;
    state.pendingBudget = null;
    state.pendingCategory = null;
    render();
    return;
  }
  if (event.key === 'Escape' && state.mobileOpen) {
    state.mobileOpen = false;
    render();
  }
});

let lastScrollPosition = window.scrollY;
window.addEventListener('scroll', () => {
  const currentPosition = window.scrollY;
  const movement = currentPosition - lastScrollPosition;

  if (Math.abs(movement) > 6) {
    if (state.mobileOpen || currentPosition < 90 || movement < 0) {
      topbar.classList.remove('topbar-hidden');
    } else if (currentPosition > 140) {
      topbar.classList.add('topbar-hidden');
    }
    lastScrollPosition = currentPosition;
  }
}, { passive: true });

document.addEventListener('submit', (event) => {
  if (event.target.id === 'transaction-form') { event.preventDefault(); handleTransactionSubmit(event.target); }
  if (event.target.id === 'budget-form') { event.preventDefault(); handleBudgetSubmit(event.target); }
  if (event.target.id === 'category-form') { event.preventDefault(); saveCategory(event.target); }
});
document.addEventListener('input', (event) => {
  if (event.target.id === 'transaction-search') { state.search = event.target.value; updateSearchResults(); return; }
  if (event.target.id === 'budget-input') { state.budgetDraft = event.target.value; return; }
  if (event.target.closest('#transaction-form')) {
    const form = document.getElementById('transaction-form');
    if (form) saveDraftFromForm(form);
    return;
  }
});
document.addEventListener('change', (event) => {
  if (event.target.id === 'type-filter') state.typeFilter = event.target.value;
  else if (event.target.id === 'category-filter') state.categoryFilter = event.target.value;
  else if (event.target.id === 'month-filter') state.monthFilter = event.target.value;
  else return;
  updateSearchResults();
});

document.documentElement.dataset.theme = state.theme;
persistTransactionsIfMissing();
function persistTransactionsIfMissing() {
  try {
    if (localStorage.getItem(STORAGE_KEYS.transactions) === null && state.transactions.length) persistTransactions();
    if (localStorage.getItem(STORAGE_KEYS.budget) === null) persist('budget', String(state.budget));
    if (localStorage.getItem(STORAGE_KEYS.categories) === null) persist('categories', state.categories);
    if (localStorage.getItem(STORAGE_KEYS.theme) === null) persist('theme', state.theme);
  } catch { }
}
render();
