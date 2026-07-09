/* ============================================================
   MacroFactor PWA — Dashboard & Food Log
   Chart: 7 columns × 4 bars. Food Log: time-pill + macro badges.
   (Dates made dynamic: current Mon–Sun week, real "today".)
   ============================================================ */

const DOW = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
const MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const _pad = n => String(n).padStart(2, '0');
const _iso = d => d.getFullYear() + '-' + _pad(d.getMonth() + 1) + '-' + _pad(d.getDate());

function currentWeekKeys(today = new Date()) {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dow = (d.getDay() + 6) % 7; // 0 = Mon … 6 = Sun
  const mon = new Date(d); mon.setDate(d.getDate() - dow);
  const keys = [];
  for (let i = 0; i < 7; i++) { const x = new Date(mon); x.setDate(mon.getDate() + i); keys.push(_iso(x)); }
  return keys;
}

const WEEK_KEYS = currentWeekKeys();
const WEEK_LBL  = ['M','D','M','D','F','S','S'];

function fmtEyebrow(key) {
  const d = new Date(key + 'T00:00:00');
  return (DOW[d.getDay()] + ', ' + d.getDate() + '. ' + MONTHS[d.getMonth()]).toUpperCase();
}
function fmtDayMonth(key) {
  const d = new Date(key + 'T00:00:00');
  return d.getDate() + '. ' + MONTHS[d.getMonth()];
}

