import { useState, useRef } from 'react';
import { exportBackup, importBackup } from '../utils/backup';
import { getStoredTheme, setTheme, type ThemeMode } from '../utils/theme';
import Button from './ui/Button';
import Card from './ui/Card';

export default function Settings() {
  const [exportStatus, setExportStatus] = useState<'idle' | 'done' | 'error'>('idle');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'confirming' | 'importing' | 'done' | 'error'>('idle');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [themeMode, setThemeMode] = useState<ThemeMode>(getStoredTheme);

  const toggleTheme = () => {
    const next = themeMode === 'light' ? 'dark' : 'light';
    setTheme(next);
    setThemeMode(next);
  };

  const handleExport = async () => {
    try {
      await exportBackup();
      setExportStatus('done');
      setTimeout(() => setExportStatus('idle'), 2000);
    } catch {
      setExportStatus('error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImportFile(file);
    setImportStatus(file ? 'confirming' : 'idle');
    setImportError(null);
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImportStatus('importing');
    const result = await importBackup(importFile);
    if (result.success) {
      setImportStatus('done');
      setImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      setImportStatus('error');
      setImportError(result.error ?? 'Unknown error');
    }
  };

  const cancelImport = () => {
    setImportFile(null);
    setImportStatus('idle');
    setImportError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-txt font-display tracking-wider">SETTINGS</h2>

      {/* Theme */}
      <Card>
        <h3 className="text-sm font-semibold text-txt-muted uppercase tracking-wider mb-2">Appearance</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-txt">Theme</p>
            <p className="text-xs text-txt-faint mt-0.5">
              {themeMode === 'light' ? 'Light mode' : 'Dark mode (FM-style)'}
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className="relative inline-flex h-7 w-12 items-center rounded-full transition-colors bg-surface-3"
            role="switch"
            aria-checked={themeMode === 'dark'}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-accent transition-transform ${
                themeMode === 'dark' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </Card>

      {/* Backup */}
      <Card>
        <h3 className="text-sm font-semibold text-txt-muted uppercase tracking-wider mb-2">Backup Data</h3>
        <p className="text-xs text-txt-faint mb-4">
          Download all your teams, players, matches, practices, and season blocks as a JSON file.
        </p>
        <Button onClick={handleExport}>
          {exportStatus === 'done' ? 'Downloaded!' : exportStatus === 'error' ? 'Error' : 'Download Backup'}
        </Button>
      </Card>

      {/* Restore */}
      <Card>
        <h3 className="text-sm font-semibold text-txt-muted uppercase tracking-wider mb-2">Restore Data</h3>
        <p className="text-xs text-txt-faint mb-4">
          Restore from a previously exported backup file.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />

        {importStatus === 'idle' && (
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            Choose Backup File
          </Button>
        )}

        {importStatus === 'confirming' && importFile && (
          <div className="space-y-3">
            <div className="text-sm text-txt">{importFile.name}</div>
            <p className="text-xs text-amber-400">
              This will replace all your current data. This cannot be undone.
            </p>
            <div className="flex items-center gap-2">
              <Button onClick={handleImport} className="!bg-amber-500 !text-surface-0 hover:!bg-amber-600">
                Restore
              </Button>
              <Button variant="ghost" onClick={cancelImport}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {importStatus === 'importing' && (
          <p className="text-sm text-txt-muted">Restoring...</p>
        )}

        {importStatus === 'done' && (
          <div className="space-y-2">
            <p className="text-sm text-emerald-400">Data restored successfully.</p>
            <Button variant="secondary" onClick={() => setImportStatus('idle')}>
              Done
            </Button>
          </div>
        )}

        {importStatus === 'error' && (
          <div className="space-y-2">
            <p className="text-sm text-red-400">{importError}</p>
            <Button variant="secondary" onClick={cancelImport}>
              Try Again
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
