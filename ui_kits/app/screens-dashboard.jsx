/* ============================================================
   MacroFactor — Dashboard (v4 full rebuild)
   3 swipeable slides + scrollable sections
   ============================================================ */

/* ---- Energy Balance bar chart (30-day) ------------------ */
const ENERGY_30D = [
  2200,2450,2310,2290,2480,2190,2560,2310,2420,2380,
  2270,2490,2310,2350,2460,2290,2510,2380,2340,2420,
  2280,2460,2330,2480,2250,2370,2510,2290,2340,2358,
];
const EXPEND_30D = [
  2340,2360,2380,2390,2400,2350,2380,2360,2370,2390,
  2380,2400,2360,2380,2410,2380,2390,2380,2370,2390,
  2380,2400,2370,2390,2360,2380,2400,2370,2380,2390,
];

function EnergyBalanceChart({ mode }) {
  const vals = mode === 'Expenditure' ? ENERGY_30D : ENERGY_30D;
  const expLine = mode === 'Expenditure' ? EXPEND_30D : EXPEND_30D.map(v => v - 200);
  const max = Math.max(...vals, ...expLine) * 1.08;
  const W = 320, H = 140, pad = 4;
  const bw = (W - pad * 2) / vals.length;
  const y = v => H - pad - ((v / max) * (H - pad * 2));
  const expPts = expLine.map((v, i) => [pad + i * bw + bw / 2, y(v)]);
  const expPath = expPts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const avgNut = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  const avgExp = Math.round(expLine.reduce((a, b) => a + b, 0) / expLine.length);
  const diff = avgNut - avgExp;
  return (
    <div className="mf-slide-card">
      <div className="mf-slide-title">Energy Balance</div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', marginBottom: 8 }}>
        {vals.map((v, i) => (
          <rect key={i} x={pad + i * bw + 1} y={y(v)} width={Math.max(2, bw - 2)} height={H - pad - y(v)}
            rx="2" fill={MF.energy} opacity="0.85" />
        ))}
        <path d={expPath} fill="none" stroke="#EF6A45" strokeWidth="1.5"
          strokeDasharray="4 3" strokeLinecap="round" />
        <text x={W - pad} y={H - 2} textAnchor="end" fill="rgba(255,255,255,.35)" fontSize="11">Last 30 Days</text>
      </svg>
      <div className="mf-ebstat">
        <div className="mf-ebcol"><span className="mf-num mf-ebn">{avgNut}</span><span className="mf-eblbl"><i>▌</i> Nutrition</span></div>
        <span className="mf-ebop">−</span>
        <div className="mf-ebcol"><span className="mf-num mf-ebn">{avgExp}</span><span className="mf-eblbl"><svg width="14" height="10"><path d="M0,8 Q3,2 7,5 Q11,8 14,2" fill="none" stroke="#EF6A45" strokeWidth="1.5"/></svg> Expenditure</span></div>
        <span className="mf-ebop">=</span>
        <div className="mf-ebcol"><span className="mf-num mf-ebn" style={{ color: diff < 0 ? MF.carb : MF.protein }}>{diff > 0 ? '+' : ''}{diff}</span><span className="mf-eblbl" style={{ color: 'var(--mf-fg-3)' }}>Difference</span></div>
      </div>
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
  const startAngle = -220 * (Math.PI / 180);
  const arcLen = C * 0.75;
  const filled = arcLen * pct;
  // SVG arc from -220° sweeping 270°
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
      <WeeklyChart mode={mode} selected={sel} onSelect={k => dispatch({ type: 'SET_DATE', date: k })} />
      <WeeklyDayLabels selected={sel} />
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
  const cols = 7, rows = Math.ceil(total / cols);
  return (
    <div className="mf-habit-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className="mf-habit-dot"
          style={{ background: i < daysLogged ? color : '#2C2C30' }} />
      ))}
    </div>
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
function StepsChart() {
  const steps = [3200, 4100, 2800, 5200, 6300, 7100, 3787];
  const max = Math.max(...steps);
  return (
    <div className="mf-steps-bars">
      {steps.map((s, i) => (
        <div key={i} className="mf-steps-bar-wrap">
          <div className="mf-steps-bar" style={{ height: (s / max * 100) + '%', background: '#EF6A45' }} />
        </div>
      ))}
    </div>
  );
}

