import { useState, useMemo, useCallback } from "react";

// ============================================================
// LAW5 FINANCIAL MODEL — INTERACTIVE DASHBOARD v4
// + Investor Pitch tab, auto API Reserve, floating save bar
// ============================================================

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const DEFAULT_TEAM = [
  { id: 1, role: "CEO", name: "James", sal: 50000, m: 1, type: "Founder" },
  { id: 2, role: "COO", name: "Poj", sal: 0, m: 1, type: "Founder" },
  { id: 3, role: "CMO", name: "Nong", sal: 0, m: 1, type: "Founder" },
  { id: 4, role: "CTO", name: "Founder", sal: 0, m: 1, type: "Founder" },
  { id: 5, role: "Exec Assistant", name: "—", sal: 25000, m: 1, type: "Employee" },
  { id: 6, role: "CDO", name: "—", sal: 35000, m: 1, type: "Employee" },
  { id: 7, role: "Developer", name: "TBD", sal: 35000, m: 6, type: "Planned" },
  { id: 8, role: "Sales Rep 1", name: "TBD", sal: 25000, m: 4, type: "Planned" },
  { id: 9, role: "Sales Rep 2", name: "TBD", sal: 25000, m: 4, type: "Planned" },
];

const DEFAULT_ROUNDS = [
  { name: "Series A", valuation: 300000000, raise: 50000000, equity: 15 },
  { name: "Series B", valuation: 1000000000, raise: 150000000, equity: 12 },
  { name: "Series C", valuation: 2500000000, raise: 300000000, equity: 10 },
];

// LLM budget — apiReserve is now auto-calculated, not manually set
const DEFAULT_LLM_BUDGET = {
  dev: 2000000, hardware: 2500000,
  salaryOps: 2000000, software: 1000000, marketing: 1500000, buffer: 0,
};

const LLM_PRESETS = {
  api:    { dev: 2000000, hardware: 0,       salaryOps: 2000000, software: 1000000, marketing: 2000000, buffer: 1500000 },
  own:    { dev: 2000000, hardware: 5000000, salaryOps: 2000000, software: 1000000, marketing: 0,       buffer: 0 },
  hybrid: { dev: 2000000, hardware: 2500000, salaryOps: 2000000, software: 1000000, marketing: 1500000, buffer: 0 },
};

const DEFAULT_PARAMS = {
  exchangeRate: 33, displayCurrency: "THB",
  preMoneyValuation: 100000000, equityOffered: 10, raiseAmount: 10000000,
  llmStrategy: "hybrid",
  llmBudget: { ...DEFAULT_LLM_BUDGET },
  apiReserveMonths: 6, // months of API reserve to budget for
  basicMonthly: 19, basicAnnual: 9, proMonthly: 29, proAnnual: 19,
  enterpriseMonthly: 149, enterpriseAnnual: 99, extraSeatMonthly: 19,
  storageTopupMonthly: 2, revenueStartMonth: 3,
  tierSplitBasic: 0.60, tierSplitPro: 0.32, tierSplitEnterprise: 0.08,
  projectionYears: 5,
  growthRates: { y2: 2.0, y3: 1.5, y4: 1.2, y5: 1.1, y6: 1.05, y7: 1.03, y8: 1.02, y9: 1.02, y10: 1.01 },
  y1AnnualRatio: 0.4,
  basicChurnMonthly: 0.06, proChurnMonthly: 0.04, enterpriseChurnMonthly: 0.02,
  websiteVisitors: 5000, visitorToLeadRate: 0.08, leadToTrialRate: 0.25, trialToCustomerRate: 0.15,
  storageAdoptionRate: 0.15, avgExtraStorageUnits: 2,
  enterpriseAvgSeats: 5, enterpriseExtraSeatAvg: 3,
  salesOutreachPct: 0.50, lineAffiliationPct: 0.30, wordOfMouthPct: 0.10, contentMarketingPct: 0.10,
  marketingBudgetY1: 1500000, lineAffiliateCommission: 0.10,
  salesRepsY1: 2, salesRepCostMonthly: 30000, dealsPerRepPerMonth: 4,
  apiCostPerUser: 150, paymentProcessingRate: 0.029, supportCostPerUser: 50,
  outsourceDevMonthly: 80000, outsourceAccountingMonthly: 15000,
  officeRent: 15000, utilities: 5000, miscOps: 10000,
  team: DEFAULT_TEAM,
  costOverrides: {},
  fundingRounds: DEFAULT_ROUNDS,
  ipoValuation: 3000000000,
  sensitivityVar: "trialToCustomerRate", bestMultiplier: 1.5, worstMultiplier: 0.5,
  vcExitYear: 5, vcExitMultiple: 10, vcDiscountRate: 0.40,
  dcfDiscountRate: 0.30, dcfTerminalGrowth: 0.03, dcfTerminalMultiple: 8, dcfMethod: "perpetuity",
  opexEscalationRate: 0.15, scaleUpYear: 3, scaleUpMultiplier: 1.5,
  loanAmount: 0, loanInterestRate: 0.08, loanTermMonths: 36, loanStartMonth: 0,
  softwareCapex: 0,
};

const STORAGE_KEY = "law5_params";

const TABS = [
  { id: "pitch", label: "Investor Pitch", icon: "🎯" },
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "revenue", label: "Revenue", icon: "💰" },
  { id: "cost", label: "Costs", icon: "📉" },
  { id: "marketing", label: "Marketing", icon: "📢" },
  { id: "headcount", label: "Headcount", icon: "👥" },
  { id: "income", label: "P&L", icon: "📋" },
  { id: "balance", label: "Balance Sheet", icon: "🏦" },
  { id: "cashflow", label: "Cash Flow", icon: "💸" },
  { id: "captable", label: "Cap Table", icon: "🥧" },
  { id: "valuation", label: "Valuation", icon: "💎" },
  { id: "sensitivity", label: "Sensitivity", icon: "🎛️" },
  { id: "params", label: "Settings", icon: "⚙️" },
];

const fmt = (v, c = "THB") => {
  if (v == null || isNaN(v)) return "—";
  const a = Math.abs(v); const s = v < 0 ? "-" : "";
  const p = c === "THB" ? "฿" : "$";
  if (a >= 1e9) return s + p + (a/1e9).toFixed(2) + "B";
  if (a >= 1e6) return s + p + (a/1e6).toFixed(1) + "M";
  if (a >= 1e3) return s + p + (a/1e3).toFixed(0) + "K";
  return s + p + a.toFixed(0);
};
const fmtF = (v, c = "THB") => {
  if (v == null || isNaN(v)) return "—";
  return (c === "THB" ? "฿" : "$") + v.toLocaleString("en-US", { maximumFractionDigits: 0 });
};
const fmtP = (v) => v == null ? "—" : (v * 100).toFixed(1) + "%";
const fmtN = (v) => v == null ? "—" : Math.round(v).toLocaleString("en-US");
const cv = (thb, rate, cur) => cur === "USD" ? thb / rate : thb;

// Dynamic year helpers
const yEnd = (data, y) => data[y * 12 - 1];
const monthLabels = (projYears) => {
  const labels = ["M1"];
  for (let y = 1; y <= projYears; y++) labels.push(`M${y * 12}`);
  return labels;
};
const yearHeaders = (annuals) => ["", ...annuals.map(a => `Year ${a.year}`)];
const yearRow = (label, annuals, fn) => [label, ...annuals.map(fn)];

