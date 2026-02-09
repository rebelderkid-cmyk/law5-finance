# LAW5 Financial Model — Interactive Dashboard

<div align="center">

**A comprehensive 3-year SaaS financial projection tool built for investor presentations.**

`React 19` `Vite 7` `Single-Page App` `Zero Dependencies`

</div>

---

## Overview

LAW5 Finance is a fully interactive financial modeling dashboard designed for SaaS startups raising Seed to Series C funding. It provides real-time 36-month projections across revenue, costs, marketing, headcount, P&L, balance sheet, cash flow, cap table, and sensitivity analysis — all in a single React component with no external charting libraries.

## Features

### Financial Engine
- **36-month projection model** with monthly granularity across 3 fiscal years
- **Marketing Funnel-driven revenue** — Visitors > Leads > Trials > Customers flow directly into revenue calculations
- **Three-tier SaaS pricing** (Basic / Pro / Enterprise) with monthly + annual billing
- **Churn modeling** per tier with compounding monthly attrition
- **LLM cost strategies** — API Only, Own LLM, or Hybrid with fully editable budget line items
- **Sensitivity analysis** — re-runs the full model with adjustable multipliers (not linear approximation)

### Interactive Dashboards (11 Tabs)

| Tab | Description |
|-----|-------------|
| **Overview** | Executive KPIs, revenue chart, cash balance, fund allocation pie |
| **Revenue** | Tier breakdown with user %, ARR progression, churn impact |
| **Costs** | Editable LLM budget (7 line items), operational costs, monthly override planner |
| **Marketing** | Budget allocation by channel, conversion funnel visualization, sales team config |
| **Headcount** | Dynamic team roster (add/remove members), salary planning, outsource costs |
| **P&L** | Income statement — annual + monthly Year 1 |
| **Balance Sheet** | Assets, liabilities, equity — end of year snapshots |
| **Cash Flow** | Annual CF statement + monthly cash balance chart |
| **Cap Table** | Seed config, post-seed ownership, Series A/B/C rounds, path to IPO with dilution tracking |
| **Sensitivity** | Scenario comparison (worst/base/best), break-even analysis, runway calculation |
| **Settings** | All model parameters in one place |

### User Experience
- **Dark / Light mode** toggle with full CSS variable theming
- **THB / USD** currency switching with configurable exchange rate
- **localStorage persistence** — Save button preserves all settings across browser refreshes
- **Reset to defaults** — one-click restore
- **Unsaved changes indicator** with visual feedback
- **Responsive layout** for desktop and tablet
- **Custom SVG charts** — Bar charts with gridlines, Pie charts with legends (zero external dependencies)

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| React 19 | UI framework |
| Vite 7 | Build tool & dev server |
| CSS Custom Properties | Theming (dark/light) |
| localStorage | Data persistence |
| SVG | Charts (Pie, Bar) |

> **Zero charting dependencies** — all visualizations are built with native SVG and CSS.

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/rebelderkid-cmyk/law5-finance.git
cd law5-finance

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview
```

## Architecture

The entire application lives in a single file: `src/App.jsx`

```
src/App.jsx
  ├── Constants & Defaults (DEFAULT_PARAMS, LLM_PRESETS, DEFAULT_TEAM, etc.)
  ├── computeModel(params) — Core financial engine (36-month loop)
  ├── UI Components (Card, Metric, Bar, Tbl, Pie, PI, SI)
  ├── Tab Views (11 tab components)
  └── App() — Main component with state, localStorage, theme
```

### Key Data Flow

```
User Input (params)
  └─> computeModel(params)
        ├─> Marketing Funnel → New Customers/Month
        ├─> Tier Split → Basic/Pro/Enterprise subscribers
        ├─> Revenue Calculation (subscriptions + seats + storage)
        ├─> Cost Calculation (salary + LLM + dev + marketing)
        ├─> Financial Statements (P&L, Balance, Cash Flow)
        ├─> Cap Table (Seed → Series A/B/C → IPO)
        └─> Sensitivity Analysis (re-runs model with multipliers)
```

## Financial Model Parameters

### Revenue Drivers
- **Pricing**: Basic ($19/mo), Pro ($29/mo), Enterprise ($149/mo)
- **Tier Split**: 60% Basic, 32% Pro, 8% Enterprise
- **Growth**: Y2 2.0x, Y3 1.5x over Y2
- **Annual Billing**: 40% of subscribers

### Cost Structure
- **LLM Budget**: Configurable across 7 categories (Dev, Hardware, API, Salary, Software, Marketing, Buffer)
- **3 LLM Strategies**: API Only (฿10M), Own LLM (฿10M), Hybrid (฿10M)
- **Team**: Dynamic headcount with per-member salary and start month
- **Monthly Overrides**: Override any cost category for specific months

### Cap Table
- **Seed Round**: Configurable pre-money, raise amount, equity %
- **Future Rounds**: Series A/B/C with editable valuations
- **IPO Projection**: Founder dilution tracking through all rounds
- **Exit Value**: Per-founder value calculation at IPO

## License

This project is proprietary to LAW5. All rights reserved.

---

<div align="center">

**Built for LAW5 Investor Deck 2025-2027**

</div>
