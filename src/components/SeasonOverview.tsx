import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { SeasonBlock } from '../db/database';
import { SEASON_BLOCK_LABELS, SEASON_BLOCK_COLORS } from '../constants/tags';
import Input from './ui/Input';
import Button from './ui/Button';
import Card from './ui/Card';

interface SeasonOverviewProps {
  teamId: number;
}

export default function SeasonOverview({ teamId }: SeasonOverviewProps) {
  const blocks = useLiveQuery(
    () => db.seasonBlocks.where('teamId').equals(teamId).sortBy('startDate'),
    [teamId],
  ) ?? [];

  const matches = useLiveQuery(
    () => db.matches.where('teamId').equals(teamId).toArray(),
    [teamId],
  ) ?? [];

  const [editingBlock, setEditingBlock] = useState<Partial<SeasonBlock> | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0);

  // Generate 6 months of weeks starting from current month
  const monthData = useMemo(() => {
    const today = new Date();
    const startMonth = new Date(today.getFullYear(), today.getMonth() + scrollOffset, 1);
    const months: { label: string; startDate: string; weeks: { startDate: string; matchCount: number }[] }[] = [];

    for (let m = 0; m < 6; m++) {
      const monthDate = new Date(startMonth.getFullYear(), startMonth.getMonth() + m, 1);
      const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      const weeks: { startDate: string; matchCount: number }[] = [];
      const firstDay = new Date(monthDate);
      const dayOfWeek = firstDay.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const weekStart = new Date(firstDay);
      weekStart.setDate(weekStart.getDate() + mondayOffset);

      const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
      const current = new Date(weekStart);

      while (current < nextMonth) {
        const weekStartStr = toDateStr(current);
        const weekEnd = new Date(current);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const weekEndStr = toDateStr(weekEnd);

        const matchCount = matches.filter(match => {
          return match.date >= weekStartStr && match.date <= weekEndStr;
        }).length;

        weeks.push({ startDate: weekStartStr, matchCount });
        current.setDate(current.getDate() + 7);
      }

      months.push({ label: monthLabel, startDate: toDateStr(monthDate), weeks });
    }

    return months;
  }, [scrollOffset, matches]);

  const allWeeks = monthData.flatMap(m => m.weeks);
  const totalWeeks = allWeeks.length;

  function toDateStr(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  function getBlockPosition(block: SeasonBlock) {
    if (allWeeks.length === 0) return { left: 0, width: 0 };

    const firstWeek = allWeeks[0].startDate;
    const lastWeek = allWeeks[allWeeks.length - 1].startDate;

    const clampedStart = block.startDate < firstWeek ? firstWeek : block.startDate;
    const clampedEnd = block.endDate > lastWeek ? lastWeek : block.endDate;

    let startIdx = 0;
    let endIdx = totalWeeks - 1;

    for (let i = 0; i < allWeeks.length; i++) {
      if (allWeeks[i].startDate <= clampedStart) startIdx = i;
      if (allWeeks[i].startDate <= clampedEnd) endIdx = i;
    }

    const left = (startIdx / totalWeeks) * 100;
    const width = ((endIdx - startIdx + 1) / totalWeeks) * 100;

    return { left, width };
  }

  async function saveBlock() {
    if (!editingBlock) return;
    if (!editingBlock.label || !editingBlock.startDate || !editingBlock.endDate) return;

    if (editingBlock.id) {
      await db.seasonBlocks.update(editingBlock.id, {
        label: editingBlock.label,
        startDate: editingBlock.startDate,
        endDate: editingBlock.endDate,
        color: editingBlock.color,
        focusTheme: editingBlock.focusTheme || undefined,
      });
    } else {
      await db.seasonBlocks.add({
        teamId,
        label: editingBlock.label,
        startDate: editingBlock.startDate,
        endDate: editingBlock.endDate,
        color: editingBlock.color ?? SEASON_BLOCK_COLORS[0],
        focusTheme: editingBlock.focusTheme || undefined,
      });
    }
    setEditingBlock(null);
  }

  async function deleteBlock(id: number) {
    await db.seasonBlocks.delete(id);
    if (editingBlock?.id === id) setEditingBlock(null);
  }

  const maxMatchCount = Math.max(1, ...allWeeks.map(w => w.matchCount));

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
        <h2 className="text-lg font-semibold text-txt">Season Overview</h2>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setScrollOffset(o => o - 3)}>
            &larr; Earlier
          </Button>
          {scrollOffset !== 0 && (
            <Button variant="ghost" onClick={() => setScrollOffset(0)}>
              Today
            </Button>
          )}
          <Button variant="secondary" onClick={() => setScrollOffset(o => o + 3)}>
            Later &rarr;
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <Card className="p-4 overflow-x-auto">
        {/* Month headers */}
        <div className="flex border-b border-surface-5 pb-2 mb-3 min-w-[500px]">
          {monthData.map(month => (
            <div
              key={month.label}
              className="text-xs font-semibold text-txt-muted"
              style={{ width: `${(month.weeks.length / totalWeeks) * 100}%` }}
            >
              {month.label}
            </div>
          ))}
        </div>

        {/* Season blocks */}
        <div className="relative h-16 mb-3 min-w-[500px]">
          {blocks.map(block => {
            const { left, width } = getBlockPosition(block);
            if (width <= 0) return null;
            return (
              <div
                key={block.id}
                className="absolute top-1 h-12 rounded-lg flex items-center px-3 cursor-pointer hover:opacity-90 transition-opacity overflow-hidden"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  backgroundColor: `${block.color ?? SEASON_BLOCK_COLORS[0]}20`,
                  borderLeft: `3px solid ${block.color ?? SEASON_BLOCK_COLORS[0]}`,
                }}
                onClick={() => setEditingBlock({ ...block })}
              >
                <div className="truncate">
                  <div className="text-xs font-semibold text-txt truncate">{block.label}</div>
                  {block.focusTheme && (
                    <div className="text-[10px] text-txt-muted truncate">{block.focusTheme}</div>
                  )}
                </div>
              </div>
            );
          })}
          {blocks.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-txt-faint">
              No blocks — click "Add Block" to create one
            </div>
          )}
        </div>

        {/* Match density */}
        <div className="flex items-end gap-px h-8 border-t border-surface-5 pt-2 min-w-[500px]">
          {allWeeks.map((week, i) => (
            <div
              key={i}
              className="flex-1 flex flex-col items-center"
              title={`Week of ${week.startDate}: ${week.matchCount} match${week.matchCount !== 1 ? 'es' : ''}`}
            >
              <div
                className="w-full rounded-sm bg-accent/40"
                style={{ height: week.matchCount > 0 ? `${Math.max(4, (week.matchCount / maxMatchCount) * 24)}px` : '0px' }}
              />
            </div>
          ))}
        </div>
        <div className="text-[9px] text-txt-faint mt-1">Game density</div>
      </Card>

      {/* Block list + editor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {/* Existing blocks */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-txt">Blocks</h3>
            <Button
              variant="secondary"
              onClick={() => setEditingBlock({
                label: '',
                startDate: '',
                endDate: '',
                color: SEASON_BLOCK_COLORS[0],
              })}
            >
              + Add Block
            </Button>
          </div>
          <div className="space-y-1.5">
            {blocks.map(block => (
              <div
                key={block.id}
                className="flex items-center gap-3 px-3 py-2 rounded bg-surface-2 border border-surface-5 cursor-pointer hover:bg-surface-3 transition-colors"
                onClick={() => setEditingBlock({ ...block })}
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: block.color ?? SEASON_BLOCK_COLORS[0] }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-txt truncate">{block.label}</div>
                  <div className="text-[10px] text-txt-faint">
                    {block.startDate} — {block.endDate}
                  </div>
                </div>
                {block.focusTheme && (
                  <span className="text-[10px] text-txt-muted truncate">{block.focusTheme}</span>
                )}
              </div>
            ))}
            {blocks.length === 0 && (
              <p className="text-xs text-txt-faint text-center py-4">No season blocks yet</p>
            )}
          </div>
        </Card>

        {/* Block editor */}
        {editingBlock && (
          <Card className="space-y-3">
            <h3 className="text-sm font-semibold text-txt">
              {editingBlock.id ? 'Edit Block' : 'New Block'}
            </h3>

            {/* Label selector */}
            <div>
              <label className="block text-xs font-medium text-txt-muted mb-1">Label</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {SEASON_BLOCK_LABELS.map(label => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setEditingBlock(prev => prev ? { ...prev, label } : null)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      editingBlock.label === label
                        ? 'bg-accent/20 text-accent border-accent/40'
                        : 'bg-surface-3 text-txt-muted border-surface-5 hover:bg-surface-4'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Input
                type="text"
                placeholder="Or type custom label..."
                value={editingBlock.label ?? ''}
                onChange={e => setEditingBlock(prev => prev ? { ...prev, label: e.target.value } : null)}
              />
            </div>

            {/* Date range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Start Date"
                type="date"
                value={editingBlock.startDate ?? ''}
                onChange={e => setEditingBlock(prev => prev ? { ...prev, startDate: e.target.value } : null)}
              />
              <Input
                label="End Date"
                type="date"
                value={editingBlock.endDate ?? ''}
                onChange={e => setEditingBlock(prev => prev ? { ...prev, endDate: e.target.value } : null)}
              />
            </div>

            {/* Color */}
            <div>
              <label className="block text-xs font-medium text-txt-muted mb-1">Color</label>
              <div className="flex gap-2">
                {SEASON_BLOCK_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setEditingBlock(prev => prev ? { ...prev, color } : null)}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${
                      editingBlock.color === color ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Focus theme */}
            <Input
              label="Focus Theme (optional)"
              type="text"
              placeholder="e.g., Possession, Fitness, Set Pieces..."
              value={editingBlock.focusTheme ?? ''}
              onChange={e => setEditingBlock(prev => prev ? { ...prev, focusTheme: e.target.value } : null)}
            />

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={saveBlock}
                disabled={!editingBlock.label || !editingBlock.startDate || !editingBlock.endDate}
                className="flex-1"
              >
                {editingBlock.id ? 'Update' : 'Create'}
              </Button>
              {editingBlock.id && (
                <Button
                  variant="secondary"
                  onClick={() => deleteBlock(editingBlock.id!)}
                  className="w-full sm:w-auto"
                >
                  Delete
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => setEditingBlock(null)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
