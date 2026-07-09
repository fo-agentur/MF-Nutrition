/* ============================================================
   Tagesplaner UI — „Was soll ich noch essen?"
   Sheet mit Vorschlags-Karten. Rechenweg (siehe planner.js):
   Kandidaten-Pool → (KI wählt id+Portion | Greedy) → Code
   berechnet Makros → Code justiert gegen Rest-Ziel → Anzeige.
   ============================================================ */

function plannerRest(state, mode) {
  const targets = targetsForDate(state, state.selectedDate);
  const totals = dayTotals(state, state.selectedDate);
  return window.planner.remainingTargets(targets, totals, mode);
}

function PlannerSummary({ totals, rest }) {
  const checks = window.planner.planChecks(totals, rest);
  const cap = window.planner.energyCap(rest);
  const cells = [
    { key: 'energy', icon: '🔥', now: totals.energy, goal: cap, color: MF.energy, ok: checks.energy },
    { key: 'protein', icon: 'P', now: totals.protein, goal: Math.max(0, rest.protein), color: MF.protein, ok: checks.protein },
    { key: 'fat', icon: 'F', now: totals.fat, goal: Math.max(0, rest.fat), color: MF.fat, ok: checks.fat },
    { key: 'carb', icon: 'C', now: totals.carb, goal: Math.max(0, rest.carb), color: MF.carb, ok: checks.carb },
  ];
  return (
    <div className="mf-plan-summary mf-num">
      {cells.map(c => (
        <span className="mf-plan-sumcell" key={c.key}>
          <span className="mf-plan-sumicon" style={{ color: c.color }}>{c.icon}</span>
          <b>{c.now}</b>/{c.goal}
          <span className={'mf-plan-check' + (c.ok ? ' ok' : '')}>{c.ok ? '✓' : '⚠'}</span>
        </span>
      ))}
    </div>
  );
}

function plannerUnitLabel(food, qty) {
  const mass = food.unit === 'g' || food.unit === 'ml';
  if (mass) return food.unit;
  const unit = food.unit === 'serving' ? 'Portion' : food.unit;
  if (qty === 1) return unit;
  if (unit === 'Portion') return 'Portionen';
  if (unit === 'Flasche') return 'Flaschen';
  if (unit === 'Tasse') return 'Tassen';
  return unit;
}

function PlannerItem({ item, onQty, onRemove }) {
  const { food, qty, macros } = item;
  const mass = food.unit === 'g' || food.unit === 'ml';
  const step = mass ? 25 : 1;
  const sourceLabel = { recipe: food.brand, habit: food.brand, custom: 'Eigenes Food', db: food.brand }[food.source] || food.brand;
  return (
    <div className="mf-plan-item">
      <span className="mf-plan-itemicon" style={{ background: (food.color || MF.teal) + '22' }}>
        <Icon name={food.icon || 'utensils'} size={24} color={food.color || MF.teal} />
      </span>
      <div className="mf-plan-itemmain">
        <div className="mf-plan-itemname">{food.name}</div>
        {sourceLabel ? <div className="mf-plan-itemsrc">{sourceLabel}</div> : null}
        <div className="mf-plan-itemmacros mf-num">
          <b style={{ color: MF.energy }}>{macros.energy}</b>🔥{' '}
          <b style={{ color: MF.protein }}>{macros.protein}</b>P{' '}
          <b style={{ color: MF.fat }}>{macros.fat}</b>F{' '}
          <b style={{ color: MF.carb }}>{macros.carb}</b>C
        </div>
        <div className="mf-plan-qty mf-num">
          <button onClick={() => onQty(Math.max(mass ? 25 : 1, qty - step))} aria-label="Weniger"><Icon name="minus" size={13} /></button>
          <span>{qty} {plannerUnitLabel(food, qty)}</span>
          <button onClick={() => onQty(qty + step)} aria-label="Mehr"><Icon name="plus" size={13} /></button>
        </div>
      </div>
      <button className="mf-plan-x" onClick={onRemove} aria-label={food.name + ' entfernen'}>
        <Icon name="x" size={15} />
      </button>
    </div>
  );
}

