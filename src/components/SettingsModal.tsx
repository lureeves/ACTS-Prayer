import React, { useState } from 'react';
import { X, Clock, PlayCircle, FolderOpen, Download, Upload, Volume2, Save, Laptop, Globe, ListFilter, Cloud, Smartphone, CheckCircle2 } from 'lucide-react';
import { AppSettings, PrayerData } from '../types/prayer';
import { exportPrayerDataAsJson, isTauriEnvironment } from '../services/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  prayerData: PrayerData;
  onImportData: (data: PrayerData) => void;
  currentFilePath: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  prayerData,
  onImportData,
  currentFilePath
}) => {
  const [duration, setDuration] = useState(settings.sessionDurationMinutes);
  const [autoStart, setAutoStart] = useState(settings.autoStartTimer);
  const [supplicationLimit, setSupplicationLimit] = useState(settings.supplicationTopicsLimit || 3);
  const [filePath, setFilePath] = useState(settings.filePath || currentFilePath);
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled);
  const isTauri = isTauriEnvironment();

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings({
      ...settings,
      sessionDurationMinutes: Math.max(1, duration),
      autoStartTimer: autoStart,
      supplicationTopicsLimit: Math.max(1, supplicationLimit),
      filePath,
      soundEnabled
    });
    onClose();
  };

  const handleSelectFile = async () => {
    if (isTauri) {
      try {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const selected = await open({
          multiple: false,
          filters: [{ name: 'JSON Backup', extensions: ['json'] }]
        });
        if (selected && typeof selected === 'string') {
          setFilePath(selected);
        }
      } catch (err) {
        console.warn('File dialog error:', err);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.Categories) {
          onImportData(parsed);
          alert('Prayer backup successfully loaded!');
        } else {
          alert('Invalid prayer file format: missing Categories');
        }
      } catch (err) {
        alert('Failed to parse JSON file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl p-5 sm:p-6 text-neutral-100 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight">Preferences & Storage</h2>
            <span className={`text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1 font-mono font-medium ${
              isTauri ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-sky-950 text-sky-400 border border-sky-800'
            }`}>
              {isTauri ? <Laptop className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
              {isTauri ? 'macOS Native App' : 'Web / PWA'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-5 overflow-y-auto flex-1 pr-1">
          {/* Default duration */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-neutral-800 rounded-lg text-neutral-300">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-200">Default Session Duration</label>
                <p className="text-xs text-neutral-400">Total duration for guided prayer timer</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="120"
                value={duration}
                onChange={e => setDuration(parseInt(e.target.value) || 1)}
                className="w-20 px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 text-center font-mono focus:outline-none focus:border-amber-500"
              />
              <span className="text-xs text-neutral-400">min</span>
            </div>
          </div>

          {/* Supplication Topics per Session */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-neutral-800 rounded-lg text-neutral-300">
                <ListFilter className="w-5 h-5" />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-200">Supplication Topics per Session</label>
                <p className="text-xs text-neutral-400">Number of topics prompted per session (rotates through remaining)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="20"
                value={supplicationLimit}
                onChange={e => setSupplicationLimit(parseInt(e.target.value) || 1)}
                className="w-20 px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 text-center font-mono focus:outline-none focus:border-amber-500"
              />
              <span className="text-xs text-neutral-400">topics</span>
            </div>
          </div>

          {/* Auto-start timer toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-neutral-800 rounded-lg text-neutral-300">
                <PlayCircle className="w-5 h-5" />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-200">Auto-start Timer</label>
                <p className="text-xs text-neutral-400">Automatically begin countdown when starting session</p>
              </div>
            </div>
            <button
              onClick={() => setAutoStart(!autoStart)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                autoStart ? 'bg-amber-500 justify-end' : 'bg-neutral-700 justify-start'
              }`}
            >
              <div className="w-4 h-4 bg-white rounded-full shadow-md" />
            </button>
          </div>

          {/* Sound chime toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-neutral-800 rounded-lg text-neutral-300">
                <Volume2 className="w-5 h-5" />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-200">Completion Chime</label>
                <p className="text-xs text-neutral-400">Play soft harmonic chime when session reaches 00:00</p>
              </div>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                soundEnabled ? 'bg-amber-500 justify-end' : 'bg-neutral-700 justify-start'
              }`}
            >
              <div className="w-4 h-4 bg-white rounded-full shadow-md" />
            </button>
          </div>

          {/* iCloud Drive Sync */}
          <div className="space-y-3 pt-3 border-t border-neutral-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-sky-400" />
                <label className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                  iCloud Drive Sync
                </label>
              </div>
              <span className="text-[10px] text-neutral-400 font-mono flex items-center gap-1">
                <Smartphone className="w-3 h-3 text-amber-400" /> Mac & iPhone
              </span>
            </div>

            <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-3 text-xs text-neutral-300 space-y-2">
              <p className="leading-relaxed font-medium text-neutral-200">
                Sync across MacBook & iPhone via iCloud Drive:
              </p>
              <ul className="list-disc list-inside space-y-1 text-neutral-400 text-[11px]">
                <li><strong className="text-neutral-200">MacBook:</strong> Save your JSON file in iCloud Drive (e.g. <span className="font-mono text-neutral-300">iCloud Drive / ACTS Prayer</span>). Every edit and prayer session auto-saves directly.</li>
                <li><strong className="text-neutral-200">iPhone:</strong> Tap <span className="text-amber-300 font-medium">Sync from iCloud Drive</span> to load your file from the iOS Files app. When finished on iPhone, tap <span className="text-amber-300 font-medium">Save to iCloud Drive</span>.</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => exportPrayerDataAsJson(prayerData, filePath || 'Backup_03-11-26_18-56.json')}
                className="px-3 py-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700/80 text-neutral-200 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span>Save to iCloud Drive</span>
              </button>

              <label className="px-3 py-2.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700/80 text-neutral-200 rounded-xl text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98">
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                <span>Sync from iCloud Drive</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* File Storage Path */}
          <div className="space-y-2 pt-2 border-t border-neutral-800">
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Active Storage Path
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={filePath}
                onChange={e => setFilePath(e.target.value)}
                placeholder="e.g. Backup_03-11-26_18-56.json"
                className="flex-1 px-3 py-2 text-xs font-mono bg-neutral-800/80 border border-neutral-700 rounded-lg text-neutral-200 focus:outline-none focus:border-amber-500"
              />
              {isTauri && (
                <button
                  onClick={handleSelectFile}
                  className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all"
                  title="Browse local or iCloud Drive file"
                >
                  <FolderOpen className="w-3.5 h-3.5" /> Browse
                </button>
              )}
            </div>
            <p className="text-xs text-neutral-400">
              {isTauri 
                ? 'All updates, prayed status, and additions instantly overwrite this local JSON file via Tauri native FS.'
                : 'In web mode, changes persist to browser local storage and offline cache.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-medium text-sm rounded-xl flex items-center gap-2 transition-all shadow-lg active:scale-95"
          >
            <Save className="w-4 h-4" /> Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};
