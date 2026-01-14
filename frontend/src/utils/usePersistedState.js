import { useState, useEffect } from "react";

/**
 * Custom hook for persisting state to localStorage
 * @param {string} key - The localStorage key
 * @param {any} defaultValue - The default value if no stored value exists
 * @returns {[any, function]} - Returns state and setter like useState
 */
export function usePersistedState(key, defaultValue) {
  const [state, setState] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
    }
    return defaultValue;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.warn(`Error writing localStorage key "${key}":`, error);
    }
  }, [key, state]);

  return [state, setState];
}

/**
 * Custom hook specifically for items per page pagination
 * Uses a single key prefix for consistency across the app
 * @param {string} pageId - Unique identifier for the page/component
 * @param {number} defaultValue - Default items per page (default: 10)
 * @returns {[number, function]} - Returns itemsPerPage and setter
 */
export function useItemsPerPage(pageId, defaultValue = 10) {
  const key = `komandorr_itemsPerPage_${pageId}`;
  return usePersistedState(key, defaultValue);
}
