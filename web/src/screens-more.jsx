/* ============================================================
   MacroFactor UI Kit — Strategy, More, Shortcuts
   ============================================================ */

const PROGRAM_MODES = [
  ['coached', 'Coached', 'Auto-adjusts check-ins'],
  ['collaborative', 'Collaborative', 'Review before applying'],
  ['manual', 'Manual', 'You own the targets'],
];
const MACRO_STYLES = [
  ['balanced', 'Balanced'],
  ['lowCarb', 'Low Carb'],
  ['keto', 'Keto'],
  ['carbFocused', 'Carb Focused'],
];
const CALORIE_PATTERNS = [
  ['sameDaily', 'Same Daily'],
  ['weekdayWeekend', 'Weekday / Weekend'],
  ['fasting', 'Fasting Days'],
];
const roundFive = v => Math.round(v / 5) * 5;
function patternEnergy(base, pattern, dayIndex) {
  if (pattern === 'sameDaily') return base;
  if (pattern === 'fasting') {
    const low = roundFive(base * 0.65);
    const high = roundFive((base * 7 - low * 2) / 5);
    return dayIndex === 1 || dayIndex === 4 ? low : high;
  }
  const weekend = roundFive(base * 1.10);
  const weekday = roundFive((base * 7 - weekend * 2) / 5);
  return dayIndex >= 5 ? weekend : weekday;
}
function styleTargets(baseTargets, style, energy) {
  const protein = Math.max(1, Math.round(baseTargets.protein));
  if (style === 'keto') {
    const carb = 30;
    const fat = Math.max(35, Math.round((energy - protein * 4 - carb * 4) / 9));
    return { energy, protein, fat, carb };
  }
  const fatPct = style === 'lowCarb' ? 0.36 : style === 'carbFocused' ? 0.20 : 0.27;
  const fat = Math.max(35, Math.round((energy * fatPct) / 9));
  const carb = Math.max(0, Math.round((energy - protein * 4 - fat * 9) / 4));
  return { energy, protein, fat, carb };
}
function programColsFor(targets, program) {
  return Array.from({ length: 7 }).map((_, i) => {
    const energy = patternEnergy(targets.energy, program.caloriePattern, i);
    return styleTargets(targets, program.macroStyle, energy);
  });
}
function goalLabel(goal) {
  if (!goal || goal.type === 'maintain') return 'Weight Maintenance Goal';
  return goal.type === 'lose' ? 'Weight Loss Goal' : 'Weight Gain Goal';
}
function goalEta(state) {
  const goal = state.goal || {};
  if (goal.type === 'maintain') return 'Maintaining';
  const current = latestWeight(state);
  const target = Number(goal.targetWeight);
  const rate = Math.abs(Number(goal.rateKgPerWeek) || 0);
  if (!current || !target || !rate) return 'Log weight for ETA';
  const weeks = Math.ceil(Math.abs(target - current) / rate);
  return weeks <= 0 ? 'At goal' : `${weeks} wk · ${addDaysISO(TODAY, weeks * 7)}`;
}

