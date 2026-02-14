import type { SessionType } from '../db/database';

export interface SessionTemplateSeed {
  name: string;
  sessionType: SessionType;
  focus: string;
  duration: number;
  intensity: number;
  description: string;
  activitySlots: {
    slot: 'warmup' | 'activity1' | 'activity2' | 'activity3' | 'activity4';
    activityName: string;
  }[];
  unitTags?: string[];
  phaseTags?: string[];
}

export const BUILTIN_TEMPLATES: SessionTemplateSeed[] = [
  {
    name: 'Heavy Technical — Rondos',
    sessionType: 'technical',
    focus: 'Possession & Quick Passing',
    duration: 90,
    intensity: 5,
    description: 'Rondo-heavy session building from warmup possession circles through tight-space drills to a game-form finish.',
    activitySlots: [
      { slot: 'warmup',    activityName: 'Rondo Warmup (4v1)' },
      { slot: 'activity1', activityName: '5v2 Rondo' },
      { slot: 'activity2', activityName: 'Passing Combinations' },
      { slot: 'activity3', activityName: 'Small-Sided Game (4v4)' },
      { slot: 'activity4', activityName: 'Cool Down & Stretch' },
    ],
    unitTags: ['Full Team'],
    phaseTags: ['Combination Play'],
  },
  {
    name: 'Tactical — Pressing & Transitions',
    sessionType: 'tactical',
    focus: 'High Press & Transition Play',
    duration: 90,
    intensity: 7,
    description: 'Shape-focused session working defensive pressing triggers and quick attack-to-defense transitions.',
    activitySlots: [
      { slot: 'warmup',    activityName: 'Dynamic Stretching' },
      { slot: 'activity1', activityName: 'Pressing Triggers' },
      { slot: 'activity2', activityName: 'Transition Game' },
      { slot: 'activity3', activityName: 'Conditioned Game' },
      { slot: 'activity4', activityName: 'Cool Down & Stretch' },
    ],
    unitTags: ['Full Team'],
    phaseTags: ['Pressing', 'Transition'],
  },
  {
    name: 'Fitness Session',
    sessionType: 'fitness',
    focus: 'Speed & Conditioning',
    duration: 75,
    intensity: 9,
    description: 'High-intensity fitness work combining agility circuits with repeated sprint efforts and a competitive finish.',
    activitySlots: [
      { slot: 'warmup',    activityName: 'Dynamic Stretching' },
      { slot: 'activity1', activityName: 'Agility Circuit' },
      { slot: 'activity2', activityName: 'Interval Sprints' },
      { slot: 'activity3', activityName: 'Small-Sided Game (4v4)' },
      { slot: 'activity4', activityName: 'Cool Down & Stretch' },
    ],
  },
  {
    name: 'Set Piece Focus',
    sessionType: 'tactical',
    focus: 'Set Pieces & Finishing',
    duration: 75,
    intensity: 5,
    description: 'Rehearse corner, free kick, and throw-in routines with crossing and finishing practice.',
    activitySlots: [
      { slot: 'warmup',    activityName: 'Passing Gates' },
      { slot: 'activity1', activityName: 'Corner Kick Routines' },
      { slot: 'activity2', activityName: 'Crossing & Finishing' },
      { slot: 'activity3', activityName: '1v1 Finishing' },
      { slot: 'activity4', activityName: 'Cool Down & Stretch' },
    ],
    phaseTags: ['Set Pieces', 'Final Third'],
  },
  {
    name: 'Game-Like Session',
    sessionType: 'tactical',
    focus: 'Match Preparation',
    duration: 90,
    intensity: 7,
    description: 'Game-realistic session progressing from build-up play through conditioned games to a full scrimmage.',
    activitySlots: [
      { slot: 'warmup',    activityName: 'Rondo Warmup (4v1)' },
      { slot: 'activity1', activityName: 'Build Out from Back' },
      { slot: 'activity2', activityName: 'Conditioned Game' },
      { slot: 'activity3', activityName: 'Full Scrimmage' },
      { slot: 'activity4', activityName: 'Cool Down & Stretch' },
    ],
    unitTags: ['Full Team'],
    phaseTags: ['Build Out', 'Attacking Patterns'],
  },
  {
    name: 'Recovery Session',
    sessionType: 'recovery',
    focus: 'Active Recovery',
    duration: 45,
    intensity: 2,
    description: 'Light session focused on recovery after a match or intense training block. Low intensity throughout.',
    activitySlots: [
      { slot: 'warmup',    activityName: 'Dynamic Stretching' },
      { slot: 'activity1', activityName: 'Passing Gates' },
      { slot: 'activity2', activityName: 'Cool Down & Stretch' },
    ],
    phaseTags: ['Recovery Runs'],
  },
];
