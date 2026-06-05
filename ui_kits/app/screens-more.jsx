/* ============================================================
   MacroFactor UI Kit — Strategy, More, Shortcuts
   ============================================================ */

function StrategyScreen({ onSearch, onCheckIn, onNewGoal }) {
  const { state } = useApp();
  const program = {
    name: 'Coached Program',
    range: '26. Mai – Now',
    cols: [
      { energy: 2505, protein: 168, fat: 82, carb: 271 },
      { energy: 2505, protein: 168, fat: 82, carb: 271 },
      { energy: 2505, protein: 168, fat: 82, carb: 271 },
      { energy: 2505, protein: 168, fat: 82, carb: 271 },
      { energy: 2505, protein: 168, fat: 82, carb: 271 },
      { energy: 2756, protein: 168, fat: 93, carb: 308 },
      { energy: 2756, protein: 168, fat: 93, carb: 308 },
    ],
  };
  const days = ['M','T','W','T','F','S','S'];
  const macroRows = [
    { key: 'energy', color: MF.energy, fmt: c => String(c.energy) },
    { key: 'protein', color: MF.protein, fmt: c => c.protein + ' P' },
    { key: 'fat', color: MF.fat, fmt: c => c.fat + ' F' },
    { key: 'carb', color: MF.carb, fmt: c => c.carb + ' C' },
  ];
  return (
    <div className="mf-screen">
      {/* Small centered nav title */}
      <div className="mf-strategy-navtitle">Strategy</div>
      <div className="mf-scroll">
        {/* CHECK IN */}
        <div className="mf-checkin-wrap">
          <button className="mf-checkin" onClick={onCheckIn}>
            <span className="mf-checkin-t">Check In</span>
            <span className="mf-checkin-s">it's time</span>
          </button>
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
          {/* 4 × 7 macro grid */}
          <div className="mf-prog-grid">
            {macroRows.map(row => (
              <div className="mf-prog-row" key={row.key}>
                {program.cols.map((col, i) => (
                  <div key={i} className="mf-prog-cell" style={{ background: row.color + (i < 5 ? '22' : '33'), color: row.color }}>
                    {row.fmt(col)}
                  </div>
                ))}
              </div>
            ))}
            <div className="mf-prog-days">
              {days.map((d, i) => <span key={i}>{d}</span>)}
            </div>
          </div>
          <div className="mf-strategy-pills" style={{ marginTop: 14, marginBottom: 0 }}>
            <button className="mf-pill"><Icon name="rotate-cw" size={15} />New Program</button>
            <button className="mf-pill"><Icon name="pencil" size={14} />Edit Program</button>
          </div>
        </div>

        {/* Goal card */}
        <div className="mf-goal-card">
          <div className="mf-goal-title">Weight Gain Goal</div>
          <div className="mf-goal-range">12. Mai – Now</div>
          <div className="mf-goal-stats">
            <div className="mf-goal-stat">
              <span className="mf-num mf-goal-val">75.0<small> kg</small></span>
              <span className="mf-goal-lbl">Goal Weight</span>
            </div>
            <div className="mf-goal-stat">
              <span className="mf-num mf-goal-val">+0.21<small> kg</small></span>
              <span className="mf-goal-lbl">Goal Rate</span>
            </div>
            <div className="mf-goal-stat">
              <span className="mf-num mf-goal-val">+0.3<small> %</small></span>
              <span className="mf-goal-lbl">Goal Rate</span>
            </div>
          </div>
          <div className="mf-strategy-pills" style={{ marginTop: 14, borderTop: '1px solid var(--mf-hairline)', paddingTop: 14, marginBottom: 0 }}>
            <button className="mf-pill" onClick={onNewGoal}><Icon name="plus" size={15} />New Goal</button>
            <button className="mf-pill"><Icon name="pencil" size={14} />Edit Goal</button>
            <button className="mf-pill"><Icon name="undo-2" size={14} />Reopen Prev</button>
          </div>
        </div>

        {/* Goal History */}
        <div className="mf-h2" style={{ margin: '20px 0 12px' }}>Goal History</div>
        <div className="mf-goal-history">
          <div className="mf-ghrow">
            <div>
              <div className="mf-gh-range">12. Mai 2026 – Now</div>
              <div className="mf-num mf-gh-val">70.0 kg</div>
            </div>
            <div className="mf-gh-tag">
              <span>Gain</span>
              <Icon name="hourglass" size={16} color="var(--mf-fg-2)" />
            </div>
          </div>
          <div className="mf-ghrow">
            <div>
              <div className="mf-gh-range">6. Jan. 2026 – 12. Mai 2026</div>
              <div className="mf-num mf-gh-val">66.0 kg <span style={{ color: 'var(--mf-fg-2)' }}>to</span> 70.0 kg</div>
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
  return (
    <button className={'mf-setrow' + (last ? ' last' : '')} onClick={onClick}>
      <span className="mf-set-ic"><Icon name={icon} size={24} /></span>
      <span className="mf-set-label">{label}</span>
      {value && <span className="mf-set-value">{value}</span>}
      <Icon name="chevron-right" size={20} color="var(--mf-fg-3)" />
    </button>
  );
}

function MoreScreen({ onGo }) {
  const { state } = useApp();
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
          <SettingRow icon="ruler" label="Units" value="metric" last onClick={() => onGo('units')} />
        </div>
        <div className="mf-group-label">Feature Settings</div>
        <div className="mf-setcard">
          <SettingRow icon="layout-dashboard" label="Dashboard" onClick={() => onGo('insights')} />
          <SettingRow icon="apple" label="Food Log" onClick={() => onGo('metrics')} last />
        </div>
        <div className="mf-group-label">Tools</div>
        <div className="mf-setcard">
          <SettingRow icon="chef-hat" label="Recipes" onClick={() => onGo('recipes')} />
          <SettingRow icon="ruler-dimension-line" label="Metrics & Weight" onClick={() => onGo('metrics')} last />
        </div>
        <button className="mf-reset" onClick={() => onGo('reset')}>Demo zurücksetzen</button>
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
    { icon: 'camera', label: 'Photos', act: 'ai' },
    { icon: 'ruler-dimension-line', label: 'Metrics', act: 'metrics' },
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
