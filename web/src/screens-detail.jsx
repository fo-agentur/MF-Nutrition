/* ============================================================
   MacroFactor — detail / metric subpages
   Scale Weight, Weight Trend, Expenditure, Steps, Visual Body
   Fat, Weigh-In, Food Logging, Nutrition Data Manager,
   Customize Dashboard. Wired to Supabase-backed state.
   ============================================================ */

const D_MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const D_MONTHS_SHORT = ['Jan.','Feb.','März','Apr.','Mai','Juni','Juli','Aug.','Sep.','Okt.','Nov.','Dez.'];
const D_DOW_SHORT = ['So.','Mo.','Di.','Mi.','Do.','Fr.','Sa.'];
const dpad = n => String(n).padStart(2, '0');
const diso = d => d.getFullYear() + '-' + dpad(d.getMonth() + 1) + '-' + dpad(d.getDate());

/* ---- Range selector (visual) ---------------------------- */
function RangeTabs({ value = '1W', onChange }) {
  const opts = ['1W', '1M', '3M', '6M', '1Y', 'All'];
  const [internal, setInternal] = React.useState(value);
  const [unit, setUnit] = React.useState('D');
  React.useEffect(() => setInternal(value), [value]);
  const active = onChange ? value : internal;
  const choose = o => {
    if (onChange) onChange(o);
    else setInternal(o);
  };
  const cycleUnit = () => setUnit(u => u === 'D' ? 'W' : u === 'W' ? 'M' : 'D');
  return (
    <div className="mf-rangebar">
      <div className="mf-rangetabs">
        {opts.map(o => (
          <button key={o} className={'mf-rangetab' + (o === active ? ' on' : '')}
            onClick={() => choose(o)}>{o}</button>
        ))}
      </div>
      <button className="mf-rangeunit" onClick={cycleUnit}>{unit} <Icon name="chevron-down" size={16} /></button>
    </div>
  );
}

/* ---- Metric hero (Average / Difference) ----------------- */
function MetricHero({ average, unit, diff, range }) {
  return (
    <div className="mf-mh">
      <div className="mf-mh-stats">
        <div className="mf-mh-col">
          <div className="mf-mh-lbl">Average</div>
          <div className="mf-mh-val mf-num">{average}<small> {unit}</small></div>
        </div>
        {diff !== undefined && (
          <div className="mf-mh-col">
            <div className="mf-mh-lbl">Difference</div>
            <div className="mf-mh-val mf-num">{diff}<small> {unit}</small></div>
          </div>
        )}
      </div>
      <div className="mf-mh-range">{range}</div>
    </div>
  );
}

/* ---- Big line chart with right-side value axis ---------- */
function BigLineChart({ values, color, emptyHint }) {
  if (!values || !values.length) {
    return (
      <div className="mf-bigchart empty">
        {[10, 5, 0].map(v => <div key={v} className="mf-bigchart-row"><span className="mf-bigchart-axis">{v}</span></div>)}
        {emptyHint && <div className="mf-bigchart-empty">{emptyHint}</div>}
      </div>
    );
  }
  const min = Math.min(...values), max = Math.max(...values);
  const span = (max - min) || 1;
  const W = 320, H = 150, pad = 16;
  const pts = values.map((v, i) => [
    pad + (i / Math.max(1, values.length - 1)) * (W - pad * 2),
    pad + (1 - (v - min) / span) * (H - pad * 2),
  ]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const ticks = [max, min + span * 0.66, min + span * 0.33, min];
  return (
    <div className="mf-bigchart">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
        {ticks.map((t, i) => {
          const y = pad + (i / (ticks.length - 1)) * (H - pad * 2);
          return <line key={i} x1="0" y1={y} x2={W} y2={y} stroke="rgba(255,255,255,.06)" strokeDasharray="3 4" />;
        })}
        <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 4 : 0} fill="#101216" stroke={color} strokeWidth="2" />)}
      </svg>
      <div className="mf-bigchart-labels">
        {ticks.map((t, i) => <span key={i}>{t.toFixed(1)}</span>)}
      </div>
    </div>
  );
}

/* ---- Bar chart (steps) ---------------------------------- */
function BigBarChart({ values, labels, color, maxLine }) {
  const max = Math.max(...values, maxLine || 0) * 1.05;
  return (
    <div className="mf-bigbars-wrap">
      <div className="mf-bigbars">
        {values.map((v, i) => (
          <div key={i} className="mf-bigbar-col">
            <div className="mf-bigbar" style={{ height: (v / max * 100) + '%', background: color }} />
          </div>
        ))}
      </div>
      <div className="mf-bigbars-labels">
        {labels.map((l, i) => <span key={i}>{l}</span>)}
      </div>
    </div>
  );
}

