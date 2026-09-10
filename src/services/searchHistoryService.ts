/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RecentSearchQuery {
  id: string;
  query: string;
  timestamp: number;
  resultsCount?: number;
  sourceScope?: string;
}

export interface AccessedPartNumber {
  partNumber: string;
  description?: string;
  manufacturer?: string;
  model?: string;
  accessCount: number;
  lastAccessed: number;
}

const STORAGE_KEYS = {
  SEARCH_HISTORY: 'emis_search_history_v1',
  FREQUENT_PARTS: 'emis_frequent_parts_v1',
};

const MAX_HISTORY_ITEMS = 25;
const MAX_FREQUENT_PARTS = 20;

// Default initial seeds for newly installed or empty storage
const DEFAULT_INITIAL_PARTS: AccessedPartNumber[] = [
  {
    partNumber: 'EJA530E-JAS4N-024NN',
    description: 'Gauge Pressure Transmitter 0-10 bar',
    manufacturer: 'Yokogawa',
    model: 'EJA530E',
    accessCount: 8,
    lastAccessed: Date.now() - 3600000 * 2,
  },
  {
    partNumber: '3051CD2A22A1AB4',
    description: 'Differential Pressure Transmitter with Coplanar Flange',
    manufacturer: 'Rosemount',
    model: '3051CD',
    accessCount: 6,
    lastAccessed: Date.now() - 3600000 * 5,
  },
  {
    partNumber: 'DVC6200-HC',
    description: 'Digital Valve Controller HART 4-20mA',
    manufacturer: 'Fisher Emerson',
    model: 'DVC6200',
    accessCount: 5,
    lastAccessed: Date.now() - 3600000 * 8,
  },
  {
    partNumber: '6003-2RS',
    description: 'Deep Groove Radial Ball Bearing 17x35x10mm',
    manufacturer: 'SKF',
    model: '6003',
    accessCount: 4,
    lastAccessed: Date.now() - 3600000 * 12,
  },
  {
    partNumber: 'PRV-200-SS',
    description: 'Stainless Steel Pressure Regulating Valve 1/2" NPT',
    manufacturer: 'Parker',
    model: 'PRV-200',
    accessCount: 3,
    lastAccessed: Date.now() - 3600000 * 24,
  }
];

const DEFAULT_INITIAL_QUERIES: RecentSearchQuery[] = [
  {
    id: 'init-q1',
    query: 'Pressure Transmitter',
    timestamp: Date.now() - 3600000 * 3,
    resultsCount: 8,
    sourceScope: 'ALL'
  },
  {
    id: 'init-q2',
    query: 'Rosemount 3051',
    timestamp: Date.now() - 3600000 * 7,
    resultsCount: 4,
    sourceScope: 'ALL'
  },
  {
    id: 'init-q3',
    query: 'DVC6200',
    timestamp: Date.now() - 3600000 * 15,
    resultsCount: 3,
    sourceScope: 'STATION'
  },
  {
    id: 'init-q4',
    query: 'Solenoid Valve 24VDC',
    timestamp: Date.now() - 3600000 * 20,
    resultsCount: 6,
    sourceScope: 'ALL'
  }
];

