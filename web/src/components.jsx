/* ============================================================
   MacroFactor UI Kit — shared primitives
   (Data + MF colors live in store.jsx — referenced globally.)
   ============================================================ */

/* ---- Lucide icon wrapper -------------------------------- */
function Icon({ name, size = 24, color = 'currentColor', strokeWidth = 2, style }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!ref.current || !window.lucide) return;
    ref.current.innerHTML = `<i data-lucide="${name}"></i>`;
    window.lucide.createIcons({ attrs: { 'stroke-width': strokeWidth } });
  });
  return (
    <span ref={ref} className="mf-icon"
      style={{ display: 'inline-flex', width: size, height: size, color, flex: 'none', ...style }} />
  );
}

/* ---- Status bar ----------------------------------------- */
function StatusBar({ dark }) {
  return (
    <div className="mf-statusbar">
      <span className="mf-sb-time">11:19</span>
      <span className="mf-sb-right">
        <Icon name="bell-off" size={15} />
        <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2, height: 13 }}>
          <i style={{ width: 3, height: 5, background: '#fff', borderRadius: 1 }} />
          <i style={{ width: 3, height: 8, background: '#fff', borderRadius: 1 }} />
          <i style={{ width: 3, height: 11, background: '#fff', borderRadius: 1 }} />
          <i style={{ width: 3, height: 13, background: '#fff', borderRadius: 1 }} />
        </span>
        <span style={{ fontWeight: 600, fontSize: 15 }}>5G</span>
        <span className="mf-battery"><span style={{ width: '72%' }} /></span>
      </span>
    </div>
  );
}

/* ---- Bottom navigation ---------------------------------- */
const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
  { id: 'foodlog',   label: 'Tagebuch',  icon: 'apple' },
  { id: 'fab',       label: '',          icon: 'plus' },
  { id: 'strategy',  label: 'Strategie', icon: 'strategy-dots' },
  { id: 'more',      label: 'Mehr',      icon: 'more-horizontal' },
];

function BottomNav({ active, onNav, onFab }) {
  return (
    <div className="mf-bottomnav">
      {NAV.map(n => n.id === 'fab' ? (
        <button key="fab" className="mf-fab" onClick={onFab} aria-label="Hinzufügen">
          <Icon name="plus" size={26} color="#0B0C0E" />
        </button>
      ) : (
        <button key={n.id} className={'mf-navitem' + (active === n.id ? ' on' : '')}
          onClick={() => onNav(n.id)}>
          <span className="mf-navicon">
            {n.badge && <span className="mf-navbadge">!</span>}
            {n.icon === 'strategy-dots'
              ? <span className="mf-strategy-glyph" aria-hidden="true"><i /><i /><i /></span>
              : <Icon name={n.icon} size={24} />}
          </span>
          <span className="mf-navlabel">{n.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ---- Persistent search bar ------------------------------ */
function SearchBar({ onTap, onAI }) {
  return (
    <div className="mf-searchrow">
      <button className="mf-searchbar" onClick={onTap}>
        <Icon name="search" size={20} color="var(--mf-fg-2)" />
        <span className="mf-search-ph">Food suchen</span>
        <Icon name="scan-barcode" size={22} color="var(--mf-fg-2)" />
      </button>
      {onAI && (
        <button className="mf-search-ai" onClick={onAI} aria-label="Mit KI loggen">
          <Icon name="sparkles" size={20} />
        </button>
      )}
    </div>
  );
}

/* ---- Segmented control ---------------------------------- */
function Segmented({ options, value, onChange }) {
  const activeIndex = Math.max(0, options.indexOf(value));
  return (
    <div className="mf-segmented" style={{ '--mf-seg-count': options.length, '--mf-seg-index': activeIndex }}>
      {options.map(o => (
        <button key={o} type="button" aria-pressed={value === o}
          className={'mf-seg' + (value === o ? ' on' : '')}
          onClick={() => onChange(o)}>{o}</button>
      ))}
    </div>
  );
}

/* ---- Macro stat header (447 / 2505 + progress) ---------- */
function MacroStat({ macroKey, value, goal, compact }) {
  const m = MACRO_META.find(x => x.key === macroKey);
  const pct = goal ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  const head = macroKey === 'energy'
    ? <span>{m.letter} {value}</span>
    : <span>{m.unit} {value}</span>;
  return (
    <div className="mf-macrostat">
      <div className="mf-macrostat-top mf-num" style={compact ? { fontSize: 15 } : null}>
        <span style={{ color: m.color, fontWeight: 800 }}>{head}</span>
        <span style={{ color: 'var(--mf-fg-2)' }}> / {goal}</span>
      </div>
      <div className="mf-track"><span style={{ width: pct + '%', background: m.color }} /></div>
    </div>
  );
}

/* ---- Section header w/ optional action ------------------ */
function SectionHead({ title, action, onAction }) {
  return (
    <div className="mf-sectionhead">
      <span className="mf-h2">{title}</span>
      {action && <button className="mf-link" onClick={onAction}>{action}</button>}
    </div>
  );
}

/* ---- Screen title + eyebrow ----------------------------- */
function ScreenTitle({ eyebrow, title, right }) {
  return (
    <div className="mf-screentitle">
      {eyebrow && <div className="mf-eyebrow">{eyebrow}</div>}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 className="mf-title">{title}</h1>
        {right}
      </div>
    </div>
  );
}

/* ---- Sub-page header (back chevron + title) ------------- */
function SubHeader({ title, onBack, right }) {
  return (
    <div className="mf-subheader">
      <button className="mf-iconbtn" onClick={onBack}><Icon name="chevron-left" size={23} /></button>
      <span className="mf-subheader-title">{title}</span>
      <span className="mf-subheader-right">{right}</span>
    </div>
  );
}

/* ---- Toast --------------------------------------------- */
function Toast({ show, children }) {
  return <div className={'mf-toast' + (show ? ' show' : '')}>{children}</div>;
}

/* ---- Food row (reusable list item) ---------------------- */
function FoodRow({ food, right, onClick, subtitle }) {
  return (
    <button className="mf-add-item" onClick={onClick}>
      <span className="mf-add-thumb" style={{ background: food.color + '22' }}>
        <Icon name={food.icon} size={19} color={food.color} />
      </span>
      <div className="mf-add-mid">
        <div className="mf-add-name">{food.name}</div>
        <div className="mf-add-macros mf-num">
          {subtitle || <span>{food.energy}E {food.protein}P {food.fat}F {food.carb}C <span className="dot">•</span> {food.per} {food.unit}</span>}
        </div>
      </div>
      {right}
    </button>
  );
}

Object.assign(window, {
  Icon, StatusBar, BottomNav, SearchBar, Segmented,
  MacroStat, SectionHead, ScreenTitle, SubHeader, Toast, FoodRow, NAV,
});