/* ---- Month calendar ------------------------------------- */
function MonthCalendar({ year, month, marked, accent }) {
  const todayISO = TODAY;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);
  return (
    <div className="mf-cal">
      <div className="mf-cal-grid">
        {cells.map((d, i) => {
          if (!d) return <span key={i} className="mf-cal-cell empty" />;
          const iso = year + '-' + dpad(month + 1) + '-' + dpad(d);
          const isToday = iso === todayISO;
          const isMarked = marked.has(iso);
          return (
            <span key={i} className={'mf-cal-cell' + (isToday ? ' today' : '') + (isMarked ? ' marked' : '')}
              style={isToday || isMarked ? { borderColor: accent, color: '#fff' } : {}}>
              {d}
              {isToday && <span className="mf-cal-dot" style={{ background: accent }} />}
            </span>
          );
        })}
      </div>
      <div className="mf-cal-dow">
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(w => <span key={w}>{w}</span>)}
      </div>
      <div className="mf-cal-monthsel">
        <span className="mf-cal-mpill">{D_MONTHS[month]}</span>
        <span className="mf-cal-mpill">{year}</span>
      </div>
    </div>
  );
}

/* ---- streak helper -------------------------------------- */
function streakFrom(dateSet) {
  let n = 0;
  const d = new Date(TODAY + 'T00:00:00');
  // allow today to be missing without breaking (start from yesterday if today missing)
  if (!dateSet.has(diso(d))) d.setDate(d.getDate() - 1);
  while (dateSet.has(diso(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

/* ============================================================
   Scale Weight / Weight Trend
   ============================================================ */
function ScaleWeightScreen({ onBack, onAddWeight, title = 'Scale Weight', color = MF.carb }) {
  const { state } = useApp();
  const vals = state.weights.map(w => weightDisplayValue(state, w.value));
  const unit = weightUnit(state);
  const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '–';
  const diff = vals.length ? (vals[vals.length - 1] - vals[0]).toFixed(1) : '0';
  const range = vals.length
    ? new Date(state.weights[0].date + 'T00:00:00').getDate() + '. ' + D_MONTHS[new Date(state.weights[0].date + 'T00:00:00').getMonth()]
      + ' – ' + new Date(state.weights[state.weights.length - 1].date + 'T00:00:00').getDate() + '. ' + D_MONTHS[new Date(state.weights[state.weights.length - 1].date + 'T00:00:00').getMonth()] + ' ' + new Date(state.weights[state.weights.length - 1].date + 'T00:00:00').getFullYear()
    : '';
  const hist = [...state.weights].reverse();
  return (
    <div className="mf-screen">
      <SubHeader title={title} onBack={onBack}
        right={<button className="mf-iconbtn" onClick={onAddWeight}><Icon name="plus" size={24} /></button>} />
      <div className="mf-scroll">
        <MetricHero average={avg} unit={unit} diff={diff} range={range} />
        <BigLineChart values={vals} color={color} emptyHint="Noch keine Gewichtsdaten" />
        <RangeTabs value="1W" />
        <div className="mf-legend-chip"><span className="mf-legend-dot" style={{ borderColor: color }} /> {title}</div>
        {hist.length > 0 && <>
          <div className="mf-h3" style={{ margin: '14px 0 8px' }}>History</div>
          <div className="mf-setcard">
            {hist.map((w, i) => (
              <div key={w.date} className={'mf-setrow' + (i === hist.length - 1 ? ' last' : '')}>
                <span className="mf-set-label mf-num">{new Date(w.date + 'T00:00:00').getDate()}. {D_MONTHS_SHORT[new Date(w.date + 'T00:00:00').getMonth()]}</span>
                <span className="mf-num" style={{ fontWeight: 600 }}>{weightDisplayText(state, w.value)} {unit}</span>
              </div>
            ))}
          </div>
        </>}
        <button className="mf-detail-log" style={{ margin: '18px 0' }} onClick={onAddWeight}>Gewicht eintragen</button>
      </div>
    </div>
  );
}

/* ============================================================
   Visual Body Fat (mostly empty state)
   ============================================================ */
function BodyFatScreen({ onBack, onAdd }) {
  return (
    <div className="mf-screen">
      <SubHeader title="Visual Body Fat" onBack={onBack}
        right={<button className="mf-iconbtn" onClick={onAdd}><Icon name="plus" size={24} /></button>} />
      <div className="mf-scroll">
        <MetricHero average="– –" unit="%" diff="– –" range={'4. Mai – ' + new Date(TODAY + 'T00:00:00').getDate() + '. ' + D_MONTHS[new Date(TODAY + 'T00:00:00').getMonth()] + ' ' + new Date(TODAY + 'T00:00:00').getFullYear()} />
        <BigLineChart values={[]} color={MF.carb} />
        <RangeTabs value="1M" />
        <div className="mf-legend-chip"><span className="mf-legend-dot" style={{ borderColor: MF.carb }} /> Visual Body Fat</div>
        <div className="mf-tut-card">
          <div className="mf-tut-title">Fortschritt tracken</div>
          <div className="mf-tut-body">Fortschrittsfotos und Körpermaße sind ein nützliches Werkzeug, um deinen Fortschritt zu verfolgen.</div>
          <div className="mf-tut-actions">
            <span className="mf-tut-dismiss">Dismiss Tutorial</span>
            <span className="mf-tut-next">Next</span>
          </div>
        </div>
        <div style={{ height: 16 }} />
      </div>
    </div>
  );
}

/* ============================================================
   Expenditure
   ============================================================ */
function ExpenditureScreen({ onBack }) {
  const vals = [2310, 2330, 2350, 2360, 2380, 2410, 2440];
  const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  return (
    <div className="mf-screen">
      <SubHeader title="Expenditure" onBack={onBack} />
      <div className="mf-scroll">
        <MetricHero average={avg} unit="kcal" range={'Letzte 7 Tage'} />
        <BigLineChart values={vals} color="#B07A50" />
        <RangeTabs value="1W" />
        <div className="mf-legend-chip"><span className="mf-legend-dot" style={{ borderColor: '#B07A50' }} /> Expenditure</div>
        <div style={{ height: 16 }} />
      </div>
    </div>
  );
}

/* ============================================================
   Steps (static — no step data source yet)
   ============================================================ */
function StepsScreen({ onBack, onAdd }) {
  const labels = ['Mi', 'Do', 'Fr', 'Sa', 'So', 'Mo', 'Di'];
  const vals = STEPS_7D;
  const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  return (
    <div className="mf-screen">
      <SubHeader title="Steps" onBack={onBack}
        right={<button className="mf-iconbtn" onClick={onAdd}><Icon name="plus" size={24} /></button>} />
      <div className="mf-scroll">
        <MetricHero average={avg} unit="steps" range={'27. Mai – ' + new Date(TODAY + 'T00:00:00').getDate() + '. ' + D_MONTHS[new Date(TODAY + 'T00:00:00').getMonth()] + ' ' + new Date(TODAY + 'T00:00:00').getFullYear()} />
        <BigBarChart values={vals} labels={labels} color="#C08268" maxLine={10000} />
        <RangeTabs value="1W" />
        <div className="mf-legend-chip"><Icon name="bar-chart-3" size={16} color="#C08268" /> Steps</div>
        <div className="mf-group-label" style={{ marginTop: 18 }}>{D_MONTHS[new Date(TODAY + 'T00:00:00').getMonth()]} {new Date(TODAY + 'T00:00:00').getFullYear()}</div>
        <div className="mf-setcard">
          <div className="mf-setrow"><span className="mf-set-ic"><Icon name="footprints" size={22} /></span><span className="mf-set-label mf-num">4037 steps</span><span className="mf-set-value">Di., 2. Juni</span></div>
          <div className="mf-setrow last"><span className="mf-set-ic"><Icon name="footprints" size={22} /></span><span className="mf-set-label mf-num">13241 steps</span><span className="mf-set-value">Mo., 1. Juni</span></div>
        </div>
        <div style={{ height: 16 }} />
      </div>
    </div>
  );
}

/* ============================================================
   Weigh-In habit
   ============================================================ */
function WeighInScreen({ onBack, onAddWeight }) {
  const { state } = useApp();
  const marked = new Set(state.weights.map(w => w.date));
  const streak = streakFrom(marked);
  const unit = weightUnit(state);
  const last = state.weights.length ? weightDisplayText(state, state.weights[state.weights.length - 1].value) : '–';
  const today = new Date(TODAY + 'T00:00:00');
  return (
    <div className="mf-screen">
      <SubHeader title="Weigh-In" onBack={onBack}
        right={<button className="mf-iconbtn" onClick={onAddWeight}><Icon name="plus" size={24} /></button>} />
      <div className="mf-scroll">
        <div className="mf-habit-hero">
          <div className="mf-habit-hero-col"><div className="mf-mh-lbl">Today</div><div className="mf-mh-val mf-num">{last}<small> {unit}</small></div></div>
          <div className="mf-habit-hero-col"><div className="mf-mh-lbl">Streak</div><div className="mf-mh-val mf-num">{streak}<small> days</small></div></div>
        </div>
        <MonthCalendar year={today.getFullYear()} month={today.getMonth()} marked={marked} accent={MF.carb} />
        <div className="mf-cal-legend">
          <span><span className="mf-legend-dot" style={{ borderColor: MF.carb }} /> Tracked</span>
          <span><span className="mf-legend-dot" /> Untracked</span>
        </div>
        <button className="mf-detail-log" style={{ margin: '8px 0 18px' }} onClick={onAddWeight}>Gewicht eintragen</button>
      </div>
    </div>
  );
}

/* ============================================================
   Food Logging habit
   ============================================================ */
function FoodLoggingScreen({ onBack }) {
  const { state } = useApp();
  const marked = new Set(Object.keys(state.days).filter(k => state.days[k].entries.length));
  const streak = streakFrom(marked);
  const todayKcal = dayTotals(state, TODAY).energy;
  const today = new Date(TODAY + 'T00:00:00');
  return (
    <div className="mf-screen">
      <SubHeader title="Food Logging" onBack={onBack} />
      <div className="mf-scroll">
        <div className="mf-habit-hero">
          <div className="mf-habit-hero-col"><div className="mf-mh-lbl">Today</div><div className="mf-mh-val mf-num">{todayKcal}<small> kcal</small></div></div>
          <div className="mf-habit-hero-col"><div className="mf-mh-lbl">Streak</div><div className="mf-mh-val mf-num">{streak}<small> days</small></div></div>
        </div>
        <MonthCalendar year={today.getFullYear()} month={today.getMonth()} marked={marked} accent={MF.energy} />
        <div className="mf-cal-legend">
          <span><span className="mf-legend-dot" style={{ borderColor: MF.energy }} /> Tracked</span>
          <span><span className="mf-legend-dot dashed" style={{ borderColor: MF.energy }} /> Fasting</span>
          <span><span className="mf-legend-dot" /> Untracked</span>
        </div>
        <div style={{ height: 18 }} />
      </div>
    </div>
  );
}

/* ============================================================
   Nutrition Data Manager (per-day kcal, grouped by month)
   ============================================================ */
function NutritionDataScreen({ onBack, onAdd }) {
  const { state } = useApp();
  const days = Object.keys(state.days)
    .filter(k => state.days[k].entries.length)
    .sort((a, b) => b.localeCompare(a));
  // group by "Month Year"
  const groups = [];
  for (const k of days) {
    const d = new Date(k + 'T00:00:00');
    const label = D_MONTHS[d.getMonth()] + ' ' + d.getFullYear();
    let g = groups.find(x => x.label === label);
    if (!g) { g = { label, items: [] }; groups.push(g); }
    g.items.push({ key: k, d, kcal: dayTotals(state, k).energy });
  }
  return (
    <div className="mf-screen">
      <SubHeader title="Nutrition Data Manager" onBack={onBack}
        right={<button className="mf-iconbtn" onClick={onAdd}><Icon name="plus" size={24} /></button>} />
      <div className="mf-scroll">
        {groups.length === 0 && <div className="mf-empty">Noch keine Einträge.</div>}
        {groups.map(g => (
          <div key={g.label}>
            <div className="mf-group-label" style={{ marginTop: 14 }}>{g.label}</div>
            <div className="mf-setcard">
              {g.items.map((it, i) => (
                <div key={it.key} className={'mf-setrow' + (i === g.items.length - 1 ? ' last' : '')}>
                  <span className="mf-ndm-mark">M</span>
                  <span className="mf-set-label mf-num">{it.kcal} kcal</span>
                  <span className="mf-set-value">{D_DOW_SHORT[it.d.getDay()]}, {it.d.getDate()}. {D_MONTHS[it.d.getMonth()]}</span>
                  <Icon name="pencil" size={15} color="var(--mf-fg-3)" />
                </div>
              ))}
            </div>
          </div>
        ))}
        <div style={{ height: 16 }} />
      </div>
    </div>
  );
}

/* ============================================================
   Customize Dashboard (sets Primary Focus)
   ============================================================ */
function CustomizeDashboardScreen({ onBack }) {
  const read = () => { try { return localStorage.getItem('mf_primary_focus') || 'weekly'; } catch (e) { return 'weekly'; } };
  const [primary, setPrimary] = React.useState(read);
  const [showInsights, setShowInsights] = React.useState(false);
  const setFocus = k => { setPrimary(k); try { localStorage.setItem('mf_primary_focus', k); } catch (e) {} };
  const Toggle = ({ on }) => <span className={'mf-switch' + (on ? ' on' : '')}><i /></span>;
  return (
    <div className="mf-screen">
      <SubHeader title="Customize Dashboard" onBack={onBack}
        right={<button className="mf-link" onClick={onBack}>Save</button>} />
      <div className="mf-scroll">
        <div className="mf-h2" style={{ margin: '6px 0 12px' }}>Primary Focus</div>
        <div className="mf-pf-row">
          <button className={'mf-pf-card' + (primary === 'weekly' ? ' on' : '')} onClick={() => setFocus('weekly')}>
            <div className="mf-pf-head"><span>Weekly Nutrition</span><Toggle on={primary === 'weekly'} /></div>
            <div className="mf-pf-prev wn">
              {[MF.energy, MF.protein, MF.fat, MF.carb].map((c, r) => (
                <div key={r} className="mf-pf-prevrow">{Array.from({ length: 7 }).map((_, i) => <span key={i} style={{ background: c }} />)}</div>
              ))}
            </div>
          </button>
          <button className={'mf-pf-card' + (primary === 'energy' ? ' on' : '')} onClick={() => setFocus('energy')}>
            <div className="mf-pf-head"><span>Energy Balance</span><Toggle on={primary === 'energy'} /></div>
            <div className="mf-pf-prev eb">
              {Array.from({ length: 22 }).map((_, i) => <span key={i} style={{ height: (30 + (i % 5) * 12) + '%' }} />)}
            </div>
          </button>
          <button className={'mf-pf-card' + (primary === 'daily' ? ' on' : '')} onClick={() => setFocus('daily')}>
            <div className="mf-pf-head"><span>Daily Nutrition</span><Toggle on={primary === 'daily'} /></div>
            <div className="mf-pf-prev daily"><span className="mf-pf-ring" /></div>
          </button>
        </div>

        <div className="mf-section-head-row" style={{ marginTop: 20 }}><span className="mf-h2">Insights &amp; Analytics</span></div>
        <div className="mf-setcard">
          <div className="mf-setrow"><span className="mf-set-ic" style={{ color: '#B07A50' }}><Icon name="trending-up" size={20} /></span><span className="mf-set-label">Expenditure</span><Icon name="menu" size={18} color="var(--mf-fg-3)" /></div>
          <div className="mf-setrow last"><span className="mf-set-ic" style={{ color: MF.purple }}><Icon name="trending-up" size={20} /></span><span className="mf-set-label">Weight Trend</span><Icon name="menu" size={18} color="var(--mf-fg-3)" /></div>
        </div>
        <button className="mf-pill" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
          onClick={() => setShowInsights(v => !v)}>
          {showInsights ? 'Hide Insight Options' : 'Add or Remove Insights'}
        </button>
        {showInsights && (
          <div className="mf-setcard" style={{ marginTop: 10 }}>
            <div className="mf-setrow"><span className="mf-set-ic"><Icon name="target" size={18} /></span><span className="mf-set-label">Goal Progress</span><Toggle on={false} /></div>
            <div className="mf-setrow last"><span className="mf-set-ic"><Icon name="footprints" size={18} /></span><span className="mf-set-label">Steps</span><Toggle on={true} /></div>
          </div>
        )}

        <div className="mf-section-head-row" style={{ marginTop: 20 }}><span className="mf-h2">Habits</span></div>
        <div className="mf-setcard">
          <div className="mf-setrow"><span className="mf-set-ic" style={{ color: MF.carb }}><Icon name="circle" size={18} /></span><span className="mf-set-label">Weigh-In</span><Icon name="menu" size={18} color="var(--mf-fg-3)" /></div>
          <div className="mf-setrow last"><span className="mf-set-ic" style={{ color: MF.energy }}><Icon name="circle" size={18} /></span><span className="mf-set-label">Food Logging</span><Icon name="menu" size={18} color="var(--mf-fg-3)" /></div>
        </div>
        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}

Object.assign(window, {
  RangeTabs, MetricHero, BigLineChart, BigBarChart, MonthCalendar,
  ScaleWeightScreen, BodyFatScreen, ExpenditureScreen, StepsScreen,
  WeighInScreen, FoodLoggingScreen, NutritionDataScreen, CustomizeDashboardScreen,
});
