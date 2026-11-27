# 💰 Expense & Budget Visualizer

A mobile-friendly web app for tracking daily spending. Add transactions, watch your balance update in real time, and see a live pie chart of your spending by category — all saved locally in your browser.

## Features

- **Transaction input** — Add expenses with a name, amount, and category (Food, Transport, Fun). Full validation with clear error messages.
- **Transaction list** — Scrollable history with per-item delete buttons and category badges.
- **Total balance** — Auto-updates as you add or remove transactions.
- **Pie chart** — Visual breakdown by category via Chart.js. Shows a friendly empty state when there is no data.
- **Sort** — Sort transactions by Amount (low→high or high→low) or Category (A–Z).
- **Spending limit** — Set a budget; the balance and transactions turn red when you exceed it.
- **Dark / light mode** — Toggle with the button in the header; preference is saved.
- **Persistent** — All data lives in `localStorage` and survives page reloads.

## Run Locally

No build step or server required — just open the file.

**Option 1 — Double-click**
Open `index.html` directly in Chrome, Firefox, Edge, or Safari.

**Option 2 — VS Code Live Server**
Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension, right-click `index.html`, and choose *Open with Live Server*.

**Option 3 — Python**
```bash
# From the project root
python -m http.server 8080
# Then open http://localhost:8080
```

## Deploy to GitHub Pages

1. Push the repository to GitHub (the root contains `index.html`).
2. Go to **Settings → Pages**.
3. Under *Branch*, select `main` and the root folder `/`, then click **Save**.
4. GitHub Pages will serve the app at `https://<username>.github.io/<repo-name>/`.

No build step needed — the project is static files only with relative paths throughout.

## File Structure

```
project-root/
├── index.html          ← single page app entry point
├── css/
│   └── style.css       ← all styles (mobile-first, CSS custom properties for theming)
├── js/
│   └── script.js       ← all application logic (vanilla JS, no frameworks)
└── README.md
```

## Tech Stack

| Concern | Technology |
|---|---|
| Structure | HTML5 |
| Styling | CSS3 (custom properties, grid, flexbox) |
| Logic | Vanilla JavaScript (ES6+) |
| Chart | [Chart.js](https://www.chartjs.org/) via CDN |
| Storage | Browser `localStorage` |
