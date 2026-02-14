import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/database';
import { initTheme, applyTeamColors } from './utils/theme';
import { seedBuiltInData } from './db/seed';
import Dashboard from './components/Dashboard';
import TeamSetup from './components/TeamSetup';
import MatchesList from './components/MatchesList';
import LineupCreator from './components/LineupCreator';
import Calendar from './components/calendar';
import DayView from './components/DayView';
import SeasonOverview from './components/SeasonOverview';
import MatchDetail from './components/MatchDetail';
import Library from './components/Library';
import Settings from './components/Settings';

// Apply theme immediately on module load (before first render)
initTheme();

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [lineupMatchId, setLineupMatchId] = useState<number | null>(null);

  const team = useLiveQuery(() => db.teams.toCollection().first(), []);
  const teamId = team?.id ?? 0;

  // Seed built-in activities and session templates on first launch
  useEffect(() => { seedBuiltInData(); }, []);

  // Apply team accent colors whenever the active team changes
  useEffect(() => {
    applyTeamColors(team?.primaryColor, team?.secondaryColor);
  }, [team?.primaryColor, team?.secondaryColor]);

  const navigateToDay = (dateStr: string) => {
    setSelectedDate(dateStr);
    setCurrentView('day');
  };

  const navigateToMatch = (matchId?: number) => {
    if (matchId) {
      setSelectedMatchId(matchId);
    } else {
      setCurrentView('matches');
    }
  };

  const isDayFromCalendar = currentView === 'day';

  const navItem = (view: string, label: string, alsoActive?: boolean) => {
    const active = currentView === view || alsoActive === true;
    return (
      <button
        onClick={() => { setCurrentView(view); setMobileNavOpen(false); }}
        className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          active
            ? 'bg-surface-3 text-accent'
            : 'text-txt-muted hover:bg-surface-3 hover:text-txt'
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-surface-0 text-txt">
      <div className="flex flex-col md:flex-row">
        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between bg-surface-1 border-b border-surface-5 px-4 py-3 sticky top-0 z-40">
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="text-txt-muted hover:text-txt p-2 -ml-2"
            aria-label="Toggle navigation"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {mobileNavOpen
                ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
                : <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>
              }
            </svg>
          </button>
          <h1 onClick={() => { setCurrentView('dashboard'); setMobileNavOpen(false); }} className="text-2xl font-bold text-accent tracking-wider font-display cursor-pointer">COATCH</h1>
          {/* Spacer to keep logo roughly centered */}
          <div className="w-[38px]" />
        </div>

        {/* Mobile nav overlay */}
        <div
          className={`md:hidden fixed inset-0 z-50 transition-opacity duration-200 ${
            mobileNavOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileNavOpen(false)} />
          {/* Slide-in panel */}
          <nav
            className={`absolute top-0 left-0 bottom-0 w-64 bg-surface-1 border-r border-surface-5 p-4 pt-6 flex flex-col transition-transform duration-200 ${
              mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <h1
              onClick={() => { setCurrentView('dashboard'); setMobileNavOpen(false); }}
              className="text-3xl font-bold text-accent tracking-wider mb-6 font-display cursor-pointer"
            >
              COATCH
            </h1>
            <div className="space-y-1 flex-1">
              {navItem('dashboard', 'Dashboard')}
              {navItem('team', 'Team')}
              {navItem('calendar', 'Calendar', isDayFromCalendar)}
              {navItem('matches', 'Matches')}
              {navItem('lineups', 'Lineups')}
              {navItem('season', 'Season')}
              {navItem('library', 'Library')}
              <div className="border-t border-surface-5 mt-2 pt-2">
                {navItem('settings', 'Settings')}
              </div>
            </div>
          </nav>
        </div>

        {/* Desktop sidebar */}
        <aside className="hidden md:block w-52 shrink-0 bg-surface-1 min-h-screen border-r border-surface-5 p-4">
          <h1 onClick={() => setCurrentView('dashboard')} className="text-3xl font-bold text-accent tracking-wider mb-6 font-display cursor-pointer">COATCH</h1>
          <nav className="space-y-1">
            {navItem('dashboard', 'Dashboard')}
            {navItem('team', 'Team')}
            {navItem('calendar', 'Calendar', isDayFromCalendar)}
            {navItem('matches', 'Matches')}
            {navItem('lineups', 'Lineups')}
            {navItem('season', 'Season')}
            {navItem('library', 'Library')}
            <div className="border-t border-surface-5 mt-2 pt-2">
              {navItem('settings', 'Settings')}
            </div>
          </nav>
        </aside>

        <main className="flex-1 p-3 sm:p-4 md:p-6 min-w-0 overflow-x-hidden">
          {currentView === 'dashboard' && (
            <Dashboard
              teamId={teamId}
              onNavigateToMatch={navigateToMatch}
              onNavigateToDay={navigateToDay}
              onAddMatch={() => setCurrentView('matches')}
              onAddPractice={() => setCurrentView('calendar')}
            />
          )}
          {currentView === 'team' && <TeamSetup />}
          {currentView === 'matches' && (
            <MatchesList
              teamId={teamId}
              onSelectMatch={(matchId) => setSelectedMatchId(matchId)}
            />
          )}
          {currentView === 'lineups' && (
            <LineupCreator
              initialMatchId={lineupMatchId}
              onBackToMatch={(matchId) => {
                setSelectedMatchId(matchId);
                setLineupMatchId(null);
              }}
            />
          )}
          {currentView === 'calendar' && (
            <Calendar
              teamId={teamId}
              onNavigateToDay={navigateToDay}
              onNavigateToMatch={navigateToMatch}
            />
          )}
          {currentView === 'day' && selectedDate && (
            <DayView
              teamId={teamId}
              dateStr={selectedDate}
              onBack={() => setCurrentView('calendar')}
              backLabel="Back to Calendar"
              onNavigateToMatch={navigateToMatch}
              onDateChange={(dateStr) => setSelectedDate(dateStr)}
            />
          )}
          {currentView === 'season' && (
            <SeasonOverview teamId={teamId} />
          )}
          {currentView === 'library' && <Library />}
          {currentView === 'settings' && <Settings />}
        </main>
      </div>

      {/* MatchDetail modal */}
      {selectedMatchId !== null && (
        <MatchDetail
          matchId={selectedMatchId}
          onClose={() => setSelectedMatchId(null)}
          onOpenLineup={() => {
            setLineupMatchId(selectedMatchId);
            setSelectedMatchId(null);
            setCurrentView('lineups');
          }}
        />
      )}
    </div>
  );
}

export default App;
