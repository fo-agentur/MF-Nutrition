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

const eur = v => (Math.round(v * 100) / 100).toFixed(2).replace('.', ',') + ' €';

function PlannerSummary({ totals, rest, budget = 0 }) {
  const checks = window.planner.planChecks(totals, rest);
  const cap = window.planner.energyCap(rest);
  const cells = [
    { key: 'energy', icon: 'E', now: totals.energy, goal: cap, color: MF.energy, ok: checks.energy },
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
      {totals.price > 0 && (
        <span className="mf-plan-sumcell">
          <span className="mf-plan-sumicon" style={{ color: MF.energy }}>€</span>
          <b>{eur(totals.price).replace(' €', '')}</b>{budget > 0 ? `/${budget}` : ''}
          <span className={'mf-plan-check' + (!budget || totals.price <= budget + 1e-9 ? ' ok' : '')}>
            {!budget || totals.price <= budget + 1e-9 ? '✓' : '⚠'}
          </span>
        </span>
      )}
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
  const sourceLabel = food.source === 'market'
    ? [food.pack, food.price > 0 ? eur(food.price) : ''].filter(Boolean).join(' · ')
    : { recipe: food.brand, habit: food.brand, custom: 'Eigenes Food', db: food.brand }[food.source] || food.brand;
  const price = window.planner.priceOf(food, qty);
  return (
    <div className="mf-plan-item">
      <span className="mf-plan-itemicon" style={{ background: (food.color || MF.teal) + '22' }}>
        <Icon name={food.icon || 'utensils'} size={21} color={food.color || MF.teal} />
      </span>
      <div className="mf-plan-itemmain">
        <div className="mf-plan-itemname">{food.name}</div>
        {sourceLabel ? <div className="mf-plan-itemsrc">{sourceLabel}</div> : null}
        <div className="mf-plan-itemmacros mf-num">
          <b style={{ color: MF.energy }}>{macros.energy}</b>E{' '}
          <b style={{ color: MF.protein }}>{macros.protein}</b>P{' '}
          <b style={{ color: MF.fat }}>{macros.fat}</b>F{' '}
          <b style={{ color: MF.carb }}>{macros.carb}</b>C
          {price > 0 ? <span className="mf-plan-itemprice"> · {eur(price)}</span> : null}
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
  const { state, dispatch } = useApp();
  const [shopped, setShopped] = React.useState(false);
  const shopPlan = () => {
    dispatch({ type: 'SHOPPING_ADD', items: window.shopping.ingredientsFromPlan(items, state.recipes) });
    setShopped(true);
    setTimeout(() => setShopped(false), 1600);
  };
  const [mode, setMode] = React.useState('now');        // 'now' | 'rest' | 'day'
  const [source, setSource] = React.useState('any');    // 'any' | 'market' | 'cook'
  const [budget, setBudget] = React.useState(0);        // € (0 = ohne Limit), nur Supermarkt
  const [items, setItems] = React.useState([]);
  const [busy, setBusy] = React.useState(false);
  const [aiUsed, setAiUsed] = React.useState(false);
  const seedRef = React.useRef(1);
  const runRef = React.useRef(0);

  // 'now' zielt auf die NÄCHSTE Mahlzeit: Anteil des Resttags nach Uhrzeit.
  const restDay = plannerRest(state, mode === 'now' ? 'rest' : mode);
  const rest = mode === 'now' ? window.planner.nowTargets(restDay) : restDay;
  const totals = window.planner.planTotals(items);
  const modeLabels = { 'Jetzt': 'now', 'Rest heute': 'rest', 'Ganzer Tag': 'day' };
  const modeLabel = { now: 'Jetzt', rest: 'Rest heute', day: 'Ganzer Tag' }[mode];
  const sourceLabels = { 'Egal': 'any', 'Supermarkt': 'market', 'Kochen': 'cook' };
  const sourceLabel = { any: 'Egal', market: 'Supermarkt', cook: 'Kochen' }[source];
  const budgetLabels = { 'Ohne Limit': 0, '5 €': 5, '10 €': 10, '15 €': 15 };
  const budgetLabel = budget ? `${budget} €` : 'Ohne Limit';
  const done = (mode === 'rest' || mode === 'now') && rest.energy <= 60;

  const generate = React.useCallback(async (nextMode, nextSource, nextBudget, { exclude } = {}) => {
    const run = ++runRef.current;
    const restBase = plannerRest(state, nextMode === 'now' ? 'rest' : nextMode);
    if ((nextMode === 'rest' || nextMode === 'now') && restBase.energy <= 60) { setItems([]); setBusy(false); return; }
    const target = nextMode === 'now' ? window.planner.nowTargets(restBase) : restBase;
    setBusy(true);
    const candidates = window.planner.plannerCandidates(state, {
      foodDb: FOOD_DB,
      customFoods: window.getCustomFoods ? window.getCustomFoods() : [],
      marketDb: SUPERMARKET_DB,
      source: nextSource,
    });
    const avoid = exclude ? [...exclude] : [];
    const budgetOpt = nextSource === 'market' ? nextBudget : 0;
    const maxItems = nextMode === 'now' ? (nextSource === 'market' ? 3 : 2) : 4;
    let plan = null;
    let viaAi = false;
    // „Jetzt" & Supermarkt laufen rein lokal: Ergebnis sofort da, und das
    // Preis-Budget kann nur der Code hart garantieren — die KI kennt keine Preise.
    const useAi = nextMode !== 'now' && nextSource !== 'market';
    if (useAi) {
      try {
        plan = await window.planner.aiProposePlan(candidates, target, { mode: nextMode, avoid });
        viaAi = true;
      } catch (e) {
        /* KI nicht erreichbar/unbrauchbar → lokaler Solver */
      }
    }
    if (!plan || !plan.items.length) {
      seedRef.current += 1;
      plan = window.planner.bestPlan(candidates, target, {
        maxItems,
        seed: seedRef.current,
        exclude,
        budget: budgetOpt,
      });
      viaAi = false;
    }
    if (run !== runRef.current) return; // stale (Sheet zu / neu gewürfelt)
    setItems(plan.items);
    setAiUsed(viaAi);
    setBusy(false);
  }, [state]);

  React.useEffect(() => {
    if (open) {
      setMode('now'); setSource('any'); setBudget(0);
      seedRef.current = Date.now() % 100000;
      generate('now', 'any', 0);
    } else { runRef.current += 1; setItems([]); setBusy(false); }
  }, [open]);

  const switchMode = lbl => {
    const next = modeLabels[lbl] || 'now';
    setMode(next);
    generate(next, source, budget);
  };
  const switchSource = lbl => {
    const next = sourceLabels[lbl] || 'any';
    setSource(next);
    generate(mode, next, budget);
  };
  const switchBudget = lbl => {
    const next = budgetLabels[lbl] || 0;
    setBudget(next);
    generate(mode, source, next);
  };

  const reroll = () => {
    const exclude = new Set(items.map(it => String(it.food.name).toLowerCase()));
    generate(mode, source, budget, { exclude });
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
          <Segmented options={['Jetzt', 'Rest heute', 'Ganzer Tag']} value={modeLabel} onChange={switchMode} />
        </div>
        <div className="mf-plan-modes mf-plan-sourcerow">
          <Segmented options={['Egal', 'Supermarkt', 'Kochen']} value={sourceLabel} onChange={switchSource} />
        </div>
        {source === 'market' && (
          <div className="mf-plan-modes mf-plan-budgetrow">
            <Segmented options={['Ohne Limit', '5 €', '10 €', '15 €']} value={budgetLabel} onChange={switchBudget} />
          </div>
        )}
        <div className="mf-plan-rest mf-num">
          {mode === 'day'
            ? <span>Tagesziel: <b style={{ color: MF.energy }}>{rest.energy} kcal</b> · <b style={{ color: MF.protein }}>{Math.max(0, rest.protein)} g Protein</b></span>
            : mode === 'now'
              ? <span>Nächste Mahlzeit: <b style={{ color: MF.energy }}>~{Math.max(0, rest.energy)} kcal</b> · <b style={{ color: MF.protein }}>{Math.max(0, rest.protein)} g Protein</b></span>
              : <span>Noch übrig: <b style={{ color: MF.energy }}>{Math.max(0, rest.energy)} kcal</b> · <b style={{ color: MF.protein }}>{Math.max(0, rest.protein)} g Protein</b></span>}
        </div>
        {mode === 'now' && !done && (
          <div className="mf-plan-hint">Ein Vorschlag nur für jetzt — vom Resttag ({Math.max(0, restDay.energy)} kcal offen) bleibt genug für später.</div>
        )}
        {source === 'market' && (
          <div className="mf-plan-hint">Fertig zum Essen, nichts zu kochen. Preise sind Richtwerte (Discounter).</div>
        )}
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
              <div className="mf-plan-doneicon"><Icon name="circle-check" size={34} color="var(--mf-carb)" /></div>
              <b>Tagesziel erreicht!</b>
              <span>Für heute ist nichts mehr offen. Du kannst trotzdem den ganzen Tag neu planen.</span>
            </div>
          ) : items.length === 0 ? (
            <div className="mf-plan-done">
              <div className="mf-plan-doneicon"><Icon name="search-x" size={34} color="var(--mf-fg-3)" /></div>
              <b>Kein passender Vorschlag</b>
              <span>{source === 'cook'
                ? 'Keine passenden Rezepte gefunden — lege Rezepte an oder importiere welche (Mehr → Rezepte).'
                : source === 'market' && budget > 0
                  ? 'Im Budget geht sich nichts Sinnvolles aus — Budget erhöhen oder neu würfeln.'
                  : 'Logge ein paar Mahlzeiten oder lege Rezepte an — daraus baut der Planer seine Vorschläge.'}</span>
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
          <PlannerSummary totals={totals} rest={rest} budget={source === 'market' ? budget : 0} />
          <div className="mf-plan-actions">
            <button className="mf-plan-reroll" onClick={reroll}>
              <Icon name="dices" size={18} /> Neu würfeln
            </button>
            <button className="mf-plan-reroll mf-plan-shop" onClick={shopPlan}
              aria-label="Zutaten auf die Einkaufsliste">
              <Icon name={shopped ? 'check' : 'shopping-cart'} size={18} />
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
              <button className="mf-plan-reroll" style={{ flex: 1 }} onClick={() => switchMode('Ganzer Tag')}>
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

/* ---- Dashboard-Einstieg: „Rest heute"-Hero ----------------
   Die eine Zahl, die Florian wirklich braucht: was ist heute noch
   offen. Groß, tabellarisch, tappbar — führt direkt in den Planer. */
function PlannerCTA({ onOpen }) {
  const { state } = useApp();
  const targets = targetsForDate(state, state.selectedDate);
  const totals = dayTotals(state, state.selectedDate);
  const restE = targets.energy - totals.energy;
  const restP = targets.protein - totals.protein;
  const pctE = Math.max(0, Math.min(100, (totals.energy / (targets.energy || 1)) * 100));
  const pctP = Math.max(0, Math.min(100, (totals.protein / (targets.protein || 1)) * 100));
  const over = restE < -30;
  return (
    <button className="mf-resthero" onClick={onOpen}>
      <div className="mf-resthero-head">
        <span className="mf-eyebrow">Rest heute</span>
        <Icon name="chevron-right" size={18} color="var(--mf-fg-3)" />
      </div>
      {restE > 0 ? (
        <div className="mf-resthero-big mf-num">{restE}<small> kcal übrig</small></div>
      ) : (
        <div className="mf-resthero-big mf-num">
          {over ? <>{Math.abs(restE)}<small> kcal über Ziel</small></> : <>Ziel erreicht<small> 🎉</small></>}
        </div>
      )}
      <div className="mf-resthero-track"><span style={{ width: pctE + '%', background: over ? MF.protein : MF.energy }} /></div>
      <div className="mf-resthero-protein mf-num">
        <span>
          <b style={{ color: MF.protein }}>P</b>{' '}
          {restP > 0 ? <>noch <b>{restP} g</b> Protein</> : <>Protein-Ziel erreicht ✓</>}
        </span>
        <span className="mf-resthero-minitrack"><span style={{ width: pctP + '%', background: MF.protein }} /></span>
      </div>
      <span className="mf-resthero-btn">
        <Icon name="utensils-crossed" size={17} color="#0B0C0E" />
        Was soll ich noch essen?
      </span>
    </button>
  );
}

Object.assign(window, { PlannerSheet, PlannerCTA });
