/**
 * User Configuration Management
 * 
 * Manages user tier and POS recognition preferences using Chrome Storage API.
 * Supports free and paid user tiers with different POS recognition approaches.
 * 
 * Requirements: 10.1, 10.2
 */

import type { POSTag } from '../types/pos';

/**
 * User tier levels
 */
export type UserTier = 'free' | 'paid';

/**
 * Available POS recognition approaches
 */
export type POSApproach = 'frontend' | 'nlp' | 'ai' | 'auto';

/**
 * Color scheme for POS visualization
 */
export interface ColorScheme {
  noun: string;
  verb: string;
  adjective: string;
  adverb: string;
  unknown: string;
}

/**
 * User configuration interface
 */
export interface UserConfig {
  tier: UserTier;
  preferredApproach: POSApproach;
  enableCache: boolean;
  colorScheme: ColorScheme;
}

/**
 * Default color scheme
 */
export const DEFAULT_COLOR_SCHEME: ColorScheme = {
  noun: '#4A90E2',      // Blue
  verb: '#E24A4A',      // Red
  adjective: '#50C878',  // Green
  adverb: '#F5A623',    // Orange
  unknown: '#9B9B9B'    // Gray
};

/**
 * Default user configuration
 */
export const DEFAULT_USER_CONFIG: UserConfig = {
  tier: 'free',
  preferredApproach: 'auto',
  enableCache: true,
  colorScheme: DEFAULT_COLOR_SCHEME
};

/**
 * Storage key for user configuration
 */
const USER_CONFIG_KEY = 'pos_user_config';

/**
 * User Configuration Manager
 * 
 * Handles reading and storing user configuration using Chrome Storage API.
 */
export class UserConfigManager {
  /**
   * Get user configuration from Chrome storage
   * 
   * @returns Promise resolving to user configuration
   */
  async getConfig(): Promise<UserConfig> {
    try {
      // Check if Chrome storage API is available
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        return new Promise((resolve) => {
          chrome.storage.sync.get([USER_CONFIG_KEY], (result) => {
            if (chrome.runtime.lastError) {
              console.warn('Failed to read user config from Chrome storage:', chrome.runtime.lastError);
              resolve(DEFAULT_USER_CONFIG);
            } else {
              const config = result[USER_CONFIG_KEY];
              resolve(config ? { ...DEFAULT_USER_CONFIG, ...config } : DEFAULT_USER_CONFIG);
            }
          });
        });
      } else {
        // Fallback to localStorage for testing environments
        const stored = localStorage.getItem(USER_CONFIG_KEY);
        if (stored) {
          const config = JSON.parse(stored);
          return { ...DEFAULT_USER_CONFIG, ...config };
        }
        return DEFAULT_USER_CONFIG;
      }
    } catch (error) {
      console.error('Error reading user config:', error);
      return DEFAULT_USER_CONFIG;
    }
  }

  /**
   * Save user configuration to Chrome storage
   * 
   * @param config - User configuration to save
   * @returns Promise resolving when save is complete
   */
  async setConfig(config: Partial<UserConfig>): Promise<void> {
    try {
      // Merge with existing config
      const currentConfig = await this.getConfig();
      const newConfig: UserConfig = { ...currentConfig, ...config };

      // Check if Chrome storage API is available
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        return new Promise((resolve, reject) => {
          chrome.storage.sync.set({ [USER_CONFIG_KEY]: newConfig }, () => {
            if (chrome.runtime.lastError) {
              console.error('Failed to save user config to Chrome storage:', chrome.runtime.lastError);
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        });
      } else {
        // Fallback to localStorage for testing environments
        localStorage.setItem(USER_CONFIG_KEY, JSON.stringify(newConfig));
      }
    } catch (error) {
      console.error('Error saving user config:', error);
      throw error;
    }
  }

  /**
   * Get user tier
   * 
   * @returns Promise resolving to user tier
   */
  async getUserTier(): Promise<UserTier> {
    const config = await this.getConfig();
    return config.tier;
  }

  /**
   * Set user tier
   * 
   * @param tier - User tier to set
   * @returns Promise resolving when tier is set
   */
  async setUserTier(tier: UserTier): Promise<void> {
    await this.setConfig({ tier });
  }

  /**
   * Get preferred POS approach
   * 
   * @returns Promise resolving to preferred approach
   */
  async getPreferredApproach(): Promise<POSApproach> {
    const config = await this.getConfig();
    return config.preferredApproach;
  }

  /**
   * Set preferred POS approach
   * 
   * @param approach - Approach to set
   * @returns Promise resolving when approach is set
   */
  async setPreferredApproach(approach: POSApproach): Promise<void> {
    await this.setConfig({ preferredApproach: approach });
  }

  /**
   * Check if cache is enabled
   * 
   * @returns Promise resolving to cache enabled status
   */
  async isCacheEnabled(): Promise<boolean> {
    const config = await this.getConfig();
    return config.enableCache;
  }

  /**
   * Set cache enabled status
   * 
   * @param enabled - Cache enabled status
   * @returns Promise resolving when status is set
   */
  async setCacheEnabled(enabled: boolean): Promise<void> {
    await this.setConfig({ enableCache: enabled });
  }

  /**
   * Get color scheme
   * 
   * @returns Promise resolving to color scheme
   */
  async getColorScheme(): Promise<ColorScheme> {
    const config = await this.getConfig();
    return config.colorScheme;
  }

  /**
   * Set color scheme
   * 
   * @param colorScheme - Color scheme to set
   * @returns Promise resolving when scheme is set
   */
  async setColorScheme(colorScheme: ColorScheme): Promise<void> {
    await this.setConfig({ colorScheme });
  }

  /**
   * Reset configuration to defaults
   * 
   * @returns Promise resolving when reset is complete
   */
  async resetConfig(): Promise<void> {
    await this.setConfig(DEFAULT_USER_CONFIG);
  }
}

/**
 * Singleton instance of UserConfigManager
 */
export const userConfigManager = new UserConfigManager();