// ============================================================
// FINANCIAL ENGINE
// ============================================================
function computeModel(p, _skipSens = false) {
  const budget = p.llmBudget || LLM_PRESETS[p.llmStrategy];

  const basicMoTHB = p.basicMonthly * p.exchangeRate;
  const basicAnTHB = p.basicAnnual * p.exchangeRate;
  const proMoTHB = p.proMonthly * p.exchangeRate;
  const proAnTHB = p.proAnnual * p.exchangeRate;
  const entMoTHB = p.enterpriseMonthly * p.exchangeRate;
  const entAnTHB = p.enterpriseAnnual * p.exchangeRate;

  const funnelCustomersBase = Math.round(
    p.websiteVisitors * p.visitorToLeadRate * p.leadToTrialRate * p.trialToCustomerRate
  );

  const totalMonths = (p.projectionYears || 5) * 12;
  const rates = p.growthRates || {};
  let bM=0, bA=0, pM=0, pA=0, eM=0, eA=0;
  const data = [];

  for (let i = 0; i < totalMonths; i++) {
    const m = i + 1;
    const yr = Math.floor(i/12) + 1;
    const label = `${MONTHS[i%12]} Y${yr}`;
    let gm = 1;
    for (let y = 2; y <= yr; y++) gm *= (rates[`y${y}`] ?? 1);

    let newCustThisMonth = 0;
    if (m >= p.revenueStartMonth) {
      const totalNew = Math.round(funnelCustomersBase * (yr===1?1:gm));
      const nB = Math.round(totalNew * p.tierSplitBasic);
      const nP = Math.round(totalNew * p.tierSplitPro);
      const nE = Math.max(0, totalNew - nB - nP);
      newCustThisMonth = nB + nP + nE;
      const aB = Math.round(nB * p.y1AnnualRatio);
      const aP = Math.round(nP * p.y1AnnualRatio);
      const aE = Math.round(nE * p.y1AnnualRatio);
      bM += nB - aB; bA += aB;
      pM += nP - aP; pA += aP;
      eM += nE - aE; eA += aE;
      bM = Math.max(0, Math.round(bM * (1 - p.basicChurnMonthly)));
      pM = Math.max(0, Math.round(pM * (1 - p.proChurnMonthly)));
      eM = Math.max(0, Math.round(eM * (1 - p.enterpriseChurnMonthly)));
    }

    const total = bM+bA+pM+pA+eM+eA;
    const revB = bM*basicMoTHB + bA*basicAnTHB;
    const revP = pM*proMoTHB + pA*proAnTHB;
    const revE = eM*entMoTHB + eA*entAnTHB;
    const revSeats = (eM+eA) * p.enterpriseExtraSeatAvg * p.extraSeatMonthly * p.exchangeRate;
    const revStor = total * p.storageAdoptionRate * p.avgExtraStorageUnits * p.storageTopupMonthly * p.exchangeRate;
    const rev = revB + revP + revE + revSeats + revStor;

    const baseSal = (p.team||[]).reduce((s,t) => s + (m >= t.m ? t.sal : 0), 0)
      + p.outsourceDevMonthly + p.outsourceAccountingMonthly + p.officeRent + p.utilities + p.miscOps;
    // OpEx escalation: compound annual growth + scale-up jump at PMF year
    const escRate = p.opexEscalationRate || 0;
    const scaleYr = p.scaleUpYear || 0;
    const scaleMult = p.scaleUpMultiplier || 1;
    let opexMult = yr > 1 ? Math.pow(1 + escRate, yr - 1) : 1;
    if (scaleYr > 0 && yr >= scaleYr) opexMult *= scaleMult;
    const sal = baseSal * opexMult;

    const ovr = (p.costOverrides||{})[m] || {};
    const api = p.llmStrategy === "own" ? 0 : total * p.apiCostPerUser;
    const hwDep = budget.hardware / totalMonths;
    const devC = m <= 6 ? budget.dev / 6 : budget.dev / totalMonths;
    const swC = budget.software / 12;
    const mktMultiplier = yr===1 ? 1 : yr===2 ? 1.5 : Math.min(yr*0.5+0.5, 3);
    const mktY = p.marketingBudgetY1 * mktMultiplier;
    const mktCalc = (p.llmStrategy==="own" && yr===1) ? 0 : mktY/12;

    const mkt = ovr.mkt != null ? ovr.mkt : mktCalc;
    const devFinal = ovr.dev != null ? ovr.dev : devC;
    const apiFinal = ovr.api != null ? ovr.api : api;

    const payProc = rev * p.paymentProcessingRate;
    const support = total * p.supportCostPerUser;
    const platformSw = swC * 0.3;
    const internalSw = swC * 0.7;

    const cogs = apiFinal + hwDep + platformSw + payProc + support;
    const opex = sal + devFinal + internalSw + mkt;
    const totalC = cogs + opex;
    const gp = rev - cogs;

    // CapEx
    const capExHW = m === 1 ? budget.hardware : 0;
    const capExSW = (p.softwareCapex || 0) / totalMonths;
    const depreciation = hwDep + capExSW;

    data.push({
      month: m, label, year: yr, bM, bA, pM, pA, eM, eA, totalCustomers: total,
      newCustomers: newCustThisMonth,
      revB, revP, revE, revSeats, revStor, totalRevenue: rev,
      salaryCost: sal, apiCost: apiFinal, hwDep, devCost: devFinal, swCost: swC, mktCost: mkt,
      paymentProcessing: payProc, supportCost: support, platformSw, internalSw,
      salesOutreach: mkt*p.salesOutreachPct, lineAff: mkt*p.lineAffiliationPct,
      wom: mkt*p.wordOfMouthPct, content: mkt*p.contentMarketingPct,
      cogs, opex, totalCost: totalC, grossProfit: gp,
      grossMargin: rev>0 ? gp/rev : 0, ebitda: rev-totalC, netIncome: rev-totalC,
      capExHW, capExSW, depreciation,
      cashFromOperations: 0, cashFromInvesting: 0, cashFromFinancing: 0,
      equityRaised: 0, debtBorrowed: 0, debtRepaid: 0, interestPaid: 0, loanBalance: 0,
    });
  }

  // API Reserve auto-calculated: apiCostPerUser × Y1 end users × reserveMonths
  const y1EndUsers = data[Math.min(11, data.length-1)].totalCustomers;
  const apiReserveCalc = p.llmStrategy === "own" ? 0 : p.apiCostPerUser * y1EndUsers * (p.apiReserveMonths || 6);

  // Full budget with computed apiReserve
  const fullBudget = { ...budget, apiReserve: apiReserveCalc };

  // Loan amortization schedule
  const loanAmt = p.loanAmount || 0;
  const loanRate = p.loanInterestRate || 0.08;
  const loanTerm = p.loanTermMonths || 36;
  const loanStart = p.loanStartMonth || 0;
  let loanBal = 0;
  const monthlyLoanRate = loanRate / 12;
  const pmt = loanAmt > 0 && loanTerm > 0 && monthlyLoanRate > 0
    ? loanAmt * monthlyLoanRate / (1 - Math.pow(1 + monthlyLoanRate, -loanTerm))
    : (loanAmt > 0 ? loanAmt / Math.max(loanTerm, 1) : 0);

  let cash = p.raiseAmount, re = 0, totalEquityRaised = p.raiseAmount;
  data.forEach((d,i) => {
    // Operating
    d.cashFromOperations = d.netIncome + d.depreciation;

    // Investing
    d.cashFromInvesting = -(d.capExHW + d.capExSW);

    // Financing — equity raised only in M1 (seed)
    d.equityRaised = i === 0 ? p.raiseAmount : 0;

    // Loan disbursement & repayment
    if (loanAmt > 0 && d.month === loanStart + 1) {
      d.debtBorrowed = loanAmt;
      loanBal = loanAmt;
    }
    if (loanBal > 0 && d.month > loanStart) {
      const interest = loanBal * monthlyLoanRate;
      const principal = Math.min(pmt - interest, loanBal);
      d.interestPaid = interest;
      d.debtRepaid = principal;
      loanBal = Math.max(0, loanBal - principal);
    }
    d.loanBalance = loanBal;
    d.cashFromFinancing = (i === 0 ? 0 : 0) + d.debtBorrowed - d.debtRepaid - d.interestPaid;

    d.netCF = d.cashFromOperations + d.cashFromInvesting + d.cashFromFinancing;
    if (i === 0) cash = p.raiseAmount + d.debtBorrowed; // initial
    cash += d.cashFromOperations + d.cashFromInvesting + (i > 0 ? d.cashFromFinancing : d.debtBorrowed - d.debtRepaid - d.interestPaid);
    re += d.netIncome;
    d.cash = cash;
    d.fixedAssets = Math.max(0, budget.hardware + (p.softwareCapex||0) - d.depreciation*(i+1));
    d.totalAssets = cash + d.fixedAssets;
    d.equity = totalEquityRaised + re;
    d.retainedEarnings = re;
  });

  const projYears = p.projectionYears || 5;
  const annuals = Array.from({length: projYears}, (_, yi) => {
    const y = yi + 1;
    const yd = data.filter(d => d.year===y);
    const last = yd[yd.length-1];
    return {
      year: y,
      revenue: yd.reduce((s,d)=>s+d.totalRevenue,0),
      cogs: yd.reduce((s,d)=>s+d.cogs,0),
      grossProfit: yd.reduce((s,d)=>s+d.grossProfit,0),
      opex: yd.reduce((s,d)=>s+d.opex,0),
      totalCost: yd.reduce((s,d)=>s+d.totalCost,0),
      ebitda: yd.reduce((s,d)=>s+d.ebitda,0),
      netIncome: yd.reduce((s,d)=>s+d.netIncome,0),
      customers: last.totalCustomers,
      newCustomers: yd.reduce((s,d)=>s+d.newCustomers,0),
      cash: last.cash,
      mkt: yd.reduce((s,d)=>s+d.mktCost,0),
      mrr: last.totalRevenue,
      cashFromOperations: yd.reduce((s,d)=>s+d.cashFromOperations,0),
      cashFromInvesting: yd.reduce((s,d)=>s+d.cashFromInvesting,0),
      cashFromFinancing: yd.reduce((s,d)=>s+d.cashFromFinancing,0),
      capex: yd.reduce((s,d)=>s+d.capExHW+d.capExSW,0),
      depreciation: yd.reduce((s,d)=>s+d.depreciation,0),
      interestPaid: yd.reduce((s,d)=>s+d.interestPaid,0),
      debtBorrowed: yd.reduce((s,d)=>s+d.debtBorrowed,0),
      debtRepaid: yd.reduce((s,d)=>s+d.debtRepaid,0),
    };
  });

  // Cap Table with multi-round
  const preShares = 1000000;
  const founders = [
    { name: "Mr. Netherine (James) — CEO", pct: 41 },
    { name: "Ms. Rachada (Nong) — CMO", pct: 19.5 },
    { name: "Mr. Nasir — Advisor", pct: 19.5 },
    { name: "Mr. Poj — COO", pct: 15 },
    { name: "Mr. Suphakit (Boat)", pct: 5 },
  ].map(f => ({ ...f, shares: Math.round(preShares*f.pct/100) }));

  const seedShares = Math.round(preShares * (p.equityOffered/100) / (1-p.equityOffered/100));
  let totShares = preShares + seedShares;

  const rounds = [{ name: "Seed", valuation: p.preMoneyValuation, raise: p.raiseAmount, equity: p.equityOffered, newShares: seedShares, postShares: totShares, postMoney: p.preMoneyValuation + p.raiseAmount }];

  let cumulativeShares = totShares;
  (p.fundingRounds||[]).forEach(r => {
    const ns = Math.round(cumulativeShares * (r.equity/100) / (1-r.equity/100));
    cumulativeShares += ns;
    rounds.push({ name: r.name, valuation: r.valuation, raise: r.raise, equity: r.equity, newShares: ns, postShares: cumulativeShares, postMoney: r.valuation + r.raise });
  });

  const ipoVal = p.ipoValuation || 3000000000;
  rounds.push({ name: "IPO", valuation: ipoVal, raise: 0, equity: 0, newShares: 0, postShares: cumulativeShares, postMoney: ipoVal });

  const founderSharesTotal = founders.reduce((s,f)=>s+f.shares, 0);
  const founderPctAtIPO = (founderSharesTotal / cumulativeShares * 100);
  const founderValueAtIPO = founderPctAtIPO / 100 * ipoVal;

  // Investor returns at each round
  const seedPct = seedShares / totShares * 100;
  const investorReturns = rounds.map(r => {
    const investorPctAtRound = seedShares / r.postShares * 100;
    const investorValue = investorPctAtRound / 100 * r.postMoney;
    const roi = investorValue / p.raiseAmount;
    return { ...r, investorPct: investorPctAtRound, investorValue, roi };
  });

  const capTable = {
    founders, seedShares, totShares, rounds, investorReturns,
    founderPctAtIPO, founderValueAtIPO, cumulativeShares, ipoVal, seedPct,
    post: [
      ...founders.map(f => ({ ...f, postPct: (f.shares/totShares*100).toFixed(2) })),
      { name: "Seed Investor(s)", shares: seedShares, pct: 0, postPct: (seedShares/totShares*100).toFixed(2) },
    ],
  };

  const sens = _skipSens ? [] : ["worst","base","best"].map(sc => {
    const mult = sc==="best"?p.bestMultiplier:sc==="worst"?p.worstMultiplier:1;
    const buildResult = (a) => {
      const res = { scenario: sc, label: sc==="base"?"Base":sc.charAt(0).toUpperCase()+sc.slice(1), mult };
      a.forEach(an => { res[`y${an.year}`] = an.revenue; res[`y${an.year}Cust`] = an.customers; });
      return res;
    };
    if (sc === "base") return buildResult(annuals);
    const adjParams = { ...p, [p.sensitivityVar]: p[p.sensitivityVar] * mult };
    const adjModel = computeModel(adjParams, true);
    return buildResult(adjModel.annuals);
  });

  // Valuation computations
  const vcExitYear = Math.min(p.vcExitYear || 5, projYears);
  const vcExitRevenue = annuals[vcExitYear - 1]?.revenue || 0;
  const vcExitValuation = vcExitRevenue * (p.vcExitMultiple || 10);
  const vcInvestorOwn = p.equityOffered / 100;
  const vcInvestorValueAtExit = vcExitValuation * vcInvestorOwn;
  const vcPreMoney = vcInvestorValueAtExit / Math.pow(1 + (p.vcDiscountRate || 0.40), vcExitYear);
  const vcReturnMultiple = p.raiseAmount > 0 ? vcInvestorValueAtExit / p.raiseAmount : 0;

  // DCF
  const dcfRate = p.dcfDiscountRate || 0.30;
  const dcfTG = p.dcfTerminalGrowth || 0.03;
  const fcfs = annuals.map(a => ({
    year: a.year,
    ebitda: a.ebitda,
    capex: a.capex,
    fcf: a.ebitda - a.capex,
    discountFactor: 1 / Math.pow(1 + dcfRate, a.year),
    pv: (a.ebitda - a.capex) / Math.pow(1 + dcfRate, a.year),
  }));
  const lastFCF = fcfs[fcfs.length - 1]?.fcf || 0;
  const terminalValue = p.dcfMethod === "multiple"
    ? lastFCF * (p.dcfTerminalMultiple || 8)
    : (dcfRate > dcfTG ? lastFCF * (1 + dcfTG) / (dcfRate - dcfTG) : 0);
  const pvTerminal = terminalValue / Math.pow(1 + dcfRate, projYears);
  const sumPVFCFs = fcfs.reduce((s, f) => s + f.pv, 0);
  const enterpriseValue = sumPVFCFs + pvTerminal;
  const terminalPctOfTotal = enterpriseValue > 0 ? pvTerminal / enterpriseValue : 0;

  const valuation = {
    vc: { exitYear: vcExitYear, exitRevenue: vcExitRevenue, exitValuation: vcExitValuation, investorValueAtExit: vcInvestorValueAtExit, impliedPreMoney: vcPreMoney, returnMultiple: vcReturnMultiple },
    dcf: { fcfs, terminalValue, pvTerminal, sumPVFCFs, enterpriseValue, terminalPctOfTotal },
  };

  return { data, annuals, capTable, sens, budget: fullBudget, apiReserveCalc, valuation, projYears };
}

// ============================================================
// UI COMPONENTS
// ============================================================
const Card = ({title, children, cls=""}) => (
  <div className={`cd ${cls}`}>
    {title && <div className="cd-t">{title}</div>}
    {children}
  </div>
);

const Metric = ({label, value, sub, color="var(--ac)"}) => (
  <div className="mc">
    <div className="mc-l">{label}</div>
    <div className="mc-v" style={{color}}>{value}</div>
    {sub && <div className="mc-s">{sub}</div>}
  </div>
);

const Bar = ({data, color="var(--ac)", h=100}) => {
  const mx = Math.max(...data.map(d=>Math.abs(d)),1);
  return (
    <div style={{position:"relative",height:h}}>
      <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,display:"flex",flexDirection:"column",justifyContent:"space-between",pointerEvents:"none"}}>
        {[1,0.75,0.5,0.25,0].map((v,i)=>(
          <div key={i} style={{borderBottom:"1px solid var(--bd)",opacity:0.3,width:"100%",position:"relative"}}>
            <span style={{position:"absolute",left:-4,top:-7,fontSize:9,color:"var(--td)",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(mx*v)}</span>
          </div>
        ))}
      </div>
      <div style={{display:"flex",alignItems:"flex-end",gap:1,height:"100%",paddingLeft:35,position:"relative",zIndex:1}}>
        {data.map((v,i) => (
          <div key={i} style={{
            flex:1, height:`${Math.max(2,(Math.abs(v)/mx)*100)}%`,
            background: v>=0?color:"var(--rd)",
            borderRadius:"3px 3px 0 0", opacity:0.85+(i/data.length)*0.15,
          }} title={fmtF(v)} />
        ))}
      </div>
    </div>
  );
};

