import { useState } from 'react';
import Dashboard from './components/Dashboard';
import TeamSetup from './components/TeamSetup';
import LineupCreator from './components/LineupCreator';
import WeekView from './components/WeekView';
import Calendar from './components/calendar';
import DayView from './components/DayView';
import SeasonOverview from './components/SeasonOverview';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayViewOrigin, setDayViewOrigin] = useState<'week' | 'calendar'>('week');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const teamId = 1;

  const navigateToDay = (dateStr: string, from?: 'week' | 'calendar') => {
    setSelectedDate(dateStr);
    setDayViewOrigin(from ?? 'week');
    setCurrentView('day');
  };

  const navigateToMatch = () => {
    setCurrentView('matches');
  };

  const isDayFromWeek = currentView === 'day' && dayViewOrigin === 'week';
  const isDayFromCalendar = currentView === 'day' && dayViewOrigin === 'calendar';

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
        <div className="md:hidden flex items-center justify-between bg-surface-1 border-b border-surface-5 px-4 py-3">
          <h1 onClick={() => { setCurrentView('dashboard'); setMobileNavOpen(false); }} className="text-2xl font-bold text-accent tracking-wider font-display cursor-pointer">BOOTROOM</h1>
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="text-txt-muted hover:text-txt p-1"
          >
            {mobileNavOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile nav dropdown */}
        {mobileNavOpen && (
          <nav className="md:hidden bg-surface-1 border-b border-surface-5 px-4 pb-3 space-y-1">
            {navItem('dashboard', 'Dashboard')}
            {navItem('team', 'Team')}
            {navItem('matches', 'Matches')}
            {navItem('week', 'Week', isDayFromWeek)}
            {navItem('calendar', 'Calendar', isDayFromCalendar)}
            {navItem('season', 'Season')}
          </nav>
        )}

        {/* Desktop sidebar */}
        <aside className="hidden md:block w-52 shrink-0 bg-surface-1 min-h-screen border-r border-surface-5 p-4">
          <h1 onClick={() => setCurrentView('dashboard')} className="text-3xl font-bold text-accent tracking-wider mb-6 font-display cursor-pointer">BOOTROOM</h1>
          <nav className="space-y-1">
            {navItem('dashboard', 'Dashboard')}
            {navItem('team', 'Team')}
            {navItem('matches', 'Matches')}
            {navItem('week', 'Week', isDayFromWeek)}
            {navItem('calendar', 'Calendar', isDayFromCalendar)}
            {navItem('season', 'Season')}
          </nav>
        </aside>

        <main className="flex-1 p-4 md:p-6 min-w-0">
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
          {currentView === 'matches' && <LineupCreator />}
          {currentView === 'week' && (
            <WeekView
              teamId={teamId}
              onNavigateToDay={navigateToDay}
              onNavigateToMatch={navigateToMatch}
            />
          )}
          {currentView === 'calendar' && (
            <Calendar
              teamId={teamId}
              onNavigateToDay={(dateStr) => navigateToDay(dateStr, 'calendar')}
              onNavigateToMatch={navigateToMatch}
            />
          )}
          {currentView === 'day' && selectedDate && (
            <DayView
              teamId={teamId}
              dateStr={selectedDate}
              onBack={() => setCurrentView(dayViewOrigin)}
              backLabel={dayViewOrigin === 'calendar' ? 'Back to Calendar' : 'Back to Week'}
              onNavigateToMatch={navigateToMatch}
              onDateChange={(dateStr) => setSelectedDate(dateStr)}
            />
          )}
          {currentView === 'season' && (
            <SeasonOverview teamId={teamId} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
