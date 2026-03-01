import type { LabelData } from './label-types';

const STORAGE_KEY = 'label-history';
const MAX_ITEMS = 20;

export function getHistory(): LabelData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToHistory(data: LabelData): void {
  const history = getHistory();
  history.unshift(data);
  if (history.length > MAX_ITEMS) history.length = MAX_ITEMS;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}