const StackedBar = ({data, h=100, legend=[]}) => {
  const mx = Math.max(...data.map(d=>d.reduce((s,v)=>s+v,0)),1);
  return (
    <div>
      <div style={{position:"relative",height:h}}>
        <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,display:"flex",flexDirection:"column",justifyContent:"space-between",pointerEvents:"none"}}>
          {[1,0.75,0.5,0.25,0].map((v,i)=>(
            <div key={i} style={{borderBottom:"1px solid var(--bd)",opacity:0.3,width:"100%",position:"relative"}}>
              <span style={{position:"absolute",left:-4,top:-7,fontSize:9,color:"var(--td)",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(mx*v)}</span>
            </div>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"flex-end",gap:1,height:"100%",paddingLeft:35,position:"relative",zIndex:1}}>
          {data.map((stack,i)=>{
            const total=stack.reduce((s,v)=>s+v,0);
            return (
              <div key={i} style={{flex:1,height:`${Math.max(2,(total/mx)*100)}%`,display:"flex",flexDirection:"column-reverse",borderRadius:"3px 3px 0 0",overflow:"hidden"}} title={fmtF(total)}>
                {stack.map((v,si)=>(
                  <div key={si} style={{height:`${total>0?(v/total)*100:0}%`,background:legend[si]?.color||"var(--ac)",minHeight:v>0?1:0}}/>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      {legend.length>0&&<div style={{display:"flex",gap:12,marginTop:8,justifyContent:"center",flexWrap:"wrap"}}>
        {legend.map((l,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"var(--td)"}}>
          <div style={{width:10,height:10,borderRadius:2,background:l.color}}/>{l.label}
        </div>)}
      </div>}
    </div>
  );
};

const Tbl = ({headers, rows, hl=false}) => (
  <div className="tw">
    <table>
      <thead><tr>{headers.map((h,i)=><th key={i}>{h}</th>)}</tr></thead>
      <tbody>
        {rows.map((r,ri) => (
          <tr key={ri} className={hl&&ri===rows.length-1?"hlr":""}>
            {r.map((c,ci) => <td key={ci} className={ci>0?"n":""}>{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Pie = ({data, size=200}) => {
  let cum=0; const tot=data.reduce((s,d)=>s+d.value,0);
  const slices = data.map(d => {
    const a = (d.value/tot)*360;
    const st = cum; cum+=a;
    const x1=50+42*Math.cos((st-90)*Math.PI/180);
    const y1=50+42*Math.sin((st-90)*Math.PI/180);
    const x2=50+42*Math.cos((st+a-90)*Math.PI/180);
    const y2=50+42*Math.sin((st+a-90)*Math.PI/180);
    return {...d, path:`M50,50 L${x1},${y1} A42,42 0 ${a>180?1:0},1 ${x2},${y2} Z`};
  });
  return (
    <div style={{display:"flex",alignItems:"center",gap:16}}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        {slices.map((s,i)=><path key={i} d={s.path} fill={s.color} stroke="var(--bg)" strokeWidth="0.5"><title>{s.label}: {(s.value/tot*100).toFixed(1)}%</title></path>)}
        <circle cx="50" cy="50" r="18" fill="var(--bg)"/>
      </svg>
      <div style={{fontSize:12}}>
        {data.map((d,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
            <div style={{width:10,height:10,borderRadius:2,background:d.color,flexShrink:0}}/>
            <span style={{color:"var(--td)"}}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const PI = ({label,value,onChange,step,min,max,w}) => (
  <div className="pr">
    <label className="pl">{label}</label>
    <input type="number" value={value} onChange={e=>onChange(parseFloat(e.target.value)||0)} step={step} min={min} max={max} className="pi" style={w?{width:w}:{}}/>
  </div>
);

const SI = ({label,value,onChange,opts}) => (
  <div className="pr">
    <label className="pl">{label}</label>
    <select className="pi" value={value} onChange={e=>onChange(e.target.value)}>
      {opts.map(o=><option key={o.v||o} value={o.v||o}>{o.l||o.toString().toUpperCase()}</option>)}
    </select>
  </div>
);

// ============================================================
// INVESTOR PITCH TAB
// ============================================================
function PitchTab({model:m, params:p}) {
  const c = v => cv(v,p.exchangeRate,p.displayCurrency);
  const cur = p.displayCurrency;
  const ct = m.capTable;
  const b = m.budget;
  const N = m.projYears;
  const beM = m.data.findIndex(d=>d.ebitda>0);
  const last = m.data[m.data.length-1];
  const lastARR = last.totalRevenue * 12;
  const totalCostY1 = m.annuals[0].totalCost;
  const runway = Math.round(p.raiseAmount / (totalCostY1/12));
  const colors = ["var(--ac)","var(--gn)","var(--pp)","var(--yl)","#6366f1","#ec4899","#10b981","#f59e0b","#3b82f6","#8b5cf6"];
  const mLabels = monthLabels(N);

  return (
    <div className="tc">
      <div style={{textAlign:"center",marginBottom:28}}>
        <div style={{fontSize:32,fontWeight:800,background:"linear-gradient(135deg,var(--ac),var(--pp))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:4}}>LAW5</div>
        <div style={{fontSize:14,color:"var(--td)",letterSpacing:1}}>AI-Powered Legal Tech SaaS — Investor Financial Summary</div>
      </div>

      {/* The Ask */}
      <Card title="The Investment">
        <div className="mg" style={{gridTemplateColumns:"repeat(4,1fr)"}}>
          <Metric label="Raising" value={fmt(c(p.raiseAmount),cur)} color="var(--ac)"/>
          <Metric label="Pre-Money" value={fmt(c(p.preMoneyValuation),cur)}/>
          <Metric label="Equity Offered" value={`${p.equityOffered}%`} color="var(--pp)"/>
          <Metric label="Post-Money" value={fmt(c(p.preMoneyValuation+p.raiseAmount),cur)} color="var(--gn)"/>
        </div>
      </Card>

      {/* Financial Highlights */}
      <Card title={`${N}-Year Financial Projection`}>
        <div className="mg" style={{gridTemplateColumns:`repeat(${Math.min(N,5)},1fr)`}}>
          {m.annuals.slice(0,5).map((a,i) => (
            <div key={i} className="mc" style={{borderLeft:`3px solid ${colors[i%colors.length]}`}}>
              <div className="mc-l">Year {a.year}</div>
              <div className="mc-v" style={{color:colors[i%colors.length]}}>{fmt(c(a.revenue),cur)}</div>
              <div className="mc-s">{fmtN(a.customers)} customers | EBITDA: {fmt(c(a.ebitda),cur)}</div>
            </div>
          ))}
        </div>
        <div className="g2" style={{marginTop:12}}>
          <div>
            <Bar data={m.data.map(d=>c(d.totalRevenue))} color="var(--gn)" h={90}/>
            <div className="cl">{mLabels.map((l,i)=><span key={i}>{l}</span>)}</div>
            <div style={{textAlign:"center",fontSize:11,color:"var(--td)",marginTop:4}}>Monthly Revenue</div>
          </div>
          <div>
            <Bar data={m.data.map(d=>c(d.cash))} h={90}/>
            <div className="cl">{mLabels.map((l,i)=><span key={i}>{l}</span>)}</div>
            <div style={{textAlign:"center",fontSize:11,color:"var(--td)",marginTop:4}}>Cash Balance</div>
          </div>
        </div>
      </Card>

      {/* Key Metrics */}
      <Card title="Key Metrics">
        <div className="mg" style={{gridTemplateColumns:"repeat(4,1fr)"}}>
          <Metric label={`Y${N} ARR`} value={fmt(c(lastARR),cur)} color="var(--gn)"/>
          <Metric label={`Y${N} Customers`} value={fmtN(last.totalCustomers)} color="var(--ac)"/>
          <Metric label="Break-Even" value={beM>=0?`Month ${beM+1}`:`Beyond M${m.data.length}`} sub={beM>=0?m.data[beM].label:""} color={beM>=0?"var(--gn)":"var(--yl)"}/>
          <Metric label="Cash Runway" value={`${runway} months`} sub="At Y1 burn rate" color="var(--yl)"/>
        </div>
        <Tbl headers={yearHeaders(m.annuals)} rows={[
          yearRow("Revenue", m.annuals, a => fmt(c(a.revenue),cur)),
          yearRow("Gross Margin", m.annuals, a => a.revenue>0?fmtP(a.grossProfit/a.revenue):"—"),
          yearRow("EBITDA", m.annuals, a => fmt(c(a.ebitda),cur)),
          yearRow("Customers", m.annuals, a => fmtN(a.customers)),
          yearRow("ARR (MRRx12)", m.annuals, a => fmt(c(a.mrr*12),cur)),
          yearRow("Cash", m.annuals, a => fmt(c(a.cash),cur)),
        ]} hl/>
      </Card>

      {/* Use of Funds */}
      <Card title="Use of Funds">
        <div className="g2">
          <Pie data={[
            {label:"Development",value:b.dev,color:"#6366f1"},
            {label:"LLM Hardware",value:b.hardware,color:"#f59e0b"},
            {label:"API Reserve",value:b.apiReserve,color:"#10b981"},
            {label:"Salary & Ops",value:b.salaryOps,color:"#3b82f6"},
            {label:"Software",value:b.software,color:"#8b5cf6"},
            {label:"Marketing",value:b.marketing,color:"#ec4899"},
            {label:"Buffer",value:b.buffer,color:"#6b7280"},
          ].filter(i=>i.value>0)} size={170}/>
          <Tbl headers={["Category","Amount","% of Total"]} rows={[
            ...Object.entries({Development:b.dev,Hardware:b.hardware,"API Reserve":b.apiReserve,"Salary & Ops":b.salaryOps,Software:b.software,Marketing:b.marketing,Buffer:b.buffer}).filter(([,v])=>v>0).map(([k,v])=>{
              const tot=Object.values(b).reduce((s,x)=>s+x,0);
              return [k,fmt(c(v),cur),fmtP(v/tot)];
            }),
            ["Total",fmt(c(Object.values(b).reduce((s,x)=>s+x,0)),cur),"100%"],
          ]} hl/>
        </div>
      </Card>

      {/* Investor Return — the key section */}
      <Card title="Investor Return at Each Exit">
        <div style={{marginBottom:14,padding:"12px 16px",background:"var(--bg3)",borderRadius:10,fontSize:12,color:"var(--td)"}}>
          Seed investor puts in <strong style={{color:"var(--ac)"}}>{fmt(c(p.raiseAmount),cur)}</strong> for <strong style={{color:"var(--ac)"}}>{p.equityOffered}%</strong> equity ({fmtN(ct.seedShares)} shares). Here is the projected return at each funding milestone:
        </div>
        <Tbl headers={["Exit Point","Valuation","Investor %","Investor Value","ROI","Multiple"]} rows={ct.investorReturns.map(r=>[
          r.name,
          fmt(c(r.postMoney),cur),
          r.investorPct.toFixed(2)+"%",
          fmt(c(r.investorValue),cur),
          r.roi>1?"+"+fmtP(r.roi-1):"−"+fmtP(1-r.roi),
          r.roi.toFixed(1)+"x",
        ])} hl/>
        <div className="mg" style={{marginTop:16,gridTemplateColumns:"repeat(4,1fr)"}}>
          {ct.investorReturns.filter(r=>r.name!=="Seed").map((r,i)=>(
            <div key={i} className="mc" style={{borderTop:`3px solid ${["var(--ac)","var(--gn)","var(--pp)","var(--yl)"][i]}`}}>
              <div className="mc-l">{r.name}</div>
              <div className="mc-v" style={{color:["var(--ac)","var(--gn)","var(--pp)","var(--yl)"][i],fontSize:26}}>{r.roi.toFixed(1)}x</div>
              <div className="mc-s">{fmt(c(r.investorValue),cur)}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Path to IPO summary */}
      <Card title="Valuation Journey — Seed to IPO">
        <div style={{display:"flex",alignItems:"center",gap:0,overflow:"auto",padding:"12px 0"}}>
          {ct.rounds.map((r,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center"}}>
              <div style={{textAlign:"center",minWidth:100}}>
                <div style={{fontSize:11,color:"var(--td)",marginBottom:4}}>{r.name}</div>
                <div style={{width:48,height:48,borderRadius:"50%",background:i===ct.rounds.length-1?"var(--gn)":"var(--ac)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto",color:"#fff",fontSize:11,fontWeight:700}}>{fmt(c(r.postMoney),cur)}</div>
                <div style={{fontSize:10,color:"var(--td)",marginTop:4}}>{r.equity>0?`${r.equity}% dilution`:""}</div>
              </div>
              {i<ct.rounds.length-1&&<div style={{width:40,height:2,background:"var(--bd)",flexShrink:0}}/>}
            </div>
          ))}
        </div>
      </Card>

      {/* Bottom line */}
      <div style={{textAlign:"center",padding:"20px 0",fontSize:13,color:"var(--td)"}}>
        All projections based on current model parameters. Adjust in Settings tab.
      </div>
    </div>
  );
}

// ============================================================
// TAB VIEWS
// ============================================================
function OverviewTab({model:m, params:p}) {
  const c = v => cv(v,p.exchangeRate,p.displayCurrency);
  const cur = p.displayCurrency;
  const N = m.projYears;
  const y1 = m.annuals[0];
  const lastA = m.annuals[N-1];
  const b = m.budget;
  const mLabels = monthLabels(N);
  return (
    <div className="tc">
      <div className="st">Executive Dashboard — Law5</div>
      <div className="mg">
        <Metric label="Year 1 Revenue" value={fmt(c(y1.revenue),cur)} sub={`${fmtN(y1.customers)} customers`}/>
        {m.annuals.slice(1,3).map(a => <Metric key={a.year} label={`Year ${a.year} Revenue`} value={fmt(c(a.revenue),cur)} sub={`${fmtN(a.customers)} customers`} color="var(--gn)"/>)}
        <Metric label="Cash Runway" value={`${Math.round(p.raiseAmount/(y1.totalCost/12))} mo`} sub="At Y1 burn rate" color="var(--yl)"/>
        <Metric label={`Y${N} EBITDA`} value={fmt(c(lastA.ebitda),cur)} sub={lastA.ebitda>0?"Profitable":"Pre-profit"} color={lastA.ebitda>0?"var(--gn)":"var(--rd)"}/>
        <Metric label="LLM Strategy" value={p.llmStrategy.toUpperCase()} sub={`HW: ${fmt(c(b.hardware),cur)} | API: ${fmt(c(b.apiReserve),cur)}`} color="var(--pp)"/>
      </div>
      <div className="g2">
        <Card title={`Monthly Revenue (${N*12}mo)`}>
          <Bar data={m.data.map(d=>c(d.totalRevenue))} color="var(--gn)" h={100}/>
          <div className="cl">{mLabels.map((l,i)=><span key={i}>{l}</span>)}</div>
        </Card>
        <Card title="Cash Balance">
          <Bar data={m.data.map(d=>c(d.cash))} h={100}/>
          <div className="cl">{mLabels.map((l,i)=><span key={i}>{l}</span>)}</div>
        </Card>
      </div>
      <Card title={`${N}-Year Summary`}>
        <Tbl headers={yearHeaders(m.annuals)} rows={[
          yearRow("Revenue", m.annuals, a => fmt(c(a.revenue),cur)),
          yearRow("COGS", m.annuals, a => fmt(c(a.cogs),cur)),
          yearRow("Gross Profit", m.annuals, a => fmt(c(a.grossProfit),cur)),
          yearRow("OpEx", m.annuals, a => fmt(c(a.opex),cur)),
          yearRow("EBITDA", m.annuals, a => fmt(c(a.ebitda),cur)),
          yearRow("End Customers", m.annuals, a => fmtN(a.customers)),
          yearRow("ARR (MRRx12)", m.annuals, a => fmt(c(a.mrr*12),cur)),
          yearRow("Cash", m.annuals, a => fmt(c(a.cash),cur)),
        ]} hl/>
      </Card>
      <Card title={`Fund Allocation — ${p.llmStrategy.toUpperCase()}`}>
        <Pie data={[
          {label:"Development",value:b.dev,color:"#6366f1"},
          {label:"LLM Hardware",value:b.hardware,color:"#f59e0b"},
          {label:"API Reserve",value:b.apiReserve,color:"#10b981"},
          {label:"Salary & Ops",value:b.salaryOps,color:"#3b82f6"},
          {label:"Software",value:b.software,color:"#8b5cf6"},
          {label:"Marketing",value:b.marketing,color:"#ec4899"},
          {label:"Buffer",value:b.buffer,color:"#6b7280"},
        ].filter(i=>i.value>0)}/>
      </Card>
    </div>
  );
}

function RevenueTab({model:m,params:p,setParams:sp}) {
  const c=v=>cv(v,p.exchangeRate,p.displayCurrency); const cur=p.displayCurrency;
  const N = m.projYears;
  const yearEnds = m.annuals.map(a => yEnd(m.data, a.year));
  const lastYE = yearEnds[yearEnds.length-1];
  const tierPct=(d)=>{const t=d.totalCustomers||1;return {b:((d.bM+d.bA)/t*100).toFixed(1),p:((d.pM+d.pA)/t*100).toFixed(1),e:((d.eM+d.eA)/t*100).toFixed(1)};};
  return (
    <div className="tc">
      <div className="st">Revenue Model</div>
      <div className="mg">
        <Metric label="Basic" value={`$${p.basicMonthly}/mo`} sub={`Annual: $${p.basicAnnual}/mo`}/>
        <Metric label="Pro" value={`$${p.proMonthly}/mo`} sub={`Annual: $${p.proAnnual}/mo`}/>
        <Metric label="Enterprise" value={`$${p.enterpriseMonthly}/mo`} sub={`Annual: $${p.enterpriseAnnual}/mo`}/>
        <Metric label="Storage" value={`$${p.storageTopupMonthly}/50GB`} sub={`${fmtP(p.storageAdoptionRate)} adopt`}/>
      </div>
      <Card title={`Customer Mix by Tier (End of Y${N})`}>
        <div className="g2">
          <Pie data={[
            {label:`Basic (${fmtN(lastYE.bM+lastYE.bA)})`,value:lastYE.bM+lastYE.bA||1,color:"#3b82f6"},
            {label:`Pro (${fmtN(lastYE.pM+lastYE.pA)})`,value:lastYE.pM+lastYE.pA||1,color:"#6366f1"},
            {label:`Enterprise (${fmtN(lastYE.eM+lastYE.eA)})`,value:lastYE.eM+lastYE.eA||1,color:"#8b5cf6"},
          ]} size={160}/>
          <Tbl headers={["Tier",...m.annuals.flatMap(a=>[`Y${a.year}`,`Y${a.year}%`])]} rows={[
            ["Basic",...yearEnds.flatMap(d=>[fmtN(d.bM+d.bA),tierPct(d).b+"%"])],
            ["Pro",...yearEnds.flatMap(d=>[fmtN(d.pM+d.pA),tierPct(d).p+"%"])],
            ["Ent",...yearEnds.flatMap(d=>[fmtN(d.eM+d.eA),tierPct(d).e+"%"])],
            ["Total",...yearEnds.flatMap(d=>[fmtN(d.totalCustomers),"100%"])],
          ]} hl/>
        </div>
      </Card>
      <Card title="Monthly Revenue — Year 1">
        <Tbl headers={["Month","Basic","Pro","Ent","Seats","Storage","Total","Cust"]} rows={m.data.filter(d=>d.year===1).map(d=>[d.label,fmt(c(d.revB),cur),fmt(c(d.revP),cur),fmt(c(d.revE),cur),fmt(c(d.revSeats),cur),fmt(c(d.revStor),cur),fmt(c(d.totalRevenue),cur),fmtN(d.totalCustomers)])}/>
      </Card>
      <Card title="ARR Progression">
        <Tbl headers={yearHeaders(m.annuals)} rows={[
          yearRow("MRR (EoY)", m.annuals, a => fmt(c(yEnd(m.data,a.year).totalRevenue),cur)),
          yearRow("ARR", m.annuals, a => fmt(c(yEnd(m.data,a.year).totalRevenue*12),cur)),
          yearRow("Customers", m.annuals, a => fmtN(a.customers)),
        ]} hl/>
      </Card>
      <Card title="Churn Impact">
        <Tbl headers={["Tier","Monthly","Annual","Note"]} rows={[
          ["Basic",fmtP(p.basicChurnMonthly),fmtP(1-Math.pow(1-p.basicChurnMonthly,12)),"Focus on onboarding"],
          ["Pro",fmtP(p.proChurnMonthly),fmtP(1-Math.pow(1-p.proChurnMonthly,12)),"Add engagement"],
          ["Enterprise",fmtP(p.enterpriseChurnMonthly),fmtP(1-Math.pow(1-p.enterpriseChurnMonthly,12)),"Sticky"],
        ]}/>
      </Card>
      <div className="g2">
        <Card title="Customer Growth"><Bar data={m.data.map(d=>d.totalCustomers)} h={80}/><div className="cl"><span>M1</span><span>M{N*12}</span></div></Card>
        <Card title={`Revenue Mix Y${N}`}>
          <Pie data={[
            {label:"Basic",value:m.data.filter(d=>d.year===N).reduce((s,d)=>s+d.revB,0)||1,color:"#3b82f6"},
            {label:"Pro",value:m.data.filter(d=>d.year===N).reduce((s,d)=>s+d.revP,0)||1,color:"#6366f1"},
            {label:"Enterprise",value:m.data.filter(d=>d.year===N).reduce((s,d)=>s+d.revE+d.revSeats,0)||1,color:"#8b5cf6"},
            {label:"Storage",value:m.data.filter(d=>d.year===N).reduce((s,d)=>s+d.revStor,0)||1,color:"#10b981"},
          ]} size={140}/>
        </Card>
      </div>
    </div>
  );
}

function CostTab({model:m,params:p,setParams:sp}) {
  const c=v=>cv(v,p.exchangeRate,p.displayCurrency); const cur=p.displayCurrency;
  const u=(k,v)=>sp(pr=>({...pr,[k]:v}));
  const [viewYear,setViewYear]=useState(1);
  const last=m.data[11]; const a0=m.annuals[0];
  const cac=a0.newCustomers>0?a0.mkt/a0.newCustomers:0;
  const arpu=last.totalCustomers>0?last.totalRevenue/last.totalCustomers:0;
  const avgChurn=(p.basicChurnMonthly+p.proChurnMonthly)/2;
  const ltv=avgChurn>0?arpu/avgChurn:0;
  const budget = p.llmBudget || LLM_PRESETS[p.llmStrategy];
  const apiReserve = m.apiReserveCalc;
  const fullBudget = m.budget;

  const updateBudget=(key,val)=>{
    sp(pr=>({...pr, llmBudget:{...(pr.llmBudget||LLM_PRESETS[pr.llmStrategy]),[key]:parseFloat(val)||0}}));
  };
  const applyPreset=(strategy)=>{
    sp(pr=>({...pr, llmStrategy:strategy, llmBudget:{...LLM_PRESETS[strategy]}}));
  };
  const setOverride=(month,key,val)=>{
    sp(pr=>{
      const ovr={...(pr.costOverrides||{})};
      if(!ovr[month]) ovr[month]={};
      if(val===""||val==null){delete ovr[month][key];if(Object.keys(ovr[month]).length===0) delete ovr[month];}
      else ovr[month]={...ovr[month],[key]:parseFloat(val)||0};
      return {...pr,costOverrides:ovr};
    });
  };
  const budgetTotal = Object.values(fullBudget).reduce((s,v)=>s+v,0);

  const N = m.projYears;
  // Aggregate COGS/OpEx for each year
  const yrData = Array.from({length: N}, (_, yi) => {
    const months = m.data.slice(yi*12,(yi+1)*12);
    const cogsTotal = months.reduce((s,d)=>s+d.cogs,0);
    const opexTotal = months.reduce((s,d)=>s+d.opex,0);
    const revTotal = months.reduce((s,d)=>s+d.totalRevenue,0);
    const gpTotal = months.reduce((s,d)=>s+d.grossProfit,0);
    const apiTotal = months.reduce((s,d)=>s+d.apiCost,0);
    const hwTotal = months.reduce((s,d)=>s+d.hwDep,0);
    const platSwTotal = months.reduce((s,d)=>s+d.platformSw,0);
    const payProcTotal = months.reduce((s,d)=>s+d.paymentProcessing,0);
    const supportTotal = months.reduce((s,d)=>s+d.supportCost,0);
    const salTotal = months.reduce((s,d)=>s+d.salaryCost,0);
    const devTotal = months.reduce((s,d)=>s+d.devCost,0);
    const intSwTotal = months.reduce((s,d)=>s+d.internalSw,0);
    const mktTotal = months.reduce((s,d)=>s+d.mktCost,0);
    return { year: yi+1, cogsTotal, opexTotal, revTotal, gpTotal, apiTotal, hwTotal, platSwTotal, payProcTotal, supportTotal, salTotal, devTotal, intSwTotal, mktTotal };
  });

  // Burn rate & runway
  const monthlyBurn = a0.totalCost / 12;
  const runway = monthlyBurn > 0 ? Math.round(p.raiseAmount / monthlyBurn) : 99;
  const costPerUser = last.totalCustomers > 0 ? (last.cogs + last.opex) / last.totalCustomers : 0;
  const cogsPerUser = last.totalCustomers > 0 ? last.cogs / last.totalCustomers : 0;

  const stackedLegend = [
    {label:"COGS",color:"var(--rd)"}, {label:"OpEx",color:"var(--ac)"}
  ];

  const mLabels = monthLabels(N);
  const YearBtns = () => (
    <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
      {Array.from({length:N},(_,i)=>i+1).map(y=><button key={y} className="ct" style={{margin:0,padding:"4px 12px",background:viewYear===y?"var(--ac)":"var(--bg3)",color:viewYear===y?"#fff":"var(--tx)",border:viewYear===y?"none":"1px solid var(--bd)"}} onClick={()=>setViewYear(y)}>Y{y}</button>)}
    </div>
  );

  return (
    <div className="tc">
      <div className="st">Cost Model — {p.llmStrategy.toUpperCase()}</div>

      {/* Summary Metrics */}
      <div className="mg" style={{gridTemplateColumns:"repeat(5,1fr)"}}>
        <Metric label="Y1 COGS" value={fmt(c(yrData[0].cogsTotal),cur)} sub="Variable costs" color="var(--rd)"/>
        <Metric label="Y1 OpEx" value={fmt(c(yrData[0].opexTotal),cur)} sub="Operating costs" color="var(--ac)"/>
        <Metric label="Gross Margin" value={yrData[0].revTotal>0?fmtP(yrData[0].gpTotal/yrData[0].revTotal):"—"} sub="Revenue − COGS" color={yrData[0].gpTotal>0?"var(--gn)":"var(--rd)"}/>
        <Metric label="Burn Rate" value={fmt(c(monthlyBurn),cur)+"/mo"} sub={`Runway: ${runway} months`} color="var(--yl)"/>
        <Metric label="Cost/User" value={fmt(c(costPerUser),cur)+"/mo"} sub={`COGS: ${fmt(c(cogsPerUser),cur)}`} color="var(--pp)"/>
      </div>

      {/* COGS vs OpEx Visual */}
      <Card title={`COGS vs OpEx — ${N*12} Months`}>
        <div className="g2">
          <div>
            <StackedBar data={m.data.map(d=>[d.cogs,d.opex].map(v=>c(v)))} h={110} legend={stackedLegend}/>
            <div className="cl">{mLabels.map((l,i)=><span key={i}>{l}</span>)}</div>
          </div>
          <div>
            <Bar data={m.data.map(d=>d.totalCustomers>0?d.grossMargin:0)} color="var(--gn)" h={110}/>
            <div className="cl">{mLabels.map((l,i)=><span key={i}>{l}</span>)}</div>
            <div style={{textAlign:"center",fontSize:11,color:"var(--td)",marginTop:4}}>Gross Margin %</div>
          </div>
        </div>
        <Tbl headers={["", ...yrData.map(y=>`Year ${y.year}`)]} rows={[
          yearRow("Revenue", yrData, y => fmt(c(y.revTotal),cur)),
          yearRow("COGS (Variable)", yrData, y => fmt(c(y.cogsTotal),cur)),
          yearRow("Gross Profit", yrData, y => fmt(c(y.gpTotal),cur)),
          yearRow("Gross Margin %", yrData, y => y.revTotal>0?fmtP(y.gpTotal/y.revTotal):"—"),
          yearRow("OpEx (Fixed)", yrData, y => fmt(c(y.opexTotal),cur)),
          yearRow("Total Costs", yrData, y => fmt(c(y.cogsTotal+y.opexTotal),cur)),
        ]} hl/>
      </Card>

      {/* COGS Breakdown */}
      <Card title="COGS / Variable Costs — Breakdown">
        <div className="g2">
          <div>
            <Pie data={[
              {label:"LLM API",value:yrData[0].apiTotal,color:"#f59e0b"},
              {label:"HW Depreciation",value:yrData[0].hwTotal,color:"#ef4444"},
              {label:"Platform Infra",value:yrData[0].platSwTotal,color:"#8b5cf6"},
              {label:"Payment Processing",value:yrData[0].payProcTotal,color:"#3b82f6"},
              {label:"Customer Support",value:yrData[0].supportTotal,color:"#10b981"},
            ].filter(i=>i.value>0)} size={160}/>
            <div style={{textAlign:"center",fontSize:11,color:"var(--td)",marginTop:4}}>Year 1 COGS Mix</div>
          </div>
          <Tbl headers={["COGS Item", ...yrData.map(y=>`Year ${y.year}`)]} rows={[
            yearRow("LLM API Cost", yrData, y => fmt(c(y.apiTotal),cur)),
            yearRow("HW Depreciation", yrData, y => fmt(c(y.hwTotal),cur)),
            yearRow("Platform Software", yrData, y => fmt(c(y.platSwTotal),cur)),
            yearRow("Payment Processing", yrData, y => fmt(c(y.payProcTotal),cur)),
            yearRow("Customer Support", yrData, y => fmt(c(y.supportTotal),cur)),
            yearRow("Total COGS", yrData, y => fmt(c(y.cogsTotal),cur)),
          ]} hl/>
        </div>
        <div style={{marginTop:12}}>
          <PI label="Payment Processing Rate" value={p.paymentProcessingRate} onChange={v=>u("paymentProcessingRate",v)} step={0.001} min={0} max={0.1}/>
          <PI label="Support Cost/User/Mo (THB)" value={p.supportCostPerUser} onChange={v=>u("supportCostPerUser",v)} step={10}/>
          <PI label="API Cost/User/Mo (THB)" value={p.apiCostPerUser} onChange={v=>u("apiCostPerUser",v)} step={10}/>
        </div>
      </Card>

      {/* OpEx Breakdown */}
      <Card title="OpEx / Operating Costs — Breakdown">
        <div className="g2">
          <div>
            <Pie data={[
              {label:"Salaries & Team",value:yrData[0].salTotal,color:"#3b82f6"},
              {label:"Development",value:yrData[0].devTotal,color:"#6366f1"},
              {label:"Internal Software",value:yrData[0].intSwTotal,color:"#8b5cf6"},
              {label:"Marketing",value:yrData[0].mktTotal,color:"#ec4899"},
            ].filter(i=>i.value>0)} size={160}/>
            <div style={{textAlign:"center",fontSize:11,color:"var(--td)",marginTop:4}}>Year 1 OpEx Mix</div>
          </div>
          <Tbl headers={["OpEx Item", ...yrData.map(y=>`Year ${y.year}`)]} rows={[
            yearRow("Salaries & Team", yrData, y => fmt(c(y.salTotal),cur)),
            yearRow("Development", yrData, y => fmt(c(y.devTotal),cur)),
            yearRow("Internal Software", yrData, y => fmt(c(y.intSwTotal),cur)),
            yearRow("Marketing", yrData, y => fmt(c(y.mktTotal),cur)),
            yearRow("Total OpEx", yrData, y => fmt(c(y.opexTotal),cur)),
          ]} hl/>
        </div>
        <div style={{marginTop:12}}>
          <PI label="Marketing Budget Y1 (THB)" value={p.marketingBudgetY1} onChange={v=>u("marketingBudgetY1",v)} step={100000}/>
          <PI label="Outsource Dev" value={p.outsourceDevMonthly} onChange={v=>u("outsourceDevMonthly",v)} step={5000}/>
          <PI label="Outsource Accounting" value={p.outsourceAccountingMonthly} onChange={v=>u("outsourceAccountingMonthly",v)} step={1000}/>
          <PI label="Office Rent" value={p.officeRent} onChange={v=>u("officeRent",v)} step={1000}/>
          <PI label="Utilities" value={p.utilities} onChange={v=>u("utilities",v)} step={1000}/>
          <PI label="Misc Ops" value={p.miscOps} onChange={v=>u("miscOps",v)} step={1000}/>
        </div>
      </Card>

      {/* LLM Strategy & Budget */}
      <Card title="LLM Strategy & Budget">
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          {["api","own","hybrid"].map(s=>(
            <button key={s} className="ct" style={{margin:0,padding:"6px 16px",background:p.llmStrategy===s?"var(--ac)":"var(--bg3)",color:p.llmStrategy===s?"#fff":"var(--tx)",border:p.llmStrategy===s?"none":"1px solid var(--bd)"}} onClick={()=>applyPreset(s)}>{s.toUpperCase()}</button>
          ))}
        </div>
        <div className="g2">
          <div>
            <PI label="Development (THB)" value={budget.dev} onChange={v=>updateBudget("dev",v)} step={100000}/>
            <PI label="Hardware (THB)" value={budget.hardware} onChange={v=>updateBudget("hardware",v)} step={100000}/>
            <div className="pr">
              <label className="pl">API Reserve (auto)</label>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:"var(--gn)",fontWeight:600}}>{fmtF(apiReserve,cur)}</span>
            </div>
            <div style={{fontSize:10,color:"var(--td)",marginTop:-4,marginBottom:6,paddingLeft:4}}>
              = {fmtN(m.data[11].totalCustomers)} users x ฿{fmtN(p.apiCostPerUser)}/user x {p.apiReserveMonths} mo
            </div>
            <PI label="Reserve Months" value={p.apiReserveMonths||6} onChange={v=>u("apiReserveMonths",v)} step={1} min={1} max={24}/>
            <PI label="Salary & Ops (THB)" value={budget.salaryOps} onChange={v=>updateBudget("salaryOps",v)} step={100000}/>
            <PI label="Software (THB)" value={budget.software} onChange={v=>updateBudget("software",v)} step={100000}/>
            <PI label="Marketing (THB)" value={budget.marketing} onChange={v=>updateBudget("marketing",v)} step={100000}/>
            <PI label="Buffer (THB)" value={budget.buffer} onChange={v=>updateBudget("buffer",v)} step={100000}/>
            <div style={{borderTop:"2px solid var(--ac)",paddingTop:8,marginTop:8}}>
              <div className="pr"><label className="pl" style={{fontWeight:700,color:"var(--tx)"}}>Total LLM Budget</label><span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:"var(--ac)"}}>{fmt(c(budgetTotal),cur)}</span></div>
            </div>
          </div>
          <div>
            <Pie data={[
              {label:"Development",value:fullBudget.dev,color:"#6366f1"},
              {label:"Hardware",value:fullBudget.hardware,color:"#f59e0b"},
              {label:"API Reserve",value:fullBudget.apiReserve,color:"#10b981"},
              {label:"Salary & Ops",value:fullBudget.salaryOps,color:"#3b82f6"},
              {label:"Software",value:fullBudget.software,color:"#8b5cf6"},
              {label:"Marketing",value:fullBudget.marketing,color:"#ec4899"},
              {label:"Buffer",value:fullBudget.buffer,color:"#6b7280"},
            ].filter(i=>i.value>0)} size={170}/>
          </div>
        </div>
      </Card>

      {/* Unit Economics */}
      <Card title="Unit Economics (Month 12)">
        <div className="mg">
          <Metric label="ARPU" value={fmt(c(arpu),cur)} sub="Revenue/User/Mo"/>
          <Metric label="COGS/User" value={fmt(c(cogsPerUser),cur)} sub="Variable Cost/User"/>
          <Metric label="CAC" value={fmt(c(cac),cur)} sub="Acquisition Cost"/>
          <Metric label="LTV" value={fmt(c(ltv),cur)} sub="Lifetime Value"/>
          <Metric label="LTV:CAC" value={cac>0?`${(ltv/cac).toFixed(1)}x`:"N/A"} sub="Target: >3x" color={ltv/cac>3?"var(--gn)":"var(--yl)"}/>
        </div>
        <Tbl headers={["Metric","Value","Notes"]} rows={[
          ["ARPU",fmt(c(arpu),cur),"Monthly revenue per user"],
          ["COGS/User",fmt(c(cogsPerUser),cur),"API + infra + support per user"],
          ["Contribution Margin",arpu>0?fmtP((arpu-cogsPerUser)/arpu):"—","ARPU minus COGS per user"],
          ["CAC",fmt(c(cac),cur),"Marketing ÷ new customers (Y1)"],
          ["LTV",fmt(c(ltv),cur),"ARPU ÷ avg churn rate"],
          ["LTV:CAC",cac>0?`${(ltv/cac).toFixed(1)}x`:"N/A","Target: >3x for healthy SaaS"],
        ]}/>
      </Card>

      {/* Cost-per-User Trend */}
      <Card title={`Cost per User — ${N*12} Month Trend`}>
        <div className="g2">
          <div>
            <Bar data={m.data.map(d=>d.totalCustomers>0?c((d.cogs+d.opex)/d.totalCustomers):0)} color="var(--pp)" h={100}/>
            <div className="cl">{mLabels.map((l,i)=><span key={i}>{l}</span>)}</div>
            <div style={{textAlign:"center",fontSize:11,color:"var(--td)",marginTop:4}}>Total Cost / User</div>
          </div>
          <div>
            <Bar data={m.data.map(d=>d.totalCustomers>0?c(d.cogs/d.totalCustomers):0)} color="var(--rd)" h={100}/>
            <div className="cl">{mLabels.map((l,i)=><span key={i}>{l}</span>)}</div>
            <div style={{textAlign:"center",fontSize:11,color:"var(--td)",marginTop:4}}>COGS / User</div>
          </div>
        </div>
      </Card>

      {/* Monthly Budget Planner with overrides */}
      <Card title={`Monthly Budget Planner — Year ${viewYear}`}>
        <YearBtns/>
        <div className="tw" style={{fontSize:11}}>
          <table>
            <thead><tr><th>Month</th><th>Mkt</th><th>Override</th><th>Dev</th><th>Override</th><th>API</th><th>Override</th><th>Total</th></tr></thead>
            <tbody>
              {m.data.filter(d=>d.year===viewYear).map(d=>{
                const ovr=(p.costOverrides||{})[d.month]||{};
                return (
                  <tr key={d.month}>
                    <td>{d.label}</td>
                    <td className="n">{fmt(c(d.mktCost),cur)}</td>
                    <td className="n"><input type="number" className="pi" style={{width:80,fontSize:11}} value={ovr.mkt!=null?ovr.mkt:""} placeholder="auto" onChange={e=>setOverride(d.month,"mkt",e.target.value)}/></td>
                    <td className="n">{fmt(c(d.devCost),cur)}</td>
                    <td className="n"><input type="number" className="pi" style={{width:80,fontSize:11}} value={ovr.dev!=null?ovr.dev:""} placeholder="auto" onChange={e=>setOverride(d.month,"dev",e.target.value)}/></td>
                    <td className="n">{fmt(c(d.apiCost),cur)}</td>
                    <td className="n"><input type="number" className="pi" style={{width:80,fontSize:11}} value={ovr.api!=null?ovr.api:""} placeholder="auto" onChange={e=>setOverride(d.month,"api",e.target.value)}/></td>
                    <td className="n" style={{fontWeight:600}}>{fmt(c(d.totalCost),cur)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detailed Monthly: COGS */}
      <Card title={`Monthly COGS — Year ${viewYear}`}>
        <YearBtns/>
        <Tbl headers={["Month","LLM API","HW Dep","Platform SW","Pay Proc","Support","Total COGS","Gross Margin"]} rows={m.data.filter(d=>d.year===viewYear).map(d=>[
          d.label,fmt(c(d.apiCost),cur),fmt(c(d.hwDep),cur),fmt(c(d.platformSw),cur),fmt(c(d.paymentProcessing),cur),fmt(c(d.supportCost),cur),fmt(c(d.cogs),cur),d.totalRevenue>0?fmtP(d.grossMargin):"—",
        ])}/>
      </Card>

      {/* Detailed Monthly: OpEx */}
      <Card title={`Monthly OpEx — Year ${viewYear}`}>
        <YearBtns/>
        <Tbl headers={["Month","Salary","Dev","Internal SW","Marketing","Total OpEx"]} rows={m.data.filter(d=>d.year===viewYear).map(d=>[
          d.label,fmt(c(d.salaryCost),cur),fmt(c(d.devCost),cur),fmt(c(d.internalSw),cur),fmt(c(d.mktCost),cur),fmt(c(d.opex),cur),
        ])}/>
      </Card>
    </div>
  );
}

function MarketingTab({model:m,params:p,setParams:sp}) {
  const c=v=>cv(v,p.exchangeRate,p.displayCurrency); const cur=p.displayCurrency;
  const u=(k,v)=>sp(pr=>({...pr,[k]:v}));
  const vis=p.websiteVisitors; const leads=Math.round(vis*p.visitorToLeadRate);
  const trials=Math.round(leads*p.leadToTrialRate); const cust=Math.round(trials*p.trialToCustomerRate);
  return (
    <div className="tc">
      <div className="st">Marketing Model</div>
      <Card title="Budget & Channel Allocation">
        <div className="g2">
          <div>
            <PI label="Y1 Budget (THB)" value={p.marketingBudgetY1} onChange={v=>u("marketingBudgetY1",v)} step={100000}/>
            <PI label="Sales Outreach %" value={p.salesOutreachPct} onChange={v=>u("salesOutreachPct",v)} step={0.05} max={1}/>
            <PI label="LINE Affiliation %" value={p.lineAffiliationPct} onChange={v=>u("lineAffiliationPct",v)} step={0.05} max={1}/>
            <PI label="Word of Mouth %" value={p.wordOfMouthPct} onChange={v=>u("wordOfMouthPct",v)} step={0.05} max={1}/>
            <PI label="Content Marketing %" value={p.contentMarketingPct} onChange={v=>u("contentMarketingPct",v)} step={0.05} max={1}/>
          </div>
          <Pie data={[
            {label:`Sales (${fmt(c(p.marketingBudgetY1*p.salesOutreachPct),cur)})`,value:p.salesOutreachPct,color:"#3b82f6"},
            {label:`LINE (${fmt(c(p.marketingBudgetY1*p.lineAffiliationPct),cur)})`,value:p.lineAffiliationPct,color:"#10b981"},
            {label:`WoM (${fmt(c(p.marketingBudgetY1*p.wordOfMouthPct),cur)})`,value:p.wordOfMouthPct,color:"#f59e0b"},
            {label:`Content (${fmt(c(p.marketingBudgetY1*p.contentMarketingPct),cur)})`,value:p.contentMarketingPct,color:"#8b5cf6"},
          ]} size={160}/>
        </div>
      </Card>
      <Card title="Conversion Funnel — Drives Revenue">
        <div className="g2">
          <div>
            <PI label="Website Visitors/Mo" value={p.websiteVisitors} onChange={v=>u("websiteVisitors",v)} step={500}/>
            <PI label="Visitor to Lead %" value={p.visitorToLeadRate} onChange={v=>u("visitorToLeadRate",v)} step={0.01} max={1}/>
            <PI label="Lead to Trial %" value={p.leadToTrialRate} onChange={v=>u("leadToTrialRate",v)} step={0.01} max={1}/>
            <PI label="Trial to Customer %" value={p.trialToCustomerRate} onChange={v=>u("trialToCustomerRate",v)} step={0.01} max={1}/>
          </div>
          <div>
            {[{l:"Website Visitors",n:vis,r:"—"},{l:"Leads",n:leads,r:fmtP(p.visitorToLeadRate)},{l:"Free Trials",n:trials,r:fmtP(p.leadToTrialRate)},{l:"Paying Customers",n:cust,r:fmtP(p.trialToCustomerRate)}].map((s,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,margin:"6px auto",width:`${95-i*15}%`}}>
                <div style={{flex:1,padding:"10px 14px",borderRadius:6,background:`hsl(${220+i*30},70%,${45+i*10}%)`,display:"flex",justifyContent:"space-between",color:"#fff",fontSize:13,fontWeight:500}}>
                  <span>{s.l}</span><strong>{fmtN(s.n)}</strong>
                </div>
                {i>0&&<span style={{fontSize:11,color:"var(--td)",minWidth:50}}>{s.r}</span>}
              </div>
            ))}
            <div style={{marginTop:10,fontSize:12,color:"var(--gn)",textAlign:"center",fontWeight:500}}>
              Funnel: {fmtN(cust)}/mo &rarr; B {fmtP(p.tierSplitBasic)} | P {fmtP(p.tierSplitPro)} | E {fmtP(p.tierSplitEnterprise)}
            </div>
          </div>
        </div>
      </Card>
      <Card title="Sales Team">
        <div className="g2">
          <div>
            <PI label="Sales Reps" value={p.salesRepsY1} onChange={v=>u("salesRepsY1",v)} step={1} min={0}/>
            <PI label="Cost/Rep/Mo (THB)" value={p.salesRepCostMonthly} onChange={v=>u("salesRepCostMonthly",v)} step={5000}/>
            <PI label="Deals/Rep/Mo" value={p.dealsPerRepPerMonth} onChange={v=>u("dealsPerRepPerMonth",v)} step={1}/>
          </div>
          <Tbl headers={["Metric","Value"]} rows={[["Total Reps",p.salesRepsY1],["Total Deals/Mo",p.salesRepsY1*p.dealsPerRepPerMonth],["Annual Cost",fmt(c(p.salesRepsY1*p.salesRepCostMonthly*12),cur)]]}/>
        </div>
      </Card>
    </div>
  );
}

function HeadcountTab({model:m,params:p,setParams:sp}) {
  const c=v=>cv(v,p.exchangeRate,p.displayCurrency); const cur=p.displayCurrency;
  const u=(k,v)=>sp(pr=>({...pr,[k]:v}));
  const team=p.team||[];
  const updateMember=(id,key,val)=>{sp(pr=>({...pr,team:(pr.team||[]).map(t=>t.id===id?{...t,[key]:val}:t)}));};
  const removeMember=(id)=>{sp(pr=>({...pr,team:(pr.team||[]).filter(t=>t.id!==id)}));};
  const addMember=()=>{const maxId=team.reduce((mx,t)=>Math.max(mx,t.id),0);sp(pr=>({...pr,team:[...(pr.team||[]),{id:maxId+1,role:"New Role",name:"TBD",sal:25000,m:1,type:"Planned"}]}));};
  const founders=team.filter(t=>t.type==="Founder"); const employees=team.filter(t=>t.type!=="Founder");
  const totalPayroll=team.reduce((s,t)=>s+t.sal,0);
  return (
    <div className="tc">
      <div className="st">Headcount Planning</div>
      <div className="mg">
        <Metric label="Team Size" value={team.length} sub={`${founders.length} Founders + ${employees.length} Others`}/>
        <Metric label="Payroll/Mo" value={fmt(c(totalPayroll),cur)} sub="All team members"/>
        <Metric label="Outsource/Mo" value={fmt(c(p.outsourceDevMonthly+p.outsourceAccountingMonthly),cur)}/>
        <Metric label="Total People Cost/Mo" value={fmt(c(totalPayroll+p.outsourceDevMonthly+p.outsourceAccountingMonthly),cur)} color="var(--yl)"/>
      </div>
      <Card title="Team Roster">
        <div className="tw"><table>
          <thead><tr><th>Role</th><th>Name</th><th>Type</th><th>Salary/Mo</th><th>Start</th><th>Y1 Cost</th><th></th></tr></thead>
          <tbody>{team.map(t=>(
            <tr key={t.id}>
              <td><input className="pi" style={{width:120,textAlign:"left",fontSize:12}} value={t.role} onChange={e=>updateMember(t.id,"role",e.target.value)}/></td>
              <td><input className="pi" style={{width:90,textAlign:"left",fontSize:12}} value={t.name} onChange={e=>updateMember(t.id,"name",e.target.value)}/></td>
              <td><select className="pi" style={{width:90,textAlign:"left",fontSize:12}} value={t.type} onChange={e=>updateMember(t.id,"type",e.target.value)}><option value="Founder">Founder</option><option value="Employee">Employee</option><option value="Planned">Planned</option></select></td>
              <td><input type="number" className="pi" style={{width:80,fontSize:12}} value={t.sal} onChange={e=>updateMember(t.id,"sal",parseFloat(e.target.value)||0)} step={5000}/></td>
              <td><input type="number" className="pi" style={{width:50,fontSize:12}} value={t.m} onChange={e=>updateMember(t.id,"m",parseInt(e.target.value)||1)} min={1} max={(p.projectionYears||5)*12}/></td>
              <td className="n">{t.sal>0?fmt(c(t.sal*Math.max(0,13-t.m)),cur):"—"}</td>
              <td><button className="del-btn" onClick={()=>removeMember(t.id)}>✕</button></td>
            </tr>
          ))}</tbody>
        </table></div>
        <button className="ct" style={{marginTop:10,display:"inline-block"}} onClick={addMember}>+ Add Team Member</button>
      </Card>
      <Card title="Outsourced & Office">
        <PI label="Dev Outsource (THB/mo)" value={p.outsourceDevMonthly} onChange={v=>u("outsourceDevMonthly",v)} step={5000}/>
        <PI label="Accounting (THB/mo)" value={p.outsourceAccountingMonthly} onChange={v=>u("outsourceAccountingMonthly",v)} step={1000}/>
        <PI label="Office Rent (THB/mo)" value={p.officeRent} onChange={v=>u("officeRent",v)} step={1000}/>
        <PI label="Utilities (THB/mo)" value={p.utilities} onChange={v=>u("utilities",v)} step={1000}/>
        <PI label="Misc Ops (THB/mo)" value={p.miscOps} onChange={v=>u("miscOps",v)} step={1000}/>
      </Card>
    </div>
  );
}

function IncomeTab({model:m,params:p}) {
  const c=v=>cv(v,p.exchangeRate,p.displayCurrency); const cur=p.displayCurrency;
  return (<div className="tc"><div className="st">Income Statement (P&L)</div>
    <Card title="Annual P&L"><Tbl headers={yearHeaders(m.annuals)} rows={[
      yearRow("Revenue", m.annuals, a => fmt(c(a.revenue),cur)),
      yearRow("COGS", m.annuals, a => `(${fmt(c(a.cogs),cur)})`),
      yearRow("Gross Profit", m.annuals, a => fmt(c(a.grossProfit),cur)),
      yearRow("Gross Margin", m.annuals, a => a.revenue>0?fmtP(a.grossProfit/a.revenue):"—"),
      yearRow("", m.annuals, () => ""),
      yearRow("OpEx", m.annuals, a => `(${fmt(c(a.opex),cur)})`),
      yearRow("", m.annuals, () => ""),
      yearRow("EBITDA", m.annuals, a => fmt(c(a.ebitda),cur)),
      yearRow("Net Income", m.annuals, a => fmt(c(a.netIncome),cur)),
    ]} hl/></Card>
    <Card title="Monthly P&L — Year 1"><Tbl headers={["Mo","Rev","COGS","GP","OpEx","EBITDA"]} rows={m.data.filter(d=>d.year===1).map(d=>[d.label,fmt(c(d.totalRevenue),cur),fmt(c(d.cogs),cur),fmt(c(d.grossProfit),cur),fmt(c(d.opex),cur),fmt(c(d.ebitda),cur)])}/></Card>
  </div>);
}

function BalanceTab({model:m,params:p}) {
  const c=v=>cv(v,p.exchangeRate,p.displayCurrency); const cur=p.displayCurrency;
  const eoy = m.annuals.map(a => yEnd(m.data, a.year));
  return (<div className="tc"><div className="st">Balance Sheet</div>
    <Card title="End of Year"><Tbl headers={yearHeaders(m.annuals)} rows={[
      yearRow("ASSETS", m.annuals, () => ""),
      yearRow("  Cash", eoy, d => fmt(c(d.cash),cur)),
      yearRow("  Fixed Assets", eoy, d => fmt(c(d.fixedAssets),cur)),
      yearRow("Total Assets", eoy, d => fmt(c(d.totalAssets),cur)),
      yearRow("", m.annuals, () => ""),
      yearRow("LIABILITIES", m.annuals, () => ""),
      yearRow("  Loan Balance", eoy, d => fmt(c(d.loanBalance),cur)),
      yearRow("  Total", eoy, d => fmt(c(d.loanBalance),cur)),
      yearRow("", m.annuals, () => ""),
      yearRow("EQUITY", m.annuals, () => ""),
      yearRow("  Paid-in Capital", m.annuals, () => fmt(c(p.raiseAmount),cur)),
      yearRow("  Retained Earnings", eoy, d => fmt(c(d.retainedEarnings),cur)),
      yearRow("Total Equity", eoy, d => fmt(c(d.equity),cur)),
    ]} hl/></Card>
  </div>);
}

function CashFlowTab({model:m,params:p,setParams:sp}) {
  const c=v=>cv(v,p.exchangeRate,p.displayCurrency); const cur=p.displayCurrency;
  const u=(k,v)=>sp(pr=>({...pr,[k]:v}));
  const N = m.projYears;
  const mLabels = monthLabels(N);
  const [viewYear,setViewYear]=useState(1);
  const last = m.data[m.data.length-1];
  const eoy = m.annuals.map(a => yEnd(m.data, a.year));
  const hasLoan = (p.loanAmount || 0) > 0;

  return (<div className="tc"><div className="st">Cash Flow Statement</div>

    {/* Annual 3-Activity Cash Flow */}
    <Card title="Annual Cash Flow Statement">
      <Tbl headers={yearHeaders(m.annuals)} rows={[
        yearRow("OPERATING ACTIVITIES", m.annuals, () => ""),
        yearRow("  Net Income", m.annuals, a => fmt(c(a.netIncome),cur)),
        yearRow("  + Depreciation", m.annuals, a => fmt(c(a.depreciation),cur)),
        yearRow("Cash from Operations", m.annuals, a => fmt(c(a.cashFromOperations),cur)),
        yearRow("", m.annuals, () => ""),
        yearRow("INVESTING ACTIVITIES", m.annuals, () => ""),
        yearRow("  Hardware CapEx", m.annuals, a => fmt(c(-a.capex),cur)),
        yearRow("Cash from Investing", m.annuals, a => fmt(c(a.cashFromInvesting),cur)),
        yearRow("", m.annuals, () => ""),
        yearRow("FINANCING ACTIVITIES", m.annuals, () => ""),
        yearRow("  Debt Borrowed", m.annuals, a => fmt(c(a.debtBorrowed),cur)),
        yearRow("  Debt Repaid", m.annuals, a => a.debtRepaid>0?`(${fmt(c(a.debtRepaid),cur)})`:"—"),
        yearRow("  Interest Paid", m.annuals, a => a.interestPaid>0?`(${fmt(c(a.interestPaid),cur)})`:"—"),
        yearRow("Cash from Financing", m.annuals, a => fmt(c(a.cashFromFinancing),cur)),
        yearRow("", m.annuals, () => ""),
        yearRow("Net Change", m.annuals, a => fmt(c(a.cashFromOperations+a.cashFromInvesting+a.cashFromFinancing),cur)),
        yearRow("Beginning Cash", eoy, (d,i) => fmt(c(i===0?p.raiseAmount:eoy[i-1].cash),cur)),
        yearRow("Ending Cash", eoy, d => fmt(c(d.cash),cur)),
      ]} hl/>
    </Card>

    {/* Monthly Cash Balance chart */}
    <Card title="Monthly Cash Balance">
      <Bar data={m.data.map(d=>c(d.cash))} h={100}/>
      <div className="cl">{mLabels.map((l,i)=><span key={i}>{l}</span>)}</div>
      <div style={{marginTop:8,fontSize:13,color:last.cash>0?"var(--gn)":"var(--rd)",fontWeight:500}}>{last.cash>0?`Cash positive at M${m.data.length}`:"Additional funding needed"}</div>
    </Card>

    {/* Stacked bar: Operating / Investing / Financing */}
    <Card title="Cash Flow Activities by Month">
      <StackedBar data={m.data.map(d=>[Math.max(0,c(d.cashFromOperations)),Math.max(0,c(-d.cashFromInvesting)),Math.max(0,c(d.cashFromFinancing))])} h={100} legend={[
        {label:"Operating",color:"var(--gn)"},{label:"Investing",color:"var(--yl)"},{label:"Financing",color:"var(--ac)"}
      ]}/>
      <div className="cl">{mLabels.map((l,i)=><span key={i}>{l}</span>)}</div>
    </Card>

    {/* Monthly detail table with year selector */}
    <Card title={`Monthly Detail — Year ${viewYear}`}>
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
        {Array.from({length:N},(_,i)=>i+1).map(y=><button key={y} className="ct" style={{margin:0,padding:"4px 12px",background:viewYear===y?"var(--ac)":"var(--bg3)",color:viewYear===y?"#fff":"var(--tx)",border:viewYear===y?"none":"1px solid var(--bd)"}} onClick={()=>setViewYear(y)}>Y{y}</button>)}
      </div>
      <Tbl headers={["Mo","Operating","Investing","Financing","Net CF","Cash"]} rows={m.data.filter(d=>d.year===viewYear).map(d=>[
        d.label,fmt(c(d.cashFromOperations),cur),fmt(c(d.cashFromInvesting),cur),fmt(c(d.cashFromFinancing),cur),fmt(c(d.netCF),cur),fmt(c(d.cash),cur)
      ])}/>
    </Card>

    {/* Debt Schedule */}
    {hasLoan && <Card title="Debt Schedule">
      <div className="mg" style={{gridTemplateColumns:"repeat(4,1fr)"}}>
        <Metric label="Loan Amount" value={fmt(c(p.loanAmount),cur)} color="var(--ac)"/>
        <Metric label="Interest Rate" value={fmtP(p.loanInterestRate)}/>
        <Metric label="Term" value={`${p.loanTermMonths} months`}/>
        <Metric label="Monthly Payment" value={fmt(c(
          p.loanAmount>0 && (p.loanInterestRate/12)>0
            ? p.loanAmount*(p.loanInterestRate/12)/(1-Math.pow(1+p.loanInterestRate/12,-p.loanTermMonths))
            : p.loanAmount/Math.max(p.loanTermMonths,1)
        ),cur)}/>
      </div>
      <Tbl headers={["Month","Balance","Interest","Principal","Payment"]} rows={
        m.data.filter(d=>d.loanBalance>0||d.debtBorrowed>0||d.debtRepaid>0).slice(0,48).map(d=>[
          d.label,fmt(c(d.loanBalance),cur),fmt(c(d.interestPaid),cur),fmt(c(d.debtRepaid),cur),fmt(c(d.interestPaid+d.debtRepaid),cur)
        ])
      }/>
    </Card>}

    {/* Financing Parameters */}
    <Card title="Financing Parameters">
      <div className="g2">
        <div>
          <PI label="Loan Amount (THB)" value={p.loanAmount||0} onChange={v=>u("loanAmount",v)} step={100000} min={0}/>
          <PI label="Interest Rate" value={p.loanInterestRate||0.08} onChange={v=>u("loanInterestRate",v)} step={0.01} min={0} max={1}/>
          <PI label="Term (months)" value={p.loanTermMonths||36} onChange={v=>u("loanTermMonths",v)} step={6} min={6} max={120}/>
          <PI label="Start Month" value={p.loanStartMonth||0} onChange={v=>u("loanStartMonth",v)} step={1} min={0} max={(p.projectionYears||5)*12}/>
        </div>
        <div>
          <PI label="Software CapEx (THB)" value={p.softwareCapex||0} onChange={v=>u("softwareCapex",v)} step={100000} min={0}/>
        </div>
      </div>
    </Card>
  </div>);
}

function CapTableTab({model:m,params:p,setParams:sp}) {
  const c=v=>cv(v,p.exchangeRate,p.displayCurrency); const cur=p.displayCurrency;
  const u=(k,v)=>sp(pr=>({...pr,[k]:v}));
  const ct=m.capTable;
  const updateRound=(idx,key,val)=>{sp(pr=>{const rounds=[...(pr.fundingRounds||[])];rounds[idx]={...rounds[idx],[key]:parseFloat(val)||0};return{...pr,fundingRounds:rounds};});};
  return (
    <div className="tc">
      <div className="st">Cap Table & Path to IPO</div>
      <Card title="Seed Round Configuration">
        <div className="g2">
          <div>
            <PI label="Pre-Money Valuation (THB)" value={p.preMoneyValuation} onChange={v=>u("preMoneyValuation",v)} step={10000000}/>
            <PI label="Raise Amount (THB)" value={p.raiseAmount} onChange={v=>u("raiseAmount",v)} step={1000000}/>
            <PI label="Equity Offered (%)" value={p.equityOffered} onChange={v=>u("equityOffered",v)} step={1} max={50}/>
          </div>
          <div className="mg" style={{gridTemplateColumns:"1fr 1fr"}}>
            <Metric label="Pre-Money" value={fmt(c(p.preMoneyValuation),cur)}/><Metric label="Raise" value={fmt(c(p.raiseAmount),cur)} sub={`${p.equityOffered}% equity`}/>
            <Metric label="Post-Money" value={fmt(c(p.preMoneyValuation+p.raiseAmount),cur)}/><Metric label="Price/Share" value={fmtF(c(p.preMoneyValuation/1000000),cur)}/>
          </div>
        </div>
      </Card>
      <Card title="Post-Seed Ownership">
        <Tbl headers={["Shareholder","Shares","Post-%","Value"]} rows={[
          ...ct.post.map(s=>[s.name,fmtN(s.shares),`${s.postPct}%`,fmt(c(parseFloat(s.postPct)/100*(p.preMoneyValuation+p.raiseAmount)),cur)]),
          ["TOTAL",fmtN(ct.totShares),"100.00%",fmt(c(p.preMoneyValuation+p.raiseAmount),cur)],
        ]} hl/>
        <div style={{marginTop:16,display:"flex",justifyContent:"center"}}>
          <Pie data={ct.post.map((s,i)=>({label:s.name.split("—")[0].trim(),value:parseFloat(s.postPct),color:["#3b82f6","#10b981","#f59e0b","#6366f1","#8b5cf6","#ec4899"][i]}))} size={180}/>
        </div>
      </Card>
      <Card title="Future Funding Rounds">
        <div className="tw"><table>
          <thead><tr><th>Round</th><th>Pre-Money Val</th><th>Raise</th><th>Equity %</th></tr></thead>
          <tbody>{(p.fundingRounds||[]).map((r,i)=>(
            <tr key={i}>
              <td><input className="pi" style={{width:100,textAlign:"left",fontSize:12}} value={r.name} onChange={e=>{sp(pr=>{const rounds=[...(pr.fundingRounds||[])];rounds[i]={...rounds[i],name:e.target.value};return{...pr,fundingRounds:rounds};});}}/></td>
              <td><input type="number" className="pi" style={{width:120,fontSize:12}} value={r.valuation} onChange={e=>updateRound(i,"valuation",e.target.value)} step={10000000}/></td>
              <td><input type="number" className="pi" style={{width:100,fontSize:12}} value={r.raise} onChange={e=>updateRound(i,"raise",e.target.value)} step={10000000}/></td>
              <td><input type="number" className="pi" style={{width:60,fontSize:12}} value={r.equity} onChange={e=>updateRound(i,"equity",e.target.value)} step={1} max={50}/></td>
            </tr>
          ))}</tbody>
        </table></div>
        <PI label="IPO Valuation (THB)" value={p.ipoValuation} onChange={v=>u("ipoValuation",v)} step={100000000}/>
      </Card>
      <Card title="Path to IPO — Valuation & Dilution">
        <Tbl headers={["Round","Pre-Money","Raise","Post-Money","New Shares","Total Shares","Founder %","Founder Value"]} rows={ct.rounds.map(r=>{
          const fPct=(ct.founders.reduce((s,f)=>s+f.shares,0)/r.postShares*100);
          return [r.name,fmt(c(r.valuation),cur),fmt(c(r.raise),cur),fmt(c(r.postMoney),cur),fmtN(r.newShares),fmtN(r.postShares),fPct.toFixed(1)+"%",fmt(c(fPct/100*r.postMoney),cur)];
        })} hl/>
      </Card>
      <Card title="Exit Value at IPO">
        <div className="mg">
          <Metric label="IPO Valuation" value={fmt(c(ct.ipoVal),cur)} color="var(--gn)"/><Metric label="Founders Total %" value={ct.founderPctAtIPO.toFixed(1)+"%"}/>
          <Metric label="Founders Exit Value" value={fmt(c(ct.founderValueAtIPO),cur)} color="var(--gn)"/><Metric label="Total Dilution" value={((100-ct.founderPctAtIPO)).toFixed(1)+"%"} sub="From all rounds" color="var(--yl)"/>
        </div>
        <Tbl headers={["Founder","Original %","At IPO %","Exit Value"]} rows={ct.founders.map(f=>{
          const pctAtIPO=f.shares/ct.cumulativeShares*100;
          return [f.name,f.pct+"%",pctAtIPO.toFixed(2)+"%",fmt(c(pctAtIPO/100*ct.ipoVal),cur)];
        })}/>
      </Card>
    </div>
  );
}

// ============================================================
// VALUATION TAB
// ============================================================
function ValuationTab({model:m,params:p,setParams:sp}) {
  const c=v=>cv(v,p.exchangeRate,p.displayCurrency); const cur=p.displayCurrency;
  const u=(k,v)=>sp(pr=>({...pr,[k]:v}));
  const N = m.projYears;
  const vc = m.valuation.vc;
  const dcf = m.valuation.dcf;

  // Sensitivity grid: Pre-Money by multiple × discount rate
  const multiples = [5,8,10,15,20];
  const discounts = [0.25,0.30,0.35,0.40,0.50];
  const exitYearRev = vc.exitRevenue;
  const investorPct = p.equityOffered / 100;

  return (<div className="tc"><div className="st">Valuation Analysis</div>

    {/* VC Method */}
    <Card title="VC Method">
      <div className="g2">
        <div>
          <SI label="Exit Year" value={p.vcExitYear||5} onChange={v=>u("vcExitYear",parseInt(v))} opts={Array.from({length:N},(_,i)=>({v:i+1,l:`Year ${i+1}`}))}/>
          <PI label="Revenue Multiple" value={p.vcExitMultiple||10} onChange={v=>u("vcExitMultiple",v)} step={1} min={1} max={50}/>
          <PI label="Discount Rate" value={p.vcDiscountRate||0.40} onChange={v=>u("vcDiscountRate",v)} step={0.05} min={0.05} max={1}/>
        </div>
        <div className="mg" style={{gridTemplateColumns:"1fr 1fr"}}>
          <Metric label={`Y${vc.exitYear} Revenue`} value={fmt(c(vc.exitRevenue),cur)} color="var(--ac)"/>
          <Metric label="Exit Valuation" value={fmt(c(vc.exitValuation),cur)} color="var(--gn)"/>
          <Metric label="Investor Value at Exit" value={fmt(c(vc.investorValueAtExit),cur)} color="var(--pp)"/>
          <Metric label="Implied Pre-Money" value={fmt(c(vc.impliedPreMoney),cur)} color="var(--yl)"/>
          <Metric label="Return Multiple" value={`${vc.returnMultiple.toFixed(1)}x`} color={vc.returnMultiple>1?"var(--gn)":"var(--rd)"}/>
        </div>
      </div>
    </Card>

    {/* VC Sensitivity Grid */}
    <Card title="VC Pre-Money Sensitivity (Multiple × Discount Rate)">
      <Tbl headers={["Multiple \\ Rate",...discounts.map(d=>fmtP(d))]} rows={multiples.map(mult=>[
        `${mult}x`,
        ...discounts.map(dr => {
          const exitVal = exitYearRev * mult;
          const invVal = exitVal * investorPct;
          const preMoney = invVal / Math.pow(1+dr, p.vcExitYear||5);
          return fmt(c(preMoney),cur);
        })
      ])}/>
    </Card>

    {/* DCF Method */}
    <Card title="DCF Method">
      <div className="g2">
        <div>
          <PI label="Discount Rate (WACC)" value={p.dcfDiscountRate||0.30} onChange={v=>u("dcfDiscountRate",v)} step={0.01} min={0.05} max={1}/>
          <PI label="Terminal Growth Rate" value={p.dcfTerminalGrowth||0.03} onChange={v=>u("dcfTerminalGrowth",v)} step={0.005} min={0} max={0.15}/>
          <SI label="Terminal Value Method" value={p.dcfMethod||"perpetuity"} onChange={v=>u("dcfMethod",v)} opts={[{v:"perpetuity",l:"Gordon Growth"},{v:"multiple",l:"Exit Multiple"}]}/>
          {p.dcfMethod==="multiple" && <PI label="Terminal Multiple" value={p.dcfTerminalMultiple||8} onChange={v=>u("dcfTerminalMultiple",v)} step={1} min={1} max={30}/>}
        </div>
        <div className="mg" style={{gridTemplateColumns:"1fr 1fr"}}>
          <Metric label="Sum PV(FCFs)" value={fmt(c(dcf.sumPVFCFs),cur)} color="var(--ac)"/>
          <Metric label="PV Terminal" value={fmt(c(dcf.pvTerminal),cur)} color="var(--pp)"/>
          <Metric label="Enterprise Value (NPV)" value={fmt(c(dcf.enterpriseValue),cur)} color="var(--gn)"/>
          <Metric label="Terminal % of Total" value={fmtP(dcf.terminalPctOfTotal)} color="var(--yl)"/>
        </div>
      </div>
    </Card>

    {/* FCF Waterfall Table */}
    <Card title="FCF Waterfall">
      <Tbl headers={["Year","EBITDA","CapEx","FCF","Discount Factor","PV(FCF)"]} rows={[
        ...dcf.fcfs.map(f=>[
          `Year ${f.year}`,fmt(c(f.ebitda),cur),fmt(c(f.capex),cur),fmt(c(f.fcf),cur),f.discountFactor.toFixed(3),fmt(c(f.pv),cur)
        ]),
        ["Terminal","","","",`1/(1+r)^${N}`,fmt(c(dcf.pvTerminal),cur)],
        ["Total","","","","",fmt(c(dcf.enterpriseValue),cur)],
      ]} hl/>
    </Card>

    {/* FCF Bar Chart */}
    <Card title="Free Cash Flow by Year">
      <div style={{display:"flex",gap:14,alignItems:"flex-end",height:140}}>
        {dcf.fcfs.map((f,i)=>{
          const mx=Math.max(...dcf.fcfs.map(x=>Math.abs(x.fcf)),1);
          const h=Math.abs(f.fcf)/mx*100;
          return (<div key={i} style={{flex:1,textAlign:"center"}}>
            <div style={{height:`${Math.max(h,2)}px`,background:f.fcf>=0?"var(--gn)":"var(--rd)",borderRadius:"4px 4px 0 0",display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:4,fontSize:10,color:"#fff",fontWeight:600}}>{fmt(c(f.fcf),cur)}</div>
            <div style={{fontSize:11,marginTop:4,color:"var(--td)"}}>Y{f.year}</div>
          </div>);
        })}
      </div>
    </Card>
  </div>);
}

function SensitivityTab({model:m,params:p}) {
  const c=v=>cv(v,p.exchangeRate,p.displayCurrency); const cur=p.displayCurrency;
  const N = m.projYears;
  const varLbl={trialToCustomerRate:"Trial to Customer Conv.",basicChurnMonthly:"Basic Churn",websiteVisitors:"Website Visitors",visitorToLeadRate:"Visitor to Lead Conv."};
  const beM = m.data.findIndex(d=>d.ebitda>0);
  const sensHeaders = ["Scenario","x",...m.annuals.map(a=>`Y${a.year} Rev`),`Y${N} Cust`];
  return (<div className="tc"><div className="st">Sensitivity Analysis</div>
    <Card title={`Variable: ${varLbl[p.sensitivityVar]||p.sensitivityVar}`}>
      <Tbl headers={sensHeaders} rows={m.sens.map(s=>[s.label,`${s.mult}x`,...m.annuals.map(a=>fmt(c(s[`y${a.year}`]||0),cur)),fmtN(s[`y${N}Cust`]||0)])}/>
    </Card>
    <div className="g2">
      <Card title={`Y${N} Revenue Comparison`}>
        <div style={{display:"flex",gap:14,alignItems:"flex-end",height:140}}>
          {m.sens.map((s,i)=>{const lastKey=`y${N}`;const mx=Math.max(...m.sens.map(x=>x[lastKey]||0),1);const cols=["var(--rd)","var(--ac)","var(--gn)"];return(
            <div key={i} style={{flex:1,textAlign:"center"}}><div style={{height:`${((s[lastKey]||0)/mx)*100}px`,background:cols[i],borderRadius:"4px 4px 0 0",display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:4,fontSize:11,color:"#fff",fontWeight:600}}>{fmt(c(s[lastKey]||0),cur)}</div><div style={{fontSize:12,marginTop:4,color:"var(--td)"}}>{s.label}</div></div>
          );})}
        </div>
      </Card>
      <Card title="Break-Even"><div className="mg">
        <Metric label="Break-Even Month" value={beM>=0?`Month ${beM+1}`:`Beyond M${m.data.length}`} sub={beM>=0?m.data[beM].label:"Need more funding"} color={beM>=0?"var(--gn)":"var(--yl)"}/>
        <Metric label="Runway" value={`${Math.round(p.raiseAmount/(m.annuals[0].totalCost/12))} mo`} sub="At Y1 burn rate"/>
      </div></Card>
    </div>
  </div>);
}

function ParamsTab({params:p,setParams:sp}) {
  const u=(k,v)=>sp(pr=>({...pr,[k]:v}));
  const setGrowth=(yr,v)=>sp(pr=>({...pr,growthRates:{...(pr.growthRates||{}),[yr]:v}}));
  const N = p.projectionYears || 5;
  const rates = p.growthRates || {};
  const secs=[
    {t:"Currency & Valuation",f:[{k:"exchangeRate",l:"THB/USD Rate",s:0.5}]},
    {t:"LLM Strategy",f:[{k:"llmStrategy",l:"Strategy",type:"select",opts:["api","own","hybrid"]},{k:"apiCostPerUser",l:"API Cost/User/Mo (THB)",s:10}]},
    {t:"Pricing (USD/mo)",f:[{k:"basicMonthly",l:"Basic Monthly",s:1},{k:"basicAnnual",l:"Basic Ann/Mo",s:1},{k:"proMonthly",l:"Pro Monthly",s:1},{k:"proAnnual",l:"Pro Ann/Mo",s:1},{k:"enterpriseMonthly",l:"Enterprise Monthly",s:1},{k:"enterpriseAnnual",l:"Enterprise Ann/Mo",s:1},{k:"storageTopupMonthly",l:"Storage USD/50GB",s:1}]},
    {t:"Acquisition",f:[{k:"revenueStartMonth",l:"Revenue Start Month",s:1,mn:1,mx:12},{k:"tierSplitBasic",l:"Basic Split %",s:0.05,mx:1},{k:"tierSplitPro",l:"Pro Split %",s:0.05,mx:1},{k:"tierSplitEnterprise",l:"Ent Split %",s:0.05,mx:1},{k:"y1AnnualRatio",l:"Annual Ratio",s:0.05,mx:1}]},
    {t:"Churn",f:[{k:"basicChurnMonthly",l:"Basic/Mo",s:0.01,mx:1},{k:"proChurnMonthly",l:"Pro/Mo",s:0.01,mx:1},{k:"enterpriseChurnMonthly",l:"Ent/Mo",s:0.01,mx:1}]},
    {t:"Sensitivity",f:[{k:"sensitivityVar",l:"Variable",type:"select",opts:["trialToCustomerRate","basicChurnMonthly","websiteVisitors","visitorToLeadRate"]},{k:"bestMultiplier",l:"Best x",s:0.1},{k:"worstMultiplier",l:"Worst x",s:0.1}]},
  ];
  return (<div className="tc"><div className="st">Settings</div><div className="pg">
    <Card title="Projection Period">
      <SI label="Projection Years" value={N} onChange={v=>u("projectionYears",parseInt(v))} opts={[{v:5,l:"5 Years"},{v:7,l:"7 Years"},{v:10,l:"10 Years"}]}/>
    </Card>
    <Card title="Growth Rates (YoY Multiplier)">
      {Array.from({length:Math.min(N,10)-1},(_,i)=>i+2).map(y=>(
        <PI key={y} label={`Y${y} Growth x`} value={rates[`y${y}`]??1} onChange={v=>setGrowth(`y${y}`,v)} step={0.05} min={0} max={10}/>
      ))}
    </Card>
    <Card title="OpEx Scaling">
      <PI label="Annual Escalation %" value={p.opexEscalationRate||0} onChange={v=>u("opexEscalationRate",v)} step={0.05} min={0} max={2}/>
      <div style={{fontSize:10,color:"var(--td)",marginTop:-4,marginBottom:8,paddingLeft:4}}>
        Salaries, outsource & office costs grow {fmtP(p.opexEscalationRate||0)}/yr compounding
      </div>
      <SI label="Scale-Up Year (PMF)" value={p.scaleUpYear||0} onChange={v=>u("scaleUpYear",parseInt(v))} opts={[{v:0,l:"None"},...Array.from({length:N},(_,i)=>({v:i+1,l:`Year ${i+1}`}))]}/>
      <PI label="Scale-Up Multiplier" value={p.scaleUpMultiplier||1} onChange={v=>u("scaleUpMultiplier",v)} step={0.1} min={1} max={5}/>
      <div style={{fontSize:10,color:"var(--td)",marginTop:-4,marginBottom:8,paddingLeft:4}}>
        At scale-up year, OpEx jumps {(p.scaleUpMultiplier||1)}x (aggressive hiring, expansion)
      </div>
    </Card>
    {secs.map((sec,si)=>(<Card key={si} title={sec.t}>{sec.f.map((f,fi)=>f.type==="select"?(<SI key={fi} label={f.l} value={p[f.k]} onChange={v=>u(f.k,v)} opts={f.opts}/>):(<PI key={fi} label={f.l} value={p[f.k]} onChange={v=>u(f.k,v)} step={f.s} min={f.mn} max={f.mx}/>))}</Card>))}
  </div></div>);
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [p, sp] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migrate old y2GrowthRate/y3GrowthRate into growthRates
        const defaultGR = DEFAULT_PARAMS.growthRates;
        let gr = { ...defaultGR, ...(parsed.growthRates || {}) };
        if (parsed.y2GrowthRate != null && !parsed.growthRates) gr.y2 = parsed.y2GrowthRate;
        if (parsed.y3GrowthRate != null && !parsed.growthRates) gr.y3 = parsed.y3GrowthRate;
        const merged = { ...DEFAULT_PARAMS, ...parsed, llmBudget: { ...DEFAULT_LLM_BUDGET, ...(parsed.llmBudget || {}) }, growthRates: gr };
        delete merged.y2GrowthRate; delete merged.y3GrowthRate;
        return merged;
      }
    } catch (e) {}
    return DEFAULT_PARAMS;
  });

  const [tab, setTab] = useState("pitch");
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem("law5_theme") || "dark"; } catch { return "dark"; } });
  const [dirty, setDirty] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  const setParams = useCallback((updater) => { sp(updater); setDirty(true); }, []);

  const model = useMemo(() => computeModel(p), [p]);
  const toggle = () => setParams(pr => ({ ...pr, displayCurrency: pr.displayCurrency==="THB"?"USD":"THB" }));
  const toggleTheme = () => { setTheme(t => { const next = t==="dark"?"light":"dark"; try { localStorage.setItem("law5_theme", next); } catch {} return next; }); };

  const handleSave = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); setDirty(false); setSavedMsg("Saved!"); setTimeout(() => setSavedMsg(""), 2000); }
    catch (e) { setSavedMsg("Save failed!"); setTimeout(() => setSavedMsg(""), 3000); }
  };
  const handleReset = () => { sp(DEFAULT_PARAMS); setDirty(true); setSavedMsg("Reset to defaults"); setTimeout(() => setSavedMsg(""), 2500); };

  const props = { model, params: p, setParams };

  const renderTab = () => {
    switch(tab) {
      case "pitch": return <PitchTab {...props}/>;
      case "overview": return <OverviewTab {...props}/>;
      case "revenue": return <RevenueTab {...props}/>;
      case "cost": return <CostTab {...props}/>;
      case "marketing": return <MarketingTab {...props}/>;
      case "headcount": return <HeadcountTab {...props}/>;
      case "income": return <IncomeTab {...props}/>;
      case "balance": return <BalanceTab {...props}/>;
      case "cashflow": return <CashFlowTab {...props}/>;
      case "captable": return <CapTableTab {...props}/>;
      case "valuation": return <ValuationTab {...props}/>;
      case "sensitivity": return <SensitivityTab {...props}/>;
      case "params": return <ParamsTab {...props}/>;
      default: return <PitchTab {...props}/>;
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        [data-theme="dark"]{--bg:#0c0f1a;--bg2:#141829;--bg3:#1c2038;--bd:#2a2f4a;--tx:#e8eaf0;--td:#8890a8;--ac:#6c8cff;--gn:#34d399;--rd:#f87171;--yl:#fbbf24;--pp:#a78bfa}
        [data-theme="light"]{--bg:#f0f2f7;--bg2:#ffffff;--bg3:#e8eaf2;--bd:#c8cdd8;--tx:#1a1d2e;--td:#5f6780;--ac:#4f6df5;--gn:#059669;--rd:#dc2626;--yl:#d97706;--pp:#7c3aed}
        *{margin:0;padding:0;box-sizing:border-box}
        body,#root{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--tx);min-height:100vh}
        .app{display:flex;min-height:100vh;color:var(--tx);background:var(--bg)}
        .sb{width:220px;background:var(--bg2);border-right:1px solid var(--bd);padding:16px 0;flex-shrink:0;position:sticky;top:0;height:100vh;overflow-y:auto}
        .sb-logo{padding:0 16px 16px;border-bottom:1px solid var(--bd);margin-bottom:8px}
        .sb-logo h1{font-size:24px;font-weight:700;background:linear-gradient(135deg,var(--ac),var(--pp));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        .sb-logo p{font-size:10px;color:var(--td);margin-top:2px;text-transform:uppercase;letter-spacing:1.5px}
        .ni{display:flex;align-items:center;gap:8px;padding:10px 16px;font-size:13px;color:var(--td);cursor:pointer;border-left:3px solid transparent;transition:all .15s}
        .ni:hover{background:var(--bg3);color:var(--tx)}
        .ni.ac{background:var(--bg3);color:var(--ac);border-left-color:var(--ac);font-weight:600}
        .ct{margin:8px 16px;padding:8px 12px;background:var(--bg3);border:1px solid var(--bd);border-radius:8px;color:var(--tx);font-size:12px;cursor:pointer;text-align:center;font-family:'DM Sans',sans-serif;transition:all .15s}
        .ct:hover{border-color:var(--ac);background:var(--ac);color:#fff}
        .mn{flex:1;padding:24px 32px 80px;overflow-y:auto;max-height:100vh;position:relative}
        .tc{max-width:1200px}
        .st{font-size:20px;font-weight:700;margin-bottom:20px;letter-spacing:-.3px;color:var(--tx)}
        .mg{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:18px}
        .mc{background:var(--bg2);border:1px solid var(--bd);border-radius:12px;padding:16px}
        .mc-l{font-size:12px;color:var(--td);text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px}
        .mc-v{font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:700}
        .mc-s{font-size:11px;color:var(--td);margin-top:4px}
        .cd{background:var(--bg2);border:1px solid var(--bd);border-radius:12px;padding:18px;margin-bottom:16px}
        .cd-t{font-size:13px;font-weight:600;color:var(--td);margin-bottom:14px;text-transform:uppercase;letter-spacing:.5px}
        .g2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .tw{overflow-x:auto}
        table{width:100%;border-collapse:collapse;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--tx)}
        th{text-align:left;padding:8px 10px;border-bottom:2px solid var(--bd);color:var(--td);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap}
        td{padding:6px 10px;border-bottom:1px solid var(--bd);white-space:nowrap;color:var(--tx)}
        td.n{text-align:right}
        tr:hover td{background:color-mix(in srgb, var(--ac) 5%, transparent)}
        tr.hlr td{background:color-mix(in srgb, var(--ac) 10%, transparent);font-weight:700;border-top:2px solid var(--ac)}
        .cl{display:flex;justify-content:space-between;font-size:10px;color:var(--td);margin-top:4px;font-family:'JetBrains Mono',monospace}
        .pg{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}
        .pr{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--bd)}
        .pl{font-size:12px;color:var(--td)}
        .pi{width:110px;padding:5px 8px;background:var(--bg3);border:1px solid var(--bd);border-radius:6px;color:var(--tx);font-family:'JetBrains Mono',monospace;font-size:12px;text-align:right}
        .pi::placeholder{color:var(--td);opacity:0.6}
        .pi:focus{outline:none;border-color:var(--ac);box-shadow:0 0 0 2px color-mix(in srgb, var(--ac) 20%, transparent)}
        select.pi{text-align:left;cursor:pointer;color:var(--tx);-webkit-appearance:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%238890a8'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 8px center;padding-right:22px}
        select.pi option{background:var(--bg2);color:var(--tx)}
        .del-btn{background:transparent;border:none;color:var(--rd);cursor:pointer;font-size:14px;padding:2px 6px;border-radius:4px;line-height:1}
        .del-btn:hover{background:var(--rd);color:#fff}
        .sb-info{padding:12px 16px;font-size:10px;color:var(--td);line-height:1.6;border-top:1px solid var(--bd);margin-top:8px}

        /* Floating save bar at bottom of main content */
        .float-save{position:fixed;bottom:0;right:0;left:220px;background:var(--bg2);border-top:1px solid var(--bd);padding:10px 32px;display:flex;align-items:center;gap:12px;z-index:100;box-shadow:0 -4px 20px rgba(0,0,0,.15);animation:slideUp .2s ease}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        .float-save .save-btn{padding:8px 24px;border-radius:8px;font-size:13px;font-family:'DM Sans',sans-serif;cursor:pointer;font-weight:600;border:none;transition:all .15s}
        .float-save .save-btn.primary{background:var(--gn);color:#fff}
        .float-save .save-btn.primary:hover{filter:brightness(1.1)}
        .float-save .save-btn.secondary{background:var(--bg3);color:var(--td);border:1px solid var(--bd)}
        .float-save .save-btn.secondary:hover{border-color:var(--rd);color:var(--rd)}
        .dirty-dot{width:8px;height:8px;border-radius:50%;background:var(--yl);display:inline-block;animation:pulse 1.5s infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}

        @media(max-width:768px){.app{flex-direction:column}.sb{width:100%;height:auto;position:relative;display:flex;flex-wrap:wrap;padding:8px;gap:2px}.sb-logo{padding:0 8px 8px;width:100%}.ni{padding:6px 10px;font-size:11px;border-left:none}.mn{padding:16px 16px 80px}.g2{grid-template-columns:1fr}.pg{grid-template-columns:1fr}.float-save{left:0}}
      `}</style>
      <div className="app" data-theme={theme}>
        <nav className="sb">
          <div className="sb-logo">
            <h1>LAW5</h1>
            <p>Financial Model 2025-{2024 + (p.projectionYears || 5)}</p>
          </div>
          {TABS.map(t=>(
            <div key={t.id} className={`ni${tab===t.id?" ac":""}`} onClick={()=>setTab(t.id)}>
              <span style={{fontSize:15,width:20,textAlign:"center"}}>{t.icon}</span>{t.label}
            </div>
          ))}
          <button className="ct" onClick={toggle}>{p.displayCurrency==="THB"?"THB to USD":"USD to THB"}</button>
          <button className="ct" onClick={toggleTheme}>{theme==="dark"?"☀️ Light Mode":"🌙 Dark Mode"}</button>
          <div className="sb-info">
            All projections are estimates.<br/>
            Currency: {p.displayCurrency} ({p.exchangeRate} THB/USD)
          </div>
        </nav>
        <main className="mn">
          {renderTab()}
        </main>

        {/* Floating save bar — only shows when dirty */}
        {dirty && (
          <div className="float-save">
            <span className="dirty-dot"/>
            <span style={{fontSize:12,color:"var(--yl)",fontWeight:500}}>Unsaved changes</span>
            <div style={{flex:1}}/>
            {savedMsg && <span style={{fontSize:12,color:"var(--gn)",fontWeight:600}}>{savedMsg}</span>}
            <button className="save-btn secondary" onClick={handleReset}>↺ Reset</button>
            <button className="save-btn primary" onClick={handleSave}>💾 Save Changes</button>
          </div>
        )}
      </div>
    </>
  );
}
