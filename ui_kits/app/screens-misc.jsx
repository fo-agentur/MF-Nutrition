/* ============================================================
   MacroFactor UI Kit — Insights, Metrics/Weight, Recipes,
   Settings subpages, Onboarding, Check-In
   ============================================================ */

/* ---- Reusable line chart -------------------------------- */
function LineChart({ values, color, height = 150, fill }) {
  if (!values.length) return null;
  const min = Math.min(...values), max = Math.max(...values);
  const span = (max - min) || 1;
  const W = 300, pad = 16;
  const pts = values.map((v, i) => [
    pad + (i / (values.length - 1)) * (W - pad * 2),
    pad + (1 - (v - min) / span) * (height - pad * 2),
  ]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = d + ` L${pts[pts.length-1][0].toFixed(1)} ${height-pad} L${pts[0][0].toFixed(1)} ${height-pad} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height}>
      {fill && <path d={area} fill={color} opacity="0.12" />}
      <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill="#1E1E20" stroke={color} strokeWidth="2" />)}
    </svg>
  );
}

/* ---- Insights & Analytics (subpage) --------------------- */
function InsightsScreen({ onBack }) {
  const { state } = useApp();
  const weights = state.weights.map(w => w.value);
  const expenditure = [2740, 2710, 2760, 2730, 2780, 2756, 2756];
  return (
    <div className="mf-screen">
      <SubHeader title="Insights & Analytics" onBack={onBack} />
      <div className="mf-scroll">
        <div className="mf-card-lg">
          <div className="mf-h3">Expenditure</div>
          <div className="mf-insight-sub">Last 7 Days · Ø {Math.round(expenditure.reduce((a,b)=>a+b,0)/7)} 🔥</div>
          <LineChart values={expenditure} color="#E07A4E" fill />
        </div>
        <div className="mf-card-lg">
          <div className="mf-h3">Weight Trend</div>
          <div className="mf-insight-sub">Last 7 Days · {weights[weights.length-1]} kg</div>
          <LineChart values={weights} color={MF.purple} fill />
        </div>
        <div className="mf-card-lg">
          <div className="mf-h3" style={{ marginBottom: 14 }}>Macro Adherence</div>
          {MACRO_META.map(m => {
            const tot = dayTotals(state, state.selectedDate)[m.key];
            const goal = state.targets[m.key];
            const pct = Math.min(100, Math.round(tot / goal * 100));
            return (
              <div key={m.key} className="mf-adh">
                <span className="mf-adh-lbl">{m.key}</span>
                <div className="mf-track" style={{ flex: 1 }}><span style={{ width: pct + '%', background: m.color }} /></div>
                <span className="mf-adh-pct mf-num">{pct}%</span>
              </div>
            );
          })}
        </div>
        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}

/* ---- Metrics / Weight (subpage) ------------------------- */
function MetricsScreen({ onBack, onAddWeight }) {
  const { state } = useApp();
  const weights = [...state.weights].reverse();
  const vals = state.weights.map(w => w.value);
  const delta = (vals[vals.length-1] - vals[0]).toFixed(1);
  return (
    <div className="mf-screen">
      <SubHeader title="Metrics" onBack={onBack}
        right={<button className="mf-iconbtn" onClick={onAddWeight}><Icon name="plus" size={24} /></button>} />
      <div className="mf-scroll">
        <div className="mf-card-lg">
          <div className="mf-metric-hero mf-num">
            <span className="mf-metric-big">{vals[vals.length-1]}<small> kg</small></span>
            <span className="mf-metric-delta" style={{ color: delta <= 0 ? MF.carb : MF.protein }}>
              {delta > 0 ? '+' : ''}{delta} kg
            </span>
          </div>
          <LineChart values={vals} color={MF.purple} fill />
        </div>
        <div className="mf-h3" style={{ margin: '8px 0 12px' }}>History</div>
        <div className="mf-setcard">
          {weights.map((w, i) => (
            <div key={w.date} className={'mf-setrow' + (i === weights.length-1 ? ' last' : '')}>
              <span className="mf-set-label mf-num">{new Date(w.date+'T00:00:00').toLocaleDateString('de-DE', { day:'2-digit', month:'short' })}</span>
              <span className="mf-num" style={{ fontWeight: 600 }}>{w.value} kg</span>
            </div>
          ))}
        </div>
        <button className="mf-detail-log" style={{ margin: '18px 0' }} onClick={onAddWeight}>Gewicht eintragen</button>
      </div>
    </div>
  );
}

/* ---- Weight entry sheet --------------------------------- */
function WeightSheet({ open, onClose, onSave }) {
  const { state } = useApp();
  const [val, setVal] = React.useState('');
  React.useEffect(() => { if (open) setVal(String(latestWeight(state) || '')); }, [open]);
  const keys = ['1','2','3','4','5','6','7','8','9','.','0','del'];
  const press = k => {
    if (k === 'del') setVal(v => v.slice(0, -1));
    else if (k === '.') setVal(v => v.includes('.') ? v : v + '.');
    else setVal(v => (v + k).slice(0, 5));
  };
  return (
    <Sheet open={open} onClose={onClose} title="Log Weight" headerRight={<Icon name="scale" size={20} />}>
      <div className="mf-weight">
        <div className="mf-weight-display mf-num">{val || '0'}<small> kg</small></div>
        <div className="mf-keypad">
          {keys.map(k => (
            <button key={k} className={'mf-key' + (k === 'del' ? ' del' : '')} onClick={() => press(k)}>
              {k === 'del' ? <Icon name="delete" size={22} /> : k}
            </button>
          ))}
        </div>
      </div>
      <div className="mf-detail-actions">
        <button className="mf-detail-log" onClick={() => onSave(parseFloat(val))} disabled={!val}
          style={{ opacity: val ? 1 : 0.5 }}>Save</button>
      </div>
    </Sheet>
  );
}

/* ---- Recipes (subpage) ---------------------------------- */
function RecipesScreen({ onBack, onNew }) {
  const { state } = useApp();
  return (
    <div className="mf-screen">
      <SubHeader title="Recipes" onBack={onBack}
        right={<button className="mf-iconbtn" onClick={onNew}><Icon name="plus" size={24} /></button>} />
      <div className="mf-scroll">
        {state.recipes.map(r => (
          <div key={r.id} className="mf-recipe">
            <span className="mf-recipe-icon" style={{ background: r.color + '22' }}><Icon name={r.icon} size={26} color={r.color} /></span>
            <div className="mf-recipe-mid">
              <div className="mf-recipe-name">{r.name}</div>
              <div className="mf-recipe-sub mf-num">{r.items} Zutaten · {r.energy}🔥 {r.protein}P {r.fat}F {r.carb}C</div>
            </div>
            <Icon name="chevron-right" size={20} color="var(--mf-fg-3)" />
          </div>
        ))}
        <button className="mf-detail-log" style={{ margin: '18px 0' }} onClick={onNew}>Neues Rezept</button>
      </div>
    </div>
  );
}

/* ---- New Recipe (subpage) ------------------------------- */
function RecipeNewScreen({ onBack, onSave }) {
  const [name, setName] = React.useState('');
  const [items, setItems] = React.useState([]);
  const add = f => setItems(s => [...s, f]);
  const remove = i => setItems(s => s.filter((_, j) => j !== i));
  const tot = items.reduce((t, f) => ({
    energy: t.energy + f.energy, protein: t.protein + f.protein, fat: t.fat + f.fat, carb: t.carb + f.carb,
  }), { energy: 0, protein: 0, fat: 0, carb: 0 });
  return (
    <div className="mf-screen">
      <SubHeader title="New Recipe" onBack={onBack} />
      <div className="mf-scroll">
        <input className="mf-quick-name" placeholder="Rezeptname" value={name} onChange={e => setName(e.target.value)} />
        <div className="mf-recipe-totals mf-num">
          <b style={{ color: MF.energy }}>{tot.energy}🔥</b>
          <b style={{ color: MF.protein }}>{tot.protein}P</b>
          <b style={{ color: MF.fat }}>{tot.fat}F</b>
          <b style={{ color: MF.carb }}>{tot.carb}C</b>
        </div>
        <div className="mf-h3" style={{ margin: '6px 0 10px' }}>Zutaten</div>
        {items.map((f, i) => (
          <div key={i} className="mf-add-item" style={{ cursor: 'default' }}>
            <span className="mf-add-thumb" style={{ background: f.color + '22' }}><Icon name={f.icon} size={20} color={f.color} /></span>
            <div className="mf-add-mid"><div className="mf-add-name">{f.name}</div></div>
            <button className="mf-add-plus" onClick={() => remove(i)}><Icon name="x" size={18} /></button>
          </div>
        ))}
        <div className="mf-h3" style={{ margin: '14px 0 10px', color: 'var(--mf-fg-2)', fontSize: 16 }}>Hinzufügen</div>
        {FOOD_DB.slice(0, 6).map(f => (
          <FoodRow key={f.id} food={f} onClick={() => add(f)}
            right={<span className="mf-add-plus"><Icon name="plus" size={18} /></span>} />
        ))}
        <button className="mf-detail-log" disabled={!name || !items.length}
          style={{ margin: '18px 0', opacity: (!name || !items.length) ? 0.5 : 1 }}
          onClick={() => onSave({ id: 'r' + Date.now(), name, items: items.length, icon: 'chef-hat', color: MF.teal, ...tot })}>
          Rezept speichern
        </button>
      </div>
    </div>
  );
}

/* ---- Settings subpages ---------------------------------- */
function SettingsPage({ title, onBack, children }) {
  return (
    <div className="mf-screen">
      <SubHeader title={title} onBack={onBack} />
      <div className="mf-scroll">{children}</div>
    </div>
  );
}

function AccountScreen({ onBack }) {
  const { state } = useApp();
  return (
    <SettingsPage title="Account" onBack={onBack}>
      <div className="mf-profile" style={{ cursor: 'default' }}>
        <div className="mf-avatar">{state.profile.initials}</div>
        <div className="mf-profile-who">
          <div className="mf-profile-name">{state.profile.name}</div>
          <div className="mf-profile-sub">Member Since {state.profile.memberSince}</div>
        </div>
      </div>
      <div className="mf-setcard">
        <SettingRow icon="user" label="Name" value={state.profile.name} />
        <SettingRow icon="mail" label="Email" value="floriflei07@…" />
        <SettingRow icon="lock" label="Password" />
        <SettingRow icon="bell" label="Notifications" value="On" last />
      </div>
    </SettingsPage>
  );
}

function SubscriptionScreen({ onBack }) {
  return (
    <SettingsPage title="Subscription" onBack={onBack}>
      <div className="mf-card-lg" style={{ textAlign: 'center' }}>
        <div className="mf-title" style={{ fontSize: 30 }}>MacroFactor Pro</div>
        <div className="mf-insight-sub" style={{ marginTop: 8 }}>Aktiv · verlängert am 6. Juli 2026</div>
        <div className="mf-num" style={{ fontSize: 40, fontWeight: 800, margin: '14px 0' }}>11,99 €<small style={{ fontSize: 16, color: 'var(--mf-fg-2)' }}> /Monat</small></div>
        <button className="mf-pill" style={{ width: '100%', justifyContent: 'center' }}>Plan verwalten</button>
      </div>
    </SettingsPage>
  );
}

function IntegrationsScreen({ onBack }) {
  const apps = [['Apple Health', 'heart-pulse', true], ['Google Fit', 'activity', false], ['Garmin', 'watch', false], ['Withings', 'scale', true]];
  return (
    <SettingsPage title="Integrations" onBack={onBack}>
      <div className="mf-setcard">
        {apps.map(([n, ic, on], i) => (
          <div key={n} className={'mf-setrow' + (i === apps.length-1 ? ' last' : '')}>
            <span className="mf-set-ic"><Icon name={ic} size={24} /></span>
            <span className="mf-set-label">{n}</span>
            <span className={'mf-switch' + (on ? ' on' : '')}><i /></span>
          </div>
        ))}
      </div>
    </SettingsPage>
  );
}

function UnitsScreen({ onBack }) {
  const [u, setU] = React.useState('metric');
  return (
    <SettingsPage title="Units" onBack={onBack}>
      <div className="mf-h3" style={{ margin: '4px 0 12px' }}>Body weight</div>
      <Segmented options={['metric', 'imperial']} value={u} onChange={setU} />
      <div className="mf-insight-sub" style={{ marginTop: 14 }}>{u === 'metric' ? 'Kilogramm (kg)' : 'Pounds (lb)'}</div>
    </SettingsPage>
  );
}

Object.assign(window, {
  LineChart, InsightsScreen, MetricsScreen, WeightSheet, RecipesScreen, RecipeNewScreen,
  AccountScreen, SubscriptionScreen, IntegrationsScreen, UnitsScreen, SettingsPage,
});
