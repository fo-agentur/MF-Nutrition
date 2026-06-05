/* ============================================================
   MacroFactor UI Kit — Dashboard & Food Log (v3 — visual fix)
   Chart: 7 columns × 4 bars. Food Log: time-pill + macro badges.
   ============================================================ */

const WEEK_KEYS = ['2026-06-01','2026-06-02','2026-06-03','2026-06-04','2026-06-05','2026-06-06','2026-06-07'];
const WEEK_LBL  = ['M','T','W','T','F','S','S'];
const DOW = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];

function fmtEyebrow(key) {
  const d = new Date(key + 'T00:00:00');
  return (DOW[d.getDay()] + ', ' + d.getDate() + '. Juni').toUpperCase();
}

/* ---- Weekly nutrition chart: 7 columns × 4 bars --------- */
function WeeklyChart({ mode, selected, onSelect }) {
  const { state } = useApp();
  return (
    <div className="mf-chart-wrap">
      <div className="mf-chart-cols">
        {WEEK_KEYS.map((k, i) => {
          const isSel = k === selected;
          return (
            <button key={k} className={'mf-chart-col' + (isSel ? ' sel' : '')}
              onClick={() => onSelect(k)}>
              {MACRO_META.map(m => {
                const goal = state.targets[m.key];
                const tot = dayTotals(state, k)[m.key];
                const shown = mode === 'Remaining' ? Math.max(0, goal - tot) : tot;
                const pct = Math.min(100, goal ? (shown / goal) * 100 : 0);
                return (
                  <div className="mf-chart-bar" key={m.key}>
                    {pct > 0
                      ? <div className="mf-chart-fill" style={{ height: pct + '%', background: m.color }} />
                      : <span className="mf-chart-dash" />
                    }
                  </div>
                );
              })}
            </button>
          );
        })}
      </div>
      <div className="mf-chart-meta">
        {MACRO_META.map(m => {
          const tot = dayTotals(state, selected)[m.key];
          const shown = mode === 'Remaining' ? Math.max(0, state.targets[m.key] - tot) : tot;
          return (
            <div className="mf-chart-meta-row" key={m.key}>
              <span className="mf-num mf-chart-meta-val" style={{ color: m.color }}>
                {shown}{m.key === 'energy' ? ' 🔥' : ' ' + m.unit}
              </span>
              <span className="mf-chart-meta-goal">of {state.targets[m.key]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeeklyDayLabels({ selected }) {
  return (
    <div className="mf-chart-days">
      <div className="mf-chart-days-inner">
        {WEEK_LBL.map((d, i) => (
          <span key={i} className={WEEK_KEYS[i] === selected ? 'on' : ''}>{d}</span>
        ))}
      </div>
      <div style={{ width: 86 }} />
    </div>
  );
}

function MiniInsight({ title, onClick, children }) {
  return (
    <button className="mf-insight" onClick={onClick}>
      <div className="mf-insight-title mf-h3">{title}</div>
      <div className="mf-insight-sub">Last 7 Days</div>
      <div className="mf-insight-chart">{children}</div>
    </button>
  );
}

function ExpenditureChart() {
  return (
    <svg viewBox="0 0 200 56" width="100%" height="56" preserveAspectRatio="none">
      <rect x="6" y="22" width="188" height="13" rx="5" fill="rgba(224,122,78,0.22)" />
      <line x1="8" y1="28.5" x2="192" y2="28.5" stroke="#E07A4E" strokeWidth="2" />
      {[8, 38, 68, 98, 128, 158, 190].map((x, i) => (
        <rect key={i} x={x - 3.5} y={25} width="7" height="7" rx="1.5" fill="#252528" stroke="#E07A4E" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

function WeightSpark({ weights }) {
  const vals = weights.slice(-7).map(w => w.value);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = (max - min) || 1;
  const pts = vals.map((v, i) => [
    10 + i * (180 / (vals.length - 1)),
    10 + (1 - (v - min) / span) * 36,
  ]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  return (
    <svg viewBox="0 0 200 56" width="100%" height="56" preserveAspectRatio="none">
      <path d={d} fill="none" stroke={MF.purple} strokeWidth="2" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#252528" stroke={MF.purple} strokeWidth="1.5" />
      ))}
    </svg>
  );
}

function DashboardScreen({ onSearch, onGo }) {
  const { state, dispatch } = useApp();
  const [mode, setMode] = React.useState('Consumed');
  const sel = state.selectedDate;
  return (
    <div className="mf-screen">
      <div className="mf-scroll">
        <div className="mf-screentitle">
          <div className="mf-eyebrow">{fmtEyebrow(sel)}</div>
          <h1 className="mf-title">Dashboard</h1>
        </div>
        <div className="mf-h2" style={{ margin: '14px 0 10px' }}>Weekly Nutrition</div>
        <WeeklyChart mode={mode} selected={sel} onSelect={k => dispatch({ type: 'SET_DATE', date: k })} />
        <WeeklyDayLabels selected={sel} />
        <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0 6px' }}>
          <Segmented options={['Consumed', 'Remaining']} value={mode} onChange={setMode} />
        </div>
        <div className="mf-dots"><i className="on" /><i /><i /></div>

        <SectionHead title="Insights & Analytics" action="See All" onAction={() => onGo('insights')} />
        <div className="mf-insight-row">
          <MiniInsight title="Expenditure" onClick={() => onGo('insights')}><ExpenditureChart /></MiniInsight>
          <MiniInsight title="Weight Trend" onClick={() => onGo('metrics')}><WeightSpark weights={state.weights} /></MiniInsight>
        </div>
        <div style={{ height: 14 }} />
      </div>
      <div className="mf-bottomdock"><SearchBar onTap={onSearch} /></div>
    </div>
  );
}

/* ---- Food Log ------------------------------------------- */
function DateStrip({ selected, onSelect }) {
  return (
    <div className="mf-datestrip">
      {WEEK_KEYS.map((k, i) => {
        const isToday = k === TODAY;
        const isSel = k === selected;
        return (
          <button key={k}
            className={'mf-dateoval' + (isSel ? ' sel' : '') + (isToday ? ' today' : '')}
            onClick={() => onSelect(k)}>
            <span className="d">{WEEK_LBL[i]}</span>
            <span className="n mf-num">{new Date(k + 'T00:00:00').getDate()}</span>
            {isToday && <span className="mf-datedot" />}
          </button>
        );
      })}
    </div>
  );
}

function MacroBadge({ letter, value, color }) {
  if (letter === '🔥') return <span className="mf-mbadge-energy mf-num" style={{ color }}>{value}<span style={{ marginLeft: 2 }}>🔥</span></span>;
  return (
    <span className="mf-mbadge mf-num">
      <span>{value}</span>
      <span className="mf-mbadge-letter" style={{ background: color + '28', color }}>{letter}</span>
    </span>
  );
}

function HourRow({ hour, entries, onAdd, onEditEntry }) {
  const label = h => h < 12 ? h + ' AM' : h === 12 ? '12 PM' : (h - 12) + ' PM';
  const isNow = hour === 11; // fake "current" hour
  const hourTots = entries.reduce((t, e) => ({
    energy: t.energy + e.energy, protein: t.protein + e.protein,
    fat: t.fat + e.fat, carb: t.carb + e.carb,
  }), { energy: 0, protein: 0, fat: 0, carb: 0 });
  const hasMacros = entries.length > 0;

  return (
    <div className="mf-tl-row">
      <div className="mf-tl-left">
        <span className={'mf-tl-pill' + (isNow ? ' now' : '')}>
          {label(hour)}{isNow ? <span className="mf-tl-nowdot">•</span> : null}
        </span>
        <button className="mf-tl-add" onClick={() => onAdd(hour)}>
          <Icon name="plus" size={18} />
        </button>
        {hasMacros && (
          <div className="mf-tl-macros">
            <MacroBadge letter="🔥" value={hourTots.energy} color={MF.energy} />
            <MacroBadge letter="P" value={hourTots.protein} color={MF.protein} />
            <MacroBadge letter="F" value={hourTots.fat} color={MF.fat} />
            <MacroBadge letter="C" value={hourTots.carb} color={MF.carb} />
          </div>
        )}
      </div>
      {entries.map(e => (
        <div key={e.id} className="mf-tl-entry">
          <span className="mf-tl-stamp mf-num">{e.time}</span>
          <button className="mf-foodentry" onClick={() => onEditEntry(e)}>
            <span className="mf-foodicon"><Icon name={e.icon} size={28} color={e.color} /></span>
            <div className="mf-foodmid">
              <div className="mf-foodname">{e.name}</div>
              <div className="mf-foodmacros mf-num">
                <b>{e.energy}</b>🔥 <b>{e.protein}</b>P <b>{e.fat}</b>F <b>{e.carb}</b>C
                <span className="dot"> • </span>{e.qty} {e.unit}
              </div>
            </div>
            <span className="mf-foodedit"><Icon name="pencil" size={16} /></span>
          </button>
        </div>
      ))}
    </div>
  );
}

function FoodLogScreen({ onSearch, onAddAt, onEditEntry }) {
  const { state, dispatch } = useApp();
  const sel = state.selectedDate;
  const entries = (state.days[sel] || { entries: [] }).entries;
  const totals = dayTotals(state, sel);
  const hours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 18, 20];
  const entryHour = e => parseInt(e.time.split(':')[0], 10);
  const idx = WEEK_KEYS.indexOf(sel);
  const shiftDay = d => { const n = idx + d; if (n >= 0 && n < WEEK_KEYS.length) dispatch({ type: 'SET_DATE', date: WEEK_KEYS[n] }); };

  return (
    <div className="mf-screen">
      {/* Top nav */}
      <div className="mf-foodlog-head">
        <button className="mf-iconbtn"><Icon name="menu" size={24} /></button>
        <div className="mf-todaynav">
          <button className="mf-iconbtn" onClick={() => shiftDay(-1)}><Icon name="chevron-left" size={20} color="var(--mf-fg-2)" /></button>
          <span className="mf-h3" style={{ fontWeight: 700, fontSize: 20 }}>{sel === TODAY ? 'Today' : new Date(sel + 'T00:00:00').getDate() + '. Juni'}</span>
          <button className="mf-iconbtn" onClick={() => shiftDay(1)}><Icon name="chevron-right" size={20} color="var(--mf-fg-2)" /></button>
        </div>
        <span style={{ width: 24 }} />
      </div>

      {/* Date strip */}
      <DateStrip selected={sel} onSelect={k => dispatch({ type: 'SET_DATE', date: k })} />

      {/* Compact macro strip */}
      <div className="mf-macrostrip">
        {MACRO_META.map(m => {
          const v = totals[m.key], g = state.targets[m.key];
          const pct = Math.min(100, g ? v / g * 100 : 0);
          return (
            <div className="mf-macrostrip-item" key={m.key}>
              <div className="mf-macrostrip-top mf-num">
                <span style={{ color: m.color, fontWeight: 700 }}>{m.key === 'energy' ? '🔥 ' : m.unit + ' '}{v}</span>
                <span style={{ color: 'var(--mf-fg-3)', fontSize: 11 }}> / {g}</span>
              </div>
              <div className="mf-track" style={{ height: 3, marginTop: 4 }}>
                <span style={{ width: pct + '%', background: m.color }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mf-dots" style={{ margin: '4px 0' }}><i className="on" /><i /></div>

      {/* Timeline */}
      <div className="mf-scroll mf-timeline">
        <div className="mf-tl-line" />
        {hours.map(h => (
          <HourRow
            key={h} hour={h}
            entries={entries.filter(e => entryHour(e) === h)}
            onAdd={onAddAt}
            onEditEntry={onEditEntry}
          />
        ))}
        <div style={{ height: 10 }} />
      </div>
      <div className="mf-bottomdock"><SearchBar onTap={onSearch} /></div>
    </div>
  );
}

Object.assign(window, { DashboardScreen, FoodLogScreen, WEEK_KEYS, WEEK_LBL, fmtEyebrow });
