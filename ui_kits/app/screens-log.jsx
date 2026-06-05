/* ============================================================
   MacroFactor UI Kit — Logging flow
   Sheet shell + Add, Food Detail, Quick Add, Barcode, AI
   ============================================================ */

/* ---- Bottom sheet shell --------------------------------- */
function Sheet({ open, onClose, children, title, headerRight, tall, onBack }) {
  return (
    <div className={'mf-sheet-scrim' + (open ? ' open' : '')} onClick={onClose}>
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

/* ---- Add / Log sheet ------------------------------------ */
function AddSheet({ open, onClose, hour, onPick, onQuickLog, onQuickAdd, onBarcode, onAI }) {
  const { state } = useApp();
  const [tab, setTab] = React.useState('Search');
  const [q, setQ] = React.useState('');
  const tabs = [
    { id: 'Scan', icon: 'scan-barcode' }, { id: 'Search', icon: 'search' },
    { id: 'AI', icon: 'sparkles' }, { id: 'Quick Add', icon: 'rocket' }, { id: 'Library', icon: 'book-open' },
  ];
  const totals = dayTotals(state, state.selectedDate);
  const results = q.trim()
    ? FOOD_DB.filter(f => f.name.toLowerCase().includes(q.toLowerCase()))
    : [];
  const favs = FOOD_DB.filter(f => f.fav);
  const picks = [FOOD_DB.find(f => f.id === 'pro35')];
  const latest = [FOOD_DB.find(f => f.id === 'muesli')];

  React.useEffect(() => { if (open) { setTab('Search'); setQ(''); } }, [open]);

  const plusBtn = food => (
    <span className="mf-add-plus" onClick={e => { e.stopPropagation(); onQuickLog(food, hour); }}>
      <Icon name="plus" size={20} />
    </span>
  );

  return (
    <Sheet open={open} onClose={onClose} tall>
      <div className="mf-add-chips">
        <button className="mf-add-chip round" onClick={onClose}><Icon name="x" size={20} /></button>
        <span className="mf-add-chip">{hourLabel(hour)}</span>
        <span className="mf-add-chip active mf-num">{totals.energy} / {state.targets.energy}</span>
        <button className="mf-add-chip round"><Icon name="utensils" size={18} color="var(--mf-fg-2)" /></button>
        <button className="mf-add-chip round"><Icon name="chevron-down" size={20} /></button>
      </div>
      <div className="mf-add-tabs">
        {tabs.map(t => (
          <button key={t.id} className={'mf-add-tab' + (tab === t.id ? ' on' : '')}
            onClick={() => { if (t.id === 'Quick Add') onQuickAdd(); else if (t.id === 'Scan') onBarcode(); else if (t.id === 'AI') onAI(); else setTab(t.id); }}>
            <Icon name={t.icon} size={20} />{t.id}
          </button>
        ))}
      </div>
      <div className="mf-add-body">
        {q.trim() ? (
          <React.Fragment>
            <div className="mf-add-sec">{results.length} Treffer</div>
            {results.map(f => <FoodRow key={f.id} food={f} onClick={() => onPick(f, hour)} right={plusBtn(f)} />)}
            {!results.length && <div className="mf-empty">Keine Treffer für „{q}"</div>}
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
            <div className="mf-add-sec">{hourLabel(hour)} Picks</div>
            {picks.map(f => <FoodRow key={f.id} food={f} onClick={() => onPick(f, hour)} right={plusBtn(f)} />)}
            <div className="mf-add-sec">Latest</div>
            {latest.map(f => <FoodRow key={f.id} food={f} onClick={() => onPick(f, hour)} right={plusBtn(f)} />)}
          </React.Fragment>
        )}
      </div>
      <div className="mf-add-footer">
        <div className="mf-add-searchfield">
          <Icon name="search" size={20} color="var(--mf-fg-2)" />
          <input className="mf-add-input" placeholder="Search for a food" value={q}
            onChange={e => setQ(e.target.value)} />
        </div>
        <button className="mf-add-logbtn" onClick={onClose}>Log Foods</button>
      </div>
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
function FoodDetailSheet({ open, food, hour, onBack, onClose, onLog, editEntry, onDelete }) {
  const [qty, setQty] = React.useState(100);
  const [h, setH] = React.useState(hour ?? 11);
  React.useEffect(() => {
    if (open && food) { setQty(editEntry ? editEntry.qty : food.per); setH(hour ?? 11); }
  }, [open, food]);
  if (!food) return <Sheet open={open} onClose={onClose} />;
  const m = scaleFood(food, qty);
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
            <button onClick={() => setQty(q => Math.max(food.per, q - food.per))}><Icon name="minus" size={18} /></button>
            <span className="mf-num">{qty} {food.unit}</span>
            <button onClick={() => setQty(q => q + food.per)}><Icon name="plus" size={18} /></button>
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
        <button className="mf-detail-log" onClick={() => onLog(buildEntry(food, qty, h))}>
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

/* ---- Barcode sheet (simulated) -------------------------- */
function BarcodeSheet({ open, hour, onClose, onFound }) {
  const [scanning, setScanning] = React.useState(true);
  React.useEffect(() => {
    if (!open) return;
    setScanning(true);
    const t = setTimeout(() => {
      setScanning(false);
      const f = FOOD_DB[Math.floor(Math.random() * 6)];
      onFound(f, hour);
    }, 1800);
    return () => clearTimeout(t);
  }, [open]);
  return (
    <Sheet open={open} onClose={onClose} title="Scan Barcode" headerRight={<Icon name="zap" size={20} />}>
      <div className="mf-scan">
        <div className="mf-scan-view">
          <div className={'mf-scan-frame' + (scanning ? ' on' : '')}>
            <span className="mf-scan-line" />
            <Icon name="scan-barcode" size={64} color="rgba(255,255,255,.5)" />
          </div>
          <div className="mf-scan-hint">{scanning ? 'Suche Barcode…' : 'Gefunden!'}</div>
        </div>
      </div>
    </Sheet>
  );
}

/* ---- AI logging sheet ----------------------------------- */
function AISheet({ open, hour, onClose, onResult }) {
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

Object.assign(window, {
  Sheet, AddSheet, FoodDetailSheet, QuickAddSheet, BarcodeSheet, AISheet,
  buildEntry, HH, hourLabel, MacroDonut,
});