/* ---- Dashboard main screen ------------------------------ */
function DashboardScreen({ onSearch, onGo }) {
  const { state } = useApp();
  const [slide, setSlide] = React.useState(0);
  const [ebMode, setEbMode] = React.useState('Expenditure');
  const tot = dayTotals(state, state.selectedDate);

  const slides = [
    <EnergyBalanceChart key="eb" mode={ebMode} />,
    <DailyNutritionSlide key="dn" mode="Consumed" />,
    <WeeklyNutritionSlide key="wn" />,
  ];
  const slideBtns = [
    { label: 'Expenditure', alt: 'Targets', key: 'eb' },
    { label: 'Consumed', alt: 'Remaining', key: 'dn' },
    null,
  ];

  return (
    <div className="mf-screen">
      {/* Small centered nav title */}
      <div className="mf-dash-header">
        <div className="mf-eyebrow" style={{ textAlign: 'center', marginBottom: 2 }}>{fmtEyebrow(state.selectedDate)}</div>
        <h1 className="mf-title" style={{ fontSize: 42, letterSpacing: '.01em', textAlign: 'left' }}>Dashboard</h1>
      </div>

      <div className="mf-scroll">
        {/* Swipeable slides */}
        <div className="mf-slides">
          {slides[slide]}
        </div>
        {/* Segmented toggle for slide-specific mode */}
        {slide === 0 && (
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
          <MiniDataCard title="Expenditure" subtitle="Last 7 Days" value="2343" unit="kcal"
            chart={<ExpenditureChartMini />} onClick={() => onGo('insights')} />
          <MiniDataCard title="Weight Trend" subtitle="Last 7 Days" value={state.weights[state.weights.length-1]?.value} unit="kg"
            chart={<WeightSparkMini weights={state.weights} />} onClick={() => onGo('metrics')} />
        </div>

        {/* ---- Habits ---------------------------------- */}
        <div className="mf-section-head-row"><span className="mf-h2">Habits</span></div>
        <div className="mf-card2grid">
          <div className="mf-datacard">
            <div className="mf-datacard-title">Weigh-In</div>
            <div className="mf-datacard-sub">Last 30 Days</div>
            <HabitGrid daysLogged={state.weights.length} total={30} color={MF.carb} />
            <div className="mf-datacard-divider" />
            <div className="mf-datacard-footer">
              <span className="mf-num mf-datacard-val">0/7 <span className="mf-datacard-unit">this week</span></span>
              <Icon name="chevron-right" size={16} color="var(--mf-fg-3)" />
            </div>
          </div>
          <div className="mf-datacard">
            <div className="mf-datacard-title">Food Logging</div>
            <div className="mf-datacard-sub">Last 30 Days</div>
            <HabitGrid daysLogged={22} total={30} color={MF.energy} />
            <div className="mf-datacard-divider" />
            <div className="mf-datacard-footer">
              <span className="mf-num mf-datacard-val">2/7 <span className="mf-datacard-unit">this week</span></span>
              <Icon name="chevron-right" size={16} color="var(--mf-fg-3)" />
            </div>
          </div>
        </div>

        {/* ---- Body Metrics ---------------------------- */}
        <SectionHead title="Body Metrics" action="See All" onAction={() => onGo('metrics')} />
        <div className="mf-card2grid">
          <MiniDataCard title="Scale Weight" subtitle="Last 7 Entries"
            value={state.weights[state.weights.length-1]?.value} unit="kg"
            chart={<WeightSparkMini weights={state.weights} color={MF.carb} />} onClick={() => onGo('metrics')} />
          <MiniDataCard title="Visual Body Fat" subtitle="Last 7 Entries"
            value="10.0" unit="%"
            chart={<div style={{ height: 40, display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: MF.carb, border: '2px solid #252528', boxShadow: `0 0 0 3px ${MF.carb}40` }} /></div>}
            onClick={() => onGo('metrics')} />
        </div>

        {/* ---- Nutrition -------------------------------- */}
        <SectionHead title="Nutrition" action="See All" onAction={() => onGo('insights')} />
        <div className="mf-card2grid">
          <NutritionCard label="Calories" value={tot.energy} unit="kcal" color={MF.energy} goal={state.targets.energy} onClick={() => onGo('insights')} />
          <NutritionCard label="Protein" value={tot.protein} unit="g" color={MF.protein} goal={state.targets.protein} onClick={() => onGo('insights')} />
          <NutritionCard label="Fat" value={tot.fat} unit="g" color={MF.fat} goal={state.targets.fat} onClick={() => onGo('insights')} />
          <NutritionCard label="Carbs" value={tot.carb} unit="g" color={MF.carb} goal={state.targets.carb} onClick={() => onGo('insights')} />
        </div>

        {/* ---- General --------------------------------- */}
        <div className="mf-section-head-row"><span className="mf-h2">General</span></div>
        <div className="mf-card2grid">
          <div className="mf-datacard">
            <div className="mf-datacard-title">Steps</div>
            <div className="mf-datacard-sub">Last 7 Days</div>
            <StepsChart />
            <div className="mf-datacard-divider" />
            <div className="mf-datacard-footer">
              <span className="mf-num mf-datacard-val">3787 <span className="mf-datacard-unit">steps</span></span>
              <Icon name="chevron-right" size={16} color="var(--mf-fg-3)" />
            </div>
          </div>
        </div>

        {/* ---- More ------------------------------------ */}
        <div className="mf-section-head-row"><span className="mf-h2">More</span></div>
        <div className="mf-setcard" style={{ marginBottom: 18 }}>
          <SettingRow icon="layout-dashboard" label="Customize Dashboard" onClick={() => {}} />
          <SettingRow icon="database" label="Nutrition Data Manager" last onClick={() => {}} />
        </div>
      </div>

      <div className="mf-bottomdock"><SearchBar onTap={onSearch} /></div>
    </div>
  );
}

/* ---- Small inline chart helpers ------------------------ */
function ExpenditureChartMini() {
  return (
    <svg viewBox="0 0 180 50" width="100%" height="44" preserveAspectRatio="none">
      <rect x="4" y="18" width="172" height="12" rx="4" fill="rgba(224,122,78,0.22)" />
      <line x1="4" y1="24" x2="176" y2="24" stroke="#E07A4E" strokeWidth="1.5" />
      {[4, 30, 56, 82, 108, 134, 160].map((x, i) => (
        <rect key={i} x={x - 2.5} y={21} width="5" height="6" rx="1" fill="#252528" stroke="#E07A4E" strokeWidth="1.2" />
      ))}
    </svg>
  );
}

function WeightSparkMini({ weights, color }) {
  const vals = (weights || []).slice(-7).map(w => w.value);
  if (!vals.length) return null;
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = (max - min) || 0.5;
  const pts = vals.map((v, i) => [8 + i * (164 / Math.max(1, vals.length - 1)), 8 + (1 - (v - min) / span) * 32]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const c = color || MF.purple;
  return (
    <svg viewBox="0 0 180 50" width="100%" height="44" preserveAspectRatio="none">
      <path d={d} fill="none" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill="#252528" stroke={c} strokeWidth="1.5" />)}
    </svg>
  );
}

Object.assign(window, {
  DashboardScreen, EnergyBalanceChart, DailyNutritionSlide, WeeklyNutritionSlide,
  MiniDataCard, HabitGrid, NutritionCard, StepsChart,
  ExpenditureChartMini, WeightSparkMini,
});