function StrategyScreen({ onSearch, onCheckIn, onNewGoal, onEditGoal, onReopenGoal }) {
  const { state, dispatch } = useApp();
  const t = state.targets;
  const settings = { ...(window.DEFAULT_PROGRAM || {}), ...(state.program || {}) };
  const setProgram = patch => dispatch({ type: 'SET_PROGRAM', program: patch });
  const mode = PROGRAM_MODES.find(([id]) => id === settings.mode) || PROGRAM_MODES[0];
  const program = {
    name: `${mode[1]} Program`,
    range: '26. Mai - Now',
    cols: programColsFor(t, settings),
  };
  const goal = state.goal || { type: 'gain', targetWeight: 75, rateKgPerWeek: 0.21 };
  const currentWeight = latestWeight(state);
  const wUnit = weightUnit(state);
  const rate = Number(goal.rateKgPerWeek) || 0;
  const ratePrefix = goal.type === 'lose' ? '-' : goal.type === 'gain' && rate > 0 ? '+' : '';
  const rateShown = rate ? weightDisplayText(state, Math.abs(rate)) : '0.0';
  const ratePct = currentWeight && rate ? Math.abs(rate / currentWeight * 100) : null;
  const days = ['M','T','W','T','F','S','S'];
  const blockH = (key, v) => {
    const scale = key === 'protein' ? 0.22 : key === 'fat' ? 0.44 : 0.105;
    return Math.min(42, Math.max(30, Math.round(v * scale)));
  };
  return (
    <div className="mf-screen mf-strategy-screen">
      <div className="mf-scroll">
        <div className="mf-strategy-head">
          <div className="mf-strategy-navtitle">Strategy</div>
          <div className="mf-strategy-top-actions">
            <button className="mf-pill mf-strategy-action primary" onClick={onCheckIn}><Icon name="calendar-check" size={15} />Check In Early</button>
            <button className="mf-pill mf-strategy-action" onClick={onNewGoal}><Icon name="plus" size={16} />New Goal</button>
            <button className="mf-pill mf-strategy-action" onClick={onEditGoal}><Icon name="pencil" size={15} />Edit Goal</button>
            <button className="mf-pill mf-strategy-action" onClick={() => setProgram(window.DEFAULT_PROGRAM || {})}><Icon name="rotate-cw" size={15} />New Program</button>
          </div>
        </div>

        {/* CHECK IN */}
        <div className="mf-checkin-wrap">
          <button className="mf-checkin" onClick={onCheckIn}>
            <span className="mf-checkin-days mf-num">2</span>
            <span className="mf-checkin-t">days</span>
            <span className="mf-checkin-s">until next</span>
          </button>
          <div className="mf-checkin-legend" aria-hidden="true">
            <span><i className="goal" />Goal</span>
            <span><i className="check" />Check-In</span>
          </div>
        </div>

        {/* In Progress */}
        <div className="mf-h2" style={{ marginBottom: 12 }}>In Progress</div>
        <div className="mf-program">
          <div className="mf-program-head">
            <div>
              <div className="mf-program-name">{program.name}</div>
              <div className="mf-program-sub">{program.range}</div>
            </div>
          </div>
          {/* 7-day stacked macro chart (blocks sized by value) */}
          <div className="mf-prog-cols">
            {program.cols.map((col, i) => (
              <div className="mf-prog-col" key={i}>
                <div className="mf-prog-kcal mf-num">{col.energy}</div>
                <div className="mf-prog-block p mf-num" style={{ height: blockH('protein', col.protein) }}>{col.protein} P</div>
                <div className="mf-prog-block f mf-num" style={{ height: blockH('fat', col.fat) }}>{col.fat} F</div>
                <div className="mf-prog-block c mf-num" style={{ height: blockH('carb', col.carb) }}>{col.carb} C</div>
                <div className="mf-prog-day">{days[i]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Goal card */}
        <div className="mf-goal-card">
          <div className="mf-goal-title">{goalLabel(goal)}</div>
          <div className="mf-goal-range">ETA {goalEta(state)}</div>
          <div className="mf-goal-stats">
            <div className="mf-goal-stat">
              <span className="mf-num mf-goal-val">{weightDisplayText(state, goal.targetWeight || 0)}<small> {wUnit}</small></span>
              <span className="mf-goal-lbl">Goal Weight</span>
            </div>
            <div className="mf-goal-stat">
              <span className="mf-num mf-goal-val">{ratePrefix}{rateShown}<small> {wUnit}</small></span>
              <span className="mf-goal-lbl">Goal Rate</span>
            </div>
            <div className="mf-goal-stat">
              <span className="mf-num mf-goal-val">{ratePct == null ? '–' : (ratePct > 0 ? '+' : '') + ratePct.toFixed(1)}<small> %</small></span>
              <span className="mf-goal-lbl">Goal Rate</span>
            </div>
          </div>
          <div className="mf-strategy-pills" style={{ marginTop: 14, borderTop: '1px solid var(--mf-hairline)', paddingTop: 14, marginBottom: 0 }}>
            <button className="mf-pill" onClick={onNewGoal}><Icon name="plus" size={15} />New Goal</button>
            <button className="mf-pill" onClick={onEditGoal}><Icon name="pencil" size={14} />Edit Goal</button>
            <button className="mf-pill" onClick={onReopenGoal}><Icon name="undo-2" size={14} />Reopen Prev</button>
          </div>
        </div>

        {/* Goal History */}
        <div className="mf-h2" style={{ margin: '20px 0 12px' }}>Goal History</div>
        <div className="mf-goal-history">
          <div className="mf-ghrow">
            <div>
              <div className="mf-gh-range">12. Mai 2026 – Now</div>
              <div className="mf-num mf-gh-val">{weightDisplayText(state, 70)} {wUnit}</div>
            </div>
            <div className="mf-gh-tag">
              <span>Gain</span>
              <Icon name="hourglass" size={16} color="var(--mf-fg-2)" />
            </div>
          </div>
          <div className="mf-ghrow">
            <div>
              <div className="mf-gh-range">6. Jan. 2026 – 12. Mai 2026</div>
              <div className="mf-num mf-gh-val">{weightDisplayText(state, 66)} {wUnit} <span style={{ color: 'var(--mf-fg-2)' }}>to</span> {weightDisplayText(state, 70)} {wUnit}</div>
            </div>
            <div className="mf-gh-tag">
              <span>Gain</span>
              <Icon name="circle-check" size={16} color="var(--mf-fg-2)" />
            </div>
          </div>
        </div>
        <div style={{ height: 16 }} />
      </div>
      <div className="mf-bottomdock"><SearchBar onTap={onSearch} /></div>
    </div>
  );
}

/* ---- More / Settings ------------------------------------ */
function SettingRow({ icon, label, value, last, onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className={'mf-setrow' + (last ? ' last' : '') + (!onClick ? ' static' : '')} onClick={onClick}>
      <span className="mf-set-ic"><Icon name={icon} size={24} /></span>
      <span className="mf-set-label">{label}</span>
      {value && <span className="mf-set-value">{value}</span>}
      {onClick && <Icon name="chevron-right" size={20} color="var(--mf-fg-3)" />}
    </Tag>
  );
}

function MoreScreen({ onGo }) {
  const { state } = useApp();
  const unitMode = weightUnit(state) === 'lb' ? 'imperial' : 'metric';
  return (
    <div className="mf-screen">
      <div className="mf-scroll">
        <ScreenTitle title="More" />
        <button className="mf-profile" onClick={() => onGo('account')}>
          <div className="mf-avatar">{state.profile.initials}</div>
          <div className="mf-profile-who">
            <div className="mf-profile-name">{state.profile.name}</div>
            <div className="mf-profile-sub">Member Since {state.profile.memberSince}</div>
          </div>
          <Icon name="chevron-right" size={22} color="var(--mf-fg-3)" />
        </button>
        <div className="mf-group-label">General</div>
        <div className="mf-setcard">
          <SettingRow icon="smile" label="Account" onClick={() => onGo('account')} />
          <SettingRow icon="tag" label="Subscription" value="Pro" onClick={() => onGo('subscription')} />
          <SettingRow icon="refresh-cw" label="Integrations" onClick={() => onGo('integrations')} />
          <SettingRow icon="ruler" label="Units" value={unitMode} last onClick={() => onGo('units')} />
        </div>
        <div className="mf-group-label">Feature Settings</div>
        <div className="mf-setcard">
          <SettingRow icon="layout-dashboard" label="Dashboard" onClick={() => onGo('customize')} />
          <SettingRow icon="apple" label="Food Log" onClick={() => onGo('foodlogging')} last />
        </div>
        <div className="mf-group-label">Tools</div>
        <div className="mf-setcard">
          <SettingRow icon="chef-hat" label="Recipes" onClick={() => onGo('recipes')} />
          <SettingRow icon="ruler" label="Metrics & Weight" onClick={() => onGo('metrics')} last />
        </div>
        <button className="mf-reset" onClick={() => window.mfSignOut && window.mfSignOut()}>Abmelden</button>
        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}

/* ---- Shortcuts sheet ------------------------------------ */
function ShortcutsSheet({ open, onClose, onAction }) {
  const quick = [
    { icon: 'search', label: 'Search', act: 'add' },
    { icon: 'scan-barcode', label: 'Barcode', act: 'barcode' },
    { icon: 'sparkles', label: 'AI', act: 'ai' },
    { icon: 'scale', label: 'Weight', act: 'weight' },
  ];
  const list = [
    { icon: 'chef-hat', label: 'Recipes', act: 'recipes' },
    { icon: 'rocket', label: 'Quick Add', act: 'quickadd' },
    { icon: 'file-text', label: 'Label Scanner', act: 'labelscan' },
    { icon: 'camera', label: 'Photos', act: 'ai' },
    { icon: 'ruler', label: 'Metrics', act: 'metrics' },
  ];
  return (
    <Sheet open={open} onClose={onClose} title="Shortcuts"
      headerRight={<Icon name="sliders-horizontal" size={22} />}>
      <div className="mf-shortcut-quick">
        {quick.map(q => (
          <button className="mf-shortcut" key={q.label} onClick={() => onAction(q.act)}>
            <span className="mf-shortcut-btn"><Icon name={q.icon} size={26} /></span>
            <span className="mf-shortcut-lbl">{q.label}</span>
          </button>
        ))}
      </div>
      <div className="mf-shortcut-list">
        {list.map((l, i) => (
          <button className={'mf-shortcut-row' + (i === list.length - 1 ? ' last' : '')} key={l.label}
            onClick={() => onAction(l.act)}>
            <span className="mf-shortcut-rowic"><Icon name={l.icon} size={24} /></span>
            <span className="mf-shortcut-rowlbl">{l.label}</span>
            <Icon name="chevron-right" size={20} color="var(--mf-fg-3)" />
          </button>
        ))}
      </div>
    </Sheet>
  );
}

Object.assign(window, { StrategyScreen, MoreScreen, ShortcutsSheet, SettingRow });
