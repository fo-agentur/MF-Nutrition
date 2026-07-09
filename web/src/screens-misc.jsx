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
  const weights = state.weights.map(w => weightDisplayValue(state, w.value));
  const unit = weightUnit(state);
  const lastWeight = state.weights.length ? weightDisplayText(state, state.weights[state.weights.length - 1].value) : '–';
  const exp = estimateExpenditure(state);
  return (
    <div className="mf-screen">
      <SubHeader title="Insights & Analytics" onBack={onBack} />
      <div className="mf-scroll">
        <div className="mf-card-lg">
          <div className="mf-h3">Expenditure</div>
          <div className="mf-insight-sub">{exp ? 'Geschätzter Tagesverbrauch' : 'Noch nicht genug Daten — logge Gewicht & Mahlzeiten ein paar Tage'}</div>
          <div className="mf-metric-big mf-num" style={{ marginTop: 8 }}>{exp ? exp : '–'}<small> 🔥 kcal</small></div>
        </div>
        <div className="mf-card-lg">
          <div className="mf-h3">Weight Trend</div>
          <div className="mf-insight-sub">Last 7 Days · {lastWeight} {unit}</div>
          <LineChart values={weights} color={MF.purple} fill />
        </div>
        <div className="mf-card-lg">
          <div className="mf-h3" style={{ marginBottom: 14 }}>Macro Adherence</div>
          {MACRO_META.map(m => {
            const tot = dayTotals(state, state.selectedDate)[m.key];
            const goal = targetsForDate(state, state.selectedDate)[m.key];
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
  const vals = state.weights.map(w => weightDisplayValue(state, w.value));
  const unit = weightUnit(state);
  const delta = vals.length ? (vals[vals.length-1] - vals[0]).toFixed(1) : '0.0';
  const latest = vals.length ? vals[vals.length-1].toFixed(1) : '–';
  return (
    <div className="mf-screen">
      <SubHeader title="Metrics" onBack={onBack}
        right={<button className="mf-iconbtn" onClick={onAddWeight}><Icon name="plus" size={24} /></button>} />
      <div className="mf-scroll">
        <div className="mf-card-lg">
          <div className="mf-metric-hero mf-num">
            <span className="mf-metric-big">{latest}<small> {unit}</small></span>
            <span className="mf-metric-delta" style={{ color: delta <= 0 ? MF.carb : MF.protein }}>
              {delta > 0 ? '+' : ''}{delta} {unit}
            </span>
          </div>
          <LineChart values={vals} color={MF.purple} fill />
        </div>
        <div className="mf-h3" style={{ margin: '8px 0 12px' }}>History</div>
        <div className="mf-setcard">
          {weights.map((w, i) => (
            <div key={w.date} className={'mf-setrow' + (i === weights.length-1 ? ' last' : '')}>
              <span className="mf-set-label mf-num">{new Date(w.date+'T00:00:00').toLocaleDateString('de-DE', { day:'2-digit', month:'short' })}</span>
              <span className="mf-num" style={{ fontWeight: 600 }}>{weightDisplayText(state, w.value)} {unit}</span>
            </div>
          ))}
        </div>
        <button className="mf-detail-log" style={{ margin: '18px 0' }} onClick={onAddWeight}>Gewicht eintragen</button>
      </div>
    </div>
  );
}

/* ---- Weight entry sheet --------------------------------- */
function WeightSheet({ open, onClose, onSave, date = TODAY }) {
  const { state } = useApp();
  const [val, setVal] = React.useState('');
  const [weightDate, setWeightDate] = React.useState(date);
  const unit = weightUnit(state);
  React.useEffect(() => {
    if (open) {
      setWeightDate(date || TODAY);
      const kg = weightValueOn(state, date || TODAY) || latestWeight(state);
      setVal(kg ? String(weightDisplayValue(state, kg)) : '');
    }
  }, [open, date, state.units]);
  const keys = ['1','2','3','4','5','6','7','8','9','.','0','del'];
  const press = k => {
    if (k === 'del') setVal(v => v.slice(0, -1));
    else if (k === '.') setVal(v => v.includes('.') ? v : v + '.');
    else setVal(v => (v + k).slice(0, 6));
  };
  const shiftDate = days => {
    const next = addDaysISO(weightDate, days);
    setWeightDate(next);
    const existing = weightValueOn(state, next);
    if (existing) setVal(String(weightDisplayValue(state, existing)));
  };
  const parsed = weightInputToKg(state, val);
  const canSave = Number.isFinite(parsed) && parsed > 0;
  return (
    <Sheet open={open} onClose={onClose} title="Log Weight" headerRight={<Icon name="scale" size={20} />}>
      <div className="mf-weight">
        <div className="mf-weight-date">
          <button className="mf-iconbtn" onClick={() => shiftDate(-1)}><Icon name="chevron-left" size={22} /></button>
          <span>{weightDate === TODAY ? 'Today' : fmtDayMonth(weightDate)}</span>
          <button className="mf-iconbtn" onClick={() => shiftDate(1)} disabled={weightDate >= TODAY}
            style={{ opacity: weightDate >= TODAY ? 0.35 : 1 }}>
            <Icon name="chevron-right" size={22} />
          </button>
        </div>
        <div className="mf-weight-display mf-num">{val || '0'}<small> {unit}</small></div>
        <div className="mf-keypad">
          {keys.map(k => (
            <button key={k} className={'mf-key' + (k === 'del' ? ' del' : '')} onClick={() => press(k)}>
              {k === 'del' ? <Icon name="delete" size={22} /> : k}
            </button>
          ))}
        </div>
      </div>
      <div className="mf-detail-actions">
        <button className="mf-detail-log" onClick={() => onSave(parsed, weightDate)} disabled={!canSave}
          style={{ opacity: canSave ? 1 : 0.5 }}>Save</button>
      </div>
    </Sheet>
  );
}

/* ---- Recipes (subpage) ---------------------------------- */
function RecipesScreen({ onBack, onNew, onImport, onLog }) {
  const { state } = useApp();
  return (
    <div className="mf-screen">
      <SubHeader title="Rezepte" onBack={onBack}
        right={
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="mf-iconbtn" onClick={onImport} aria-label="Rezept importieren"><Icon name="link" size={22} /></button>
            <button className="mf-iconbtn" onClick={onNew} aria-label="Neues Rezept"><Icon name="plus" size={24} /></button>
          </div>
        } />
      <div className="mf-scroll">
        <button className="mf-create-food" onClick={onImport}>
          <span><Icon name="link" size={20} /></span>
          <b>Rezept von URL importieren</b>
          <small>Link oder kopierten Rezepttext einlesen</small>
        </button>
        {state.recipes.map(r => (
          <button key={r.id} className="mf-recipe" onClick={onLog ? () => onLog(r) : undefined}
            style={{ cursor: onLog ? 'pointer' : 'default' }}>
            <span className="mf-recipe-icon" style={{ background: r.color + '22' }}><Icon name={r.icon} size={26} color={r.color} /></span>
            <div className="mf-recipe-mid">
              <div className="mf-recipe-name">{r.name}</div>
              <div className="mf-recipe-sub mf-num">{r.items} Zutaten · {r.energy}🔥 {r.protein}P {r.fat}F {r.carb}C</div>
            </div>
            <Icon name="chevron-right" size={20} color="var(--mf-fg-3)" />
          </button>
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

/* ---- Import Recipe (subpage) ---------------------------- */
function RecipeImportScreen({ onBack, onSave }) {
  const [url, setUrl] = React.useState('');
  const [text, setText] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  const number = v => Math.max(0, Math.round(Number(String(v ?? '').replace(',', '.').match(/\d+(?:\.\d+)?/)?.[0] || 0)));
  const titleCase = s => String(s || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
  const nameFromUrl = raw => {
    try {
      const u = new URL(raw);
      const slug = u.pathname.split('/').filter(Boolean).pop() || u.hostname.replace(/^www\./, '');
      return titleCase(slug.replace(/\.[a-z0-9]+$/i, '')) || 'Imported Recipe';
    } catch (e) {
      return 'Imported Recipe';
    }
  };
  const cleanText = html => String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const recipeFromJsonLd = raw => {
    const matches = [...String(raw || '').matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    const flatten = v => Array.isArray(v) ? v.flatMap(flatten) : v && typeof v === 'object' && Array.isArray(v['@graph']) ? flatten(v['@graph']) : [v];
    for (const m of matches) {
      try {
        const all = flatten(JSON.parse(m[1].trim()));
        const recipe = all.find(x => {
          const t = x && x['@type'];
          return Array.isArray(t) ? t.includes('Recipe') : t === 'Recipe';
        });
        if (!recipe) continue;
        const n = recipe.nutrition || {};
        return {
          id: 'r' + Date.now(),
          name: String(recipe.name || nameFromUrl(url)).slice(0, 80),
          items: Math.max(1, (recipe.recipeIngredient || []).length || 1),
          energy: number(n.calories || n.energy || 0),
          protein: number(n.proteinContent || 0),
          fat: number(n.fatContent || 0),
          carb: number(n.carbohydrateContent || 0),
          icon: 'chef-hat',
          color: MF.teal,
          sourceUrl: url.trim(),
        };
      } catch (e) {}
    }
    return null;
  };

  const parseLocalRecipe = (raw, fallbackUrl = '') => {
    const source = String(raw || '').replace(/,/g, '.');
    const lines = source.split(/\n+/).map(s => s.trim()).filter(Boolean);
    const isMacro = l => /(kcal|calories|energy|protein|fat|carb|fett|kohlenhydrate|eiweiss|eiweiß)/i.test(l) && /\d/.test(l);
    const name = (lines.find(l => !isMacro(l) && !/^https?:\/\//i.test(l) && l.length <= 80) || nameFromUrl(fallbackUrl)).slice(0, 80);
    const ingredientLines = lines.filter(l =>
      !isMacro(l) && (
      /^[-*•]/.test(l) ||
      /\b(\d+(?:\.\d+)?)\s*(g|kg|ml|l|cup|cups|tbsp|tsp|oz|egg|eggs|stk|stueck|stück)\b/i.test(l)
      )
    );
    const findValue = patterns => {
      for (const line of lines) {
        for (const re of patterns) {
          const m = line.match(re);
          if (m) return number(m[1]);
        }
      }
      return 0;
    };
    return {
      id: 'r' + Date.now(),
      name,
      items: Math.max(1, ingredientLines.length || lines.filter(l => !isMacro(l)).length || 1),
      energy: findValue([/(?:energy|calories|kcal)\D{0,30}(\d+(?:\.\d+)?)/i, /(\d+(?:\.\d+)?)\s*kcal/i]),
      protein: findValue([/(?:protein|eiweiss|eiweiß)\D{0,30}(\d+(?:\.\d+)?)/i]),
      fat: findValue([/(?:fat|fett)\D{0,30}(\d+(?:\.\d+)?)/i]),
      carb: findValue([/(?:carb|carbs|kohlenhydrate)\D{0,30}(\d+(?:\.\d+)?)/i]),
      icon: 'chef-hat',
      color: MF.teal,
      sourceUrl: fallbackUrl.trim(),
    };
  };

  const fetchRecipePage = async raw => {
    const target = raw.trim();
    if (!target) return '';
    const urls = [
      target,
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(target),
    ];
    for (const u of urls) {
      try {
        const res = await fetch(u);
        if (res.ok) return await res.text();
      } catch (e) {}
    }
    return '';
  };

  const recipeFromOpenRouter = async context => {
    if (!window.analyzeFoodViaApi) return null;
    const data = await window.analyzeFoodViaApi({ task: 'recipe', text: context.slice(0, 16000) });
    const json = data.recipe || {};
    return {
      id: 'r' + Date.now(),
      name: String(json.name || nameFromUrl(url)).slice(0, 80),
      items: Math.max(1, number(json.items || 1)),
      energy: number(json.energy || json.kcal || json.calories),
      protein: number(json.protein || json.protein_g),
      fat: number(json.fat || json.fat_g),
      carb: number(json.carb || json.carbs || json.carbs_g),
      icon: 'chef-hat',
      color: MF.teal,
      sourceUrl: url.trim(),
    };
  };

  const importRecipe = async () => {
    setBusy(true);
    setError('');
    try {
      const page = await fetchRecipePage(url);
      const structured = recipeFromJsonLd(page);
      if (structured && (structured.energy || structured.items > 1)) {
        setBusy(false);
        onSave(structured);
        return;
      }
      const context = [url.trim(), text.trim(), cleanText(page)].filter(Boolean).join('\n\n');
      if (!context.trim()) throw new Error('Füge eine URL oder kopierten Rezepttext ein.');
      let aiRecipe = null;
      try { aiRecipe = await recipeFromOpenRouter(context); } catch (e) {}
      const recipe = aiRecipe || parseLocalRecipe(context, url);
      if (!recipe.energy && !recipe.protein && !recipe.fat && !recipe.carb && !text.trim() && !page) {
        throw new Error('URL konnte nicht gelesen werden. Rezepttext einfügen oder erneut versuchen.');
      }
      setBusy(false);
      onSave(recipe);
    } catch (e) {
      if (text.trim()) {
        setBusy(false);
        onSave(parseLocalRecipe(text, url));
        return;
      }
      setBusy(false);
      setError(e.message || 'Import fehlgeschlagen');
    }
  };

  const canImport = !!(url.trim() || text.trim());
  return (
    <div className="mf-screen">
      <SubHeader title="Import Recipe" onBack={onBack} />
      <div className="mf-scroll">
        <div className="mf-ai-prompt" style={{ marginTop: 10 }}>Rezept-Link einfügen. Optional kannst du Zutaten und Makros als Text dazugeben.</div>
        <input className="mf-quick-name" placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)} />
        <textarea className="mf-ai-input" rows="8"
          placeholder={'Recipe text or nutrition info\nExample:\nProtein Pancakes\n- 60g oats\n- 2 eggs\nEnergy 520 kcal\nProtein 34g\nFat 18g\nCarbs 54g'}
          value={text} onChange={e => setText(e.target.value)} />
        {error && <div className="mf-ai-error">{error}</div>}
        <button className="mf-detail-log" disabled={!canImport || busy}
          style={{ margin: '18px 0', opacity: canImport && !busy ? 1 : 0.5 }}
          onClick={importRecipe}>
          {busy ? 'Importiere...' : 'Rezept importieren'}
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
          <div className="mf-profile-sub">Mitglied seit {state.profile.memberSince}</div>
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
  const [message, setMessage] = React.useState('');
  return (
    <SettingsPage title="Subscription" onBack={onBack}>
      <div className="mf-card-lg" style={{ textAlign: 'center' }}>
        <div className="mf-title" style={{ fontSize: 30 }}>MacroFactor Pro</div>
        <div className="mf-insight-sub" style={{ marginTop: 8 }}>Aktiv · verlängert am 6. Juli 2026</div>
        <div className="mf-num" style={{ fontSize: 40, fontWeight: 800, margin: '14px 0' }}>11,99 €<small style={{ fontSize: 16, color: 'var(--mf-fg-2)' }}> /Monat</small></div>
        <button className="mf-pill" style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => setMessage('Aboverwaltung ist in diesem Prototyp lokal markiert.')}>Plan verwalten</button>
        {message && <div className="mf-auth-info" style={{ marginTop: 12, textAlign: 'left' }}>{message}</div>}
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
  const { state, dispatch } = useApp();
  const u = weightUnit(state) === 'lb' ? 'imperial' : 'metric';
  const setU = next => dispatch({ type: 'SET_UNITS', units: { weight: next === 'imperial' ? 'lb' : 'kg' } });
  return (
    <SettingsPage title="Units" onBack={onBack}>
      <div className="mf-h3" style={{ margin: '4px 0 12px' }}>Body weight</div>
      <Segmented options={['metric', 'imperial']} value={u} onChange={setU} />
      <div className="mf-insight-sub" style={{ marginTop: 14 }}>{u === 'metric' ? 'Kilogramm (kg)' : 'Pounds (lb)'}</div>
    </SettingsPage>
  );
}

Object.assign(window, {
  LineChart, InsightsScreen, MetricsScreen, WeightSheet, RecipesScreen, RecipeNewScreen, RecipeImportScreen,
  AccountScreen, SubscriptionScreen, IntegrationsScreen, UnitsScreen, SettingsPage,
});
