import { PrayerData, AppSettings } from '../types/prayer';
import { DEFAULT_PRAYER_DATA } from '../data/defaultData';

const SETTINGS_STORAGE_KEY = 'acts_prayer_settings_v1';
const WEB_DATA_STORAGE_KEY = 'acts_prayer_data_v1';
export const DEFAULT_FILE_NAME = 'Backup_03-11-26_18-56.json';

export const DEFAULT_SETTINGS: AppSettings = {
  sessionDurationMinutes: 15,
  autoStartTimer: true,
  filePath: DEFAULT_FILE_NAME,
  soundEnabled: true,
  supplicationTopicsLimit: 3,
  theme: 'dark'
};

export const isTauriEnvironment = (): boolean => {
  return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
};

export const loadSettings = (): AppSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.warn('Failed to load settings from localStorage:', err);
  }
  return DEFAULT_SETTINGS;
};

export const saveSettings = (settings: AppSettings): void => {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
};

/**
 * Loads prayer data from the Tauri local filesystem, or falls back to localStorage/bundled JSON in web mode.
 */
export async function loadPrayerData(filePathOverride?: string): Promise<{ data: PrayerData; filePath: string; isTauri: boolean }> {
  const currentSettings = loadSettings();
  const targetPath = filePathOverride || currentSettings.filePath || DEFAULT_FILE_NAME;

  if (isTauriEnvironment()) {
    try {
      const { readTextFile, exists } = await import('@tauri-apps/plugin-fs');
      
      let pathExists = false;
      try {
        pathExists = await exists(targetPath);
      } catch (e) {
        console.warn('Could not verify file existence, trying read directly:', e);
      }

      if (pathExists || true) {
        const fileContent = await readTextFile(targetPath);
        const parsed = JSON.parse(fileContent) as PrayerData;

        return { data: parsed, filePath: targetPath, isTauri: true };
      }
    } catch (err) {
      console.warn(`Tauri FS read failed for "${targetPath}", trying fallback:`, err);
    }
  }

  // Web / Fallback mode
  try {
    const webSaved = localStorage.getItem(WEB_DATA_STORAGE_KEY);
    if (webSaved) {
      const parsed = JSON.parse(webSaved) as PrayerData;

      return { data: parsed, filePath: targetPath, isTauri: false };
    }
  } catch (err) {
    console.warn('Could not read from localStorage:', err);
  }

  // Fallback to bundled dataset
  return { data: DEFAULT_PRAYER_DATA, filePath: targetPath, isTauri: false };
}

/**
 * Saves prayer data directly to local JSON file via Tauri FS, or localStorage in web mode.
 */
export async function savePrayerData(data: PrayerData, filePathOverride?: string): Promise<void> {
  const currentSettings = loadSettings();
  const targetPath = filePathOverride || currentSettings.filePath || DEFAULT_FILE_NAME;

  // Always update card counts and metadata
  let cardCount = 0;
  let subjectCount = 0;
  data.Categories.forEach(cat => {
    cat.subjects.forEach(sub => {
      subjectCount++;
      cardCount += sub.cards.length;
    });
  });

  data.Metadata = {
    ...data.Metadata,
    card_count: cardCount,
    subject_count: subjectCount,
    list_count: data.Categories.length,
    settings: currentSettings,
  };

  const jsonString = JSON.stringify(data, null, 2);

  if (isTauriEnvironment()) {
    try {
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');
      await writeTextFile(targetPath, jsonString);
      return;
    } catch (err) {
      console.error('Failed to write file via Tauri FS:', err);
      // Fall through to localStorage fallback
    }
  }

  // Web fallback
  try {
    localStorage.setItem(WEB_DATA_STORAGE_KEY, jsonString);
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

/**
 * Trigger download of JSON file in browser / static web mode
 */
export function exportPrayerDataAsJson(data: PrayerData, fileName = 'prayer_backup.json'): void {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
