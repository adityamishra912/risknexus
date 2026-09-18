export const DATA_SOURCE_MODES = {
  SAMPLE: 'sample',
  SUPABASE_PRIMARY: 'supabase-primary',
  SUPABASE_SECONDARY: 'supabase-secondary',
};

export const ACTIVE_DATA_SOURCE_STORAGE_KEY = 'risknexus:active-data-source';

export const DATA_SOURCE_MODE_OPTIONS = [
  {
    value: DATA_SOURCE_MODES.SAMPLE,
    label: 'Normal Sample Mode',
    description: 'Use the built-in sample dataset currently shown in the application.',
  },
  {
    value: DATA_SOURCE_MODES.SUPABASE_PRIMARY,
    label: 'Supabase Connection Mode',
    description: 'Read risk data from the primary Supabase account and store results there.',
  },
  {
    value: DATA_SOURCE_MODES.SUPABASE_SECONDARY,
    label: 'Another Supabase Connection',
    description: 'Use a second Supabase account and keep it isolated from the primary source.',
  },
];

export function getDataSourceModeLabel(mode) {
  const match = DATA_SOURCE_MODE_OPTIONS.find((option) => option.value === mode);
  return match ? match.label : 'Normal Sample Mode';
}

export function getActiveDataSourceMode() {
  if (typeof window === 'undefined') {
    return DATA_SOURCE_MODES.SAMPLE;
  }

  try {
    const saved = window.localStorage.getItem(ACTIVE_DATA_SOURCE_STORAGE_KEY);
    return saved && DATA_SOURCE_MODE_OPTIONS.some((option) => option.value === saved)
      ? saved
      : DATA_SOURCE_MODES.SAMPLE;
  } catch (error) {
    console.warn('[Data Source] Failed to read active mode:', error);
    return DATA_SOURCE_MODES.SAMPLE;
  }
}

export function setActiveDataSourceMode(mode) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const nextMode = DATA_SOURCE_MODE_OPTIONS.some((option) => option.value === mode)
      ? mode
      : DATA_SOURCE_MODES.SAMPLE;
    window.localStorage.setItem(ACTIVE_DATA_SOURCE_STORAGE_KEY, nextMode);
  } catch (error) {
    console.warn('[Data Source] Failed to save active mode:', error);
  }
}

export function getDataSourceStorageKey(mode) {
  return `risknexus:data-source:${mode}`;
}

export function readCachedDataSource(mode) {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(getDataSourceStorageKey(mode));
    if (!rawValue) {
      return null;
    }
    return JSON.parse(rawValue);
  } catch (error) {
    console.warn('[Data Source] Failed to parse cached mode payload:', error);
    return null;
  }
}

export function writeCachedDataSource(mode, payload) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(getDataSourceStorageKey(mode), JSON.stringify(payload));
  } catch (error) {
    console.warn('[Data Source] Failed to save cached mode payload:', error);
  }
}
