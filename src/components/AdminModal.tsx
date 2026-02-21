import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../config/firebase';
import { Modal } from './Modal';
import type { NavigabilityConfig, SpotConfig } from '../types/forecast';

type Tab = 'settings' | 'users' | 'spots';

interface AdminModalProps {
  open: boolean;
  onClose: () => void;
}

interface AdminUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  createdAt: string | null;
  isAdmin: boolean;
}

const tabClass = (active: boolean) =>
  `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
    active
      ? 'bg-teal-600 text-white'
      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
  }`;

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm';

const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1';

export function AdminModal({ open, onClose }: AdminModalProps) {
  const [tab, setTab] = useState<Tab>('settings');

  return (
    <Modal open={open} onClose={onClose} title="Administration">
      <div className="space-y-4">
        {/* Tab navigation */}
        <div className="flex gap-2">
          <button className={tabClass(tab === 'settings')} onClick={() => setTab('settings')}>
            Paramètres
          </button>
          <button className={tabClass(tab === 'users')} onClick={() => setTab('users')}>
            Utilisateurs
          </button>
          <button className={tabClass(tab === 'spots')} onClick={() => setTab('spots')}>
            Spots
          </button>
        </div>

        {tab === 'settings' && <SettingsTab open={open} />}
        {tab === 'users' && <UsersTab open={open} />}
        {tab === 'spots' && <SpotsTab open={open} />}
      </div>
    </Modal>
  );
}

// --- Settings Tab ---