export const searchHistoryService = {
  /**
   * Retrieves the saved search history queries from localStorage
   */
  getSearchHistory: (): RecentSearchQuery[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY);
      if (!raw) {
        // Initialize with default seeds
        localStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(DEFAULT_INITIAL_QUERIES));
        return DEFAULT_INITIAL_QUERIES;
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : DEFAULT_INITIAL_QUERIES;
    } catch (e) {
      console.warn('Error reading search history from localStorage:', e);
      return DEFAULT_INITIAL_QUERIES;
    }
  },

  /**
   * Saves or bumps a search query in history
   */
  saveSearchQuery: (query: string, resultsCount?: number, sourceScope: string = 'ALL'): RecentSearchQuery[] => {
    const trimmed = (query || '').trim();
    if (!trimmed || trimmed.length < 2) {
      return searchHistoryService.getSearchHistory();
    }

    try {
      const current = searchHistoryService.getSearchHistory();
      // Remove any existing entry with the same query (case-insensitive)
      const filtered = current.filter(item => item.query.toLowerCase() !== trimmed.toLowerCase());
      
      const newEntry: RecentSearchQuery = {
        id: `search-q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        query: trimmed,
        timestamp: Date.now(),
        resultsCount: resultsCount !== undefined ? resultsCount : undefined,
        sourceScope
      };

      const updated = [newEntry, ...filtered].slice(0, MAX_HISTORY_ITEMS);
      localStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.warn('Error saving search query to localStorage:', e);
      return [];
    }
  },

  /**
   * Removes a single search query from history
   */
  deleteSearchQuery: (idOrQuery: string): RecentSearchQuery[] => {
    try {
      const current = searchHistoryService.getSearchHistory();
      const updated = current.filter(
        item => item.id !== idOrQuery && item.query.toLowerCase() !== idOrQuery.toLowerCase()
      );
      localStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.warn('Error deleting search query from localStorage:', e);
      return [];
    }
  },

  /**
   * Clears all search history
   */
  clearSearchHistory: (): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify([]));
    } catch (e) {
      console.warn('Error clearing search history:', e);
    }
  },

  /**
   * Retrieves the accessed part numbers from localStorage, sorted by access frequency and recency
   */
  getAccessedParts: (): AccessedPartNumber[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.FREQUENT_PARTS);
      if (!raw) {
        localStorage.setItem(STORAGE_KEYS.FREQUENT_PARTS, JSON.stringify(DEFAULT_INITIAL_PARTS));
        return DEFAULT_INITIAL_PARTS;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return DEFAULT_INITIAL_PARTS;
      
      // Sort primarily by accessCount descending, secondarily by lastAccessed descending
      return parsed.sort((a, b) => {
        if (b.accessCount !== a.accessCount) {
          return b.accessCount - a.accessCount;
        }
        return b.lastAccessed - a.lastAccessed;
      });
    } catch (e) {
      console.warn('Error reading frequent parts from localStorage:', e);
      return DEFAULT_INITIAL_PARTS;
    }
  },

  /**
   * Records access/inspection to a part number, updating count and timestamp
   */
  recordPartAccess: (
    partNumber: string, 
    details?: { description?: string; manufacturer?: string; model?: string }
  ): AccessedPartNumber[] => {
    const cleanPN = (partNumber || '').trim().toUpperCase();
    if (!cleanPN) return searchHistoryService.getAccessedParts();

    try {
      const current = searchHistoryService.getAccessedParts();
      const existingIdx = current.findIndex(p => p.partNumber.toUpperCase() === cleanPN);

      let updated: AccessedPartNumber[];
      if (existingIdx >= 0) {
        const existing = current[existingIdx];
        const updatedItem: AccessedPartNumber = {
          ...existing,
          description: details?.description || existing.description,
          manufacturer: details?.manufacturer || existing.manufacturer,
          model: details?.model || existing.model,
          accessCount: (existing.accessCount || 0) + 1,
          lastAccessed: Date.now()
        };
        current.splice(existingIdx, 1);
        updated = [updatedItem, ...current];
      } else {
        const newItem: AccessedPartNumber = {
          partNumber: cleanPN,
          description: details?.description || 'Industrial Component',
          manufacturer: details?.manufacturer || 'Standard',
          model: details?.model,
          accessCount: 1,
          lastAccessed: Date.now()
        };
        updated = [newItem, ...current];
      }

      // Keep top items
      const trimmed = updated.slice(0, MAX_FREQUENT_PARTS);
      localStorage.setItem(STORAGE_KEYS.FREQUENT_PARTS, JSON.stringify(trimmed));
      return trimmed;
    } catch (e) {
      console.warn('Error recording part access to localStorage:', e);
      return [];
    }
  },

  /**
   * Deletes a single part number from frequent access history
   */
  deleteAccessedPart: (partNumber: string): AccessedPartNumber[] => {
    try {
      const current = searchHistoryService.getAccessedParts();
      const updated = current.filter(p => p.partNumber.toUpperCase() !== partNumber.trim().toUpperCase());
      localStorage.setItem(STORAGE_KEYS.FREQUENT_PARTS, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.warn('Error deleting accessed part from localStorage:', e);
      return [];
    }
  },

  /**
   * Clears all accessed part numbers
   */
  clearAccessedParts: (): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.FREQUENT_PARTS, JSON.stringify([]));
    } catch (e) {
      console.warn('Error clearing accessed parts:', e);
    }
  }
};
