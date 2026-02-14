import type { SessionType } from '../db/database';

// Training Phases (Training row)
export const TRAINING_PHASES = [
  'General Preparation',
  'Specific Preparation',
  'Pre-Competition',
  'Competition',
  'Championship Phase',
  'Transition/Recovery',
  'Off-Season'
] as const;

// Technical Focus options (Technical row)
export const TECHNICAL_FOCUS = [
  'Ball Mastery',
  'Passing & Receiving',
  'Dribbling & Turns',
  'Finishing',
  'First Touch',
  '1v1 Attacking',
  '1v1 Defending',
  'Heading',
  'Crossing',
  'Long Passing'
] as const;

// Tactical Focus options (Tactical row)
export const TACTICAL_FOCUS = [
  'Formation Work',
  'Build-Up Play',
  'Pressing Systems',
  'Defensive Shape',
  'Attacking Transitions',
  'Defensive Transitions',
  'Set Pieces',
  'Counter-Attacking',
  'Possession Play',
  'High Press',
  'Low Block',
  'Wide Play'
] as const;

// Physical Focus options (Physical row)
export const PHYSICAL_FOCUS = [
  'Aerobic Base',
  'Speed & Agility',
  'Strength & Power',
  'Endurance',
  'Flexibility & Mobility',
  'Injury Prevention',
  'Recovery & Regeneration',
  'Plyometrics',
  'Sprint Mechanics'
] as const;

// Session Types with baseline intensity values (1-10 scale)
export const SESSION_TYPES: Record<SessionType, { label: string; baseIntensity: number; color: string }> = {
  technical: {
    label: 'Technical',
    baseIntensity: 5,
    color: '#3b82f6' // blue
  },
  tactical: {
    label: 'Tactical',
    baseIntensity: 6,
    color: '#8b5cf6' // purple
  },
  physical: {
    label: 'Physical',
    baseIntensity: 8,
    color: '#ef4444' // red
  },
  fitness: {
    label: 'Fitness',
    baseIntensity: 9,
    color: '#f97316' // orange
  },
  recovery: {
    label: 'Recovery',
    baseIntensity: 2,
    color: '#10b981' // green
  }
};

// Periodization row colors (for visual distinction)
export const PERIODIZATION_COLORS = {
  training: '#06b6d4',   // cyan (primary accent)
  technical: '#3b82f6',  // blue
  tactical: '#8b5cf6',   // purple
  physical: '#ef4444'    // red
} as const;

// Default color palette for periodization blocks (can be overridden)
export const BLOCK_COLORS = [
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#6366f1'  // indigo
] as const;
