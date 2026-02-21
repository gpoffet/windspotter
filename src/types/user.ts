import type { User } from 'firebase/auth';

export interface UserPreferences {
  windSpeedMin: number;
  gustMin: number;
  forecastDays: number;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  windSpeedMin: 15,
  gustMin: 25,
  forecastDays: 2,
};

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  preferences: UserPreferences | null;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  signOut: () => Promise<void>;
}
