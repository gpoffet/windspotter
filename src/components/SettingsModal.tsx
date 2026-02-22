import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../hooks/useConfig';
import { useNotifications } from '../hooks/useNotifications';
import { Modal } from './Modal';
import { AdminModal } from './AdminModal';
import { EditProfileModal } from './EditProfileModal';
import { ChangePasswordModal } from './ChangePasswordModal';
import { DEFAULT_USER_PREFERENCES } from '../types/user';
import type { ThemePreference } from '../types/user';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm';

const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1';

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { user, isAdmin, preferences, updatePreferences, signOut } = useAuth();
  const { spots: spotConfigs } = useConfig();

  const [windSpeedMin, setWindSpeedMin] = useState(DEFAULT_USER_PREFERENCES.windSpeedMin);
  const [gustMin, setGustMin] = useState(DEFAULT_USER_PREFERENCES.gustMin);
  const [forecastDays, setForecastDays] = useState(DEFAULT_USER_PREFERENCES.forecastDays);
  const [selectedSpots, setSelectedSpots] = useState<string[]>([]);
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');
  const [saving, setSaving] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const notifications = useNotifications();
  const [togglingNotif, setTogglingNotif] = useState(false);

  useEffect(() => {
    if (open && preferences) {
      setWindSpeedMin(preferences.windSpeedMin);
      setGustMin(preferences.gustMin);
      setForecastDays(preferences.forecastDays);
      setSelectedSpots(
        preferences.selectedSpots?.length
          ? preferences.selectedSpots
          : spotConfigs.map((s) => s.pointId),
      );
      setThemePreference(preferences.themePreference ?? 'system');
    }
  }, [open, preferences, spotConfigs]);

  function toggleSpot(pointId: string) {
    setSelectedSpots((prev) =>
      prev.includes(pointId)
        ? prev.filter((id) => id !== pointId)
        : [...prev, pointId],
    );
  }

  async function handleSave() {
    const allSelected = selectedSpots.length === spotConfigs.length;
    setSaving(true);
    await updatePreferences({
      windSpeedMin,
      gustMin,
      forecastDays,
      selectedSpots: allSelected ? [] : selectedSpots,
      themePreference,
    });
    setSaving(false);
    onClose();
  }

  async function handleSignOut() {
    await signOut();
    onClose();
  }

  const displayName = user?.displayName || user?.email || '';

  return (
    <>
    <Modal open={open} onClose={onClose} title="Paramètres">
      <div className="space-y-6">
        {/* Admin button */}
        {isAdmin && (
          <button
            onClick={() => setAdminOpen(true)}
            className="w-full py-2.5 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 transition-colors text-sm flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Administration
          </button>
        )}

        {/* User info */}
        <div className="pb-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
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
          <div className="flex gap-3 mt-3">
            <button
              type="button"
              onClick={() => setEditProfileOpen(true)}
              className="text-xs text-teal-600 dark:text-teal-400 hover:underline"
            >
              Modifier le profil
            </button>
            <span className="text-xs text-slate-300 dark:text-slate-600">|</span>
            <button
              type="button"
              onClick={() => setChangePasswordOpen(true)}
              className="text-xs text-teal-600 dark:text-teal-400 hover:underline"
            >
              Changer le mot de passe
            </button>
          </div>
        </div>

        {/* Theme selector */}
        <div>
          <label className={labelClass}>Thème</label>
          <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-700/50">
            {([
              { value: 'light' as const, label: 'Clair', icon: (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              )},
              { value: 'dark' as const, label: 'Sombre', icon: (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
              )},
              { value: 'system' as const, label: 'Système', icon: (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <path d="M8 21h8M12 17v4" />
                </svg>
              )},
            ] as const).map(({ value, label, icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setThemePreference(value)}
                className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  themePreference === value
                    ? 'bg-white dark:bg-slate-600 text-teal-700 dark:text-teal-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
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

          {spotConfigs.length > 0 && (
            <div>
              <label className={labelClass}>Choisis tes spots</label>
              <div className="space-y-2">
                {[...spotConfigs].sort((a, b) => a.name.localeCompare(b.name)).map((spot) => (
                  <label
                    key={spot.pointId}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSpots.includes(spot.pointId)}
                      onChange={() => toggleSpot(spot.pointId)}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {spot.name}
                    </span>
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Seuls les spots cochés s'afficheront sur la page d'accueil
              </p>
            </div>
          )}
        </div>

        {/* Notifications */}
        {notifications.supported && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Notifications matinales
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Reçois une alerte chaque matin si du vent est prévu
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notifications.enabled}
                disabled={togglingNotif || notifications.loading}
                onClick={async () => {
                  setTogglingNotif(true);
                  try {
                    if (notifications.enabled) {
                      await notifications.disable();
                    } else {
                      await notifications.enable();
                    }
                  } catch (err) {
                    console.error('Notification toggle error:', err);
                  } finally {
                    setTogglingNotif(false);
                  }
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out disabled:opacity-50 ${
                  notifications.enabled ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    notifications.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            {notifications.permission === 'denied' && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                Les notifications sont bloquées. Active-les dans les paramètres de ton navigateur.
              </p>
            )}
            {notifications.error && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                {notifications.error}
              </p>
            )}
          </div>
        )}

      </div>

      {/* Actions – sticky bottom */}
      <div className="sticky bottom-0 -mx-5 -mb-4 px-5 pb-4 pt-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 space-y-3">
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
    </Modal>
    <AdminModal open={adminOpen} onClose={() => setAdminOpen(false)} />
    <EditProfileModal open={editProfileOpen} onClose={() => setEditProfileOpen(false)} />
    <ChangePasswordModal open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />
    </>
  );
}
