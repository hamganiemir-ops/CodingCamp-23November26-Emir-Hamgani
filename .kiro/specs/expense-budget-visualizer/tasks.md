# Implementation Plan: Expense & Budget Visualizer

## Overview

Build a single-page static web application using vanilla HTML, CSS, and JavaScript. The implementation follows a unidirectional data flow: every user action updates a central `state` object, persists to `localStorage`, then re-renders the UI. Chart.js is loaded via CDN. No build step is required — the project deploys directly to GitHub Pages.

## Tasks

- [ ] 1. Set up project structure and HTML skeleton
  - Create the root `index.html` with the full document structure: `<header>` (theme toggle), four `<section>` elements (balance, form, chart, list), Chart.js CDN `<script>` tag, and `js/script.js` `<script>` tag
  - Create `css/style.css` as an empty file linked from `index.html`
  - Create `js/script.js` with the `state` object, `CATEGORY_COLORS` constant, and a `DOMContentLoaded` listener that calls `init()`
  - Use only relative paths for all resource references
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 2. Implement core state management and localStorage persistence
  - [ ] 2.1 Implement `loadFromStorage()` and `saveToStorage()`
    - Read/write `ebv_transactions`, `ebv_spending_limit`, and `ebv_theme` keys
    - Wrap all `localStorage` calls in try/catch; fall back to in-memory state and display a one-time banner if storage is unavailable
    - On load, default to `theme: 'light'` and `sortOrder: 'default'` when no stored value exists
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 8.5_

  - [ ]* 2.2 Write property test for localStorage round-trip (Property 8)
    - **Property 8: LocalStorage round-trip preserves all transaction data**
    - **Validates: Requirements 5.1, 5.2, 5.3**

  - [ ]* 2.3 Write property test for spending limit and theme persistence (Property 12)
    - **Property 12: Spending limit and theme persistence round-trips**
    - **Validates: Requirements 7.2, 7.3, 8.3, 8.4**

- [ ] 3. Implement transaction input form and validation
  - [ ] 3.1 Implement `handleFormSubmit(event)` with full validation
    - Prevent default form submission
    - Validate: item name non-empty/non-whitespace, amount present, amount a positive number
    - Display per-field error messages in `#form-error` (`role="alert"`); clear errors on successful submission
    - On valid input: generate a unique `id` via `crypto.randomUUID()` (fall back to `Date.now().toString()`), set `createdAt` to `Date.now()`, push to `state.transactions`, call `saveToStorage()`, call `renderAll()`, then clear all form fields
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 3.2 Write property test for transaction addition grows list by one (Property 1)
    - **Property 1: Transaction addition grows the list by one**
    - **Validates: Requirements 1.2**

  - [ ]* 3.3 Write property test for invalid input rejection (Property 2)
    - **Property 2: Invalid inputs are rejected and leave state unchanged**
    - **Validates: Requirements 1.3, 1.5**

  - [ ]* 3.4 Write property test for form cleared after submission (Property 3)
    - **Property 3: Successful submission clears the input form**
    - **Validates: Requirements 1.4**

- [ ] 4. Implement transaction list rendering and deletion
  - [ ] 4.1 Implement `renderTransactionList()`
    - Apply current `state.sortOrder` to produce a sorted copy of `state.transactions` (do not mutate `state.transactions`)
    - Rebuild `<ul id="transaction-list">` by creating one `<li>` per transaction displaying name, amount (two decimal places), and category
    - Attach a delete button to each `<li>` wired to `handleDelete(id)`
    - Apply an over-limit CSS class to any transaction whose addition would push the running total over `state.spendingLimit`
    - _Requirements: 2.1, 2.2, 2.3, 7.5_

  - [ ] 4.2 Implement `handleDelete(id)`
    - Filter `state.transactions` to remove the matching id, call `saveToStorage()`, call `renderAll()`
    - _Requirements: 2.4, 2.5_

  - [ ]* 4.3 Write property test for transaction render completeness (Property 4)
    - **Property 4: Transaction render completeness**
    - **Validates: Requirements 2.2, 2.3**

  - [ ]* 4.4 Write property test for transaction deletion removes exactly the target item (Property 5)
    - **Property 5: Transaction deletion removes exactly the target item**
    - **Validates: Requirements 2.4**

- [ ] 5. Implement balance calculation and spending-limit highlight
  - [ ] 5.1 Implement `renderBalance()`
    - Compute total as the sum of all `state.transactions` amounts
    - Display in `#total-balance` formatted to two decimal places
    - Add/remove an over-limit CSS highlight class on `#total-balance` based on whether the total exceeds `state.spendingLimit`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 7.4, 7.6_

  - [ ]* 5.2 Write property test for total balance equals sum of amounts (Property 6)
    - **Property 6: Total balance equals the sum of all transaction amounts**
    - **Validates: Requirements 3.2, 3.3, 3.4**

  - [ ]* 5.3 Write property test for spending limit highlight correctness (Property 11)
    - **Property 11: Spending limit highlight correctness**
    - **Validates: Requirements 7.4, 7.5, 7.6**

