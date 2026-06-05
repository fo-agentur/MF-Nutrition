/* ============================================================
   MacroFactor UI Kit — Onboarding & Check-In
   ============================================================ */

/* ---- Onboarding flow ------------------------------------ */
function Onboarding({ onDone }) {
  const [step, setStep] = React.useState(0);
  const [data, setData] = React.useState({ name: '', goal: 'lose', sex: 'm', weight: 78, height: 180, activity: 'medium' });
  const set = (k, v) => setData(s => ({ ...s, [k]: v }));

  // crude target calc for demo
  const calcTargets = () => {
    const bmr = data.sex === 'm'
      ? 10 * data.weight + 6.25 * data.height - 5 * 28 + 5
      : 10 * data.weight + 6.25 * data.height - 5 * 28 - 161;
    const act = { low: 1.35, medium: 1.55, high: 1.75 }[data.activity];
    let kcal = bmr * act;
    if (data.goal === 'lose') kcal -= 400; if (data.goal === 'gain') kcal += 300;
    kcal = Math.round(kcal / 5) * 5;
    const protein = Math.round(data.weight * 2.1);
    const fat = Math.round(kcal * 0.27 / 9);
    const carb = Math.round((kcal - protein * 4 - fat * 9) / 4);
    return { energy: kcal, protein, fat, carb };
  };
  const targets = calcTargets();

  const next = () => setStep(s => s + 1);
  const finish = () => onDone({
    profile: { name: data.name || 'floriflei07', initials: (data.name || 'FL').slice(0, 2).toUpperCase(), memberSince: '2. Juni 2026' },
    goal: {
      type: data.goal,
      targetWeight: data.goal === 'lose' ? Math.max(45, data.weight - 5) : data.goal === 'gain' ? data.weight + 5 : data.weight,
      rateKgPerWeek: data.goal === 'maintain' ? 0 : 0.21,
    },
    program: {
      mode: 'coached',
      macroStyle: 'balanced',
      caloriePattern: 'weekdayWeekend',
    },
    targets,
  });

  const steps = [
    /* 0 — welcome */
    (
      <div className="mf-onb-center">
        <div className="mf-onb-mark">MF</div>
        <h1 className="mf-title" style={{ fontSize: 52, textAlign: 'center' }}>Empower<br />Every Body</h1>
        <p className="mf-onb-lede">Wissenschaftsbasiertes Tracking, das sich an dich anpasst. Lass uns dein Ziel einrichten.</p>
        <button className="mf-onb-btn" onClick={next}>Los geht's</button>
      </div>
    ),
    /* 1 — name */
    (
      <div className="mf-onb-step">
        <div className="mf-eyebrow">Schritt 1 von 4</div>
        <h2 className="mf-onb-q">Wie heißt du?</h2>
        <input className="mf-onb-input" placeholder="Dein Name" value={data.name} onChange={e => set('name', e.target.value)} autoFocus />
        <div className="mf-onb-spacer" />
        <button className="mf-onb-btn" onClick={next}>Weiter</button>
      </div>
    ),
    /* 2 — goal */
    (
      <div className="mf-onb-step">
        <div className="mf-eyebrow">Schritt 2 von 4</div>
        <h2 className="mf-onb-q">Was ist dein Ziel?</h2>
        <div className="mf-onb-cards">
          {[['lose', 'Abnehmen', 'trending-down'], ['maintain', 'Halten', 'minus'], ['gain', 'Muskeln aufbauen', 'trending-up']].map(([k, lbl, ic]) => (
            <button key={k} className={'mf-onb-card' + (data.goal === k ? ' on' : '')} onClick={() => set('goal', k)}>
              <Icon name={ic} size={26} />{lbl}
            </button>
          ))}
        </div>
        <div className="mf-onb-spacer" />
        <button className="mf-onb-btn" onClick={next}>Weiter</button>
      </div>
    ),
    /* 3 — stats */
    (
      <div className="mf-onb-step">
        <div className="mf-eyebrow">Schritt 3 von 4</div>
        <h2 className="mf-onb-q">Deine Daten</h2>
        <div className="mf-onb-seg"><Segmented options={['m', 'w']} value={data.sex} onChange={v => set('sex', v)} /></div>
        <label className="mf-onb-slabel">Gewicht <b className="mf-num">{data.weight} kg</b></label>
        <input type="range" min="45" max="160" value={data.weight} onChange={e => set('weight', +e.target.value)} className="mf-range" />
        <label className="mf-onb-slabel">Größe <b className="mf-num">{data.height} cm</b></label>
        <input type="range" min="140" max="210" value={data.height} onChange={e => set('height', +e.target.value)} className="mf-range" />
        <label className="mf-onb-slabel">Aktivität</label>
        <div className="mf-onb-seg"><Segmented options={['low', 'medium', 'high']} value={data.activity} onChange={v => set('activity', v)} /></div>
        <div className="mf-onb-spacer" />
        <button className="mf-onb-btn" onClick={next}>Ziel berechnen</button>
      </div>
    ),
    /* 4 — reveal */
    (
      <div className="mf-onb-step">
        <div className="mf-eyebrow">Dein Startpunkt</div>
        <h2 className="mf-onb-q">Dein täglicher Plan</h2>
        <div className="mf-onb-target mf-num">{targets.energy}<small> 🔥 kcal</small></div>
        <div className="mf-onb-macros">
          {[['protein', targets.protein], ['fat', targets.fat], ['carb', targets.carb]].map(([k, v]) => (
            <div key={k} className="mf-onb-macro">
              <span className="mf-num" style={{ color: MF[k], fontWeight: 800, fontSize: 26 }}>{v}g</span>
              <span className="mf-detail-macrolbl">{k === 'protein' ? 'Protein' : k === 'fat' ? 'Fat' : 'Carbs'}</span>
            </div>
          ))}
        </div>
        <p className="mf-onb-lede" style={{ textAlign: 'left' }}>Diese Werte passen sich jede Woche automatisch an deine Fortschritte an.</p>
        <div className="mf-onb-spacer" />
        <button className="mf-onb-btn" onClick={finish}>App starten</button>
      </div>
    ),
  ];

  return (
    <div className="mf-screen mf-onb">
      {step > 0 && (
        <div className="mf-onb-top">
          <button className="mf-iconbtn" onClick={() => setStep(s => s - 1)}><Icon name="chevron-left" size={26} /></button>
          <div className="mf-onb-progress"><span style={{ width: (step / 4 * 100) + '%' }} /></div>
        </div>
      )}
      {steps[step]}
    </div>
  );
}

