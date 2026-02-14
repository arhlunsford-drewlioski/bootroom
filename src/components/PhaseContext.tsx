import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { PERIODIZATION_COLORS } from '../constants/periodization';

interface PhaseContextProps {
  teamId: number;
  date: string;
  compact?: boolean; // Show condensed version
}

export default function PhaseContext({ teamId, date, compact = false }: PhaseContextProps) {
  const blocks = useLiveQuery(
    () => db.periodizationBlocks.where('teamId').equals(teamId).toArray(),
    [teamId]
  ) ?? [];

  // Find active blocks for this date
  const activeBlocks = blocks.filter(block =>
    block.startDate <= date && block.endDate >= date
  );

  const training = activeBlocks.find(b => b.type === 'training');
  const technical = activeBlocks.find(b => b.type === 'technical');
  const tactical = activeBlocks.find(b => b.type === 'tactical');
  const physical = activeBlocks.find(b => b.type === 'physical');

  if (activeBlocks.length === 0) return null;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1 text-[10px]">
        {training && (
          <span
            className="px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: `${training.color ?? PERIODIZATION_COLORS.training}30`,
              color: training.color ?? PERIODIZATION_COLORS.training
            }}
          >
            {training.label}
          </span>
        )}
        {technical && (
          <span
            className="px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: `${technical.color ?? PERIODIZATION_COLORS.technical}30`,
              color: technical.color ?? PERIODIZATION_COLORS.technical
            }}
          >
            Tech: {technical.label}
          </span>
        )}
        {tactical && (
          <span
            className="px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: `${tactical.color ?? PERIODIZATION_COLORS.tactical}30`,
              color: tactical.color ?? PERIODIZATION_COLORS.tactical
            }}
          >
            Tac: {tactical.label}
          </span>
        )}
        {physical && (
          <span
            className="px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: `${physical.color ?? PERIODIZATION_COLORS.physical}30`,
              color: physical.color ?? PERIODIZATION_COLORS.physical
            }}
          >
            Phys: {physical.label}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5 text-xs">
      <div className="text-txt-muted font-semibold">Current Periodization Phase</div>
      {training && (
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: training.color ?? PERIODIZATION_COLORS.training }}
          />
          <span className="text-txt-faint">Training:</span>
          <span className="text-txt font-medium">{training.label}</span>
        </div>
      )}
      {technical && (
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: technical.color ?? PERIODIZATION_COLORS.technical }}
          />
          <span className="text-txt-faint">Technical:</span>
          <span className="text-txt font-medium">{technical.label}</span>
        </div>
      )}
      {tactical && (
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: tactical.color ?? PERIODIZATION_COLORS.tactical }}
          />
          <span className="text-txt-faint">Tactical:</span>
          <span className="text-txt font-medium">{tactical.label}</span>
        </div>
      )}
      {physical && (
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: physical.color ?? PERIODIZATION_COLORS.physical }}
          />
          <span className="text-txt-faint">Physical:</span>
          <span className="text-txt font-medium">{physical.label}</span>
        </div>
      )}
    </div>
  );
}

// Helper hook for getting phase-aware recommendations
export function usePhaseRecommendations(teamId: number, date: string) {
  const blocks = useLiveQuery(
    () => db.periodizationBlocks.where('teamId').equals(teamId).toArray(),
    [teamId]
  ) ?? [];

  const trainingPhase = blocks.find(
    b => b.type === 'training' && b.startDate <= date && b.endDate >= date
  );

  const physicalPhase = blocks.find(
    b => b.type === 'physical' && b.startDate <= date && b.endDate >= date
  );

  // Generate recommendations
  const recommendations: string[] = [];

  if (trainingPhase) {
    if (trainingPhase.label.includes('Recovery') || trainingPhase.label.includes('Transition')) {
      recommendations.push('Focus on recovery and light technical work');
      recommendations.push('Consider low-intensity sessions (2-4/10)');
    } else if (trainingPhase.label.includes('Competition')) {
      recommendations.push('Balance training load with match schedule');
      recommendations.push('Prioritize recovery between matches');
    } else if (trainingPhase.label.includes('General Prep')) {
      recommendations.push('Build aerobic base and general fitness');
      recommendations.push('Focus on fundamental technical skills');
    } else if (trainingPhase.label.includes('Championship')) {
      recommendations.push('Maintain peak performance');
      recommendations.push('Tactical refinement and game-specific training');
    }
  }

  if (physicalPhase) {
    if (physicalPhase.label.includes('Aerobic')) {
      recommendations.push('Emphasize endurance and aerobic conditioning');
    } else if (physicalPhase.label.includes('Speed')) {
      recommendations.push('Focus on speed, agility, and quickness drills');
    } else if (physicalPhase.label.includes('Strength')) {
      recommendations.push('Incorporate strength and power exercises');
    }
  }

  return {
    trainingPhase,
    physicalPhase,
    recommendations,
    targetIntensity: trainingPhase?.targetIntensity
  };
}
