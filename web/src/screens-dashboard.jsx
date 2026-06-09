/* ============================================================
   MacroFactor — Dashboard (v4)
   3 swipeable slides + scrollable sections.
   Primary Focus order is configurable (Customize Dashboard);
   default = Weekly Nutrition.
   ============================================================ */

/* ---- Energy Balance bar chart (real last-30-day intake) -- */
function EnergyBalanceChart({ mode }) {
  const { state } = useApp();
  const keys = dateRangeBack(TODAY, 30);
  const vals = keys.map(k => dayTotals(state, k).energy);
  const loggedVals = vals.filter(v => v > 0);
  const hasData = loggedVals.length > 0;
  const est = estimateExpenditure(state, TODAY, 30);
  // Reference line: measured expenditure, or the calorie target when toggled/while
  // there isn't enough data for an estimate yet.
  const refValue = mode === 'Targets' ? state.targets.energy : (est || state.targets.energy);
  const max = Math.max(...vals, refValue, 1) * 1.12;
  const W = 320, H = 140, pad = 4;
  const bw = (W - pad * 2) / (vals.length || 1);
  const y = v => H - pad - ((v / max) * (H - pad * 2));
  const refY = y(refValue);
  const avgNut = hasData ? Math.round(loggedVals.reduce((a, b) => a + b, 0) / loggedVals.length) : 0;
  const avgExp = Math.round(refValue);
  const diff = avgNut - avgExp;
  const showExp = mode === 'Targets' ? true : !!est;
  return (
    <div className="mf-slide-card">
      <div className="mf-slide-title">Energy Balance</div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', marginBottom: 8 }}>
        {vals.map((v, i) => v > 0 ? (
          <rect key={i} x={pad + i * bw + 1} y={y(v)} width={Math.max(2, bw - 2)} height={H - pad - y(v)}
            rx="2" fill={MF.energy} opacity="0.85" />
        ) : null)}
        {hasData && showExp && (
          <line x1={pad} y1={refY} x2={W - pad} y2={refY} stroke="#EF6A45" strokeWidth="1.5"
            strokeDasharray="4 3" strokeLinecap="round" />
        )}
        <text x={W - pad} y={H - 2} textAnchor="end" fill="rgba(255,255,255,.35)" fontSize="11">Letzte 30 Tage</text>
      </svg>
      {hasData ? (
        <div className="mf-ebstat">
          <div className="mf-ebcol"><span className="mf-num mf-ebn">{avgNut}</span><span className="mf-eblbl"><i>▌</i> Zufuhr</span></div>
          <span className="mf-ebop">−</span>
          <div className="mf-ebcol"><span className="mf-num mf-ebn">{showExp ? avgExp : '–'}</span><span className="mf-eblbl">{mode === 'Targets' ? 'Ziel' : 'Verbrauch'}</span></div>
          <span className="mf-ebop">=</span>
          <div className="mf-ebcol"><span className="mf-num mf-ebn" style={{ color: showExp ? (diff < 0 ? MF.carb : MF.protein) : 'var(--mf-fg-3)' }}>{showExp ? (diff > 0 ? '+' : '') + diff : '–'}</span><span className="mf-eblbl" style={{ color: 'var(--mf-fg-3)' }}>Differenz</span></div>
        </div>
      ) : (
        <div className="mf-empty" style={{ textAlign: 'center', padding: '2px 0 10px' }}>
          Logge ein paar Tage — dann erscheint hier deine Energiebilanz.
        </div>
      )}
    </div>
  );
}

