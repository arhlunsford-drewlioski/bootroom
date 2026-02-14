import type { Activity, ActivityCategory } from '../db/database';

export const ACTIVITY_CATEGORIES: Record<ActivityCategory, { label: string; color: string }> = {
  warmup:       { label: 'Warmup',     color: '#f59e0b' },
  technical:    { label: 'Technical',  color: '#3b82f6' },
  tactical:     { label: 'Tactical',   color: '#8b5cf6' },
  physical:     { label: 'Physical',   color: '#ef4444' },
  fitness:      { label: 'Fitness',    color: '#f97316' },
  recovery:     { label: 'Recovery',   color: '#10b981' },
  'game-form':  { label: 'Game Form',  color: '#06b6d4' },
  'set-pieces': { label: 'Set Pieces', color: '#ec4899' },
};

export const BUILTIN_ACTIVITIES: Omit<Activity, 'id'>[] = [
  // Warmups
  {
    name: 'Dynamic Stretching',
    category: 'warmup',
    suggestedDuration: 10,
    intensity: 2,
    description: 'Progressive dynamic stretches — hip circles, leg swings, high knees, butt kicks, lateral shuffles.',
    isBuiltIn: true,
  },
  {
    name: 'Rondo Warmup (4v1)',
    category: 'warmup',
    suggestedDuration: 10,
    intensity: 3,
    description: 'Quick-touch possession circle. 4 players keep the ball from 1 defender in a small grid. Rotate on turnover.',
    isBuiltIn: true,
  },
  {
    name: 'Passing Gates',
    category: 'warmup',
    suggestedDuration: 10,
    intensity: 3,
    description: 'Pairs pass through cone gates scattered across the area. Score a point for each completed pass through a gate. Move to a new gate after each pass.',
    isBuiltIn: true,
  },

  // Technical
  {
    name: '5v2 Rondo',
    category: 'technical',
    suggestedDuration: 15,
    intensity: 5,
    description: 'Possession drill in tight space. 5 attackers maintain possession against 2 defenders. Focus on body shape, first touch, and quick decision-making.',
    isBuiltIn: true,
  },
  {
    name: '1v1 Finishing',
    category: 'technical',
    suggestedDuration: 15,
    intensity: 6,
    description: 'Attackers receive a pass and go 1v1 against a defender with a shot on goal. Emphasize quick turn, change of pace, and clinical finishing.',
    isBuiltIn: true,
  },
  {
    name: 'Passing Combinations',
    category: 'technical',
    suggestedDuration: 15,
    intensity: 4,
    description: 'Rehearsed passing patterns — wall passes, overlaps, third-man runs, through balls. Progress from walking pace to game speed.',
    isBuiltIn: true,
  },
  {
    name: 'Crossing & Finishing',
    category: 'technical',
    suggestedDuration: 15,
    intensity: 6,
    description: 'Wide players deliver crosses into the box. Attackers time their runs for near post, far post, and cutback finishes.',
    isBuiltIn: true,
  },

  // Tactical
  {
    name: 'Pressing Triggers',
    category: 'tactical',
    suggestedDuration: 20,
    intensity: 7,
    description: 'Team pressing on identified cues — backward pass, poor touch, sideline trap. Work in units to press as a coordinated block.',
    isBuiltIn: true,
  },
  {
    name: 'Build Out from Back',
    category: 'tactical',
    suggestedDuration: 20,
    intensity: 5,
    description: 'GK distribution through defensive and midfield thirds. Focus on creating passing angles, movement off the ball, and progressing under pressure.',
    isBuiltIn: true,
  },
  {
    name: 'Transition Game',
    category: 'tactical',
    suggestedDuration: 20,
    intensity: 7,
    description: 'Attack-to-defense and defense-to-attack transitions. On turnover, attacking team must press immediately while defending team looks to counter.',
    isBuiltIn: true,
  },
  {
    name: 'Defensive Shape',
    category: 'tactical',
    suggestedDuration: 15,
    intensity: 5,
    description: 'Compact defensive lines. Practice sliding as a unit, covering, and maintaining distances between lines against ball movement.',
    isBuiltIn: true,
  },

  // Game Form
  {
    name: 'Small-Sided Game (4v4)',
    category: 'game-form',
    suggestedDuration: 15,
    intensity: 7,
    description: 'High-tempo game in a reduced area with small goals. Emphasize quick transitions, tight control, and constant movement.',
    isBuiltIn: true,
  },
  {
    name: 'Full Scrimmage',
    category: 'game-form',
    suggestedDuration: 25,
    intensity: 8,
    description: 'Match conditions on a full-size pitch. Apply the session focus in a realistic game environment. Coach can freeze play for coaching moments.',
    isBuiltIn: true,
  },
  {
    name: 'Conditioned Game',
    category: 'game-form',
    suggestedDuration: 20,
    intensity: 7,
    description: 'Modified rules to reinforce the session theme — e.g., two-touch only, must play wide before shooting, goals from crosses count double.',
    isBuiltIn: true,
  },

  // Fitness / Physical
  {
    name: 'Agility Circuit',
    category: 'fitness',
    suggestedDuration: 15,
    intensity: 8,
    description: 'Ladder drills, cone weaves, hurdle hops, and short sprints. Rotate through stations with active recovery between sets.',
    isBuiltIn: true,
  },
  {
    name: 'Interval Sprints',
    category: 'physical',
    suggestedDuration: 15,
    intensity: 9,
    description: 'Repeated sprint efforts — 30m sprints with walk-back recovery. Progress to longer distances or shorter rest periods.',
    isBuiltIn: true,
  },

  // Set Pieces
  {
    name: 'Corner Kick Routines',
    category: 'set-pieces',
    suggestedDuration: 15,
    intensity: 4,
    description: 'Rehearse attacking and defending corner variations. Near post flick-ons, far post runs, short corners, and zonal/man-marking assignments.',
    isBuiltIn: true,
  },

  // Recovery
  {
    name: 'Cool Down & Stretch',
    category: 'recovery',
    suggestedDuration: 10,
    intensity: 1,
    description: 'Light jog followed by static stretching. Hold each stretch 20-30 seconds. Focus on hamstrings, quads, hip flexors, and calves.',
    isBuiltIn: true,
  },
];
