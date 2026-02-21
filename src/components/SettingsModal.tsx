import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from './Modal';
import { DEFAULT_USER_PREFERENCES } from '../types/user';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm';

const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1';

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { user, preferences, updatePreferences, signOut } = useAuth();

  const [windSpeedMin, setWindSpeedMin] = useState(DEFAULT_USER_PREFERENCES.windSpeedMin);
  const [gustMin, setGustMin] = useState(DEFAULT_USER_PREFERENCES.gustMin);
  const [forecastDays, setForecastDays] = useState(DEFAULT_USER_PREFERENCES.forecastDays);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && preferences) {
      setWindSpeedMin(preferences.windSpeedMin);
      setGustMin(preferences.gustMin);
      setForecastDays(preferences.forecastDays);
    }
  }, [open, preferences]);

  async function handleSave() {
    setSaving(true);
    await updatePreferences({ windSpeedMin, gustMin, forecastDays });
    setSaving(false);
    onClose();
  }

  async function handleSignOut() {
    await signOut();
    onClose();
  }

  const displayName = user?.displayName || user?.email || '';

  return (
    <Modal open={open} onClose={onClose} title="Paramètres">
      <div className="space-y-6">
        {/* User info */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
          <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-500/20 flex items-center justify-center">
            <span className="text-teal-700 dark:text-teal-400 font-bold text-sm">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {displayName}
            </p>
            {user?.displayName && user.email && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {user.email}
              </p>
            )}
          </div>
        </div>

        {/* Settings form */}
        <div className="space-y-4">
          <div>
            <label className={labelClass}>
              Vent minimum (km/h)
            </label>
            <input
              type="number"
              min={5}
              max={40}
              step={1}
              value={windSpeedMin}
              onChange={(e) => setWindSpeedMin(Number(e.target.value))}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-slate-400">
              Vitesse de vent minimum pour considérer un créneau navigable
            </p>
          </div>

          <div>
            <label className={labelClass}>
              Rafales minimum (km/h)
            </label>
            <input
              type="number"
              min={10}
              max={60}
              step={1}
              value={gustMin}
              onChange={(e) => setGustMin(Number(e.target.value))}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-slate-400">
              Vitesse de rafale minimum pour considérer un créneau navigable
            </p>
          </div>

          <div>
            <label className={labelClass}>
              Jours de prévision
            </label>
            <select
              value={forecastDays}
              onChange={(e) => setForecastDays(Number(e.target.value))}
              className={inputClass}
            >
              <option value={1}>1 jour (aujourd'hui)</option>
              <option value={2}>2 jours</option>
              <option value={3}>3 jours</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 text-sm"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          <button
            onClick={handleSignOut}
            className="w-full py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-sm font-medium"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </Modal>
  );
}