function SettingsTab({ open }: { open: boolean }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [windSpeedMin, setWindSpeedMin] = useState(15);
  const [gustMin, setGustMin] = useState(25);
  const [dayStartHour, setDayStartHour] = useState(7);
  const [dayEndHour, setDayEndHour] = useState(20);
  const [notificationHour, setNotificationHour] = useState(8);
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setTestResult(null);
    Promise.all([
      getDoc(doc(db, 'config', 'navigability')),
      getDoc(doc(db, 'config', 'notifications')),
    ]).then(([navSnap, notifSnap]) => {
      if (navSnap.exists()) {
        const data = navSnap.data() as NavigabilityConfig;
        setWindSpeedMin(data.windSpeedMin);
        setGustMin(data.gustMin);
        setDayStartHour(data.dayStartHour);
        setDayEndHour(data.dayEndHour);
      }
      if (notifSnap.exists()) {
        setNotificationHour(notifSnap.data().hour ?? 8);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [open]);

  async function handleSave() {
    setSaving(true);
    try {
      const snap = await getDoc(doc(db, 'config', 'navigability'));
      const existing = snap.exists() ? snap.data() as NavigabilityConfig : {};
      await Promise.all([
        setDoc(doc(db, 'config', 'navigability'), {
          ...existing,
          windSpeedMin,
          gustMin,
          dayStartHour,
          dayEndHour,
        }),
        setDoc(doc(db, 'config', 'notifications'), { hour: notificationHour }),
      ]);
    } catch (err) {
      console.error('Failed to save config:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleTestNotification() {
    setSendingTest(true);
    setTestResult(null);
    try {
      const fn = httpsCallable(functions, 'sendTestNotification');
      await fn();
      setTestResult({ ok: true, msg: 'Notification envoyée !' });
    } catch (err: unknown) {
      const message = (err as { message?: string }).message || 'Erreur inconnue';
      setTestResult({ ok: false, msg: message });
    } finally {
      setSendingTest(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Chargement...</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Ces valeurs sont les paramètres par défaut appliqués à tous les utilisateurs.
      </p>

      <div>
        <label className={labelClass}>Vent minimum (km/h)</label>
        <input
          type="number"
          min={5}
          max={40}
          step={1}
          value={windSpeedMin}
          onChange={(e) => setWindSpeedMin(Number(e.target.value))}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Rafales minimum (km/h)</label>
        <input
          type="number"
          min={10}
          max={60}
          step={1}
          value={gustMin}
          onChange={(e) => setGustMin(Number(e.target.value))}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Heure de début de navigation</label>
        <input
          type="number"
          min={0}
          max={23}
          step={1}
          value={dayStartHour}
          onChange={(e) => setDayStartHour(Number(e.target.value))}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-slate-400">{dayStartHour}h00</p>
      </div>

      <div>
        <label className={labelClass}>Heure de fin de navigation</label>
        <input
          type="number"
          min={0}
          max={23}
          step={1}
          value={dayEndHour}
          onChange={(e) => setDayEndHour(Number(e.target.value))}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-slate-400">{dayEndHour}h00</p>
      </div>

      {/* Notification hour */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
        <label className={labelClass}>Heure de notification matinale</label>
        <select
          value={notificationHour}
          onChange={(e) => setNotificationHour(Number(e.target.value))}
          className={inputClass}
        >
          {[6, 7, 8, 9].map((h) => (
            <option key={h} value={h}>{h}h00</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-400">
          Heure d'envoi des notifications push aux utilisateurs abonnés
        </p>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 text-sm"
      >
        {saving ? 'Enregistrement...' : 'Enregistrer'}
      </button>

      {/* Test notification */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={handleTestNotification}
          disabled={sendingTest}
          className="w-full py-2.5 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 text-sm flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          {sendingTest ? 'Envoi...' : 'Envoyer une notification de test'}
        </button>
        {testResult && (
          <p className={`mt-2 text-xs ${testResult.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {testResult.msg}
          </p>
        )}
      </div>
    </div>
  );
}

// --- Users Tab ---

function UsersTab({ open }: { open: boolean }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingUid, setDeletingUid] = useState<string | null>(null);
  const [confirmUid, setConfirmUid] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const listUsersFn = httpsCallable<void, AdminUser[]>(functions, 'listUsers');
      const result = await listUsersFn();
      setUsers(result.data);
    } catch (err) {
      console.error('Failed to list users:', err);
      setError('Impossible de charger les utilisateurs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadUsers();
  }, [open, loadUsers]);

  async function handleDelete(uid: string) {
    setDeletingUid(uid);
    try {
      const deleteUserFn = httpsCallable(functions, 'deleteUser');
      await deleteUserFn({ uid });
      setUsers((prev) => prev.filter((u) => u.uid !== uid));
    } catch (err) {
      console.error('Failed to delete user:', err);
      setError('Impossible de supprimer cet utilisateur.');
    } finally {
      setDeletingUid(null);
      setConfirmUid(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Chargement...</p>;
  }

  if (error) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <button onClick={loadUsers} className="text-sm text-teal-600 dark:text-teal-400 hover:underline">
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {users.length} utilisateur{users.length > 1 ? 's' : ''} inscrit{users.length > 1 ? 's' : ''}
      </p>

      <div className="space-y-1 max-h-64 overflow-y-auto">
        {users.map((u) => (
          <div
            key={u.uid}
            className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700/50"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                {u.displayName || u.email || u.uid}
                {u.isAdmin && (
                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
                    admin
                  </span>
                )}
              </p>
              {u.displayName && u.email && (
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{u.email}</p>
              )}
            </div>

            {!u.isAdmin && (
              <>
                {confirmUid === u.uid ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleDelete(u.uid)}
                      disabled={deletingUid === u.uid}
                      className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {deletingUid === u.uid ? '...' : 'Oui'}
                    </button>
                    <button
                      onClick={() => setConfirmUid(null)}
                      className="px-2 py-1 text-xs rounded bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500"
                    >
                      Non
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmUid(u.uid)}
                    className="p-1 rounded text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    title="Supprimer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Spots Tab ---

interface GeoAdminResult {
  label: string;
  detail: string;
  lat: number;
  lon: number;
  origin: string;
}

const SMN_STATIONS: Record<string, { name: string; location: string; lat: number; lon: number }> = {
  PUY: { name: 'Pully', location: 'Pully, VD', lat: 46.5106, lon: 6.6667 },
  CGI: { name: 'Changins', location: 'Nyon, VD', lat: 46.4011, lon: 6.2277 },
  CHB: { name: 'Les Charbonnières', location: 'Vallée de Joux, VD', lat: 46.6702, lon: 6.3124 },
  PAY: { name: 'Payerne', location: 'Payerne, FR', lat: 46.8116, lon: 6.9426 },
  MAH: { name: 'Mathod', location: 'Mathod, VD', lat: 46.7370, lon: 6.5680 },
  NEU: { name: 'Neuchâtel', location: 'Neuchâtel, NE', lat: 47.0000, lon: 6.9500 },
  FRE: { name: 'La Frêtaz', location: 'Bullet, VD', lat: 46.8406, lon: 6.5764 },
  BIE: { name: 'Bière', location: 'Bière, VD', lat: 46.5249, lon: 6.3424 },
};

const LAKES = [
  { value: 'geneva', label: 'Lac Léman', lat: 46.45, lon: 6.55 },
  { value: 'neuchatel', label: 'Lac de Neuchâtel', lat: 46.90, lon: 6.85 },
  { value: 'joux', label: 'Lac de Joux', lat: 46.63, lon: 6.28 },
  { value: 'bret', label: 'Lac de Bret', lat: 46.53, lon: 6.79 },
];

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findNearestLake(lat: number, lon: number): string {
  let nearest = '';
  let minDist = Infinity;
  for (const l of LAKES) {
    const d = distanceKm(lat, lon, l.lat, l.lon);
    if (d < minDist) { minDist = d; nearest = l.value; }
  }
  return nearest;
}

function findNearestStation(lat: number, lon: number): string {
  let nearest = '';
  let minDist = Infinity;
  for (const [id, s] of Object.entries(SMN_STATIONS)) {
    const d = distanceKm(lat, lon, s.lat, s.lon);
    if (d < minDist) { minDist = d; nearest = id; }
  }
  return nearest;
}

function SpotsTab({ open }: { open: boolean }) {
  const [spots, setSpots] = useState<SpotConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Search
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<GeoAdminResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // New spot form
  const [newSpot, setNewSpot] = useState<Partial<SpotConfig> | null>(null);
  const [selectedLake, setSelectedLake] = useState('');
  const [selectedStation, setSelectedStation] = useState('');
  const [adding, setAdding] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    getDoc(doc(db, 'config', 'spots'))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setSpots(data.spots as SpotConfig[]);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Impossible de charger les spots.');
        setLoading(false);
      });
  }, [open]);

  function handleSearchChange(value: string) {
    setSearchText(value);
    setValidationError(null);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      return;
    }

    searchTimerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const url = `https://api3.geo.admin.ch/rest/services/api/SearchServer?searchText=${encodeURIComponent(trimmed)}&origins=zipcode,gg25&type=locations&limit=10`;
        const res = await fetch(url);
        const data = await res.json();
        setSearchResults(data.results?.map((r: Record<string, unknown>) => r.attrs) ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }

  async function handleSelectResult(result: GeoAdminResult) {
    const lat = Math.round(result.lat * 10000) / 10000;
    const lon = Math.round(result.lon * 10000) / 10000;

    // Extract NPA: available directly for zipcode results, needs lookup for gg25
    let npa = 0;
    const npaMatch = result.detail.match(/^\d{4}/);
    if (npaMatch) {
      npa = parseInt(npaMatch[0], 10);
    } else if (result.origin === 'gg25') {
      // For municipality results, look up NPA via the MapServer find endpoint
      try {
        const name = result.label.replace(/<[^>]*>/g, '').replace(/\s*\([^)]*\)\s*$/, '').trim();
        const url = `https://api3.geo.admin.ch/rest/services/api/MapServer/find?layer=ch.swisstopo-vd.ortschaftenverzeichnis_plz&searchField=langtext&searchText=${encodeURIComponent(name)}&returnGeometry=false`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.results?.length) {
          npa = data.results[0].attributes?.plz ?? 0;
        }
      } catch { /* NPA will remain 0, admin can fill manually */ }
    }

    const nameFromLabel = result.label
      .replace(/<[^>]*>/g, '')
      .replace(/^\d+\s*-\s*/, '')
      .replace(/\s*\([^)]*\)\s*$/, '')
      .trim();
    const id = nameFromLabel
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    setNewSpot({
      name: nameFromLabel,
      id,
      npa,
      pointId: npa ? `${npa}00` : '',
      lat,
      lon,
    });

    setSelectedStation(findNearestStation(lat, lon));
    setSelectedLake(findNearestLake(lat, lon));
    setSearchText('');
    setSearchResults([]);
    setValidationError(null);
  }

  function validate(): string | null {
    if (!newSpot) return 'Sélectionnez une localité.';
    if (!newSpot.name?.trim()) return 'Le nom est requis.';
    if (!newSpot.id?.trim()) return "L'identifiant est requis.";
    if (!newSpot.npa || newSpot.npa < 1000 || newSpot.npa > 9999) return 'Le NPA doit être un code postal suisse valide (4 chiffres).';
    if (!newSpot.lat || !newSpot.lon) return 'Les coordonnées sont requises.';
    if (!selectedLake) return 'Sélectionnez un lac.';
    if (!selectedStation) return 'Sélectionnez une station SMN.';
    if (spots.some((s) => s.id === newSpot.id)) return `Un spot avec l'identifiant "${newSpot.id}" existe déjà.`;
    if (spots.some((s) => s.npa === newSpot.npa)) return `Un spot avec le NPA ${newSpot.npa} existe déjà.`;
    return null;
  }

  async function handleAddSpot() {
    const err = validate();
    if (err) {
      setValidationError(err);
      return;
    }
    setAdding(true);
    setValidationError(null);
    try {
      const spot: SpotConfig = {
        id: newSpot!.id!,
        name: newSpot!.name!,
        npa: newSpot!.npa!,
        pointId: newSpot!.pointId || `${newSpot!.npa}00`,
        lat: newSpot!.lat!,
        lon: newSpot!.lon!,
        stationId: selectedStation,
        lake: selectedLake,
        alplakesKey: selectedLake,
      };
      const updated = [...spots, spot];
      await setDoc(doc(db, 'config', 'spots'), { spots: updated });
      setSpots(updated);
      setNewSpot(null);
      setSelectedLake('');
      setSelectedStation('');
      // Trigger forecast refresh so the new spot appears on the main page
      const refreshFn = httpsCallable(functions, 'refreshForecast');
      refreshFn({ force: true }).catch(() => { /* silent — will refresh on next cycle */ });
    } catch {
      setError("Impossible d'ajouter le spot.");
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteSpot(spotId: string) {
    setDeletingId(spotId);
    try {
      const updated = spots.filter((s) => s.id !== spotId);
      await setDoc(doc(db, 'config', 'spots'), { spots: updated });
      setSpots(updated);
      // Trigger forecast refresh to remove the spot from the main page
      const refreshFn = httpsCallable(functions, 'refreshForecast');
      refreshFn({ force: true }).catch(() => { /* silent */ });
    } catch {
      setError('Impossible de supprimer le spot.');
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Chargement...</p>;
  }

  if (error) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={() => { setError(null); setLoading(true); getDoc(doc(db, 'config', 'spots')).then((snap) => { if (snap.exists()) setSpots(snap.data().spots as SpotConfig[]); setLoading(false); }).catch(() => { setError('Impossible de charger les spots.'); setLoading(false); }); }}
          className="text-sm text-teal-600 dark:text-teal-400 hover:underline"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Add spot section */}
      <div className="space-y-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Recherchez un NPA ou une localité pour ajouter un spot.
        </p>

        {/* Search field */}
        <div className="relative">
          <input
            type="text"
            value={searchText}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Ex: 1095 ou Lutry"
            className={inputClass}
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">...</div>
          )}

          {/* Dropdown results */}
          {searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {searchResults.map((r, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectResult(r)}
                  className="w-full text-left px-3 py-2 text-sm text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                  dangerouslySetInnerHTML={{ __html: r.label }}
                />
              ))}
            </div>
          )}
        </div>

        {/* New spot form */}
        {newSpot && (
          <div className="space-y-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
            <div>
              <label className={labelClass}>Nom</label>
              <input
                type="text"
                value={newSpot.name || ''}
                onChange={(e) => {
                  const name = e.target.value;
                  const id = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                  setNewSpot({ ...newSpot, name, id });
                }}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>ID</label>
                <input type="text" value={newSpot.id || ''} readOnly className={`${inputClass} bg-slate-100 dark:bg-slate-600 cursor-not-allowed`} />
              </div>
              <div>
                <label className={labelClass}>NPA</label>
                {newSpot.npa ? (
                  <input type="text" value={newSpot.npa} readOnly className={`${inputClass} bg-slate-100 dark:bg-slate-600 cursor-not-allowed`} />
                ) : (
                  <input
                    type="number"
                    value={newSpot.npa || ''}
                    onChange={(e) => {
                      const npa = parseInt(e.target.value, 10) || 0;
                      setNewSpot({ ...newSpot, npa, pointId: npa >= 1000 ? `${npa}00` : '' });
                    }}
                    placeholder="Code postal (4 chiffres)"
                    className={inputClass}
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Latitude</label>
                <input type="text" value={newSpot.lat || ''} readOnly className={`${inputClass} bg-slate-100 dark:bg-slate-600 cursor-not-allowed`} />
              </div>
              <div>
                <label className={labelClass}>Longitude</label>
                <input type="text" value={newSpot.lon || ''} readOnly className={`${inputClass} bg-slate-100 dark:bg-slate-600 cursor-not-allowed`} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Point ID</label>
              <input type="text" value={newSpot.pointId || ''} readOnly className={`${inputClass} bg-slate-100 dark:bg-slate-600 cursor-not-allowed`} />
            </div>

            <div>
              <label className={labelClass}>Lac</label>
              <select
                value={selectedLake}
                onChange={(e) => setSelectedLake(e.target.value)}
                className={inputClass}
              >
                <option value="">Sélectionner un lac...</option>
                {LAKES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Station SMN</label>
              <select
                value={selectedStation}
                onChange={(e) => setSelectedStation(e.target.value)}
                className={inputClass}
              >
                <option value="">Sélectionner une station...</option>
                {Object.entries(SMN_STATIONS)
                  .map(([id, s]) => ({
                    id,
                    ...s,
                    dist: Math.round(distanceKm(newSpot.lat!, newSpot.lon!, s.lat, s.lon)),
                  }))
                  .sort((a, b) => a.dist - b.dist)
                  .map(({ id, name, dist }) => (
                    <option key={id} value={id}>
                      {id} - {name} ({dist} km)
                    </option>
                  ))}
              </select>
            </div>

            {validationError && (
              <p className="text-sm text-red-600 dark:text-red-400">{validationError}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleAddSpot}
                disabled={adding}
                className="flex-1 py-2.5 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 text-sm"
              >
                {adding ? 'Ajout...' : 'Ajouter le spot'}
              </button>
              <button
                onClick={() => { setNewSpot(null); setSelectedLake(''); setSelectedStation(''); setValidationError(null); }}
                className="px-4 py-2.5 rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors text-sm"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Existing spots list */}
      <div className="space-y-2">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {spots.length} spot{spots.length > 1 ? 's' : ''} configuré{spots.length > 1 ? 's' : ''}
        </p>

        <div className="space-y-1 max-h-64 overflow-y-auto">
          {spots.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700/50"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {s.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {LAKES.find((l) => l.value === s.lake)?.label ?? s.lake} · NPA {s.npa} · {s.stationId}
                </p>
              </div>

              {confirmDeleteId === s.id ? (
                <div className="flex gap-1">
                  <button
                    onClick={() => handleDeleteSpot(s.id)}
                    disabled={deletingId === s.id}
                    className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {deletingId === s.id ? '...' : 'Oui'}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-2 py-1 text-xs rounded bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500"
                  >
                    Non
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(s.id)}
                  className="p-1 rounded text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  title="Supprimer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
