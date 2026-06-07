/* ============================================================
   MacroFactor PWA — App shell (routing + state wiring)
   ============================================================ */

function AppInner() {
  const { state, dispatch } = useApp();
  const [tab, setTab] = React.useState('dashboard');   // bottom-nav tab
  const [page, setPage] = React.useState(null);        // full-screen subpage over tab
  const [pageStack, setPageStack] = React.useState([]);
  const [sheet, setSheet] = React.useState(null);      // { id, food, hour, entry }
  const [toast, setToast] = React.useState('');
  const [onboarding, setOnboarding] = React.useState(false);
  const toastT = React.useRef(null);

  const flash = msg => {
    setToast(msg); clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(''), 1700);
  };

  const openSheet = (id, extra = {}) => setSheet({ id, hour: new Date().getHours(), ...extra });
  const openWeight = (date = TODAY) => openSheet('weight', { date });
  const closeSheet = () => setSheet(null);
  const openPage = (id) => {
    if (!id) {
      setPage(null);
      setPageStack([]);
      return;
    }
    setPageStack(stack => (page ? [...stack, page] : stack));
    setPage(id);
  };
  const replacePage = (id, clearStack = false) => {
    setPage(id || null);
    if (!id || clearStack) setPageStack([]);
  };
  const back = () => {
    const prev = pageStack[pageStack.length - 1] || null;
    setPageStack(stack => stack.slice(0, -1));
    setPage(prev);
  };
  const switchTab = (id) => {
    setPage(null);
    setPageStack([]);
    setTab(id);
  };

  /* ----- actions ----- */
  const logFood = entry => { dispatch({ type: 'LOG_FOOD', entry }); closeSheet(); flash(entry.name + ' geloggt'); };
  const quickLog = (food, hour) => { dispatch({ type: 'LOG_FOOD', entry: buildEntry(food, food.per, hour ?? new Date().getHours()) }); flash(food.name + ' geloggt'); };
  const saveEntry = entry => {
    dispatch({ type: 'DELETE_ENTRY', id: sheet.entry.id });
    dispatch({ type: 'LOG_FOOD', entry });
    closeSheet(); flash('Aktualisiert');
  };
  const deleteEntry = () => { dispatch({ type: 'DELETE_ENTRY', id: sheet.entry.id }); closeSheet(); flash('Eintrag gelöscht'); };
  const addWeight = (v, date = TODAY) => {
    const value = Number(v);
    if (!Number.isFinite(value) || value <= 0) { flash('Bitte gueltiges Gewicht eingeben'); return; }
    dispatch({ type: 'ADD_WEIGHT', date, value });
    closeSheet();
    flash('Gewicht gespeichert');
  };
  const saveRecipe = r => { dispatch({ type: 'ADD_RECIPE', recipe: r }); replacePage('recipes', true); flash('Rezept gespeichert'); };
  const saveCustomFood = async (food, h) => {
    const saved = window.saveCustomFood ? await window.saveCustomFood(food) : food;
    openSheet('detail', { food: saved, hour: h ?? sheet?.hour ?? new Date().getHours() });
    flash('Food gespeichert');
  };
  const foodClipboard = () => {
    try { return JSON.parse(localStorage.getItem('mf_food_clipboard') || 'null'); }
    catch (e) { return null; }
  };
  const copySelectedDay = () => {
    const entries = ((state.days[state.selectedDate] || {}).entries || []);
    if (!entries.length) { closeSheet(); flash('Keine Foods zum Kopieren'); return; }
    try {
      localStorage.setItem('mf_food_clipboard', JSON.stringify({
        type: 'day',
        copiedFrom: state.selectedDate,
        entries,
      }));
    } catch (e) {}
    closeSheet();
    flash('Tag kopiert');
  };
  const copyEntries = (entries, type = 'foods') => {
    const items = (entries || []).filter(Boolean);
    if (!items.length) { flash('Keine Foods zum Kopieren'); return; }
    try {
      localStorage.setItem('mf_food_clipboard', JSON.stringify({
        type,
        copiedFrom: state.selectedDate,
        entries: items,
      }));
    } catch (e) {}
    closeSheet();
    flash(type === 'meal' ? 'Meal kopiert' : items.length === 1 ? 'Food kopiert' : 'Foods kopiert');
  };
  const pasteToSelectedDay = () => {
    const clip = foodClipboard();
    if (!clip || !Array.isArray(clip.entries) || !clip.entries.length) {
      closeSheet(); flash('Nichts zum Einfuegen'); return;
    }
    clip.entries.forEach(e => {
      const { id, ...rest } = e;
      dispatch({ type: 'LOG_FOOD', date: state.selectedDate, entry: { ...rest } });
    });
    closeSheet();
    flash('Tag eingefuegt');
  };

  const shortcutAction = act => {
    if (act === 'recipes') { closeSheet(); openPage('recipes'); }
    else if (act === 'metrics') { closeSheet(); openPage('metrics'); }
    else if (act === 'weight') openWeight(TODAY);
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
  const pages = {
    insights:     <InsightsScreen onBack={back} />,
    metrics:      <ScaleWeightScreen onBack={back} onAddWeight={() => openWeight(TODAY)} />,
    weighttrend:  <ScaleWeightScreen onBack={back} onAddWeight={() => openWeight(TODAY)} title="Weight Trend" color={MF.purple} />,
    expenditure:  <ExpenditureScreen onBack={back} />,
    steps:        <StepsScreen onBack={back} onAdd={() => openPage('integrations')} />,
    bodyfat:      <BodyFatScreen onBack={back} onAdd={() => flash('Progress-Fotos sind noch nicht verbunden')} />,
    weighin:      <WeighInScreen onBack={back} onAddWeight={() => openWeight(TODAY)} />,
    foodlogging:  <FoodLoggingScreen onBack={back} />,
    nutridata:    <NutritionDataScreen onBack={back} onAdd={() => openSheet('quickadd')} />,
    customize:    <CustomizeDashboardScreen onBack={back} />,
    recipes:      <RecipesScreen onBack={back} onNew={() => openPage('recipe-new')} onImport={() => openPage('recipe-import')} />,
    'recipe-new': <RecipeNewScreen onBack={back} onSave={saveRecipe} />,
    'recipe-import': <RecipeImportScreen onBack={back} onSave={saveRecipe} />,
    account:      <AccountScreen onBack={back} />,
    subscription: <SubscriptionScreen onBack={back} />,
    integrations: <IntegrationsScreen onBack={back} />,
    units:        <UnitsScreen onBack={back} />,
  };

  /* ----- tabs ----- */
  const tabs = {
    dashboard: <DashboardScreen onSearch={() => openSheet('add')} onGo={openPage} />,
    foodlog:   <FoodLogScreen onSearch={() => openSheet('add')}
                  onMenu={() => openSheet('foodlogmenu')}
                  onAddAt={h => openSheet('add', { hour: h })}
                  onCopyHour={(entries) => copyEntries(entries, 'meal')}
                  onEditEntry={e => { const food = FOOD_DB.find(f => f.id === e.foodId) || { ...e, per: e.qty || 1, brand: '' }; openSheet('detail', { food, hour: parseInt(e.time, 10), entry: e }); }} />,
    strategy:  <StrategyScreen onSearch={() => openSheet('add')} onCheckIn={() => openSheet('checkin')}
                  onNewGoal={() => setOnboarding(true)}
                  onEditGoal={() => setOnboarding(true)}
                  onReopenGoal={() => {
                    if (!((state.goalHistory || []).length)) { flash('Kein vorheriges Ziel vorhanden'); return; }
                    dispatch({ type: 'REOPEN_PREVIOUS_GOAL' });
                    flash('Vorheriges Ziel wieder geoeffnet');
                  }} />,
    more:      <MoreScreen onGo={id => { if (id === 'reset') { dispatch({ type: 'RESET' }); flash('Aktualisiert'); } else openPage(id); }} />,
  };

  return (
    <div className={'mf-screenwrap' + (!page ? ' has-bottomnav' : '')}>
      <StatusBar />
      <div className="mf-screenarea">
        {page ? pages[page] : tabs[tab]}
      </div>
      {!page && (
        <BottomNav active={tab} onNav={switchTab} onFab={() => openSheet('shortcuts')} />
      )}
      <div className="mf-homeind" />

      {/* sheets */}
      <AddSheet open={sheet?.id === 'add'} hour={sheet?.hour ?? new Date().getHours()} onClose={closeSheet}
        onPick={(food, hour) => { if (window.cacheFood) window.cacheFood(food); openSheet('detail', { food, hour }); }}
        onQuickLog={quickLog}
        onQuickAdd={() => openSheet('quickadd')}
        onBarcode={() => openSheet('barcode')}
        onAI={() => openSheet('ai')}
        onLabelScan={() => openSheet('labelscan')}
        onCustomFood={name => openSheet('customfood', { name, hour: sheet?.hour ?? new Date().getHours() })} />

      <FoodDetailSheet key={sheet?.id === 'detail'
          ? `${sheet?.entry?.id || sheet?.food?.id || 'food'}-${sheet?.food?.per || 0}`
          : 'detail-closed'}
        open={sheet?.id === 'detail'} food={sheet?.food} hour={sheet?.hour}
        editEntry={sheet?.entry}
        onBack={sheet?.entry ? null : () => openSheet('add', { hour: sheet?.hour })}
        onClose={closeSheet}
        onLog={sheet?.entry ? saveEntry : logFood}
        onCopy={sheet?.entry ? () => copyEntries([sheet.entry], 'food') : null}
        onDelete={deleteEntry} />

      <QuickAddSheet open={sheet?.id === 'quickadd'} hour={sheet?.hour}
        onBack={() => openSheet('add')} onClose={closeSheet} onLog={logFood} />

      <CustomFoodSheet open={sheet?.id === 'customfood'} hour={sheet?.hour}
        initialName={sheet?.name || ''}
        onBack={() => openSheet('add', { hour: sheet?.hour ?? new Date().getHours() })}
        onClose={closeSheet}
        onSave={saveCustomFood} />

      <BarcodeSheet open={sheet?.id === 'barcode'} hour={sheet?.hour} onClose={closeSheet}
        onFound={(food, hour) => { if (window.cacheFood) window.cacheFood(food); openSheet('detail', { food, hour }); }} />

      <AISheet open={sheet?.id === 'ai'} hour={sheet?.hour} onClose={closeSheet}
        onResult={(food, hour) => openSheet('detail', { food, hour })} />

      <LabelScannerSheet open={sheet?.id === 'labelscan'} hour={sheet?.hour} onClose={closeSheet}
        onResult={saveCustomFood} />

      <WeightSheet open={sheet?.id === 'weight'} date={sheet?.date || TODAY} onClose={closeSheet} onSave={addWeight} />

      <ShortcutsSheet open={sheet?.id === 'shortcuts'} onClose={closeSheet} onAction={shortcutAction} />

      <FoodLogMenuSheet open={sheet?.id === 'foodlogmenu'} onClose={closeSheet}
        hasEntries={!!(((state.days[state.selectedDate] || {}).entries || []).length)}
        canPaste={!!(foodClipboard() && foodClipboard().entries && foodClipboard().entries.length)}
        onCopyDay={copySelectedDay}
        onPasteDay={pasteToSelectedDay} />

      <CheckInSheet open={sheet?.id === 'checkin'} onClose={closeSheet}
        onLogWeight={() => openWeight(TODAY)}
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

window.App = App;