function PlannerSheet({ open, onClose, onLogPlan }) {
  const { state } = useApp();
  const [mode, setMode] = React.useState('rest');       // 'rest' | 'day'
  const [items, setItems] = React.useState([]);
  const [busy, setBusy] = React.useState(false);
  const [aiUsed, setAiUsed] = React.useState(false);
  const seedRef = React.useRef(1);
  const runRef = React.useRef(0);

  const rest = plannerRest(state, mode);
  const totals = window.planner.planTotals(items);
  const modeLabels = { 'Rest füllen': 'rest', 'Ganzen Tag planen': 'day' };
  const modeLabel = mode === 'day' ? 'Ganzen Tag planen' : 'Rest füllen';
  const done = mode === 'rest' && rest.energy <= 60;

  const generate = React.useCallback(async (nextMode, { exclude } = {}) => {
    const run = ++runRef.current;
    const restNow = plannerRest(state, nextMode);
    if (nextMode === 'rest' && restNow.energy <= 60) { setItems([]); setBusy(false); return; }
    setBusy(true);
    const candidates = window.planner.plannerCandidates(state, {
      foodDb: FOOD_DB,
      customFoods: window.getCustomFoods ? window.getCustomFoods() : [],
    });
    const avoid = exclude ? [...exclude] : [];
    let plan = null;
    let viaAi = false;
    try {
      plan = await window.planner.aiProposePlan(candidates, restNow, { mode: nextMode, avoid });
      viaAi = true;
    } catch (e) {
      /* KI nicht erreichbar/unbrauchbar → lokaler Solver */
    }
    if (!plan || !plan.items.length) {
      seedRef.current += 1;
      plan = window.planner.bestPlan(candidates, restNow, {
        maxItems: 4,
        seed: seedRef.current,
        exclude,
      });
      viaAi = false;
    }
    if (run !== runRef.current) return; // stale (Sheet zu / neu gewürfelt)
    setItems(plan.items);
    setAiUsed(viaAi);
    setBusy(false);
  }, [state]);

  React.useEffect(() => {
    if (open) { setMode('rest'); seedRef.current = Date.now() % 100000; generate('rest'); }
    else { runRef.current += 1; setItems([]); setBusy(false); }
  }, [open]);

  const switchMode = lbl => {
    const next = modeLabels[lbl] || 'rest';
    setMode(next);
    generate(next);
  };

  const reroll = () => {
    const exclude = new Set(items.map(it => String(it.food.name).toLowerCase()));
    generate(mode, { exclude });
  };

  const setQty = (idx, qty) => {
    setItems(list => list.map((it, i) => i === idx
      ? { ...it, qty, macros: scaleFood(it.food, qty) }
      : it));
  };
  const removeItem = idx => setItems(list => list.filter((_, i) => i !== idx));

  return (
    <Sheet open={open} onClose={onClose} title="Was soll ich noch essen?" headerRight={<Icon name="utensils-crossed" size={20} />} tall>
      <div className="mf-plan">
        <div className="mf-plan-modes">
          <Segmented options={['Rest füllen', 'Ganzen Tag planen']} value={modeLabel} onChange={switchMode} />
        </div>
        <div className="mf-plan-rest mf-num">
          {mode === 'day'
            ? <span>Tagesziel: <b style={{ color: MF.energy }}>{rest.energy} kcal</b> · <b style={{ color: MF.protein }}>{Math.max(0, rest.protein)} g Protein</b></span>
            : <span>Noch übrig: <b style={{ color: MF.energy }}>{Math.max(0, rest.energy)} kcal</b> · <b style={{ color: MF.protein }}>{Math.max(0, rest.protein)} g Protein</b></span>}
        </div>
        {mode === 'day' && (((state.days[state.selectedDate] || {}).entries || []).length > 0) && (
          <div className="mf-plan-hint">Plant den kompletten Tag — bereits Geloggtes wird dabei nicht abgezogen.</div>
        )}

        <div className="mf-plan-body">
          {busy ? (
            <div className="mf-plan-busy">
              <span className="mf-plan-spinner" />
              Stelle Vorschläge zusammen…
            </div>
          ) : done ? (
            <div className="mf-plan-done">
              <div className="mf-plan-doneicon">🎉</div>
              <b>Tagesziel erreicht!</b>
              <span>Für heute ist nichts mehr offen. Du kannst trotzdem den ganzen Tag neu planen.</span>
            </div>
          ) : items.length === 0 ? (
            <div className="mf-plan-done">
              <div className="mf-plan-doneicon">🤷</div>
              <b>Kein passender Vorschlag</b>
              <span>Logge ein paar Mahlzeiten oder lege Rezepte an — daraus baut der Planer seine Vorschläge.</span>
            </div>
          ) : (
            <React.Fragment>
              {aiUsed && <div className="mf-plan-aitag"><Icon name="sparkles" size={13} /> KI-Vorschlag — Makros vom Code berechnet</div>}
              {items.map((it, i) => (
                <PlannerItem key={it.food.id} item={it}
                  onQty={q => setQty(i, q)}
                  onRemove={() => removeItem(i)} />
              ))}
            </React.Fragment>
          )}
        </div>
      </div>

      {items.length > 0 && !busy && (
        <div className="mf-plan-footer">
          <PlannerSummary totals={totals} rest={rest} />
          <div className="mf-plan-actions">
            <button className="mf-plan-reroll" onClick={reroll}>
              <Icon name="dices" size={18} /> Neu würfeln
            </button>
            <button className="mf-detail-log mf-plan-log" onClick={() => onLogPlan(items, mode)}>
              Plan loggen ({items.length})
            </button>
          </div>
        </div>
      )}
      {(done || (!busy && items.length === 0)) && (
        <div className="mf-plan-footer">
          <div className="mf-plan-actions">
            {done ? (
              <button className="mf-plan-reroll" style={{ flex: 1 }} onClick={() => switchMode('Ganzen Tag planen')}>
                <Icon name="calendar-days" size={18} /> Ganzen Tag planen
              </button>
            ) : (
              <button className="mf-plan-reroll" style={{ flex: 1 }} onClick={reroll}>
                <Icon name="dices" size={18} /> Nochmal versuchen
              </button>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}

/* ---- Dashboard-Einstieg ----------------------------------- */
function PlannerCTA({ onOpen }) {
  const { state } = useApp();
  const targets = targetsForDate(state, state.selectedDate);
  const totals = dayTotals(state, state.selectedDate);
  const restE = Math.max(0, targets.energy - totals.energy);
  const restP = Math.max(0, targets.protein - totals.protein);
  return (
    <button className="mf-plan-cta" onClick={onOpen}>
      <span className="mf-plan-ctaicon"><Icon name="utensils-crossed" size={22} color="#000" /></span>
      <span className="mf-plan-ctamain">
        <b>Was soll ich noch essen?</b>
        <span className="mf-num">
          {restE > 0
            ? <>Noch <b style={{ color: MF.energy }}>{restE} kcal</b> · <b style={{ color: MF.protein }}>{restP} g Protein</b> übrig</>
            : 'Tagesziel erreicht — Plan für morgen holen'}
        </span>
      </span>
      <Icon name="chevron-right" size={20} color="var(--mf-fg-3)" />
    </button>
  );
}

Object.assign(window, { PlannerSheet, PlannerCTA });
