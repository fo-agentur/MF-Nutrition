import { estimateLocalMealFromText, normalizeAiTextForMatch } from './ai-estimator.js';

/* ============================================================
   MacroFactor UI Kit — Logging flow
   Sheet shell + Add, Food Detail, Quick Add, Barcode, AI
   ============================================================ */

/* ---- Bottom sheet shell --------------------------------- */
function Sheet({ open, onClose, children, title, headerRight, tall, onBack }) {
  if (!open) return null;

  return (
    <div className="mf-sheet-scrim open" onClick={onClose}>
      <div className={'mf-sheet' + (tall ? ' tall' : '')} onClick={e => e.stopPropagation()}>
        <div className="mf-sheet-grab" />
        {title !== undefined && (
          <div className="mf-sheet-head">
            <button className="mf-sheet-x" onClick={onBack || onClose}>
              <Icon name={onBack ? 'chevron-left' : 'x'} size={22} />
            </button>
            <span className="mf-h3" style={{ fontWeight: 700 }}>{title}</span>
            <span className="mf-sheet-right">{headerRight}</span>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

const HH = h => String(h).padStart(2, '0') + ':00';
const hourLabel = h => (h === 0 ? '12 AM' : h < 12 ? h + ' AM' : h === 12 ? '12 PM' : (h - 12) + ' PM');

function buildEntry(food, qty, hour) {
  const s = scaleFood(food, qty);
  return { foodId: food.id, name: food.name, time: HH(hour), qty, unit: food.unit,
    icon: food.icon, color: food.color, ...s };
}

function historyKey(entry) {
  const id = entry.foodId && !String(entry.foodId).startsWith('recent-') ? entry.foodId : '';
  return id || `${String(entry.name || '').toLowerCase()}|${entry.unit || ''}`;
}
function historyFood(entry, prefix) {
  return {
    id: `${prefix}-${entry.id || historyKey(entry)}`,
    name: entry.name,
    brand: '',
    icon: entry.icon,
    color: entry.color,
    per: entry.qty || 1,
    unit: entry.unit || 'g',
    energy: entry.energy,
    protein: entry.protein,
    fat: entry.fat,
    carb: entry.carb,
    fav: false,
  };
}
function uniqueHistoryFoods(records, limit, skip = new Set(), prefix = 'recent') {
  const out = [];
  for (const r of records) {
    const key = historyKey(r.e);
    if (skip.has(key)) continue;
    skip.add(key);
    out.push(historyFood(r.e, prefix));
    if (out.length >= limit) break;
  }
  return out;
}
function smartHistory(state, hour) {
  const records = [];
  Object.keys(state.days || {}).forEach(d => {
    const entries = ((state.days[d] || {}).entries || []);
    entries.forEach(e => records.push({ d, e, h: parseInt((e.time || '12').split(':')[0], 10) }));
  });
  records.sort((a, b) => (b.d + b.e.time).localeCompare(a.d + a.e.time));

  const used = new Set();
  const sameTime = uniqueHistoryFoods(
    records.filter(r => Number.isFinite(r.h) && Math.abs(r.h - hour) <= 1),
    4,
    used,
    'time'
  );

  const grouped = new Map();
  records.forEach((r, idx) => {
    const key = historyKey(r.e);
    const g = grouped.get(key) || { ...r, count: 0, lastIndex: idx };
    g.count += 1;
    g.lastIndex = Math.min(g.lastIndex, idx);
    grouped.set(key, g);
  });
  const frequentRecords = [...grouped.values()]
    .filter(r => r.count > 1)
    .sort((a, b) => b.count - a.count || a.lastIndex - b.lastIndex);
  const frequent = uniqueHistoryFoods(frequentRecords, 4, used, 'frequent');
  const latest = uniqueHistoryFoods(records, 5, new Set(), 'recent');

  return {
    sameTime,
    frequent,
    latest,
    hasHistory: records.length > 0,
  };
}

/* ---- Add / Log sheet ------------------------------------ */
function AddSheet({ open, onClose, hour, initialTab, onPick, onQuickLog, onQuickAdd, onBarcode, onAIResult, onLabelScan, onCustomFood }) {
  const { state } = useApp();
  const [tab, setTab] = React.useState('Search');
  const [q, setQ] = React.useState('');
  const [customFoods, setCustomFoods] = React.useState([]);
  const tabs = [
    { id: 'Scan', icon: 'scan-barcode' }, { id: 'Search', icon: 'search' },
    { id: 'AI', icon: 'sparkles' },
    { id: 'Quick Add', icon: 'rocket' }, { id: 'Library', icon: 'book-open' },
  ];
  const totals = dayTotals(state, state.selectedDate);
  const [results, setResults] = React.useState([]);
  const [searching, setSearching] = React.useState(false);
  const favs = FOOD_DB.filter(f => f.fav);
  const fallbackPicks = [FOOD_DB.find(f => f.id === 'pro35')].filter(Boolean);
  const libraryFoods = React.useMemo(() => {
    const base = FOOD_DB.filter(f => !f.fav).slice(0, 8);
    return [...customFoods, ...base];
  }, [customFoods]);
  const history = React.useMemo(() => smartHistory(state, hour), [state.days, hour]);
  const timePicks = history.sameTime.length ? history.sameTime : fallbackPicks;
  const latest = history.latest.length ? history.latest : [FOOD_DB.find(f => f.id === 'muesli')].filter(Boolean);

  React.useEffect(() => {
    if (open) {
      setTab(initialTab || 'Search');
      setQ('');
      setResults([]);
      setCustomFoods(window.getCustomFoods ? window.getCustomFoods() : []);
    }
  }, [open, initialTab]);

  // Live OpenFoodFacts search (debounced)
  React.useEffect(() => {
    const query = q.trim();
    if (query.length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    let alive = true;
    const t = setTimeout(async () => {
      const r = await window.searchFoods(query);
      if (alive) { setResults(r); setSearching(false); }
    }, 350);
    return () => { alive = false; clearTimeout(t); };
  }, [q]);

  const plusBtn = food => (
    <span className="mf-add-plus" onClick={e => { e.stopPropagation(); onQuickLog(food, hour); }}>
      <Icon name="plus" size={20} />
    </span>
  );

  const kcalPct = Math.max(0, Math.min(100, Math.round((totals.energy / (state.targets.energy || 1)) * 100)));

  return (
    <Sheet open={open} onClose={onClose} tall>
      <div className="mf-add-chips">
        <button className="mf-add-chip round" onClick={onClose} aria-label="Close food search"><Icon name="x" size={20} /></button>
        <span className="mf-add-chip">{hourLabel(hour)}</span>
        <span className="mf-add-chip kcal mf-num" style={{ '--pct': kcalPct }}>{totals.energy} / {state.targets.energy}</span>
        <span className="mf-add-chip duo">
          <button className="mf-add-duo-btn" onClick={() => setTab('Library')} aria-label="Library">
            <Icon name="utensils" size={18} color="var(--mf-fg-3)" />
          </button>
          <button className="mf-add-duo-btn" onClick={onClose} aria-label="Collapse">
            <Icon name="chevron-down" size={20} />
          </button>
        </span>
      </div>
      <div className="mf-add-tabs">
        {tabs.map(t => (
          <button key={t.id} className={'mf-add-tab' + (tab === t.id ? ' on' : '')}
            onClick={() => { if (t.id === 'Quick Add') onQuickAdd(); else if (t.id === 'Scan') onBarcode(); else setTab(t.id); }}>
            <Icon name={t.icon} size={20} />{t.id}
          </button>
        ))}
      </div>
      <div className="mf-add-body">
        {tab === 'AI' ? (
          <AIPanel hour={hour} onResult={onAIResult} />
        ) : q.trim().length >= 2 ? (
          <React.Fragment>
            <div className="mf-add-sec">{searching ? 'Suche…' : results.length + ' Treffer'}</div>
            {results.map(f => <FoodRow key={f.id} food={f} onClick={() => onPick(f, hour)} right={plusBtn(f)} />)}
            <button className="mf-create-food" onClick={() => onCustomFood(q)}>
              <span><Icon name="plus" size={20} /></span>
              <b>Custom Food erstellen</b>
              <small>{q.trim()}</small>
            </button>
            {!searching && !results.length && <div className="mf-empty">Keine Treffer für „{q}"</div>}
          </React.Fragment>
        ) : tab === 'Library' ? (
          <React.Fragment>
            <div className="mf-add-sec">Your Foods</div>
            <button className="mf-create-food" onClick={() => onCustomFood('')}>
              <span><Icon name="plus" size={20} /></span>
              <b>Custom Food erstellen</b>
              <small>Eigene Nahrungsmittel mit Makros speichern</small>
            </button>
            {libraryFoods.map(f => <FoodRow key={f.id} food={f} onClick={() => onPick(f, hour)} right={plusBtn(f)} />)}
          </React.Fragment>
        ) : (
          <React.Fragment>
            <div className="mf-add-sec">Favorites</div>
            <div className="mf-favrow">
              {favs.map(f => (
                <button key={f.id} className="mf-fav" onClick={() => onPick(f, hour)}>
                  <div className="mf-fav-thumb" style={{ background: f.color + '22' }}>
                    <Icon name={f.icon} size={26} color={f.color} />
                    <span className="mf-fav-add" onClick={e => { e.stopPropagation(); onQuickLog(f, hour); }}><Icon name="plus" size={16} /></span>
                  </div>
                  <span className="mf-fav-name">{f.name.split(' ').slice(0, 2).join(' ')}</span>
                </button>
              ))}
            </div>
            <div className="mf-add-sec">{hourLabel(hour)} Smart History</div>
            {timePicks.map(f => <FoodRow key={f.id} food={f} onClick={() => onPick(f, hour)} right={plusBtn(f)} />)}
            {history.frequent.length > 0 && (
              <React.Fragment>
                <div className="mf-add-sec">Frequent</div>
                {history.frequent.map(f => <FoodRow key={f.id} food={f} onClick={() => onPick(f, hour)} right={plusBtn(f)} />)}
              </React.Fragment>
            )}
            <div className="mf-add-sec">Latest</div>
            {latest.map(f => <FoodRow key={f.id} food={f} onClick={() => onPick(f, hour)} right={plusBtn(f)} />)}
          </React.Fragment>
        )}
      </div>
      {tab !== 'AI' && (
        <div className="mf-add-footer">
          <div className="mf-add-searchfield">
            <Icon name="search" size={20} color="var(--mf-fg-2)" />
            <input className="mf-add-input" placeholder="Search for a food" value={q}
              onChange={e => setQ(e.target.value)} />
          </div>
          <button className="mf-add-logbtn" onClick={onClose}>Log Foods</button>
        </div>
      )}
    </Sheet>
  );
}

/* ---- Macro donut ---------------------------------------- */
function MacroDonut({ p, f, c }) {
  const total = p * 4 + f * 9 + c * 4 || 1;
  const seg = [['protein', p * 4], ['fat', f * 9], ['carb', c * 4]];
  let acc = 0; const R = 52, C = 2 * Math.PI * R;
  return (
    <svg width="130" height="130" viewBox="0 0 130 130">
      <circle cx="65" cy="65" r={R} fill="none" stroke="#2A2A2D" strokeWidth="12" />
      {seg.map(([k, v], i) => {
        const len = (v / total) * C; const off = acc; acc += len;
        return <circle key={i} cx="65" cy="65" r={R} fill="none" stroke={MF[k]} strokeWidth="12"
          strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} transform="rotate(-90 65 65)" />;
      })}
    </svg>
  );
}

/* ---- Food Detail sheet ---------------------------------- */
function FoodDetailSheet({ open, food, hour, onBack, onClose, onLog, editEntry, onDelete, onCopy }) {
  const initialQty = () => Math.max(1, Math.round(Number(editEntry ? editEntry.qty : food?.per) || 100));
  const [qty, setQty] = React.useState(initialQty);
  const [h, setH] = React.useState(hour ?? 11);
  React.useEffect(() => {
    if (open && food) { setQty(initialQty()); setH(hour ?? 11); }
  }, [open, food, editEntry, hour]);
  if (!food) return <Sheet open={open} onClose={onClose} />;
  // Step size: fine-grained for weights/volumes (5/10/25 g·ml) so a photo's
  // gram estimate can be nudged precisely; whole units otherwise (e.g. 1 Stück).
  const isMass = food.unit === 'g' || food.unit === 'ml';
  const step = isMass ? (food.per >= 200 ? 25 : food.per >= 80 ? 10 : 5) : Math.max(1, Math.round(food.per || 1));
  const qtyNum = Math.max(1, Math.round(Number(qty) || 0));
  const m = scaleFood(food, qtyNum);
  return (
    <Sheet open={open} onClose={onClose} onBack={onBack} title={editEntry ? 'Edit Entry' : 'Add Food'}>
      <div className="mf-detail">
        <div className="mf-detail-head">
          <span className="mf-detail-icon" style={{ background: food.color + '22' }}>
            <Icon name={food.icon} size={30} color={food.color} />
          </span>
          <div>
            <div className="mf-detail-name">{food.name}</div>
            <div className="mf-detail-brand">{food.brand}</div>
          </div>
        </div>

        <div className="mf-detail-donut">
          <MacroDonut p={m.protein} f={m.fat} c={m.carb} />
          <div className="mf-detail-cal mf-num">
            <b>{m.energy}</b><span>🔥 kcal</span>
          </div>
        </div>

        <div className="mf-detail-macros">
          {['protein', 'fat', 'carb'].map(k => (
            <div className="mf-detail-macro" key={k}>
              <span className="mf-num" style={{ color: MF[k], fontWeight: 800, fontSize: 22 }}>{m[k]}g</span>
              <span className="mf-detail-macrolbl">{k === 'protein' ? 'Protein' : k === 'fat' ? 'Fat' : 'Carbs'}</span>
            </div>
          ))}
        </div>

        <div className="mf-detail-field">
          <span className="mf-detail-fieldlbl">Quantity</span>
          <div className="mf-stepper">
            <button onClick={() => setQty(Math.max(step, qtyNum - step))} aria-label="Weniger"><Icon name="minus" size={18} /></button>
            <span className="mf-stepper-val">
              <input className="mf-num mf-stepper-input" inputMode="numeric" aria-label="Menge"
                value={qty === '' ? '' : qty}
                onChange={e => { const d = e.target.value.replace(/[^0-9]/g, ''); setQty(d === '' ? '' : parseInt(d, 10)); }}
                onBlur={() => { if (qty === '' || qtyNum < 1) setQty(1); }} />
              <span className="mf-stepper-unit">{food.unit}</span>
            </span>
            <button onClick={() => setQty(qtyNum + step)} aria-label="Mehr"><Icon name="plus" size={18} /></button>
          </div>
        </div>
        <div className="mf-detail-field">
          <span className="mf-detail-fieldlbl">Time</span>
          <div className="mf-timepick">
            <button onClick={() => setH(x => Math.max(0, x - 1))}><Icon name="chevron-left" size={18} /></button>
            <span className="mf-num">{hourLabel(h)}</span>
            <button onClick={() => setH(x => Math.min(23, x + 1))}><Icon name="chevron-right" size={18} /></button>
          </div>
        </div>
      </div>
      <div className="mf-detail-actions">
        {editEntry && <button className="mf-detail-delete" onClick={onDelete}><Icon name="trash-2" size={20} /></button>}
        {editEntry && onCopy && <button className="mf-detail-copy" onClick={onCopy}><Icon name="copy" size={20} /></button>}
        <button className="mf-detail-log" onClick={() => onLog(buildEntry(food, qtyNum, h))}>
          {editEntry ? 'Save' : 'Log Food'}
        </button>
      </div>
    </Sheet>
  );
}

/* ---- Quick Add sheet ------------------------------------ */
function QuickAddSheet({ open, hour, onBack, onClose, onLog }) {
  const [v, setV] = React.useState({ name: '', energy: '', protein: '', fat: '', carb: '' });
  React.useEffect(() => { if (open) setV({ name: '', energy: '', protein: '', fat: '', carb: '' }); }, [open]);
  const set = (k, val) => setV(s => ({ ...s, [k]: val }));
  const fields = [['energy', 'Energy', '🔥'], ['protein', 'Protein', 'P'], ['fat', 'Fat', 'F'], ['carb', 'Carbs', 'C']];
  const log = () => onLog({
    foodId: 'quick', name: v.name || 'Quick Add', time: HH(hour ?? 11), qty: 1, unit: 'serving',
    icon: 'rocket', color: MF.energy,
    energy: +v.energy || 0, protein: +v.protein || 0, fat: +v.fat || 0, carb: +v.carb || 0,
  });
  return (
    <Sheet open={open} onClose={onClose} onBack={onBack} title="Quick Add">
      <div className="mf-quick">
        <input className="mf-quick-name" placeholder="Name (optional)" value={v.name} onChange={e => set('name', e.target.value)} />
        <div className="mf-quick-grid">
          {fields.map(([k, lbl, badge]) => (
            <div className="mf-quick-cell" key={k}>
              <span className="mf-quick-badge" style={{ color: MF[k] }}>{badge}</span>
              <input className="mf-quick-input mf-num" inputMode="numeric" placeholder="0"
                value={v[k]} onChange={e => set(k, e.target.value.replace(/[^0-9]/g, ''))} />
              <span className="mf-quick-lbl">{lbl}{k === 'energy' ? '' : ' (g)'}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mf-detail-actions">
        <button className="mf-detail-log" onClick={log}>Quick Add</button>
      </div>
    </Sheet>
  );
}

/* ---- Custom food sheet ---------------------------------- */
function CustomFoodSheet({ open, hour, initialName, onBack, onClose, onSave }) {
  const [v, setV] = React.useState({
    name: '', brand: '', per: '100', unit: 'g',
    energy: '', protein: '', fat: '', carb: '',
  });
  React.useEffect(() => {
    if (open) {
      setV({
        name: initialName || '',
        brand: '',
        per: '100',
        unit: 'g',
        energy: '',
        protein: '',
        fat: '',
        carb: '',
      });
    }
  }, [open, initialName]);
  const set = (k, val) => setV(s => ({ ...s, [k]: val }));
  const digits = val => val.replace(/[^0-9.]/g, '');
  const intDigits = val => val.replace(/[^0-9]/g, '');
  const num = val => Number(val) || 0;
  const canSave = v.name.trim() && num(v.per) > 0 &&
    (num(v.energy) > 0 || num(v.protein) > 0 || num(v.fat) > 0 || num(v.carb) > 0);
  const save = () => {
    if (!canSave) return;
    onSave({
      name: v.name.trim(),
      brand: v.brand.trim(),
      per: num(v.per),
      unit: v.unit.trim() || 'g',
      energy: num(v.energy),
      protein: num(v.protein),
      fat: num(v.fat),
      carb: num(v.carb),
      icon: 'utensils',
      color: MF.teal,
      fav: false,
    }, hour);
  };
  return (
    <Sheet open={open} onClose={onClose} onBack={onBack} title="Custom Food" headerRight={<Icon name="utensils" size={20} />}>
      <div className="mf-custom">
        <input className="mf-quick-name" placeholder="Food name" value={v.name} onChange={e => set('name', e.target.value)} />
        <input className="mf-custom-input" placeholder="Brand (optional)" value={v.brand} onChange={e => set('brand', e.target.value)} />
        <div className="mf-custom-serving">
          <label>
            <span>Serving</span>
            <input className="mf-custom-input mf-num" inputMode="decimal" value={v.per} onChange={e => set('per', digits(e.target.value))} />
          </label>
          <label>
            <span>Unit</span>
            <input className="mf-custom-input" value={v.unit} onChange={e => set('unit', e.target.value.slice(0, 12))} />
          </label>
        </div>
        <div className="mf-quick-grid">
          {[
            ['energy', 'Energy', 'kcal', MF.energy],
            ['protein', 'Protein', 'g', MF.protein],
            ['fat', 'Fat', 'g', MF.fat],
            ['carb', 'Carbs', 'g', MF.carb],
          ].map(([k, lbl, unit, color]) => (
            <div className="mf-quick-cell" key={k}>
              <span className="mf-quick-badge" style={{ color }}>{unit}</span>
              <input className="mf-quick-input mf-num" inputMode="numeric" placeholder="0"
                value={v[k]} onChange={e => set(k, intDigits(e.target.value))} />
              <span className="mf-quick-lbl">{lbl}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mf-detail-actions">
        <button className="mf-detail-log" onClick={save} disabled={!canSave}
          style={{ opacity: canSave ? 1 : 0.5 }}>Save Food</button>
      </div>
    </Sheet>
  );
}

/* ---- Food log actions ----------------------------------- */
function FoodLogMenuSheet({ open, onClose, hasEntries, canPaste, onCopyDay, onPasteDay }) {
  return (
    <Sheet open={open} onClose={onClose} title="Food Log" headerRight={<Icon name="clipboard-list" size={20} />}>
      <div className="mf-shortcut-list" style={{ paddingTop: 4 }}>
        <button className={'mf-shortcut-row' + (!hasEntries ? ' disabled' : '')}
          onClick={hasEntries ? onCopyDay : undefined}>
          <span className="mf-shortcut-rowic"><Icon name="copy" size={24} /></span>
          <span className="mf-shortcut-rowlbl">Tag kopieren</span>
          <Icon name="chevron-right" size={20} color="var(--mf-fg-3)" />
        </button>
        <button className={'mf-shortcut-row last' + (!canPaste ? ' disabled' : '')}
          onClick={canPaste ? onPasteDay : undefined}>
          <span className="mf-shortcut-rowic"><Icon name="clipboard-paste" size={24} /></span>
          <span className="mf-shortcut-rowlbl">In diesen Tag einfügen</span>
          <Icon name="chevron-right" size={20} color="var(--mf-fg-3)" />
        </button>
      </div>
    </Sheet>
  );
}

/* ---- Barcode sheet (simulated) -------------------------- */
function BarcodeSheet({ open, hour, onClose, onFound, onLabelScan }) {
  const videoRef = React.useRef(null);
  const doneRef = React.useRef(false);
  const [status, setStatus] = React.useState('scanning'); // scanning|searching|notfound|error

  const begin = React.useCallback(() => {
    doneRef.current = false;
    setStatus('scanning');
    window.startBarcodeScan(videoRef.current, async (code) => {
      if (doneRef.current) return;
      doneRef.current = true;
      window.stopBarcodeScan();
      setStatus('searching');
      const food = await window.lookupBarcode(code);
      if (food) onFound(food, hour);
      else setStatus('notfound');
    }).catch(() => setStatus('error'));
  }, [hour, onFound]);

  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(begin, 250); // wait for the sheet/video to mount
    return () => { clearTimeout(t); if (window.stopBarcodeScan) window.stopBarcodeScan(); };
  }, [open, begin]);

  const hint = {
    scanning: 'Barcode in den Rahmen halten…',
    searching: 'Produkt wird gesucht…',
    notfound: 'Kein Produkt gefunden',
    error: 'Kamera nicht verfügbar – erlaube den Zugriff',
  }[status];

  return (
    <Sheet open={open} onClose={onClose} title="Barcode scannen" headerRight={<Icon name="zap" size={20} />}>
      <div className="mf-scan">
        <div className="mf-scan-view">
          <div className={'mf-scan-frame' + (status === 'scanning' ? ' on' : '')}>
            <video ref={videoRef} className="mf-scan-video" muted playsInline autoPlay />
            <span className="mf-scan-line" />
            {(status === 'notfound' || status === 'error') && (
              <Icon name="scan-barcode" size={64} color="rgba(255,255,255,.5)" />
            )}
          </div>
          <div className="mf-scan-hint">{hint}</div>
          {(status === 'notfound' || status === 'error') && (
            <button className="mf-pill" onClick={begin}><Icon name="rotate-ccw" size={18} /> Erneut versuchen</button>
          )}
          {onLabelScan && (
            <button className="mf-pill" onClick={onLabelScan}>
              <Icon name="file-text" size={18} /> Nährwert-Label scannen
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}

/* ---- AI logging sheet ----------------------------------- */
function LegacyAISheet({ open, hour, onClose, onResult }) {
  const [text, setText] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (open) { setText(''); setBusy(false); } }, [open]);
  const samples = ['2 Eier mit Toast', 'Skyr mit Banane', 'Hähnchen mit Reis'];
  const analyze = () => {
    setBusy(true);
    setTimeout(() => {
      const t = text.toLowerCase();
      const f = FOOD_DB.find(x => t.includes(x.name.toLowerCase().split(' ')[0].toLowerCase()))
        || FOOD_DB.find(x => x.id === 'eggs');
      setBusy(false);
      onResult(f, hour);
    }, 1400);
  };
  return (
    <Sheet open={open} onClose={onClose} title="AI" headerRight={<Icon name="sparkles" size={20} />}>
      <div className="mf-ai">
        <div className="mf-ai-prompt">Beschreibe deine Mahlzeit — die KI schätzt die Makros.</div>
        <textarea className="mf-ai-input" rows="3" placeholder="z. B. „Skyr mit Banane und Honig…"
          value={text} onChange={e => setText(e.target.value)} />
        <div className="mf-ai-samples">
          {samples.map(s => <button key={s} className="mf-ai-chip" onClick={() => setText(s)}>{s}</button>)}
        </div>
      </div>
      <div className="mf-detail-actions">
        <button className="mf-detail-log" onClick={analyze} disabled={busy || !text.trim()}
          style={{ opacity: busy || !text.trim() ? 0.5 : 1 }}>
          {busy ? 'Analysiere…' : 'Makros schätzen'}
        </button>
      </div>
    </Sheet>
  );
}

function fileToImageData(file, maxSide = 1280, quality = 0.84) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('');
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Foto konnte nicht gelesen werden.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Foto konnte nicht verarbeitet werden.'));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

async function analyzeFoodViaApi({ task = 'meal', text = '', imageData = '' }) {
  const res = await fetch('/api/analyze-food', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task, text, imageData }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'AI Analyse fehlgeschlagen.');
  return data;
}

function aiFoodToAppFood(food, task = 'meal') {
  const f = food || {};
  return {
    id: (task === 'label' ? 'label-' : 'ai-') + Date.now(),
    name: String(f.name || (task === 'label' ? 'Scanned Label' : 'AI Meal')).slice(0, 80),
    brand: String(f.brand || (task === 'label' ? 'Nutrition Label' : 'AI Estimate')).slice(0, 80),
    icon: task === 'label' ? 'file-text' : 'sparkles',
    color: task === 'label' ? MF.teal : MF.purple,
    per: Math.max(1, Math.round(Number(f.per || 1) || 1)),
    unit: String(f.unit || 'g').slice(0, 12) || 'g',
    energy: Math.max(0, Math.round(Number(f.energy) || 0)),
    protein: Math.max(0, Math.round(Number(f.protein) || 0)),
    fat: Math.max(0, Math.round(Number(f.fat) || 0)),
    carb: Math.max(0, Math.round(Number(f.carb) || 0)),
    fav: false,
  };
}

function AIPanel({ hour, onResult }) {
  const [text, setText] = React.useState('');
  const [imageData, setImageData] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [listening, setListening] = React.useState(false);
  const recognitionRef = React.useRef(null);
  const speechBaseRef = React.useRef('');

  React.useEffect(() => () => {
    if (recognitionRef.current) recognitionRef.current.stop();
  }, []);

  const samples = ['2 Eier mit Toast', 'Skyr mit Banane', 'Hähnchen mit Reis'];

  const localFallback = () => {
    const estimated = estimateLocalMealFromText(text, { foodDb: FOOD_DB, scaleFood, mf: MF });
    if (estimated) return estimated;
    const t = normalizeAiTextForMatch(text);
    return FOOD_DB.find(x => t.includes(normalizeAiTextForMatch(x.name).split(' ')[0]))
      || FOOD_DB.find(x => x.id === 'eggs');
  };

  const onImage = async e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setError('');
    try {
      setImageData(await fileToImageData(file));
    } catch (err) {
      setError(err.message || 'Foto konnte nicht geladen werden.');
    }
  };

  const toggleSpeech = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech-to-Text wird in diesem Browser nicht unterstützt.');
      return;
    }
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }
    setError('');
    speechBaseRef.current = text.trim();
    const rec = new SpeechRecognition();
    recognitionRef.current = rec;
    rec.lang = navigator.language || 'de-DE';
    rec.interimResults = true;
    rec.continuous = false;
    rec.onstart = () => setListening(true);
    rec.onresult = event => {
      const spoken = Array.from(event.results)
        .map(result => result[0] && result[0].transcript)
        .filter(Boolean)
        .join(' ')
        .trim();
      setText([speechBaseRef.current, spoken].filter(Boolean).join(' '));
    };
    rec.onerror = event => {
      setListening(false);
      setError(event.error === 'not-allowed' ? 'Mikrofonzugriff wurde blockiert.' : 'Speech-to-Text fehlgeschlagen.');
    };
    rec.onend = () => setListening(false);
    rec.start();
  };

  const analyze = async () => {
    setError('');
    setBusy(true);
    try {
      const data = await analyzeFoodViaApi({ task: 'meal', text, imageData });
      setBusy(false);
      onResult(data.food ? aiFoodToAppFood(data.food, 'meal') : localFallback(), hour);
    } catch (e) {
      setBusy(false);
      if (text.trim() && !imageData) {
        onResult(localFallback(), hour);
        return;
      }
      setError(e.message || 'Analyse fehlgeschlagen');
    }
  };

  return (
    <div className="mf-ai mf-ai-panel">
      <div className="mf-ai-prompt">Beschreibe deine Mahlzeit, sprich sie ein, oder lade ein Foto hoch.</div>
      <div className="mf-ai-tools">
        <label className={'mf-ai-photo' + (imageData ? ' on' : '')}>
          <Icon name={imageData ? 'image-check' : 'camera'} size={20} />
          {imageData ? 'Foto bereit' : 'Foto'}
          <input type="file" accept="image/*" onChange={onImage} />
        </label>
        <button className={'mf-ai-photo' + (listening ? ' on' : '')} type="button" onClick={toggleSpeech} aria-pressed={listening}>
          <Icon name={listening ? 'mic-off' : 'mic'} size={20} />
          {listening ? 'Hört zu' : 'Sprache'}
        </button>
      </div>
      <textarea className="mf-ai-input" rows="3" placeholder="z. B. Skyr mit Banane und Honig"
        value={text} onChange={e => setText(e.target.value)} />
      <div className="mf-ai-samples">
        {samples.map(s => <button key={s} className="mf-ai-chip" onClick={() => setText(s)}>{s}</button>)}
      </div>
      {error && <div className="mf-ai-error">{error}</div>}
      <div className="mf-ai-actionrow">
        <button className="mf-detail-log" onClick={analyze} disabled={busy || (!text.trim() && !imageData)}
          style={{ opacity: busy || (!text.trim() && !imageData) ? 0.5 : 1 }}>
          {busy ? 'Analysiere…' : 'Makros schätzen'}
        </button>
      </div>
    </div>
  );
}

function LabelScannerSheet({ open, hour, onClose, onResult }) {
  const [imageData, setImageData] = React.useState('');
  const [text, setText] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!open) return;
    setImageData('');
    setText('');
    setBusy(false);
    setError('');
  }, [open]);

  const number = v => Math.max(0, Math.round(Number(v) || 0));
  const cleanUnit = v => String(v || 'g').trim().slice(0, 12) || 'g';

  const parseLabelText = raw => {
    const source = String(raw || '').replace(/,/g, '.');
    const lines = source.split(/\n+/).map(s => s.trim()).filter(Boolean);
    const findValue = patterns => {
      for (const re of patterns) {
        const m = source.match(re);
        if (m) return number(m[1]);
      }
      return 0;
    };
    const servingMatch = source.match(/(?:serving size|serving|portion|pro portion|per serving|per)\D{0,24}(\d+(?:\.\d+)?)\s*(g|ml|oz)?/i);
    const isNutrientLine = l =>
      /(nutrition\s*facts?)/i.test(l) ||
      /(?:serving|portion|energy|energie|kcal|calories|protein|fat|carb|fett|kohlenhydrate|eiweiss|eiweiß).*\d/i.test(l) ||
      /\d.*(?:kcal|protein|fat|carb|fett|kohlenhydrate|eiweiss|eiweiß)/i.test(l);
    const name = (lines.find(l => !isNutrientLine(l) && l.length <= 80) || 'Scanned Label').slice(0, 80);
    return {
      id: 'label-' + Date.now(),
      name,
      brand: 'Nutrition Label',
      icon: 'file-text',
      color: MF.teal,
      per: servingMatch ? number(servingMatch[1]) || 100 : 100,
      unit: cleanUnit(servingMatch && servingMatch[2] ? servingMatch[2] : 'g'),
      energy: findValue([
        /(?:energy|energie|calories|kcal)\D{0,30}(\d+(?:\.\d+)?)/i,
        /(\d+(?:\.\d+)?)\s*kcal/i,
      ]),
      protein: findValue([
        /(?:protein|eiweiss|eiweiß)\D{0,30}(\d+(?:\.\d+)?)/i,
        /(\d+(?:\.\d+)?)\s*g?\s*(?:protein|eiweiss|eiweiß)/i,
      ]),
      fat: findValue([
        /(?:fat|fett)\D{0,30}(\d+(?:\.\d+)?)/i,
        /(\d+(?:\.\d+)?)\s*g?\s*(?:fat|fett)/i,
      ]),
      carb: findValue([
        /(?:carbohydrate|carbs|kohlenhydrate)\D{0,30}(\d+(?:\.\d+)?)/i,
        /(\d+(?:\.\d+)?)\s*g?\s*(?:carbohydrate|carbs|kohlenhydrate)/i,
      ]),
      fav: false,
    };
  };

  const onImage = async e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setError('');
    try {
      setImageData(await fileToImageData(file));
    } catch (err) {
      setError(err.message || 'Foto konnte nicht geladen werden.');
    }
  };

  const analyze = async () => {
    setBusy(true);
    setError('');
    try {
      const data = imageData
        ? await analyzeFoodViaApi({ task: 'label', text, imageData })
        : null;
      const food = data?.food ? aiFoodToAppFood(data.food, 'label') : parseLabelText(text);
      if (!food.energy && !food.protein && !food.fat && !food.carb) {
        throw new Error(imageData ? 'Keine verwertbaren Label-Daten gefunden.' : 'Foto hochladen oder Label-Text einfügen.');
      }
      setBusy(false);
      onResult(food, hour);
    } catch (e) {
      setBusy(false);
      if (text.trim()) {
        const food = parseLabelText(text);
        if (food.energy || food.protein || food.fat || food.carb) {
          onResult(food, hour);
          return;
        }
      }
      setError(e.message || 'Label-Analyse fehlgeschlagen');
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Label Scanner" headerRight={<Icon name="file-text" size={20} />}>
      <div className="mf-ai">
        <div className="mf-ai-prompt">Foto vom Nutrition Label hochladen oder Label-Text einfügen.</div>
        <label className={'mf-ai-photo' + (imageData ? ' on' : '')}>
          <Icon name={imageData ? 'image-check' : 'camera'} size={20} />
          {imageData ? 'Label-Foto bereit' : 'Label-Foto'}
          <input type="file" accept="image/*" onChange={onImage} />
        </label>
        <textarea className="mf-ai-input" rows="5"
          placeholder={'Beispiel:\nProtein Bar\nServing 60g\nEnergy 220 kcal\nProtein 20g\nFat 7g\nCarbs 22g'}
          value={text} onChange={e => setText(e.target.value)} />
        {error && <div className="mf-ai-error">{error}</div>}
      </div>
      <div className="mf-detail-actions">
        <button className="mf-detail-log" onClick={analyze} disabled={busy || (!imageData && !text.trim())}
          style={{ opacity: busy || (!imageData && !text.trim()) ? 0.5 : 1 }}>
          {busy ? 'Analysiere…' : 'Label auslesen'}
        </button>
      </div>
    </Sheet>
  );
}

Object.assign(window, {
  Sheet, AddSheet, FoodDetailSheet, QuickAddSheet, CustomFoodSheet, FoodLogMenuSheet, BarcodeSheet, AIPanel, LabelScannerSheet,
  buildEntry, HH, hourLabel, MacroDonut, analyzeFoodViaApi,
});
