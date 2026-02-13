// Feature 1: Role Tags (single-select per player)
export const ROLE_TAGS = [
  'Forward',
  'Winger',
  'Inverted Winger',
  'Left Mid',
  'Right Mid',
  'Center Mid',
  'Attacking Mid',
  'Holding Mid',
  'Box to Box Mid',
  'Center Back',
  'Left Back',
  'Right Back',
  'Left Wing Back',
  'Right Wing Back',
  'Keeper',
] as const;

// Feature 2: Opponent Traits (pick up to 5)
export const OPPONENT_TRAITS = [
  'High Press',
  'Direct',
  'Strong in Wide Areas',
  'Set Piece Threat',
  'Counter-Attack',
  'Low Block',
  'Physical',
  'Possession-Based',
  'Quick Transitions',
  'Man-Marking',
  'Aerial Threat',
  'Compact Shape',
  'Overlapping Full-Backs',
  'Long Ball',
  'Zonal Marking',
] as const;

// Feature 3: Unit Tags
export const UNIT_TAGS = [
  'Back Line',
  'Midfield',
  'Front 3',
  'Full Team',
  'GK Unit',
  'Wide Players',
  'Central Spine',
] as const;

// Feature 3: Phase Tags
export const PHASE_TAGS = [
  'Build Out',
  'Pressing',
  'Transition',
  'Set Pieces',
  'Defensive Shape',
  'Attacking Patterns',
  'Counter-Press',
  'Recovery Runs',
  'Final Third',
  'Combination Play',
] as const;

// Feature 7: Quick Tactical Tags (in-session)
export const TACTICAL_TAGS = [
  'Press Higher',
  'Switch Play',
  'Drop Deeper',
  'Tighter Marking',
  'More Width',
  'Play Through Centre',
  'Quick Restart',
  'Hold Shape',
  'Push Up',
  'Slow Build',
  'Direct Forward',
  'Overload Flanks',
] as const;

// Feature 5: Season block labels
export const SEASON_BLOCK_LABELS = [
  'Preseason',
  'Build',
  'Peak',
  'Taper',
  'Mid-Season Break',
  'Playoffs',
] as const;

// Feature 5: Season block colors
export const SEASON_BLOCK_COLORS = [
  '#FF2E63',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#f97316',
] as const;