/* ---- Daily Nutrition ring gauge ------------------------- */
function DailyNutritionSlide({ mode, onMode }) {
  const { state } = useApp();
  const tot = dayTotals(state, state.selectedDate);
  const consumed = tot.energy, target = state.targets.energy;
  const remaining = Math.max(0, target - consumed);
  const pct = Math.min(1, consumed / target);
  const R = 80, CX = 110, CY = 100;
  const C = 2 * Math.PI * R;
  const arcLen = C * 0.75;
  const filled = arcLen * pct;
  const transform = `rotate(-220, ${CX}, ${CY})`;
  return (
    <div className="mf-slide-card">
      <div className="mf-slide-title">Daily Nutrition</div>
      <div className="mf-ring-wrap">
        <svg width="220" height="130" viewBox="0 0 220 130">
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#2C2C30" strokeWidth="10"
            strokeDasharray={`${arcLen} ${C - arcLen}`} strokeDashoffset="0"
            strokeLinecap="round" transform={transform} />
          <circle cx={CX} cy={CY} r={R} fill="none" stroke={MF.energy} strokeWidth="10"
            strokeDasharray={`${filled} ${C - filled}`} strokeDashoffset="0"
            strokeLinecap="round" transform={transform} />
          <text x={CX} y={CY - 10} textAnchor="middle" fill="#fff" fontSize="26" fontWeight="800"
            style={{ fontVariantNumeric: 'tabular-nums' }}>{consumed}</text>
          <text x={CX} y={CY + 12} textAnchor="middle" fill="rgba(255,255,255,.45)" fontSize="12">Consumed</text>
        </svg>
        <div className="mf-ring-sides">
          <div className="mf-ring-side"><span className="mf-num mf-ring-val">{remaining}</span><span className="mf-ring-lbl">Remaining</span></div>
          <div className="mf-ring-side right"><span className="mf-num mf-ring-val">{target}</span><span className="mf-ring-lbl">Target</span></div>
        </div>
      </div>
      <div className="mf-ring-macros">
        {[['protein', tot.protein], ['fat', tot.fat], ['carb', tot.carb]].map(([k, v]) => {
          const m = MACRO_META.find(x => x.key === k);
          const g = state.targets[k];
          const pct = Math.min(100, v / g * 100);
          return (
            <div className="mf-ring-macrow" key={k}>
              <span className="mf-ring-macro-lbl" style={{ color: m.color }}>{k.charAt(0).toUpperCase() + k.slice(1)}</span>
              <div className="mf-ring-bar"><span style={{ width: pct + '%', background: m.color }} /></div>
              <span className="mf-num mf-ring-macro-val">{v}/{g}g</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---- Weekly Nutrition slide (reuses chart from screens-main) */
function WeeklyNutritionSlide() {
  const { state, dispatch } = useApp();
  const [mode, setMode] = React.useState('Consumed');
  const sel = state.selectedDate;
  return (
    <div className="mf-slide-card">
      <div className="mf-slide-title">Weekly Nutrition</div>
      <div key={mode} className="mf-weekly-mode-panel">
        <WeeklyChart mode={mode} selected={sel} onSelect={k => dispatch({ type: 'SET_DATE', date: k })} />
        <WeeklyDayLabels selected={sel} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
        <Segmented options={['Consumed', 'Remaining']} value={mode} onChange={setMode} />
      </div>
    </div>
  );
}

/* ---- Mini data card (Insights, Body Metrics) ------------ */
function MiniDataCard({ title, subtitle, value, unit, color, chart, onClick }) {
  return (
    <button className="mf-datacard" onClick={onClick}>
      <div className="mf-datacard-title">{title}</div>
      <div className="mf-datacard-sub">{subtitle}</div>
      <div className="mf-datacard-chart">{chart}</div>
      <div className="mf-datacard-divider" />
      <div className="mf-datacard-footer">
        <span className="mf-num mf-datacard-val" style={color ? { color } : {}}>{value} <span className="mf-datacard-unit">{unit}</span></span>
        <Icon name="chevron-right" size={16} color="var(--mf-fg-3)" />
      </div>
    </button>
  );
}

/* ---- Habit dot grid ------------------------------------- */
function HabitGrid({ daysLogged, total = 30, color }) {
  const cols = 7;
  return (
    <div className="mf-habit-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className="mf-habit-dot"
          style={{ background: i < daysLogged ? color : '#2C2C30' }} />
      ))}
    </div>
  );
}

/* ---- Habit summary card (tappable) ---------------------- */
function HabitCard({ title, daysLogged, thisWeek, color, onClick }) {
  return (
    <button className="mf-datacard" onClick={onClick}>
      <div className="mf-datacard-title">{title}</div>
      <div className="mf-datacard-sub">Last 30 Days</div>
      <HabitGrid daysLogged={daysLogged} total={30} color={color} />
      <div className="mf-datacard-divider" />
      <div className="mf-datacard-footer">
        <span className="mf-num mf-datacard-val">{thisWeek}/7 <span className="mf-datacard-unit">this week</span></span>
        <Icon name="chevron-right" size={16} color="var(--mf-fg-3)" />
      </div>
    </button>
  );
}

/* ---- Nutrition card (Calories/Protein/Fat/Carbs) -------- */
function NutritionCard({ label, value, unit, color, goal, onClick }) {
  const pct = Math.min(100, (value / goal) * 100);
  return (
    <button className="mf-nutcard" onClick={onClick}>
      <div className="mf-nutcard-label">{label}</div>
      <div className="mf-nutcard-sub">Today</div>
      <div className="mf-nutbar">
        <div className="mf-nutbar-fill" style={{ width: pct + '%', background: color }} />
        <div className="mf-nutbar-tick" style={{ left: '100%' }} />
      </div>
      <div className="mf-nutcard-divider" />
      <div className="mf-nutcard-footer">
        <span className="mf-num mf-nutcard-val">{value} <span className="mf-nutcard-unit">{unit}</span></span>
        <Icon name="chevron-right" size={16} color="var(--mf-fg-3)" />
      </div>
    </button>
  );
}

/* ---- Steps chart ---------------------------------------- */
const STEPS_7D = [7800, 7900, 5400, 9800, 9900, 13241, 4037];
function StepsChart() {
  const max = Math.max(...STEPS_7D);
  return (
    <div className="mf-steps-bars">
      {STEPS_7D.map((s, i) => (
        <div key={i} className="mf-steps-bar-wrap">
          <div className="mf-steps-bar" style={{ height: (s / max * 100) + '%', background: '#EF6A45' }} />
        </div>
      ))}
    </div>
  );
}

/* ---- Dashboard main screen ------------------------------ */
function DashboardScreen({ onSearch, onAI, onGo }) {
  const { state } = useApp();
  const [ebMode, setEbMode] = React.useState('Expenditure');
  const [slide, setSlide] = React.useState(0);
  const tot = dayTotals(state, state.selectedDate);
  const expEstimate = estimateExpenditure(state);

  // Primary Focus order (configurable via Customize Dashboard; default Weekly Nutrition)
  let primary = 'weekly';
  try { primary = localStorage.getItem('mf_primary_focus') || 'weekly'; } catch (e) {}
  const slideMap = {
    weekly: { key: 'weekly', node: <WeeklyNutritionSlide /> },
    energy: { key: 'energy', node: <EnergyBalanceChart mode={ebMode} /> },
    daily:  { key: 'daily',  node: <DailyNutritionSlide mode="Consumed" /> },
  };
  const order = [primary, ...['weekly', 'energy', 'daily'].filter(k => k !== primary)];
  const slides = order.map(k => slideMap[k]);
  const current = slides[Math.min(slide, slides.length - 1)];

  // habit summaries from real data
  const weighThisWeek = WEEK_KEYS.filter(k => state.weights.some(w => w.date === k)).length;
  const foodThisWeek = WEEK_KEYS.filter(k => (state.days[k] || {}).entries && state.days[k].entries.length).length;
  const lastW = state.weights[state.weights.length - 1];
  const wUnit = weightUnit(state);
  const foodDays = Object.keys(state.days).filter(k => state.days[k].entries.length).length;

  return (
    <div className="mf-screen mf-dashboard-screen">
      {/* Title */}
      <div className="mf-dash-header">
        <div className="mf-eyebrow" style={{ marginBottom: 2 }}>{fmtEyebrow(TODAY)}</div>
        <h1 className="mf-title">Dashboard</h1>
      </div>

      <div className="mf-scroll">
        {/* Swipeable slides */}
        <div className="mf-slides">
          {current.node}
        </div>
        {/* Energy-Balance-specific toggle */}
        {current.key === 'energy' && (
          <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0' }}>
            <Segmented options={['Expenditure', 'Targets']} value={ebMode} onChange={setEbMode} />
          </div>
        )}
        {/* Dots (tappable slide nav) */}
        <div className="mf-dots">
          {slides.map((_, i) => (
            <i key={i} className={i === slide ? 'on' : ''} onClick={() => setSlide(i)}
              style={{ cursor: 'pointer' }} />
          ))}
        </div>

        {/* ---- Insights & Analytics -------------------- */}
        <SectionHead title="Insights & Analytics" action="See All" onAction={() => onGo('insights')} />
        <div className="mf-card2grid">
          <MiniDataCard title="Expenditure" subtitle="geschätzt" value={expEstimate ? String(expEstimate) : '–'} unit="kcal"
            chart={<ExpenditureChartMini />} onClick={() => onGo('expenditure')} />
          <MiniDataCard title="Weight Trend" subtitle="Last 7 Days" value={lastW ? weightDisplayText(state, lastW.value) : '–'} unit={wUnit}
            chart={<WeightSparkMini weights={state.weights} />} onClick={() => onGo('weighttrend')} />
        </div>

        {/* ---- Habits ---------------------------------- */}
        <div className="mf-section-head-row"><span className="mf-h2">Habits</span></div>
        <div className="mf-card2grid">
          <HabitCard title="Weigh-In" daysLogged={Math.min(30, state.weights.length)} thisWeek={weighThisWeek}
            color={MF.carb} onClick={() => onGo('weighin')} />
          <HabitCard title="Food Logging" daysLogged={Math.min(30, foodDays)} thisWeek={foodThisWeek}
            color={MF.energy} onClick={() => onGo('foodlogging')} />
        </div>

        {/* ---- Body Metrics ---------------------------- */}
        <SectionHead title="Body Metrics" action="See All" onAction={() => onGo('metrics')} />
        <div className="mf-card2grid">
          <MiniDataCard title="Scale Weight" subtitle="Last 7 Entries"
            value={lastW ? weightDisplayText(state, lastW.value) : '–'} unit={wUnit}
            chart={<WeightSparkMini weights={state.weights} color={MF.carb} />} onClick={() => onGo('metrics')} />
          <MiniDataCard title="Visual Body Fat" subtitle="Last 7 Entries"
            value="–" unit="%"
            chart={<div style={{ height: 40 }} />}
            onClick={() => onGo('bodyfat')} />
        </div>

        {/* ---- Nutrition -------------------------------- */}
        <SectionHead title="Nutrition" action="See All" onAction={() => onGo('nutridata')} />
        <div className="mf-card2grid">
          <NutritionCard label="Calories" value={tot.energy} unit="kcal" color={MF.energy} goal={state.targets.energy} onClick={() => onGo('nutridata')} />
          <NutritionCard label="Protein" value={tot.protein} unit="g" color={MF.protein} goal={state.targets.protein} onClick={() => onGo('insights')} />
          <NutritionCard label="Fat" value={tot.fat} unit="g" color={MF.fat} goal={state.targets.fat} onClick={() => onGo('insights')} />
          <NutritionCard label="Carbs" value={tot.carb} unit="g" color={MF.carb} goal={state.targets.carb} onClick={() => onGo('insights')} />
        </div>

        {/* ---- General --------------------------------- */}
        <div className="mf-section-head-row"><span className="mf-h2">General</span></div>
        <div className="mf-card2grid">
          <button className="mf-datacard" onClick={() => onGo('steps')}>
            <div className="mf-datacard-title">Steps</div>
            <div className="mf-datacard-sub">Last 7 Days</div>
            <StepsChart />
            <div className="mf-datacard-divider" />
            <div className="mf-datacard-footer">
              <span className="mf-num mf-datacard-val">4037 <span className="mf-datacard-unit">steps</span></span>
              <Icon name="chevron-right" size={16} color="var(--mf-fg-3)" />
            </div>
          </button>
        </div>

        {/* ---- More ------------------------------------ */}
        <div className="mf-section-head-row"><span className="mf-h2">More</span></div>
        <div className="mf-setcard" style={{ marginBottom: 18 }}>
          <SettingRow icon="layout-dashboard" label="Customize Dashboard" onClick={() => onGo('customize')} />
          <SettingRow icon="database" label="Nutrition Data Manager" last onClick={() => onGo('nutridata')} />
        </div>
      </div>

      <div className="mf-bottomdock"><SearchBar onTap={onSearch} onAI={onAI} /></div>
    </div>
  );
}

/* ---- Small inline chart helpers ------------------------ */
function ExpenditureChartMini() {
  return (
    <svg viewBox="0 0 180 50" width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block', minHeight: 44 }}>
      <rect x="4" y="18" width="172" height="12" rx="4" fill="rgba(224,122,78,0.22)" />
      <line x1="4" y1="28" x2="176" y2="20" stroke="#E07A4E" strokeWidth="1.5" />
      {[[4,27],[30,26],[56,25],[82,24],[108,23],[134,22],[160,20]].map(([x, y], i) => (
        <rect key={i} x={x - 2.5} y={y - 3} width="5" height="6" rx="1" fill="#252528" stroke="#E07A4E" strokeWidth="1.2" />
      ))}
    </svg>
  );
}

function WeightSparkMini({ weights, color }) {
  const c = color || MF.purple;
  const vals = (weights || []).slice(-7).map(w => w.value);
  if (vals.length < 2) {
    // empty / single-point state: faint baseline so the card isn't blank
    return (
      <svg viewBox="0 0 180 50" width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block', minHeight: 44 }}>
        <line x1="8" y1="25" x2="172" y2="25" stroke={c} strokeWidth="1.5" strokeDasharray="4 5" opacity="0.35" />
        {vals.length === 1 && <circle cx="90" cy="25" r="2.5" fill="#252528" stroke={c} strokeWidth="1.5" />}
      </svg>
    );
  }
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = (max - min) || 0.5;
  const pts = vals.map((v, i) => [8 + i * (164 / Math.max(1, vals.length - 1)), 8 + (1 - (v - min) / span) * 32]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  return (
    <svg viewBox="0 0 180 50" width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block', minHeight: 44 }}>
      <path d={d} fill="none" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill="#252528" stroke={c} strokeWidth="1.5" />)}
    </svg>
  );
}

Object.assign(window, {
  DashboardScreen, EnergyBalanceChart, DailyNutritionSlide, WeeklyNutritionSlide,
  MiniDataCard, HabitGrid, HabitCard, NutritionCard, StepsChart, STEPS_7D,
  ExpenditureChartMini, WeightSparkMini,
});