/* ---- Weekly nutrition chart: 7 columns × 4 bars --------- */
function WeeklyChart({ mode, selected, onSelect }) {
  const { state } = useApp();
  return (
    <div className="mf-chart-wrap">
      <div className="mf-chart-cols">
        {WEEK_KEYS.map((k, i) => {
          const isSel = k === selected;
          const dayGoals = targetsForDate(state, k);
          return (
            <button key={k} className={'mf-chart-col' + (isSel ? ' sel' : '')}
              style={{ '--mf-weekly-index': i }}
              onClick={() => onSelect(k)}>
              {MACRO_META.map(m => {
                const goal = dayGoals[m.key];
                const tot = dayTotals(state, k)[m.key];
                const shown = mode === 'Übrig' ? Math.max(0, goal - tot) : tot;
                const scaleMax = Math.max(goal || 0, shown || 0) * 1.12;
                const pct = Math.min(96, scaleMax ? (shown / scaleMax) * 100 : 0);
                const goalPct = Math.min(94, scaleMax && mode === 'Gegessen' ? (goal / scaleMax) * 100 : 0);
                return (
                  <div className={'mf-chart-bar' + (pct > 0 ? '' : ' empty')} key={m.key}>
                    {pct > 0 && <div className="mf-chart-fill" style={{ height: pct + '%', background: m.color }} />}
                    {pct <= 0 && goalPct <= 0 && <span className="mf-chart-dash" />}
                    {goalPct > 0 && <span className="mf-chart-goalmark" style={{ bottom: goalPct + '%' }} />}
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
          const goal = targetsForDate(state, selected)[m.key];
          const shown = mode === 'Übrig' ? Math.max(0, goal - tot) : tot;
          return (
            <div className="mf-chart-meta-row" key={m.key}>
              <span className="mf-num mf-chart-meta-val" style={{ color: m.color }}>
                {shown}<span className="mf-chart-meta-unit">{m.key === 'energy' ? '🔥' : m.unit}</span>
              </span>
              <span className="mf-chart-meta-goal">von {goal}</span>
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
      {/* spacer mirrors the meta column so the 7 letters line up under the 7 bars */}
      <div className="mf-chart-days-meta" />
    </div>
  );
}

function MiniInsight({ title, onClick, children }) {
  return (
    <button className="mf-insight" onClick={onClick}>
      <div className="mf-insight-title mf-h3">{title}</div>
      <div className="mf-insight-sub">Letzte 7 Tage</div>
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
  const vals = (weights || []).slice(-7).map(w => w.value);
  if (!vals.length) return null;
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = (max - min) || 1;
  const pts = vals.map((v, i) => [
    10 + i * (180 / Math.max(1, vals.length - 1)),
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
  const [mode, setMode] = React.useState('Gegessen');
  const sel = state.selectedDate;
  return (
    <div className="mf-screen">
      <div className="mf-scroll">
        <div className="mf-screentitle">
          <div className="mf-eyebrow">{fmtEyebrow(sel)}</div>
          <h1 className="mf-title">Dashboard</h1>
        </div>
        <div className="mf-h2" style={{ margin: '14px 0 10px' }}>Wochenübersicht</div>
        <div key={mode} className="mf-weekly-mode-panel">
          <WeeklyChart mode={mode} selected={sel} onSelect={k => dispatch({ type: 'SET_DATE', date: k })} />
          <WeeklyDayLabels selected={sel} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0 6px' }}>
          <Segmented options={['Gegessen', 'Übrig']} value={mode} onChange={setMode} />
        </div>
        <div className="mf-dots"><i className="on" /><i /><i /></div>

        <SectionHead title="Insights & Analytics" action="Alle" onAction={() => onGo('insights')} />
        <div className="mf-insight-row">
          <MiniInsight title="Verbrauch" onClick={() => onGo('insights')}><ExpenditureChart /></MiniInsight>
          <MiniInsight title="Gewichtstrend" onClick={() => onGo('metrics')}><WeightSpark weights={state.weights} /></MiniInsight>
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

function HourRow({ hour, entries, onAdd, onEditEntry, onCopyHour, isNow }) {
  const label = h => h === 0 ? '12 AM' : h < 12 ? h + ' AM' : h === 12 ? '12 PM' : (h - 12) + ' PM';
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
            <button className="mf-tl-copy" onClick={() => onCopyHour && onCopyHour(entries)} aria-label="Meal kopieren">
              <Icon name="copy" size={14} />
            </button>
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

function FoodLogScreen({ onSearch, onAI, onAddAt, onEditEntry, onMenu, onCopyHour }) {
  const { state, dispatch } = useApp();
  const sel = state.selectedDate;
  const entries = (state.days[sel] || { entries: [] }).entries;
  const totals = dayTotals(state, sel);
  const dayTargets = targetsForDate(state, sel);
  const entryHour = e => parseInt(e.time.split(':')[0], 10);
  const isViewingToday = sel === TODAY;
  const nowHour = new Date().getHours();
  const base = [6, 7, 8, 9, 10, 11, 12, 13, 14, 18, 20];
  const hours = [...new Set([...base, ...entries.map(entryHour), ...(isViewingToday ? [nowHour] : [])])]
    .sort((a, b) => a - b);
  const idx = WEEK_KEYS.indexOf(sel);
  const shiftDay = d => { const n = idx + d; if (n >= 0 && n < WEEK_KEYS.length) dispatch({ type: 'SET_DATE', date: WEEK_KEYS[n] }); };

  return (
    <div className="mf-screen">
      {/* Top nav */}
      <div className="mf-foodlog-head">
        <button className="mf-iconbtn" onClick={onMenu}><Icon name="menu" size={24} /></button>
        <div className="mf-todaynav">
          <button className="mf-iconbtn" onClick={() => shiftDay(-1)}><Icon name="chevron-left" size={20} color="var(--mf-fg-2)" /></button>
          <span className="mf-h3" style={{ fontWeight: 700, fontSize: 20 }}>{sel === TODAY ? 'Heute' : fmtDayMonth(sel)}</span>
          <button className="mf-iconbtn" onClick={() => shiftDay(1)}><Icon name="chevron-right" size={20} color="var(--mf-fg-2)" /></button>
        </div>
        <span style={{ width: 24 }} />
      </div>

      {/* Date strip */}
      <DateStrip selected={sel} onSelect={k => dispatch({ type: 'SET_DATE', date: k })} />

      {/* Compact macro strip (goals follow the Strategy program per day) */}
      <div className="mf-macrostrip">
        {MACRO_META.map(m => {
          const v = totals[m.key], g = dayTargets[m.key];
          const pct = Math.min(100, g ? v / g * 100 : 0);
          return (
            <div className="mf-macrostrip-item" key={m.key}>
              <div className="mf-macrostrip-top mf-num">
                <span style={{ color: m.color, fontWeight: 700 }}>{(m.key === 'energy' ? '🔥' : m.unit) + ' ' + v}</span>
                <span style={{ color: 'var(--mf-fg-3)', fontSize: 11 }}>/{g}</span>
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
            onCopyHour={onCopyHour}
            isNow={isViewingToday && h === nowHour}
          />
        ))}
        <div style={{ height: 10 }} />
      </div>
      <div className="mf-bottomdock"><SearchBar onTap={onSearch} onAI={onAI} /></div>
    </div>
  );
}

Object.assign(window, {
  DashboardScreen, FoodLogScreen, WEEK_KEYS, WEEK_LBL, fmtEyebrow, fmtDayMonth,
  WeeklyChart, WeeklyDayLabels, MiniInsight, ExpenditureChart, WeightSpark,
  DateStrip, MacroBadge, HourRow,
});
