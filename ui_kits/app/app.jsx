/* ============================================================
   MacroFactor UI Kit — App shell (routing + state wiring)
   ============================================================ */

function AppInner() {
  const { state, dispatch } = useApp();
  const [tab, setTab] = React.useState('foodlog');     // bottom-nav tab
  const [page, setPage] = React.useState(null);        // full-screen subpage over tab
  const [sheet, setSheet] = React.useState(null);      // { id, food, hour, entry }
  const [toast, setToast] = React.useState('');
  const [onboarding, setOnboarding] = React.useState(false);
  const toastT = React.useRef(null);

  const flash = msg => {
    setToast(msg); clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(''), 1700);
  };

  const openSheet = (id, extra = {}) => setSheet({ id, hour: 11, ...extra });
  const closeSheet = () => setSheet(null);

  const curHour = () => 11;

  /* ----- actions ----- */
  const logFood = entry => { dispatch({ type: 'LOG_FOOD', entry }); closeSheet(); flash(entry.name + ' geloggt'); };
  const quickLog = (food, hour) => { dispatch({ type: 'LOG_FOOD', entry: buildEntry(food, food.per, hour ?? 11) }); flash(food.name + ' geloggt'); };
  const saveEntry = entry => {
    dispatch({ type: 'DELETE_ENTRY', id: sheet.entry.id });
    dispatch({ type: 'LOG_FOOD', entry });
    closeSheet(); flash('Aktualisiert');
  };
  const deleteEntry = () => { dispatch({ type: 'DELETE_ENTRY', id: sheet.entry.id }); closeSheet(); flash('Eintrag gelöscht'); };
  const addWeight = v => { dispatch({ type: 'ADD_WEIGHT', date: state.selectedDate, value: v }); closeSheet(); flash('Gewicht gespeichert'); };
  const saveRecipe = r => { dispatch({ type: 'ADD_RECIPE', recipe: r }); setPage('recipes'); flash('Rezept gespeichert'); };

  const shortcutAction = act => {
    if (act === 'recipes') { closeSheet(); setPage('recipes'); }
    else if (act === 'metrics') { closeSheet(); setPage('metrics'); }
    else if (act === 'weight') openSheet('weight');
    else openSheet(act);
  };

  /* ----- onboarding gate ----- */
  if (onboarding) {
    return (
      <div className="mf-screenwrap">
        <StatusBar />
        <div className="mf-screenarea">
          <Onboarding onDone={p => { dispatch({ type: 'ONBOARD', ...p }); setOnboarding(false); flash('Willkommen!'); }} />
        </div>
        <div className="mf-homeind" />
        <Toast show={!!toast}>{toast}</Toast>
      </div>
    );
  }

  /* ----- subpages ----- */
  const back = () => setPage(null);
  const pages = {
    insights:     <InsightsScreen onBack={back} />,
    metrics:      <MetricsScreen onBack={back} onAddWeight={() => openSheet('weight')} />,
    recipes:      <RecipesScreen onBack={back} onNew={() => setPage('recipe-new')} />,
    'recipe-new': <RecipeNewScreen onBack={() => setPage('recipes')} onSave={saveRecipe} />,
    account:      <AccountScreen onBack={back} />,
    subscription: <SubscriptionScreen onBack={back} />,
    integrations: <IntegrationsScreen onBack={back} />,
    units:        <UnitsScreen onBack={back} />,
  };

  /* ----- tabs ----- */
  const tabs = {
    dashboard: <DashboardScreen onSearch={() => openSheet('add')} onGo={setPage} />,
    foodlog:   <FoodLogScreen onSearch={() => openSheet('add')}
                  onAddAt={h => openSheet('add', { hour: h })}
                  onEditEntry={e => { const food = FOOD_DB.find(f => f.id === e.foodId) || { ...e, per: e.qty, brand: '' }; openSheet('detail', { food, hour: parseInt(e.time, 10), entry: e }); }} />,
    strategy:  <StrategyScreen onSearch={() => openSheet('add')} onCheckIn={() => openSheet('checkin')} onNewGoal={() => setOnboarding(true)} />,
    more:      <MoreScreen onGo={id => { if (id === 'reset') { dispatch({ type: 'RESET' }); flash('Zurückgesetzt'); } else setPage(id); }} />,
  };

  return (
    <div className="mf-screenwrap">
      <StatusBar />
      <div className="mf-screenarea">
        {page ? pages[page] : tabs[tab]}
      </div>
      {!page && (
        <BottomNav active={tab} onNav={id => { setPage(null); setTab(id); }} onFab={() => openSheet('shortcuts')} />
      )}
      <div className="mf-homeind" />

      {/* sheets */}
      <AddSheet open={sheet?.id === 'add'} hour={sheet?.hour ?? 11} onClose={closeSheet}
        onPick={(food, hour) => openSheet('detail', { food, hour })}
        onQuickLog={quickLog}
        onQuickAdd={() => openSheet('quickadd')}
        onBarcode={() => openSheet('barcode')}
        onAI={() => openSheet('ai')} />

      <FoodDetailSheet open={sheet?.id === 'detail'} food={sheet?.food} hour={sheet?.hour}
        editEntry={sheet?.entry}
        onBack={sheet?.entry ? null : () => openSheet('add', { hour: sheet?.hour })}
        onClose={closeSheet}
        onLog={sheet?.entry ? saveEntry : logFood}
        onDelete={deleteEntry} />

      <QuickAddSheet open={sheet?.id === 'quickadd'} hour={sheet?.hour}
        onBack={() => openSheet('add')} onClose={closeSheet} onLog={logFood} />

      <BarcodeSheet open={sheet?.id === 'barcode'} hour={sheet?.hour} onClose={closeSheet}
        onFound={(food, hour) => openSheet('detail', { food, hour })} />

      <AISheet open={sheet?.id === 'ai'} hour={sheet?.hour} onClose={closeSheet}
        onResult={(food, hour) => openSheet('detail', { food, hour })} />

      <WeightSheet open={sheet?.id === 'weight'} onClose={closeSheet} onSave={addWeight} />

      <ShortcutsSheet open={sheet?.id === 'shortcuts'} onClose={closeSheet} onAction={shortcutAction} />

      <CheckInSheet open={sheet?.id === 'checkin'} onClose={closeSheet}
        onApply={t => dispatch({ type: 'SET_TARGETS', targets: t })} />

      <Toast show={!!toast}>{toast}</Toast>
    </div>
  );
}

function App() {
  return (
    <div className="mf-stage">
      <div className="mf-phone">
        <AppProvider>
          <AppInner />
        </AppProvider>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