/* ---- Check-In sheet ------------------------------------- */
function CheckInSheet({ open, onClose, onApply, onLogWeight }) {
  const { state } = useApp();
  const [stage, setStage] = React.useState(0);
  React.useEffect(() => { if (open) setStage(0); }, [open]);
  const rec = computeCheckInRecommendation(state, TODAY);
  const readiness = rec.readiness;
  const newTargets = rec.targets;
  const diffLabel = rec.deltaEnergy > 0 ? '+' + rec.deltaEnergy : String(rec.deltaEnergy);
  const wUnit = weightUnit(state);
  return (
    <Sheet open={open} onClose={onClose} title="Weekly Check-In" headerRight={<Icon name="circle-check" size={20} />} tall>
      {stage === 0 ? (
        <div className="mf-checkin-body mf-checkin-review">
          <div className="mf-checkin-illus">📊</div>
          <h2 className="mf-onb-q" style={{ textAlign: 'center' }}>Dein Wochen-Update</h2>
          <p className="mf-onb-lede" style={{ textAlign: 'center' }}>
            Basierend auf deinem Gewicht ({weightDisplayText(state, latestWeight(state))} {wUnit}) und deiner Adhärenz passen wir dein Energieziel an.
          </p>
          <p className="mf-onb-lede mf-checkin-reason" style={{ textAlign: 'center' }}>{rec.reason}</p>
          <div className="mf-checkin-modules">
            <div className="mf-checkin-module">
              <span className={'mf-checkin-state' + (readiness.nutritionDays >= 4 ? ' ok' : '')}>
                <Icon name={readiness.nutritionDays >= 4 ? 'check' : 'pause'} size={16} />
              </span>
              <div>
                <div className="mf-checkin-module-title">Nutrition Logging</div>
                <div className="mf-checkin-module-sub">{readiness.nutritionDays}/7 Tage geloggt, mindestens 4 noetig</div>
              </div>
            </div>
            <div className="mf-checkin-module">
              <span className={'mf-checkin-state' + (readiness.hasRecentWeight ? ' ok' : '')}>
                <Icon name={readiness.hasRecentWeight ? 'check' : 'scale'} size={16} />
              </span>
              <div>
                <div className="mf-checkin-module-title">Weigh-In</div>
                <div className="mf-checkin-module-sub">
                  {readiness.latestWeight ? `${weightDisplayText(state, readiness.latestWeight)} ${wUnit}, zuletzt ${readiness.latestWeightDate}` : 'Noch kein Gewicht geloggt'}
                </div>
              </div>
            </div>
            <div className="mf-checkin-module">
              <span className={'mf-checkin-state' + (rec.expenditure ? ' ok' : '')}>
                <Icon name={rec.expenditure ? 'check' : 'activity'} size={16} />
              </span>
              <div>
                <div className="mf-checkin-module-title">Expenditure</div>
                <div className="mf-checkin-module-sub">
                  {rec.expenditure ? `${rec.expenditure} kcal geschaetzt, Trend ${weightDisplayText(state, rec.trend)} ${wUnit}` : 'Wartet auf mehr Gewicht/Nutrition-Daten'}
                </div>
              </div>
            </div>
          </div>
          <div className="mf-checkin-row">
            <div><div className="mf-insight-sub">Bisher</div><div className="mf-num mf-checkin-num">{state.targets.energy} 🔥</div></div>
            <Icon name="arrow-right" size={24} color="var(--mf-fg-2)" />
            <div><div className="mf-insight-sub">Neu</div><div className="mf-num mf-checkin-num" style={{ color: MF.energy }}>{newTargets.energy} 🔥</div></div>
          </div>
          {rec.ready && (
            <div className="mf-checkin-macros">
              <span className="mf-num" style={{ color: rec.deltaEnergy >= 0 ? MF.carb : MF.protein }}>{diffLabel} kcal</span>
              <span className="mf-num" style={{ color: MF.protein }}>{newTargets.protein}P</span>
              <span className="mf-num" style={{ color: MF.fat }}>{newTargets.fat}F</span>
              <span className="mf-num" style={{ color: MF.carb }}>{newTargets.carb}C</span>
            </div>
          )}
          <div className="mf-detail-actions" style={{ padding: '20px 0 0' }}>
            {!readiness.hasRecentWeight && onLogWeight ? (
              <button className="mf-detail-log" onClick={onLogWeight}>Gewicht jetzt eintragen</button>
            ) : rec.ready ? (
              <button className="mf-detail-log" onClick={() => { onApply(newTargets); setStage(1); }}>Uebernehmen</button>
            ) : (
              <button className="mf-detail-log" onClick={onClose}>Fertig</button>
            )}
          </div>
          <div className="mf-detail-actions" style={{ padding: '20px 0 0', display: 'none' }}>
            <button className="mf-detail-log" onClick={() => { onApply(newTargets); setStage(1); }}>Übernehmen</button>
          </div>
        </div>
      ) : (
        <div className="mf-checkin-body" style={{ textAlign: 'center' }}>
          <div className="mf-checkin-illus">🚀</div>
          <h2 className="mf-onb-q">Check-In abgeschlossen!</h2>
          <p className="mf-onb-lede" style={{ textAlign: 'center' }}>Dein neues Ziel ist aktiv. Bis nächste Woche!</p>
          <div className="mf-detail-actions" style={{ padding: '20px 0 0' }}>
            <button className="mf-detail-log" onClick={onClose}>Fertig</button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

Object.assign(window, { Onboarding, CheckInSheet });