- [ ] 6. Implement pie chart rendering
  - [ ] 6.1 Implement `renderPieChart()`
    - If `state.transactions` is empty, hide `<canvas id="spending-chart">` and show `#empty-state`; return early
    - Otherwise show the canvas, hide `#empty-state`
    - Destroy any existing Chart.js instance attached to the canvas before creating a new one
    - Compute per-category totals and pass them to Chart.js as a `'doughnut'` or `'pie'` chart using `CATEGORY_COLORS`
    - If Chart.js is not available (CDN failed), hide the canvas and show a "Chart unavailable" message
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 10.3_

  - [ ]* 6.2 Write property test for pie chart category percentages sum to 100 (Property 7)
    - **Property 7: Pie chart category percentages sum to 100**
    - **Validates: Requirements 4.6**

- [ ] 7. Checkpoint — wire up core flow
  - Connect `init()` to call `loadFromStorage()` then `renderAll()`; implement `renderAll()` to call `renderBalance()`, `renderTransactionList()`, and `renderPieChart()` in order
  - Verify: add a transaction → list updates, balance updates, chart updates; delete a transaction → same; reload page → data restored
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement transaction sorting
  - [ ] 8.1 Implement `handleSortChange(value)` and sorting logic inside `renderTransactionList()`
    - `'default'`: reverse-chronological order using `createdAt`
    - `'amount-asc'`: ascending by amount
    - `'amount-desc'`: descending by amount
    - `'category-alpha'`: ascending lexicographic by category (case-insensitive)
    - Update `state.sortOrder`, then call `renderTransactionList()`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ]* 8.2 Write property test for amount sort invariants (Property 9)
    - **Property 9: Amount sort invariants**
    - **Validates: Requirements 6.2, 6.3**

  - [ ]* 8.3 Write property test for category-alphabetical sort (Property 10)
    - **Property 10: Category-alphabetical sort is lexicographically ordered**
    - **Validates: Requirements 6.4**

- [ ] 9. Implement spending-limit input
  - [ ] 9.1 Implement `handleSpendingLimitChange(value)`
    - Parse the input value as a float; ignore non-numeric or negative values silently (retain previous limit)
    - Empty input sets `state.spendingLimit` to `null` (clears the limit)
    - Call `saveToStorage()` then `renderBalance()` and `renderTransactionList()` to update highlights
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [ ] 10. Implement theme toggle
  - [ ] 10.1 Implement `handleThemeToggle()`
    - Flip `state.theme` between `'light'` and `'dark'`
    - Set `data-theme` attribute on `<body>`
    - Save to `localStorage` under `ebv_theme`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [ ] 11. Write CSS — mobile-first layout and theming
  - [ ] 11.1 Implement base styles and CSS custom properties for theming
    - Define `--color-bg`, `--color-surface`, `--color-text`, `--color-accent`, `--color-over-limit` custom properties on `:root` (light) and `[data-theme="dark"]`
    - Style the four sections in single-column order: balance → form → chart → list
    - Ensure all interactive elements (buttons, inputs, selects) have `min-height: 44px`
    - _Requirements: 9.1, 9.2, 9.3, 9.5, 8.6_

  - [ ] 11.2 Implement responsive breakpoint at 768 px
    - Add a `@media (min-width: 768px)` block that arranges the layout to use available horizontal space (e.g., two-column grid for form + chart)
    - _Requirements: 9.4_

  - [ ] 11.3 Implement over-limit highlight styles and transition feedback
    - Define `.over-limit` class using `--color-over-limit` (e.g., red border or background tint)
    - Ensure all interactive element state changes have a CSS transition ≤ 50 ms
    - _Requirements: 7.4, 7.5, 7.6, 10.3_

- [ ] 12. Write README.md
  - Create `README.md` in the project root with: project description, instructions for running locally (open `index.html` in a browser), how to deploy to GitHub Pages, and a list of features
  - _Requirements: 11.6_

- [ ] 13. Final checkpoint — full integration review
  - Manually verify all sections of the Testing Strategy checklist from the design document
  - Confirm the file layout matches `index.html` at root, `css/style.css`, `js/script.js` with no build step
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints (tasks 7 and 13) validate incremental progress before moving on
- Property tests document behavioral invariants; since no test framework is in scope, they serve as a manual testing checklist
- The sort order is intentionally not persisted to `localStorage` — it resets to `'default'` on every page load
- `renderTransactionList()` must sort a **copy** of `state.transactions` to avoid mutating insertion order

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.4", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3"] },
    { "id": 5, "tasks": ["4.4", "5.1"] },
    { "id": 6, "tasks": ["5.2", "5.3", "6.1"] },
    { "id": 7, "tasks": ["6.2"] },
    { "id": 8, "tasks": ["7"] },
    { "id": 9, "tasks": ["8.1", "9.1", "10.1"] },
    { "id": 10, "tasks": ["8.2", "8.3"] },
    { "id": 11, "tasks": ["11.1"] },
    { "id": 12, "tasks": ["11.2", "11.3"] },
    { "id": 13, "tasks": ["12"] },
    { "id": 14, "tasks": ["13"] }
  ]
}
```
