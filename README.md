# SpendWise — Student Expense and Budget Manager

SpendWise is a simple personal-finance companion designed for students. It helps users record income and everyday expenses, organise entries by category, plan a monthly spending limit, and understand where their money goes.

## Run the website


1. Open `index.html` in a modern browser.
2. For the most reliable browser storage behavior, open the folder in VS Code and use the Live Server extension.
3. Open **Settings → Explore sample activity** to load example records.

This is a static frontend website. It does not need React, Vite, npm, a backend, or a database.

## Main sections

- **Dashboard:** monthly income, monthly expenses, available balance, budget usage, recent transactions, category preview, and a spending reminder.
- **Transactions:** add, review, search, filter, edit, and delete income and expense records.
- **Budget planner:** choose a monthly budget, use quick amounts, review remaining budget, and see spending warnings.
- **Analytics:** view transaction count, average daily spending, highest-spending category, largest expense, and category totals.
- **Settings:** change the theme, add custom income/expense categories, export transactions as CSV, load sample activity, clear saved data, and read about SpendWise.

## Financial rules used by the app

1. The starting monthly budget is **₹0 / not set**. The user must choose a budget.
2. An expense must fit within the available balance for its month (recorded income minus existing expenses). If it does not, SpendWise shows a **Not enough balance** message. Only after this check passes does the app check the monthly budget and show a separate budget-limit message or warning.
3. When a monthly budget is set, a warning appears as spending approaches 75% of the limit.
4. An entry that would take current-month expenses above the budget is not saved. The user must increase the budget first if the new limit is intentional.
5. Reaching exactly 100% is allowed after a clear confirmation. Further expense entries are blocked until the budget is increased or removed.
6. These rules control records inside SpendWise only. The website is not connected to a bank or payment app and cannot stop a payment made outside it.

The balance check is based on income and expenses recorded in the same calendar month. The current version does not carry a previous month's unused balance into the next month.

## Confirmation steps

- Submitting an income or expense form opens a review window showing the amount, type, category, description, date, and payment method. The record is saved only after the user confirms.
- Saving a new monthly budget opens a second review window before the budget changes.
- Deleting a transaction, adding or removing a category, changing the budget, loading sample activity over existing records, and clearing saved data use a confirmation step where appropriate.

## Categories

SpendWise starts with useful income and expense categories. Users can add or remove categories in **Settings → Manage categories**. Adding a category opens a review dialog before saving; removing a category also requires confirmation. Both built-in and custom categories can be removed, but a category cannot be removed while a saved transaction uses it. At least one category must remain in each list. This keeps transaction history understandable and prevents records from losing their category.

## Export

The **Download CSV** option in Settings exports the saved transactions as `spendwise-transactions.csv`. The file can be opened in spreadsheet software.

## Technology

- **HTML5:** semantic page structure, navigation, forms, controls, and content.
- **CSS3:** colors, layouts, responsive design, states, modals, and animation.
- **Vanilla JavaScript:** application state, event handling, validation, calculations, filtering, rendering, and CSV export.
- **localStorage:** saves transactions, budget, the user’s chosen income and expense categories, and theme preference in the current browser profile.

There is no server-side storage or account synchronization. Data is specific to the current browser and device.

## Folder structure

```text
SpendWise_Vanilla_App/
├── index.html
├── README.md
├── .gitignore
├── css/
│   └── style.css
└── js/
    └── app.js
```

## Important JavaScript functions

- `readBudget()` loads the user's budget. A new installation starts at zero.
- `calculateTotals()` adds income and expenses using a basic `for` loop.
- `currentData()` prepares the current month's totals, category totals, balance, and budget status.
- `renderDashboard()` builds the dashboard from the current data.
- `handleTransactionSubmit()` validates the form and opens the transaction review window.
- `validateTransaction()` checks that monthly expenses do not exceed recorded monthly income or the set monthly budget.
- `confirmTransaction()` saves the transaction after the user approves the details.
- `handleBudgetSubmit()` and `confirmBudgetChange()` provide the two-step budget update.
- `saveCategory()` validates a new category and opens a review dialog. `removeCategory()` checks whether it can be removed and opens a confirmation dialog. `confirmCategoryChange()` applies the confirmed change and saves the updated list.
- `downloadTransactionsCSV()` creates a downloadable spreadsheet file.
