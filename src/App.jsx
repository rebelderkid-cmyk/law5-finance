import { useState, useMemo, useEffect, useCallback } from "react";

// ============================================================
// LAW5 FINANCIAL MODEL — INTERACTIVE DASHBOARD v3
// Fixes: Light mode, localStorage, LLM Budget editing, Cap Table layout
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

// Fix 3: LLM budget moved into params so users can edit each line item
const DEFAULT_LLM_BUDGET = {
  dev: 2000000, hardware: 2500000, apiReserve: 1000000,
  salaryOps: 2000000, software: 1000000, marketing: 1500000, buffer: 0,
};

const LLM_PRESETS = {
  api:    { dev: 2000000, hardware: 0,       apiReserve: 1500000, salaryOps: 2000000, software: 1000000, marketing: 2000000, buffer: 1500000 },
  own:    { dev: 2000000, hardware: 5000000, apiReserve: 0,       salaryOps: 2000000, software: 1000000, marketing: 0,       buffer: 0 },
  hybrid: { dev: 2000000, hardware: 2500000, apiReserve: 1000000, salaryOps: 2000000, software: 1000000, marketing: 1500000, buffer: 0 },
};

const DEFAULT_PARAMS = {
  exchangeRate: 33, displayCurrency: "THB",
  preMoneyValuation: 100000000, equityOffered: 10, raiseAmount: 10000000,
  llmStrategy: "hybrid",
  llmBudget: { ...DEFAULT_LLM_BUDGET }, // Fix 3: user-editable budget
  basicMonthly: 19, basicAnnual: 9, proMonthly: 29, proAnnual: 19,
  enterpriseMonthly: 149, enterpriseAnnual: 99, extraSeatMonthly: 19,
  storageTopupMonthly: 2, revenueStartMonth: 3,
  tierSplitBasic: 0.60, tierSplitPro: 0.32, tierSplitEnterprise: 0.08,
  y1AnnualRatio: 0.4, y2GrowthRate: 2.0, y3GrowthRate: 1.5,
  basicChurnMonthly: 0.06, proChurnMonthly: 0.04, enterpriseChurnMonthly: 0.02,
  websiteVisitors: 5000, visitorToLeadRate: 0.08, leadToTrialRate: 0.25, trialToCustomerRate: 0.15,
  storageAdoptionRate: 0.15, avgExtraStorageUnits: 2,
  enterpriseAvgSeats: 5, enterpriseExtraSeatAvg: 3,
  salesOutreachPct: 0.50, lineAffiliationPct: 0.30, wordOfMouthPct: 0.10, contentMarketingPct: 0.10,
  marketingBudgetY1: 1500000, lineAffiliateCommission: 0.10,
  salesRepsY1: 2, salesRepCostMonthly: 30000, dealsPerRepPerMonth: 4,
  apiCostPerUser: 150,
  outsourceDevMonthly: 80000, outsourceAccountingMonthly: 15000,
  officeRent: 15000, utilities: 5000, miscOps: 10000,
  team: DEFAULT_TEAM,
  costOverrides: {},
  fundingRounds: DEFAULT_ROUNDS,
  ipoValuation: 3000000000,
  sensitivityVar: "trialToCustomerRate", bestMultiplier: 1.5, worstMultiplier: 0.5,
};

const STORAGE_KEY = "law5_params";

const TABS = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "revenue", label: "Revenue", icon: "💰" },
  { id: "cost", label: "Costs", icon: "📉" },
  { id: "marketing", label: "Marketing", icon: "📢" },
  { id: "headcount", label: "Headcount", icon: "👥" },
  { id: "income", label: "P&L", icon: "📋" },
  { id: "balance", label: "Balance Sheet", icon: "🏦" },
  { id: "cashflow", label: "Cash Flow", icon: "💸" },
  { id: "captable", label: "Cap Table", icon: "🥧" },
  { id: "sensitivity", label: "Sensitivity", icon: "🎛️" },
  { id: "params", label: "Settings", icon: "⚙️" },
];

const fmt = (v, c = "THB") => {
  if (v == null || isNaN(v)) return "—";
  const a = Math.abs(v); const s = v < 0 ? "-" : "";
  const p = c === "THB" ? "฿" : "$";
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

// ============================================================
// FINANCIAL ENGINE
// ============================================================
function computeModel(p, _skipSens = false) {
  // Fix 3: read budget from params (user-editable) instead of hardcoded LLM_BUDGETS
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

  let bM=0, bA=0, pM=0, pA=0, eM=0, eA=0;
  const data = [];

  for (let i = 0; i < 36; i++) {
    const m = i + 1;
    const yr = Math.floor(i/12) + 1;
    const label = `${MONTHS[i%12]} Y${yr}`;
    let gm = 1;
    if (yr === 2) gm = p.y2GrowthRate;
    if (yr === 3) gm = p.y2GrowthRate * p.y3GrowthRate;

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

    // Salary from team array
    const sal = (p.team||[]).reduce((s,t) => s + (m >= t.m ? t.sal : 0), 0)
      + p.outsourceDevMonthly + p.outsourceAccountingMonthly + p.officeRent + p.utilities + p.miscOps;

    const ovr = (p.costOverrides||{})[m] || {};
    const api = p.llmStrategy === "own" ? 0 : total * p.apiCostPerUser;
    const hwDep = budget.hardware / 36;
    const devC = m <= 6 ? budget.dev / 6 : budget.dev / 36;
    const swC = budget.software / 12;
    const mktY = yr===1 ? p.marketingBudgetY1 : p.marketingBudgetY1*(yr===2?1.5:2);
    const mktCalc = (p.llmStrategy==="own" && yr===1) ? 0 : mktY/12;

    // Apply overrides if provided
    const mkt = ovr.mkt != null ? ovr.mkt : mktCalc;
    const devFinal = ovr.dev != null ? ovr.dev : devC;
    const apiFinal = ovr.api != null ? ovr.api : api;

    const cogs = apiFinal + hwDep + swC*0.3;
    const opex = sal + devFinal + swC*0.7 + mkt;
    const totalC = cogs + opex;
    const gp = rev - cogs;

    data.push({
      month: m, label, year: yr, bM, bA, pM, pA, eM, eA, totalCustomers: total,
      newCustomers: newCustThisMonth,
      revB, revP, revE, revSeats, revStor, totalRevenue: rev,
      salaryCost: sal, apiCost: apiFinal, hwDep, devCost: devFinal, swCost: swC, mktCost: mkt,
      salesOutreach: mkt*p.salesOutreachPct, lineAff: mkt*p.lineAffiliationPct,
      wom: mkt*p.wordOfMouthPct, content: mkt*p.contentMarketingPct,
      cogs, opex, totalCost: totalC, grossProfit: gp,
      grossMargin: rev>0 ? gp/rev : 0, ebitda: rev-totalC, netIncome: rev-totalC,
    });
  }

  let cash = p.raiseAmount, re = 0;
  data.forEach((d,i) => {
    d.netCF = d.totalRevenue - d.totalCost;
    cash += d.netCF;
    re += d.netIncome;
    d.cash = cash;
    d.fixedAssets = Math.max(0, budget.hardware - d.hwDep*(i+1));
    d.totalAssets = cash + d.fixedAssets;
    d.equity = p.raiseAmount + re;
    d.retainedEarnings = re;
  });

  const annuals = [1,2,3].map(y => {
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

  // Seed round
  const seedShares = Math.round(preShares * (p.equityOffered/100) / (1-p.equityOffered/100));
  let totShares = preShares + seedShares;

  // Build rounds table: Seed + future rounds
  const rounds = [{ name: "Seed", valuation: p.preMoneyValuation, raise: p.raiseAmount, equity: p.equityOffered, newShares: seedShares, postShares: totShares, postMoney: p.preMoneyValuation + p.raiseAmount }];

  let cumulativeShares = totShares;
  (p.fundingRounds||[]).forEach(r => {
    const ns = Math.round(cumulativeShares * (r.equity/100) / (1-r.equity/100));
    cumulativeShares += ns;
    rounds.push({ name: r.name, valuation: r.valuation, raise: r.raise, equity: r.equity, newShares: ns, postShares: cumulativeShares, postMoney: r.valuation + r.raise });
  });

  // IPO row
  const ipoVal = p.ipoValuation || 3000000000;
  rounds.push({ name: "IPO", valuation: ipoVal, raise: 0, equity: 0, newShares: 0, postShares: cumulativeShares, postMoney: ipoVal });

  // Calculate founder ownership after all rounds
  const founderSharesTotal = founders.reduce((s,f)=>s+f.shares, 0);
  const founderPctAtIPO = (founderSharesTotal / cumulativeShares * 100);
  const founderValueAtIPO = founderPctAtIPO / 100 * ipoVal;

  const capTable = {
    founders, seedShares, totShares, rounds,
    founderPctAtIPO, founderValueAtIPO, cumulativeShares, ipoVal,
    post: [
      ...founders.map(f => ({ ...f, postPct: (f.shares/totShares*100).toFixed(2) })),
      { name: "Seed Investor(s)", shares: seedShares, pct: 0, postPct: (seedShares/totShares*100).toFixed(2) },
    ],
  };

  const sens = _skipSens ? [] : ["worst","base","best"].map(sc => {
    const mult = sc==="best"?p.bestMultiplier:sc==="worst"?p.worstMultiplier:1;
    if (sc === "base") {
      return { scenario: sc, label: "Base", mult, y1: annuals[0].revenue, y2: annuals[1].revenue, y3: annuals[2].revenue, y3Cust: annuals[2].customers };
    }
    const adjParams = { ...p, [p.sensitivityVar]: p[p.sensitivityVar] * mult };
    const adjModel = computeModel(adjParams, true);
    return { scenario: sc, label: sc.charAt(0).toUpperCase()+sc.slice(1), mult, y1: adjModel.annuals[0].revenue, y2: adjModel.annuals[1].revenue, y3: adjModel.annuals[2].revenue, y3Cust: adjModel.annuals[2].customers };
  });

  return { data, annuals, capTable, sens, budget };
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
// TAB VIEWS
// ============================================================
function OverviewTab({model:m, params:p}) {
  const c = v => cv(v,p.exchangeRate,p.displayCurrency);
  const cur = p.displayCurrency;
  const [y1,y2,y3] = m.annuals;
  const b = m.budget;
  return (
    <div className="tc">
      <div className="st">Executive Dashboard — Law5</div>
      <div className="mg">
        <Metric label="Year 1 Revenue" value={fmt(c(y1.revenue),cur)} sub={`${fmtN(y1.customers)} customers`}/>
        <Metric label="Year 2 Revenue" value={fmt(c(y2.revenue),cur)} sub={`${fmtN(y2.customers)} customers`} color="var(--gn)"/>
        <Metric label="Year 3 Revenue" value={fmt(c(y3.revenue),cur)} sub={`${fmtN(y3.customers)} customers`} color="var(--gn)"/>
        <Metric label="Cash Runway" value={`${Math.round(p.raiseAmount/(y1.totalCost/12))} mo`} sub="At Y1 burn rate" color="var(--yl)"/>
        <Metric label="Y3 EBITDA" value={fmt(c(y3.ebitda),cur)} sub={y3.ebitda>0?"Profitable":"Pre-profit"} color={y3.ebitda>0?"var(--gn)":"var(--rd)"}/>
        <Metric label="LLM Strategy" value={p.llmStrategy.toUpperCase()} sub={`HW: ${fmt(c(b.hardware),cur)} | API: ${fmt(c(b.apiReserve),cur)}`} color="var(--pp)"/>
      </div>
      <div className="g2">
        <Card title="Monthly Revenue (36mo)">
          <Bar data={m.data.map(d=>c(d.totalRevenue))} color="var(--gn)" h={100}/>
          <div className="cl"><span>M1</span><span>M12</span><span>M24</span><span>M36</span></div>
        </Card>
        <Card title="Cash Balance">
          <Bar data={m.data.map(d=>c(d.cash))} h={100}/>
          <div className="cl"><span>M1</span><span>M12</span><span>M24</span><span>M36</span></div>
        </Card>
      </div>
      <Card title="3-Year Summary">
        <Tbl headers={["","Year 1","Year 2","Year 3"]} rows={[
          ["Revenue",fmt(c(y1.revenue),cur),fmt(c(y2.revenue),cur),fmt(c(y3.revenue),cur)],
          ["COGS",fmt(c(y1.cogs),cur),fmt(c(y2.cogs),cur),fmt(c(y3.cogs),cur)],
          ["Gross Profit",fmt(c(y1.grossProfit),cur),fmt(c(y2.grossProfit),cur),fmt(c(y3.grossProfit),cur)],
          ["OpEx",fmt(c(y1.opex),cur),fmt(c(y2.opex),cur),fmt(c(y3.opex),cur)],
          ["EBITDA",fmt(c(y1.ebitda),cur),fmt(c(y2.ebitda),cur),fmt(c(y3.ebitda),cur)],
          ["End Customers",fmtN(y1.customers),fmtN(y2.customers),fmtN(y3.customers)],
          ["ARR (MRRx12)",fmt(c(y1.mrr*12),cur),fmt(c(y2.mrr*12),cur),fmt(c(y3.mrr*12),cur)],
          ["Cash",fmt(c(y1.cash),cur),fmt(c(y2.cash),cur),fmt(c(y3.cash),cur)],
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

// Feature 1: Revenue with user % breakdown
function RevenueTab({model:m,params:p,setParams:sp}) {
  const c=v=>cv(v,p.exchangeRate,p.displayCurrency); const cur=p.displayCurrency;
  const last12=m.data[11]; const last24=m.data[23]; const last36=m.data[35];
  const tierPct=(d)=>{
    const t=d.totalCustomers||1;
    return {b:((d.bM+d.bA)/t*100).toFixed(1),p:((d.pM+d.pA)/t*100).toFixed(1),e:((d.eM+d.eA)/t*100).toFixed(1)};
  };
  return (
    <div className="tc">
      <div className="st">Revenue Model</div>
      <div className="mg">
        <Metric label="Basic" value={`$${p.basicMonthly}/mo`} sub={`Annual: $${p.basicAnnual}/mo`}/>
        <Metric label="Pro" value={`$${p.proMonthly}/mo`} sub={`Annual: $${p.proAnnual}/mo`}/>
        <Metric label="Enterprise" value={`$${p.enterpriseMonthly}/mo`} sub={`Annual: $${p.enterpriseAnnual}/mo`}/>
        <Metric label="Storage" value={`$${p.storageTopupMonthly}/50GB`} sub={`${fmtP(p.storageAdoptionRate)} adopt`}/>
      </div>

      <Card title="Customer Mix by Tier (End of Year)">
        <div className="g2">
          <Pie data={[
            {label:`Basic (${fmtN(last36.bM+last36.bA)})`,value:last36.bM+last36.bA||1,color:"#3b82f6"},
            {label:`Pro (${fmtN(last36.pM+last36.pA)})`,value:last36.pM+last36.pA||1,color:"#6366f1"},
            {label:`Enterprise (${fmtN(last36.eM+last36.eA)})`,value:last36.eM+last36.eA||1,color:"#8b5cf6"},
          ]} size={160}/>
          <Tbl headers={["Tier","Y1 Users","Y1 %","Y2 Users","Y2 %","Y3 Users","Y3 %"]} rows={[
            ["Basic",fmtN(last12.bM+last12.bA),tierPct(last12).b+"%",fmtN(last24.bM+last24.bA),tierPct(last24).b+"%",fmtN(last36.bM+last36.bA),tierPct(last36).b+"%"],
            ["Pro",fmtN(last12.pM+last12.pA),tierPct(last12).p+"%",fmtN(last24.pM+last24.pA),tierPct(last24).p+"%",fmtN(last36.pM+last36.pA),tierPct(last36).p+"%"],
            ["Enterprise",fmtN(last12.eM+last12.eA),tierPct(last12).e+"%",fmtN(last24.eM+last24.eA),tierPct(last24).e+"%",fmtN(last36.eM+last36.eA),tierPct(last36).e+"%"],
            ["Total",fmtN(last12.totalCustomers),"100%",fmtN(last24.totalCustomers),"100%",fmtN(last36.totalCustomers),"100%"],
          ]} hl/>
        </div>
      </Card>

      <Card title="Monthly Revenue — Year 1">
        <Tbl headers={["Month","Basic","Pro","Enterprise","Seats","Storage","Total","Cust","B%","P%","E%"]} rows={m.data.filter(d=>d.year===1).map(d=>{
          const tp=tierPct(d);
          return [d.label,fmt(c(d.revB),cur),fmt(c(d.revP),cur),fmt(c(d.revE),cur),fmt(c(d.revSeats),cur),fmt(c(d.revStor),cur),fmt(c(d.totalRevenue),cur),fmtN(d.totalCustomers),tp.b+"%",tp.p+"%",tp.e+"%"];
        })}/>
      </Card>
      <Card title="ARR Progression">
        <Tbl headers={["","Year 1","Year 2","Year 3"]} rows={[
          ["MRR (EoY)",fmt(c(m.data[11].totalRevenue),cur),fmt(c(m.data[23].totalRevenue),cur),fmt(c(m.data[35].totalRevenue),cur)],
          ["ARR",fmt(c(m.data[11].totalRevenue*12),cur),fmt(c(m.data[23].totalRevenue*12),cur),fmt(c(m.data[35].totalRevenue*12),cur)],
          ["Customers",fmtN(m.annuals[0].customers),fmtN(m.annuals[1].customers),fmtN(m.annuals[2].customers)],
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
        <Card title="Customer Growth">
          <Bar data={m.data.map(d=>d.totalCustomers)} h={80}/>
          <div className="cl"><span>M1</span><span>M36</span></div>
        </Card>
        <Card title="Revenue Mix Y3">
          <Pie data={[
            {label:"Basic",value:m.data.filter(d=>d.year===3).reduce((s,d)=>s+d.revB,0)||1,color:"#3b82f6"},
            {label:"Pro",value:m.data.filter(d=>d.year===3).reduce((s,d)=>s+d.revP,0)||1,color:"#6366f1"},
            {label:"Enterprise",value:m.data.filter(d=>d.year===3).reduce((s,d)=>s+d.revE+d.revSeats,0)||1,color:"#8b5cf6"},
            {label:"Storage",value:m.data.filter(d=>d.year===3).reduce((s,d)=>s+d.revStor,0)||1,color:"#10b981"},
          ]} size={140}/>
        </Card>
      </div>
    </div>
  );
}

// Feature 2+3+7: Cost with inline config + editable LLM budget + dynamic monthly overrides
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
      if(val===""||val==null){
        delete ovr[month][key];
        if(Object.keys(ovr[month]).length===0) delete ovr[month];
      } else {
        ovr[month]={...ovr[month],[key]:parseFloat(val)||0};
      }
      return {...pr,costOverrides:ovr};
    });
  };

  const budgetTotal = Object.values(budget).reduce((s,v)=>s+v,0);

  return (
    <div className="tc">
      <div className="st">Cost Model — {p.llmStrategy.toUpperCase()}</div>

      <Card title="LLM Strategy & Budget">
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          {["api","own","hybrid"].map(s=>(
            <button key={s} className="ct" style={{margin:0,padding:"6px 16px",background:p.llmStrategy===s?"var(--ac)":"var(--bg3)",color:p.llmStrategy===s?"#fff":"var(--tx)",border:p.llmStrategy===s?"none":"1px solid var(--bd)"}} onClick={()=>applyPreset(s)}>
              {s.toUpperCase()}
            </button>
          ))}
        </div>
        <div style={{fontSize:11,color:"var(--td)",marginBottom:12}}>Switching strategy resets budget to preset. Edit individual items below.</div>
        <div className="g2">
          <div>
            <PI label="Development (THB)" value={budget.dev} onChange={v=>updateBudget("dev",v)} step={100000}/>
            <PI label="Hardware (THB)" value={budget.hardware} onChange={v=>updateBudget("hardware",v)} step={100000}/>
            <PI label="API Reserve (THB)" value={budget.apiReserve} onChange={v=>updateBudget("apiReserve",v)} step={100000}/>
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
              {label:"Development",value:budget.dev,color:"#6366f1"},
              {label:"Hardware",value:budget.hardware,color:"#f59e0b"},
              {label:"API Reserve",value:budget.apiReserve,color:"#10b981"},
              {label:"Salary & Ops",value:budget.salaryOps,color:"#3b82f6"},
              {label:"Software",value:budget.software,color:"#8b5cf6"},
              {label:"Marketing",value:budget.marketing,color:"#ec4899"},
              {label:"Buffer",value:budget.buffer,color:"#6b7280"},
            ].filter(i=>i.value>0)} size={170}/>
          </div>
        </div>
      </Card>

      <Card title="Operational Costs">
        <div className="g2">
          <div>
            <PI label="API Cost/User/Mo (THB)" value={p.apiCostPerUser} onChange={v=>u("apiCostPerUser",v)} step={10}/>
            <PI label="Marketing Budget Y1 (THB)" value={p.marketingBudgetY1} onChange={v=>u("marketingBudgetY1",v)} step={100000}/>
          </div>
          <div>
            <PI label="Outsource Dev" value={p.outsourceDevMonthly} onChange={v=>u("outsourceDevMonthly",v)} step={5000}/>
            <PI label="Outsource Accounting" value={p.outsourceAccountingMonthly} onChange={v=>u("outsourceAccountingMonthly",v)} step={1000}/>
            <PI label="Office Rent" value={p.officeRent} onChange={v=>u("officeRent",v)} step={1000}/>
            <PI label="Utilities" value={p.utilities} onChange={v=>u("utilities",v)} step={1000}/>
            <PI label="Misc Ops" value={p.miscOps} onChange={v=>u("miscOps",v)} step={1000}/>
          </div>
        </div>
      </Card>

      <Card title="LLM Strategy Comparison (Presets)">
        <Tbl headers={["","API Only","Own LLM","Hybrid"]} rows={[
          ["Development",...["api","own","hybrid"].map(s=>fmt(c(LLM_PRESETS[s].dev),cur))],
          ["Hardware",...["api","own","hybrid"].map(s=>fmt(c(LLM_PRESETS[s].hardware),cur))],
          ["API Reserve",...["api","own","hybrid"].map(s=>fmt(c(LLM_PRESETS[s].apiReserve),cur))],
          ["Salary & Ops",...["api","own","hybrid"].map(s=>fmt(c(LLM_PRESETS[s].salaryOps),cur))],
          ["Software",...["api","own","hybrid"].map(s=>fmt(c(LLM_PRESETS[s].software),cur))],
          ["Marketing",...["api","own","hybrid"].map(s=>fmt(c(LLM_PRESETS[s].marketing),cur))],
          ["Buffer",...["api","own","hybrid"].map(s=>fmt(c(LLM_PRESETS[s].buffer),cur))],
          ["Total",...["api","own","hybrid"].map(s=>fmt(c(Object.values(LLM_PRESETS[s]).reduce((a,b)=>a+b,0)),cur))],
        ]} hl/>
      </Card>

      <Card title="Unit Economics (Month 12)">
        <div className="mg">
          <Metric label="ARPU" value={fmt(c(arpu),cur)} sub="Revenue/User/Mo"/>
          <Metric label="CAC" value={fmt(c(cac),cur)} sub="Acquisition Cost"/>
          <Metric label="LTV" value={fmt(c(ltv),cur)} sub="Lifetime Value"/>
          <Metric label="LTV:CAC" value={cac>0?`${(ltv/cac).toFixed(1)}x`:"N/A"} sub="Target: >3x" color={ltv/cac>3?"var(--gn)":"var(--yl)"}/>
        </div>
      </Card>

      <Card title={`Monthly Budget Planner — Year ${viewYear}`}>
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          {[1,2,3].map(y=><button key={y} className="ct" style={{margin:0,padding:"4px 12px",background:viewYear===y?"var(--ac)":"var(--bg3)",color:viewYear===y?"#fff":"var(--tx)",border:viewYear===y?"none":"1px solid var(--bd)"}} onClick={()=>setViewYear(y)}>Year {y}</button>)}
        </div>
        <div className="tw" style={{fontSize:11}}>
          <table>
            <thead><tr><th>Month</th><th>Mkt (auto)</th><th>Mkt Override</th><th>Dev (auto)</th><th>Dev Override</th><th>API (auto)</th><th>API Override</th><th>Total Cost</th></tr></thead>
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
        <div style={{marginTop:6,fontSize:11,color:"var(--td)"}}>Leave blank to use auto-calculated values. Enter a number to override for that month.</div>
      </Card>

      <Card title={`Monthly Costs — Year ${viewYear}`}>
        <Tbl headers={["Month","Salary","Dev","LLM","SW","Mkt","Total"]} rows={m.data.filter(d=>d.year===viewYear).map(d=>[
          d.label,fmt(c(d.salaryCost),cur),fmt(c(d.devCost),cur),fmt(c(d.apiCost+d.hwDep),cur),fmt(c(d.swCost),cur),fmt(c(d.mktCost),cur),fmt(c(d.totalCost),cur),
        ])}/>
      </Card>
    </div>
  );
}

// Feature 3: Marketing with inline config
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
          <div>
            <Pie data={[
              {label:`Sales (${fmt(c(p.marketingBudgetY1*p.salesOutreachPct),cur)})`,value:p.salesOutreachPct,color:"#3b82f6"},
              {label:`LINE (${fmt(c(p.marketingBudgetY1*p.lineAffiliationPct),cur)})`,value:p.lineAffiliationPct,color:"#10b981"},
              {label:`WoM (${fmt(c(p.marketingBudgetY1*p.wordOfMouthPct),cur)})`,value:p.wordOfMouthPct,color:"#f59e0b"},
              {label:`Content (${fmt(c(p.marketingBudgetY1*p.contentMarketingPct),cur)})`,value:p.contentMarketingPct,color:"#8b5cf6"},
            ]} size={160}/>
          </div>
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
              Funnel output: {fmtN(cust)}/mo &rarr; Basic {fmtP(p.tierSplitBasic)} | Pro {fmtP(p.tierSplitPro)} | Ent {fmtP(p.tierSplitEnterprise)}
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
          <Tbl headers={["Metric","Value"]} rows={[
            ["Total Reps",p.salesRepsY1],
            ["Total Deals/Mo",p.salesRepsY1*p.dealsPerRepPerMonth],
            ["Annual Cost",fmt(c(p.salesRepsY1*p.salesRepCostMonthly*12),cur)],
          ]}/>
        </div>
      </Card>
    </div>
  );
}

// Feature 4: Headcount with add/remove + inline config
function HeadcountTab({model:m,params:p,setParams:sp}) {
  const c=v=>cv(v,p.exchangeRate,p.displayCurrency); const cur=p.displayCurrency;
  const u=(k,v)=>sp(pr=>({...pr,[k]:v}));
  const team=p.team||[];

  const updateMember=(id,key,val)=>{
    sp(pr=>({...pr,team:(pr.team||[]).map(t=>t.id===id?{...t,[key]:val}:t)}));
  };
  const removeMember=(id)=>{
    sp(pr=>({...pr,team:(pr.team||[]).filter(t=>t.id!==id)}));
  };
  const addMember=()=>{
    const maxId=team.reduce((mx,t)=>Math.max(mx,t.id),0);
    sp(pr=>({...pr,team:[...(pr.team||[]),{id:maxId+1,role:"New Role",name:"TBD",sal:25000,m:1,type:"Planned"}]}));
  };

  const founders=team.filter(t=>t.type==="Founder");
  const employees=team.filter(t=>t.type!=="Founder");
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
        <div className="tw">
          <table>
            <thead><tr><th>Role</th><th>Name</th><th>Type</th><th>Salary/Mo</th><th>Start Month</th><th>Y1 Cost</th><th></th></tr></thead>
            <tbody>
              {team.map(t=>(
                <tr key={t.id}>
                  <td><input className="pi" style={{width:120,textAlign:"left",fontSize:12}} value={t.role} onChange={e=>updateMember(t.id,"role",e.target.value)}/></td>
                  <td><input className="pi" style={{width:90,textAlign:"left",fontSize:12}} value={t.name} onChange={e=>updateMember(t.id,"name",e.target.value)}/></td>
                  <td>
                    <select className="pi" style={{width:90,textAlign:"left",fontSize:12}} value={t.type} onChange={e=>updateMember(t.id,"type",e.target.value)}>
                      <option value="Founder">Founder</option>
                      <option value="Employee">Employee</option>
                      <option value="Planned">Planned</option>
                    </select>
                  </td>
                  <td><input type="number" className="pi" style={{width:80,fontSize:12}} value={t.sal} onChange={e=>updateMember(t.id,"sal",parseFloat(e.target.value)||0)} step={5000}/></td>
                  <td><input type="number" className="pi" style={{width:50,fontSize:12}} value={t.m} onChange={e=>updateMember(t.id,"m",parseInt(e.target.value)||1)} min={1} max={36}/></td>
                  <td className="n">{t.sal>0?fmt(c(t.sal*Math.max(0,13-t.m)),cur):"—"}</td>
                  <td><button className="del-btn" onClick={()=>removeMember(t.id)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="ct" style={{marginTop:10,display:"inline-block"}} onClick={addMember}>+ Add Team Member</button>
      </Card>

      <Card title="Outsourced & Office">
        <PI label="Dev Outsource (THB/mo)" value={p.outsourceDevMonthly} onChange={v=>u("outsourceDevMonthly",v)} step={5000}/>
        <PI label="Accounting (THB/mo)" value={p.outsourceAccountingMonthly} onChange={v=>u("outsourceAccountingMonthly",v)} step={1000}/>
        <PI label="Office Rent (THB/mo)" value={p.officeRent} onChange={v=>u("officeRent",v)} step={1000}/>
        <PI label="Utilities (THB/mo)" value={p.utilities} onChange={v=>u("utilities",v)} step={1000}/>
        <PI label="Misc Ops (THB/mo)" value={p.miscOps} onChange={v=>u("miscOps",v)} step={1000}/>
        <div style={{borderTop:"1px solid var(--bd)",paddingTop:8,marginTop:8}}>
          <div className="pr"><label className="pl" style={{fontWeight:600}}>Total Outsource + Office</label><span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:600}}>{fmt(c(p.outsourceDevMonthly+p.outsourceAccountingMonthly+p.officeRent+p.utilities+p.miscOps),cur)}/mo</span></div>
        </div>
      </Card>
    </div>
  );
}

function IncomeTab({model:m,params:p}) {
  const c=v=>cv(v,p.exchangeRate,p.displayCurrency); const cur=p.displayCurrency;
  const [a1,a2,a3]=m.annuals;
  return (
    <div className="tc">
      <div className="st">Income Statement (P&L)</div>
      <Card title="Annual P&L">
        <Tbl headers={["","Year 1","Year 2","Year 3"]} rows={[
          ["Revenue",fmt(c(a1.revenue),cur),fmt(c(a2.revenue),cur),fmt(c(a3.revenue),cur)],
          ["COGS",`(${fmt(c(a1.cogs),cur)})`,`(${fmt(c(a2.cogs),cur)})`,`(${fmt(c(a3.cogs),cur)})`],
          ["Gross Profit",fmt(c(a1.grossProfit),cur),fmt(c(a2.grossProfit),cur),fmt(c(a3.grossProfit),cur)],
          ["Gross Margin",a1.revenue>0?fmtP(a1.grossProfit/a1.revenue):"—",a2.revenue>0?fmtP(a2.grossProfit/a2.revenue):"—",a3.revenue>0?fmtP(a3.grossProfit/a3.revenue):"—"],
          ["","","",""],
          ["OpEx",`(${fmt(c(a1.opex),cur)})`,`(${fmt(c(a2.opex),cur)})`,`(${fmt(c(a3.opex),cur)})`],
          ["","","",""],
          ["EBITDA",fmt(c(a1.ebitda),cur),fmt(c(a2.ebitda),cur),fmt(c(a3.ebitda),cur)],
          ["EBITDA Margin",a1.revenue>0?fmtP(a1.ebitda/a1.revenue):"—",a2.revenue>0?fmtP(a2.ebitda/a2.revenue):"—",a3.revenue>0?fmtP(a3.ebitda/a3.revenue):"—"],
          ["Net Income",fmt(c(a1.netIncome),cur),fmt(c(a2.netIncome),cur),fmt(c(a3.netIncome),cur)],
        ]} hl/>
      </Card>
      <Card title="Monthly P&L — Year 1">
        <Tbl headers={["Mo","Rev","COGS","GP","OpEx","EBITDA"]} rows={m.data.filter(d=>d.year===1).map(d=>[
          d.label,fmt(c(d.totalRevenue),cur),fmt(c(d.cogs),cur),fmt(c(d.grossProfit),cur),fmt(c(d.opex),cur),fmt(c(d.ebitda),cur),
        ])}/>
      </Card>
    </div>
  );
}

function BalanceTab({model:m,params:p}) {
  const c=v=>cv(v,p.exchangeRate,p.displayCurrency); const cur=p.displayCurrency;
  const eoy=[m.data[11],m.data[23],m.data[35]];
  return (
    <div className="tc">
      <div className="st">Balance Sheet</div>
      <Card title="End of Year">
        <Tbl headers={["","Year 1","Year 2","Year 3"]} rows={[
          ["ASSETS","","",""],
          ["  Cash",...eoy.map(d=>fmt(c(d.cash),cur))],
          ["  Fixed Assets",...eoy.map(d=>fmt(c(d.fixedAssets),cur))],
          ["Total Assets",...eoy.map(d=>fmt(c(d.totalAssets),cur))],
          ["","","",""],
          ["LIABILITIES","","",""],
          ["  Total","0","0","0"],
          ["","","",""],
          ["EQUITY","","",""],
          ["  Paid-in Capital",...eoy.map(()=>fmt(c(p.raiseAmount),cur))],
          ["  Retained Earnings",...eoy.map(d=>fmt(c(d.retainedEarnings),cur))],
          ["Total Equity",...eoy.map(d=>fmt(c(d.equity),cur))],
        ]} hl/>
      </Card>
    </div>
  );
}

function CashFlowTab({model:m,params:p}) {
  const c=v=>cv(v,p.exchangeRate,p.displayCurrency); const cur=p.displayCurrency;
  const b=m.budget;
  return (
    <div className="tc">
      <div className="st">Cash Flow Statement</div>
      <Card title="Annual Cash Flow">
        <Tbl headers={["","Year 1","Year 2","Year 3"]} rows={[
          ["Beginning Cash",fmt(c(p.raiseAmount),cur),fmt(c(m.data[11].cash),cur),fmt(c(m.data[23].cash),cur)],
          ["Cash from Revenue",...m.annuals.map(a=>fmt(c(a.revenue),cur))],
          ["Cash to Operations",...m.annuals.map(a=>`(${fmt(c(a.totalCost),cur)})`)],
          ["Net Operating CF",...m.annuals.map(a=>fmt(c(a.revenue-a.totalCost),cur))],
          ["CapEx",`(${fmt(c(b.hardware),cur)})`,"0","0"],
          ["Ending Cash",fmt(c(m.data[11].cash),cur),fmt(c(m.data[23].cash),cur),fmt(c(m.data[35].cash),cur)],
        ]} hl/>
      </Card>
      <Card title="Monthly Cash Balance">
        <Bar data={m.data.map(d=>c(d.cash))} h={100}/>
        <div className="cl"><span>M1</span><span>M12</span><span>M24</span><span>M36</span></div>
        <div style={{marginTop:8,fontSize:13,color:m.data[35].cash>0?"var(--gn)":"var(--rd)",fontWeight:500}}>
          {m.data[35].cash>0?"Cash positive at M36":"Additional funding needed"}
        </div>
      </Card>
      <Card title="Monthly — Year 1">
        <Tbl headers={["Mo","In","Out","Net","Balance"]} rows={m.data.filter(d=>d.year===1).map(d=>[
          d.label,fmt(c(d.totalRevenue),cur),fmt(c(d.totalCost),cur),fmt(c(d.netCF),cur),fmt(c(d.cash),cur),
        ])}/>
      </Card>
    </div>
  );
}

// Feature 5: Cap Table with IPO forecast — Fix 4: layout fix for Post-Seed
function CapTableTab({model:m,params:p,setParams:sp}) {
  const c=v=>cv(v,p.exchangeRate,p.displayCurrency); const cur=p.displayCurrency;
  const u=(k,v)=>sp(pr=>({...pr,[k]:v}));
  const ct=m.capTable;

  const updateRound=(idx,key,val)=>{
    sp(pr=>{
      const rounds=[...(pr.fundingRounds||[])];
      rounds[idx]={...rounds[idx],[key]:parseFloat(val)||0};
      return {...pr,fundingRounds:rounds};
    });
  };

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
            <Metric label="Pre-Money" value={fmt(c(p.preMoneyValuation),cur)}/>
            <Metric label="Raise" value={fmt(c(p.raiseAmount),cur)} sub={`${p.equityOffered}% equity`}/>
            <Metric label="Post-Money" value={fmt(c(p.preMoneyValuation+p.raiseAmount),cur)}/>
            <Metric label="Price/Share" value={fmtF(c(p.preMoneyValuation/1000000),cur)}/>
          </div>
        </div>
      </Card>

      {/* Fix 4: Post-Seed uses full-width stacked layout instead of cramped g2 grid */}
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
        <div className="tw">
          <table>
            <thead><tr><th>Round</th><th>Pre-Money Val</th><th>Raise</th><th>Equity %</th></tr></thead>
            <tbody>
              {(p.fundingRounds||[]).map((r,i)=>(
                <tr key={i}>
                  <td><input className="pi" style={{width:100,textAlign:"left",fontSize:12}} value={r.name} onChange={e=>{sp(pr=>{const rounds=[...(pr.fundingRounds||[])];rounds[i]={...rounds[i],name:e.target.value};return{...pr,fundingRounds:rounds};});}}/></td>
                  <td><input type="number" className="pi" style={{width:120,fontSize:12}} value={r.valuation} onChange={e=>updateRound(i,"valuation",e.target.value)} step={10000000}/></td>
                  <td><input type="number" className="pi" style={{width:100,fontSize:12}} value={r.raise} onChange={e=>updateRound(i,"raise",e.target.value)} step={10000000}/></td>
                  <td><input type="number" className="pi" style={{width:60,fontSize:12}} value={r.equity} onChange={e=>updateRound(i,"equity",e.target.value)} step={1} max={50}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PI label="IPO Valuation (THB)" value={p.ipoValuation} onChange={v=>u("ipoValuation",v)} step={100000000}/>
      </Card>

      <Card title="Path to IPO — Valuation & Dilution">
        <Tbl headers={["Round","Pre-Money","Raise","Post-Money","New Shares","Total Shares","Founder %","Founder Value"]} rows={ct.rounds.map(r=>{
          const fPct=(ct.founders.reduce((s,f)=>s+f.shares,0)/r.postShares*100);
          const fVal=fPct/100*r.postMoney;
          return [r.name,fmt(c(r.valuation),cur),fmt(c(r.raise),cur),fmt(c(r.postMoney),cur),fmtN(r.newShares),fmtN(r.postShares),fPct.toFixed(1)+"%",fmt(c(fVal),cur)];
        })} hl/>
      </Card>

      <Card title="Exit Value at IPO">
        <div className="mg">
          <Metric label="IPO Valuation" value={fmt(c(ct.ipoVal),cur)} color="var(--gn)"/>
          <Metric label="Founders Total %" value={ct.founderPctAtIPO.toFixed(1)+"%"}/>
          <Metric label="Founders Exit Value" value={fmt(c(ct.founderValueAtIPO),cur)} color="var(--gn)"/>
          <Metric label="Total Dilution" value={((100-ct.founderPctAtIPO)).toFixed(1)+"%"} sub="From all rounds" color="var(--yl)"/>
        </div>
        <Tbl headers={["Founder","Original %","At IPO %","Exit Value"]} rows={ct.founders.map(f=>{
          const pctAtIPO=f.shares/ct.cumulativeShares*100;
          return [f.name,f.pct+"%",pctAtIPO.toFixed(2)+"%",fmt(c(pctAtIPO/100*ct.ipoVal),cur)];
        })}/>
      </Card>
    </div>
  );
}

function SensitivityTab({model:m,params:p}) {
  const c=v=>cv(v,p.exchangeRate,p.displayCurrency); const cur=p.displayCurrency;
  const varLbl={trialToCustomerRate:"Trial to Customer Conv.",basicChurnMonthly:"Basic Churn",websiteVisitors:"Website Visitors",visitorToLeadRate:"Visitor to Lead Conv."};
  const beM = m.data.findIndex(d=>d.ebitda>0);
  return (
    <div className="tc">
      <div className="st">Sensitivity Analysis</div>
      <Card title={`Variable: ${varLbl[p.sensitivityVar]||p.sensitivityVar}`}>
        <Tbl headers={["Scenario","x","Y1 Rev","Y2 Rev","Y3 Rev","Y3 Cust"]} rows={m.sens.map(s=>[
          s.label,`${s.mult}x`,fmt(c(s.y1),cur),fmt(c(s.y2),cur),fmt(c(s.y3),cur),fmtN(s.y3Cust),
        ])}/>
      </Card>
      <div className="g2">
        <Card title="Y3 Revenue Comparison">
          <div style={{display:"flex",gap:14,alignItems:"flex-end",height:140}}>
            {m.sens.map((s,i)=>{
              const mx=Math.max(...m.sens.map(x=>x.y3));
              const cols=["var(--rd)","var(--ac)","var(--gn)"];
              return(
                <div key={i} style={{flex:1,textAlign:"center"}}>
                  <div style={{height:`${(s.y3/mx)*100}px`,background:cols[i],borderRadius:"4px 4px 0 0",display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:4,fontSize:11,color:"#fff",fontWeight:600}}>{fmt(c(s.y3),cur)}</div>
                  <div style={{fontSize:12,marginTop:4,color:"var(--td)"}}>{s.label}</div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card title="Break-Even">
          <div className="mg">
            <Metric label="Break-Even Month" value={beM>=0?`Month ${beM+1}`:"Beyond M36"} sub={beM>=0?m.data[beM].label:"Need more funding"} color={beM>=0?"var(--gn)":"var(--yl)"}/>
            <Metric label="Runway" value={`${Math.round(p.raiseAmount/(m.annuals[0].totalCost/12))} mo`} sub="At Y1 burn rate"/>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ParamsTab({params:p,setParams:sp}) {
  const u=(k,v)=>sp(pr=>({...pr,[k]:v}));
  const secs=[
    {t:"Currency & Valuation",f:[
      {k:"exchangeRate",l:"THB/USD Rate",s:0.5},
    ]},
    {t:"LLM Strategy",f:[
      {k:"llmStrategy",l:"Strategy",type:"select",opts:["api","own","hybrid"]},{k:"apiCostPerUser",l:"API Cost/User/Mo (THB)",s:10},
    ]},
    {t:"Pricing (USD/mo)",f:[
      {k:"basicMonthly",l:"Basic Monthly",s:1},{k:"basicAnnual",l:"Basic Ann/Mo",s:1},
      {k:"proMonthly",l:"Pro Monthly",s:1},{k:"proAnnual",l:"Pro Ann/Mo",s:1},
      {k:"enterpriseMonthly",l:"Enterprise Monthly",s:1},{k:"enterpriseAnnual",l:"Enterprise Ann/Mo",s:1},
      {k:"storageTopupMonthly",l:"Storage USD/50GB",s:1},
    ]},
    {t:"Acquisition",f:[
      {k:"revenueStartMonth",l:"Revenue Start Month",s:1,mn:1,mx:12},
      {k:"tierSplitBasic",l:"Basic Split %",s:0.05,mx:1},{k:"tierSplitPro",l:"Pro Split %",s:0.05,mx:1},{k:"tierSplitEnterprise",l:"Ent Split %",s:0.05,mx:1},
      {k:"y1AnnualRatio",l:"Annual Ratio",s:0.05,mx:1},{k:"y2GrowthRate",l:"Y2 Growth x",s:0.1},{k:"y3GrowthRate",l:"Y3 Growth x",s:0.1},
    ]},
    {t:"Churn",f:[
      {k:"basicChurnMonthly",l:"Basic/Mo",s:0.01,mx:1},{k:"proChurnMonthly",l:"Pro/Mo",s:0.01,mx:1},{k:"enterpriseChurnMonthly",l:"Ent/Mo",s:0.01,mx:1},
    ]},
    {t:"Sensitivity",f:[
      {k:"sensitivityVar",l:"Variable",type:"select",opts:["trialToCustomerRate","basicChurnMonthly","websiteVisitors","visitorToLeadRate"]},
      {k:"bestMultiplier",l:"Best x",s:0.1},{k:"worstMultiplier",l:"Worst x",s:0.1},
    ]},
  ];
  return (
    <div className="tc">
      <div className="st">Settings</div>
      <div className="pg">
        {secs.map((sec,si)=>(
          <Card key={si} title={sec.t}>
            {sec.f.map((f,fi)=>f.type==="select"?(
              <SI key={fi} label={f.l} value={p[f.k]} onChange={v=>u(f.k,v)} opts={f.opts}/>
            ):(
              <PI key={fi} label={f.l} value={p[f.k]} onChange={v=>u(f.k,v)} step={f.s} min={f.mn} max={f.mx}/>
            ))}
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP with Theme Support + localStorage persistence
// ============================================================
export default function App() {
  // Fix 2: Load from localStorage on mount
  const [p, sp] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to handle new fields added in updates
        return { ...DEFAULT_PARAMS, ...parsed, llmBudget: { ...DEFAULT_LLM_BUDGET, ...(parsed.llmBudget || {}) } };
      }
    } catch (e) { /* ignore corrupted data */ }
    return DEFAULT_PARAMS;
  });

  const [tab, setTab] = useState("overview");
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("law5_theme") || "dark"; } catch { return "dark"; }
  });
  const [dirty, setDirty] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  // Track if params changed (dirty state)
  const setParams = useCallback((updater) => {
    sp(updater);
    setDirty(true);
  }, []);

  const model = useMemo(() => computeModel(p), [p]);
  const toggle = () => setParams(pr => ({ ...pr, displayCurrency: pr.displayCurrency==="THB"?"USD":"THB" }));
  const toggleTheme = () => {
    setTheme(t => {
      const next = t==="dark"?"light":"dark";
      try { localStorage.setItem("law5_theme", next); } catch {}
      return next;
    });
  };

  // Fix 2: Save to localStorage
  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
      setDirty(false);
      setSavedMsg("Saved!");
      setTimeout(() => setSavedMsg(""), 2000);
    } catch (e) {
      setSavedMsg("Save failed!");
      setTimeout(() => setSavedMsg(""), 3000);
    }
  };

  // Fix 2: Reset to defaults
  const handleReset = () => {
    sp(DEFAULT_PARAMS);
    setDirty(true);
    setSavedMsg("Reset to defaults (unsaved)");
    setTimeout(() => setSavedMsg(""), 2500);
  };

  const props = { model, params: p, setParams };

  const renderTab = () => {
    switch(tab) {
      case "overview": return <OverviewTab {...props}/>;
      case "revenue": return <RevenueTab {...props}/>;
      case "cost": return <CostTab {...props}/>;
      case "marketing": return <MarketingTab {...props}/>;
      case "headcount": return <HeadcountTab {...props}/>;
      case "income": return <IncomeTab {...props}/>;
      case "balance": return <BalanceTab {...props}/>;
      case "cashflow": return <CashFlowTab {...props}/>;
      case "captable": return <CapTableTab {...props}/>;
      case "sensitivity": return <SensitivityTab {...props}/>;
      case "params": return <ParamsTab {...props}/>;
      default: return <OverviewTab {...props}/>;
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

        /* Fix 1: ensure ALL text inherits theme color */
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
        .mn{flex:1;padding:24px 32px;overflow-y:auto;max-height:100vh}
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

        /* Fix 1: table styles use CSS variables instead of hardcoded rgba */
        table{width:100%;border-collapse:collapse;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--tx)}
        th{text-align:left;padding:8px 10px;border-bottom:2px solid var(--bd);color:var(--td);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap}
        td{padding:6px 10px;border-bottom:1px solid var(--bd);white-space:nowrap;color:var(--tx)}
        td.n{text-align:right}
        tr:hover td{background:color-mix(in srgb, var(--ac) 5%, transparent)}
        tr.hlr td{background:color-mix(in srgb, var(--ac) 10%, transparent);font-weight:700;border-top:2px solid var(--ac)}
        .cl{display:flex;justify-content:space-between;font-size:10px;color:var(--td);margin-top:4px;font-family:'JetBrains Mono',monospace}
        .pg{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}

        /* Fix 1: .pr border uses CSS variable */
        .pr{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--bd)}
        .pl{font-size:12px;color:var(--td)}

        /* Fix 1: input and select fully themed */
        .pi{width:110px;padding:5px 8px;background:var(--bg3);border:1px solid var(--bd);border-radius:6px;color:var(--tx);font-family:'JetBrains Mono',monospace;font-size:12px;text-align:right}
        .pi::placeholder{color:var(--td);opacity:0.6}
        .pi:focus{outline:none;border-color:var(--ac);box-shadow:0 0 0 2px color-mix(in srgb, var(--ac) 20%, transparent)}
        select.pi{text-align:left;cursor:pointer;color:var(--tx);-webkit-appearance:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%238890a8'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 8px center;padding-right:22px}
        select.pi option{background:var(--bg2);color:var(--tx)}

        /* Fix 1: delete button */
        .del-btn{background:transparent;border:none;color:var(--rd);cursor:pointer;font-size:14px;padding:2px 6px;border-radius:4px;line-height:1}
        .del-btn:hover{background:var(--rd);color:#fff}

        .sb-info{padding:12px 16px;font-size:10px;color:var(--td);line-height:1.6;border-top:1px solid var(--bd);margin-top:8px}

        /* Fix 2: Save bar styling */
        .save-bar{display:flex;align-items:center;gap:8px;padding:8px 16px;border-top:1px solid var(--bd);margin-top:8px}
        .save-btn{flex:1;padding:8px;border-radius:8px;font-size:12px;font-family:'DM Sans',sans-serif;cursor:pointer;font-weight:600;border:none;transition:all .15s}
        .save-btn.primary{background:var(--gn);color:#fff}
        .save-btn.primary:hover{filter:brightness(1.1)}
        .save-btn.secondary{background:var(--bg3);color:var(--td);border:1px solid var(--bd)}
        .save-btn.secondary:hover{border-color:var(--rd);color:var(--rd)}
        .dirty-dot{width:8px;height:8px;border-radius:50%;background:var(--yl);display:inline-block;animation:pulse 1.5s infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .saved-msg{font-size:11px;color:var(--gn);font-weight:600;text-align:center;padding:4px 16px}

        @media(max-width:768px){.app{flex-direction:column}.sb{width:100%;height:auto;position:relative;display:flex;flex-wrap:wrap;padding:8px;gap:2px}.sb-logo{padding:0 8px 8px;width:100%}.ni{padding:6px 10px;font-size:11px;border-left:none}.mn{padding:16px}.g2{grid-template-columns:1fr}.pg{grid-template-columns:1fr}}
      `}</style>
      <div className="app" data-theme={theme}>
        <nav className="sb">
          <div className="sb-logo">
            <h1>LAW5</h1>
            <p>Financial Model 2025-2027</p>
          </div>
          {TABS.map(t=>(
            <div key={t.id} className={`ni${tab===t.id?" ac":""}`} onClick={()=>setTab(t.id)}>
              <span style={{fontSize:15,width:20,textAlign:"center"}}>{t.icon}</span>{t.label}
            </div>
          ))}
          <button className="ct" onClick={toggle}>
            {p.displayCurrency==="THB"?"THB to USD":"USD to THB"}
          </button>
          <button className="ct" onClick={toggleTheme}>
            {theme==="dark"?"☀️ Light Mode":"🌙 Dark Mode"}
          </button>

          {/* Fix 2: Save/Reset bar */}
          <div className="save-bar">
            <button className="save-btn primary" onClick={handleSave}>
              💾 Save {dirty && <span className="dirty-dot" style={{marginLeft:4}}/>}
            </button>
            <button className="save-btn secondary" onClick={handleReset}>↺</button>
          </div>
          {savedMsg && <div className="saved-msg">{savedMsg}</div>}
          {dirty && <div style={{fontSize:10,color:"var(--yl)",textAlign:"center",padding:"2px 16px"}}>Unsaved changes</div>}

          <div className="sb-info">
            All projections are estimates.<br/>
            Currency: {p.displayCurrency} ({p.exchangeRate} THB/USD)
          </div>
        </nav>
        <main className="mn">{renderTab()}</main>
      </div>
    </>
  );
}
