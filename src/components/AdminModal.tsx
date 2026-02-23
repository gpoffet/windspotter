import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../config/firebase';
import { Modal } from './Modal';
import { SpotLocationPicker, type SearchResult } from './SpotLocationPicker';
import type { NavigabilityConfig, SpotConfig, WaterBody, WaterBodyType } from '../types/forecast';
import { findNearestAlplakesLake } from '../data/alplakesLakes';

type Tab = 'settings' | 'users' | 'spots' | 'waterBodies';

const WATER_BODY_TYPE_LABELS: Record<WaterBodyType, string> = {
  lake: 'Lac',
  sea: 'Mer',
  ocean: 'Océan',
  river: 'Rivière',
  quarry_lake: 'Gravière',
  pond: 'Étang',
  other: 'Autre',
};

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
  `px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
    active
      ? 'bg-teal-600 text-white'
      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
  }`;

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm';

const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1';

const flashRingClass = 'ring-2 ring-green-500 dark:ring-green-400';

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
}

export function AdminModal({ open, onClose }: AdminModalProps) {
  const [tab, setTab] = useState<Tab>('settings');

  return (
    <Modal open={open} onClose={onClose} title="Administration">
      <div className="space-y-4">
        {/* Tab navigation */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          <button className={tabClass(tab === 'settings')} onClick={() => setTab('settings')}>
            Paramètres
          </button>
          <button className={tabClass(tab === 'users')} onClick={() => setTab('users')}>
            Utilisateurs
          </button>
          <button className={tabClass(tab === 'spots')} onClick={() => setTab('spots')}>
            Spots
          </button>
          <button className={tabClass(tab === 'waterBodies')} onClick={() => setTab('waterBodies')}>
            Plans d'eau
          </button>
        </div>

        {tab === 'settings' && <SettingsTab open={open} />}
        {tab === 'users' && <UsersTab open={open} />}
        {tab === 'spots' && <SpotsTab open={open} />}
        {tab === 'waterBodies' && <WaterBodiesTab open={open} />}
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
  const [waterBodies, setWaterBodies] = useState<WaterBody[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Add/edit spot mode
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSpotId, setEditingSpotId] = useState<string | null>(null);

  // Spot form
  const [newSpot, setNewSpot] = useState<Partial<SpotConfig> | null>(null);
  const [selectedWaterBodyId, setSelectedWaterBodyId] = useState('');
  const [selectedStation, setSelectedStation] = useState('');
  const [adding, setAdding] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reverse geocoding debounce
  const reverseGeoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    Promise.all([
      getDoc(doc(db, 'config', 'spots')),
      getDocs(collection(db, 'waterBodies')),
    ])
      .then(([spotsSnap, wbSnap]) => {
        if (spotsSnap.exists()) {
          setSpots(spotsSnap.data().spots as SpotConfig[]);
        }
        setWaterBodies(wbSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as WaterBody[]);
        setLoading(false);
      })
      .catch(() => {
        setError('Impossible de charger les spots.');
        setLoading(false);
      });
  }, [open]);

  function handleLocationChange(lat: number, lon: number) {
    setNewSpot((prev) => ({ ...(prev ?? {}), lat, lon }));
    setSelectedStation(findNearestStation(lat, lon));
    setValidationError(null);

    // Debounced reverse geocoding for NPA via MapServer identify
    if (reverseGeoTimerRef.current) clearTimeout(reverseGeoTimerRef.current);
    reverseGeoTimerRef.current = setTimeout(async () => {
      try {
        const url = `https://api3.geo.admin.ch/rest/services/api/MapServer/identify?geometryType=esriGeometryPoint&geometry=${lon},${lat}&sr=4326&layers=all:ch.swisstopo-vd.ortschaftenverzeichnis_plz&tolerance=0&mapExtent=5.8,45.8,10.5,47.9&imageDisplay=500,300,96&returnGeometry=false`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.results?.length) {
          const npa = data.results[0].attributes?.plz ?? 0;
          if (npa >= 1000 && npa <= 9999) {
            setNewSpot((prev) => prev ? { ...prev, npa, pointId: `${npa}00` } : prev);
          }
        }
      } catch { /* NPA will remain unfilled, admin can set manually */ }
    }, 500);
  }

  async function handleSearchSelect(result: SearchResult) {
    const { lat, lon, label, detail, origin } = result;

    const nameFromLabel = label
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

    // Extract NPA directly from search result
    let npa = 0;
    const npaMatch = detail.match(/^\d{4}/);
    if (npaMatch) {
      npa = parseInt(npaMatch[0], 10);
    } else if (origin === 'gg25') {
      // For municipality results, look up NPA via the MapServer find endpoint
      try {
        const cleanName = label.replace(/<[^>]*>/g, '').replace(/\s*\([^)]*\)\s*$/, '').trim();
        const url = `https://api3.geo.admin.ch/rest/services/api/MapServer/find?layer=ch.swisstopo-vd.ortschaftenverzeichnis_plz&searchField=langtext&searchText=${encodeURIComponent(cleanName)}&returnGeometry=false`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.results?.length) {
          npa = data.results[0].attributes?.plz ?? 0;
        }
      } catch { /* NPA will remain 0, admin can fill manually */ }
    }

    setNewSpot({
      name: nameFromLabel,
      id,
      lat,
      lon,
      npa: npa || undefined,
      pointId: npa ? `${npa}00` : '',
    });
    setSelectedStation(findNearestStation(lat, lon));
    setValidationError(null);
  }

  function handleEditSpot(spot: SpotConfig) {
    setNewSpot({ ...spot });
    setSelectedWaterBodyId(spot.waterBodyId ?? spot.lake ?? '');
    setSelectedStation(spot.stationId);
    setEditingSpotId(spot.id);
    setShowAddForm(true);
    setValidationError(null);
  }

  function validate(): string | null {
    if (!newSpot) return 'Placez un marqueur sur la carte.';
    if (!newSpot.name?.trim()) return 'Le nom est requis.';
    if (!newSpot.id?.trim()) return "L'identifiant est requis.";
    if (!newSpot.npa || newSpot.npa < 1000 || newSpot.npa > 9999) return 'Le NPA doit être un code postal suisse valide (4 chiffres).';
    if (!newSpot.lat || !newSpot.lon) return 'Les coordonnées sont requises.';
    if (!selectedStation) return 'Sélectionnez une station SMN.';
    const otherSpots = editingSpotId ? spots.filter((s) => s.id !== editingSpotId) : spots;
    if (otherSpots.some((s) => s.id === newSpot.id)) return `Un spot avec l'identifiant "${newSpot.id}" existe déjà.`;
    if (otherSpots.some((s) => s.npa === newSpot.npa)) return `Un spot avec le NPA ${newSpot.npa} existe déjà.`;
    return null;
  }

  async function handleSaveSpot() {
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
        lake: selectedWaterBodyId || '',
        alplakesKey: selectedWaterBodyId || '',
        ...(selectedWaterBodyId && { waterBodyId: selectedWaterBodyId }),
      };
      const updated = editingSpotId
        ? spots.map((s) => s.id === editingSpotId ? spot : s)
        : [...spots, spot];
      await setDoc(doc(db, 'config', 'spots'), { spots: updated });
      setSpots(updated);
      setNewSpot(null);
      setSelectedWaterBodyId('');
      setSelectedStation('');
      setEditingSpotId(null);
      setShowAddForm(false);
      // Trigger forecast refresh so changes appear on the main page
      const refreshFn = httpsCallable(functions, 'refreshForecast');
      refreshFn({ force: true }).catch(() => { /* silent — will refresh on next cycle */ });
    } catch {
      setError(editingSpotId ? 'Impossible de modifier le spot.' : "Impossible d'ajouter le spot.");
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
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full py-2.5 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors text-sm flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Ajouter un spot
          </button>
        ) : (
        <>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {editingSpotId ? 'Modifiez la position ou les informations du spot.' : 'Placez le marqueur sur la carte ou recherchez un lieu pour ajouter un spot.'}
        </p>

        {/* Map picker */}
        <SpotLocationPicker
          lat={newSpot?.lat}
          lon={newSpot?.lon}
          onChange={handleLocationChange}
          onSearchSelect={handleSearchSelect}
        />

        {/* New spot form — visible once a location is set */}
        {newSpot && newSpot.lat && newSpot.lon && (
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
                placeholder="Nom du spot"
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
                <input
                  type="number"
                  value={newSpot.npa || ''}
                  onChange={(e) => {
                    const npa = parseInt(e.target.value, 10) || 0;
                    setNewSpot({ ...newSpot, npa, pointId: npa >= 1000 ? `${npa}00` : '' });
                  }}
                  placeholder="Auto-détecté..."
                  className={inputClass}
                />
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
              <label className={labelClass}>Point ID (prévisions)</label>
              <input type="text" value={newSpot.pointId || ''} readOnly className={`${inputClass} bg-slate-100 dark:bg-slate-600 cursor-not-allowed`} />
              <p className="mt-1 text-xs text-slate-400">Dérivé du NPA — modifiez le NPA pour changer la station de prévision</p>
            </div>

            <div>
              <label className={labelClass}>Plan d'eau</label>
              <select
                value={selectedWaterBodyId}
                onChange={(e) => setSelectedWaterBodyId(e.target.value)}
                className={inputClass}
              >
                <option value="">— Aucun —</option>
                {[...waterBodies].sort((a, b) => a.name.localeCompare(b.name)).map((wb) => (
                  <option key={wb.id} value={wb.id}>{wb.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Station SMN (conditions actuelles)</label>
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
                onClick={handleSaveSpot}
                disabled={adding}
                className="flex-1 py-2.5 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 text-sm"
              >
                {adding ? 'Enregistrement...' : editingSpotId ? 'Enregistrer' : 'Ajouter le spot'}
              </button>
              <button
                onClick={() => { setNewSpot(null); setSelectedWaterBodyId(''); setSelectedStation(''); setValidationError(null); setEditingSpotId(null); setShowAddForm(false); }}
                className="px-4 py-2.5 rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors text-sm"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
        </>
        )}
      </div>

      {/* Existing spots list */}
      <div className="space-y-2">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {spots.length} spot{spots.length > 1 ? 's' : ''} configuré{spots.length > 1 ? 's' : ''}
        </p>

        <div className="space-y-1 max-h-64 overflow-y-auto">
          {[...spots].sort((a, b) => a.name.localeCompare(b.name)).map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <div className="min-w-0 flex-1" onClick={() => handleEditSpot(s)}>
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {s.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {waterBodies.find((wb) => wb.id === (s.waterBodyId ?? s.lake))?.name ?? 'Aucun plan d\'eau'} · NPA {s.npa} · {s.stationId}
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

// --- Water Bodies Tab ---

function WaterBodiesTab({ open }: { open: boolean }) {
  const [waterBodies, setWaterBodies] = useState<WaterBody[]>([]);
  const [spots, setSpots] = useState<SpotConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Add/edit mode
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<WaterBodyType>('lake');
  const [formCountry, setFormCountry] = useState('CH');
  const [formRegion, setFormRegion] = useState('');
  const [formAlplakesId, setFormAlplakesId] = useState('');
  const [formCenterLat, setFormCenterLat] = useState('');
  const [formCenterLng, setFormCenterLng] = useState('');
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Nominatim search state
  const [nominatimResults, setNominatimResults] = useState<NominatimResult[]>([]);
  const [nominatimLoading, setNominatimLoading] = useState(false);
  const [nominatimError, setNominatimError] = useState<string | null>(null);

  // Flash highlight state
  const [flashLat, setFlashLat] = useState(false);
  const [flashLng, setFlashLng] = useState(false);
  const [flashAlplakesId, setFlashAlplakesId] = useState(false);

  // Alplakes nearest lake suggestion (recalculated when lat/lng change)
  const alplakesSuggestion = useMemo(() => {
    const lat = parseFloat(formCenterLat);
    const lng = parseFloat(formCenterLng);
    if (isNaN(lat) || isNaN(lng)) return null;
    return findNearestAlplakesLake(lat, lng);
  }, [formCenterLat, formCenterLng]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [wbSnap, spotsSnap] = await Promise.all([
        getDocs(collection(db, 'waterBodies')),
        getDoc(doc(db, 'config', 'spots')),
      ]);
      setWaterBodies(wbSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as WaterBody[]);
      if (spotsSnap.exists()) {
        setSpots(spotsSnap.data().spots as SpotConfig[]);
      }
    } catch {
      setError('Impossible de charger les plans d\'eau.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadData();
  }, [open, loadData]);

  function spotCount(wbId: string): number {
    return spots.filter((s) => (s.waterBodyId ?? s.lake) === wbId).length;
  }

  function resetForm() {
    setFormName('');
    setFormType('lake');
    setFormCountry('CH');
    setFormRegion('');
    setFormAlplakesId('');
    setFormCenterLat('');
    setFormCenterLng('');
    setValidationError(null);
    setEditingId(null);
    setShowAddForm(false);
    setNominatimResults([]);
    setNominatimLoading(false);
    setNominatimError(null);
    setFlashLat(false);
    setFlashLng(false);
    setFlashAlplakesId(false);
  }

  function handleEdit(wb: WaterBody) {
    setFormName(wb.name);
    setFormType(wb.type);
    setFormCountry(wb.country);
    setFormRegion(wb.region ?? '');
    setFormAlplakesId(wb.alplakesId ?? '');
    setFormCenterLat(wb.center?.lat?.toString() ?? '');
    setFormCenterLng(wb.center?.lng?.toString() ?? '');
    setEditingId(wb.id);
    setShowAddForm(true);
    setValidationError(null);
    setNominatimResults([]);
    setNominatimError(null);
  }

  // --- Nominatim & Alplakes helpers ---

  function triggerFlash(setter: (v: boolean) => void) {
    setter(true);
    setTimeout(() => setter(false), 1500);
  }

  async function handleNominatimSearch() {
    const q = formName.trim();
    if (q.length < 3) return;

    setNominatimLoading(true);
    setNominatimError(null);
    setNominatimResults([]);

    try {
      const url =
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(q)}&format=json&limit=5&accept-language=fr`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'WindSpotter/1.0 (contact@windspotter.app)' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: NominatimResult[] = await res.json();
      if (data.length === 0) {
        setNominatimError('Aucun résultat trouvé. Essayez un autre nom ou saisissez les coordonnées manuellement.');
      } else {
        setNominatimResults(data);
      }
    } catch {
      setNominatimError('Erreur lors de la recherche. Réessayez.');
    } finally {
      setNominatimLoading(false);
    }
  }

  function handleSelectNominatimResult(result: NominatimResult) {
    setFormCenterLat(result.lat);
    setFormCenterLng(result.lon);
    setNominatimResults([]);
    setNominatimError(null);
    triggerFlash(setFlashLat);
    triggerFlash(setFlashLng);
  }

  function handleApplyAlplakesSuggestion() {
    if (alplakesSuggestion) {
      setFormAlplakesId(alplakesSuggestion.lake.key);
      triggerFlash(setFlashAlplakesId);
    }
  }

  function validate(): string | null {
    if (!formName.trim()) return 'Le nom est requis.';
    if (!formCountry.trim() || formCountry.trim().length !== 2) return 'Le pays doit être un code ISO à 2 caractères (ex. CH).';
    // Check name uniqueness
    const otherWbs = editingId ? waterBodies.filter((wb) => wb.id !== editingId) : waterBodies;
    if (otherWbs.some((wb) => wb.name.toLowerCase() === formName.trim().toLowerCase())) {
      return `Un plan d'eau nommé "${formName.trim()}" existe déjà.`;
    }
    return null;
  }

  async function handleSave() {
    const err = validate();
    if (err) {
      setValidationError(err);
      return;
    }
    setSaving(true);
    setValidationError(null);
    try {
      const id = editingId ?? formName.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const centerLat = parseFloat(formCenterLat);
      const centerLng = parseFloat(formCenterLng);
      const data: Record<string, unknown> = {
        name: formName.trim(),
        type: formType,
        country: formCountry.trim().toUpperCase(),
        updatedAt: serverTimestamp(),
      };
      if (formRegion.trim()) data.region = formRegion.trim();
      if (formAlplakesId.trim()) data.alplakesId = formAlplakesId.trim();
      if (!isNaN(centerLat) && !isNaN(centerLng)) {
        data.center = { lat: centerLat, lng: centerLng };
      }
      if (!editingId) {
        data.createdAt = serverTimestamp();
      }
      await setDoc(doc(db, 'waterBodies', id), data, { merge: editingId ? true : false });
      await loadData();
      resetForm();
    } catch {
      setError(editingId ? 'Impossible de modifier le plan d\'eau.' : 'Impossible d\'ajouter le plan d\'eau.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(wbId: string) {
    setDeletingId(wbId);
    try {
      await deleteDoc(doc(db, 'waterBodies', wbId));
      await loadData();
    } catch {
      setError('Impossible de supprimer le plan d\'eau.');
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
        <button onClick={loadData} className="text-sm text-teal-600 dark:text-teal-400 hover:underline">
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Add form */}
      <div className="space-y-3">
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full py-2.5 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors text-sm flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Ajouter un plan d'eau
          </button>
        ) : (
          <div className="space-y-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
            <div>
              <label className={labelClass}>Nom *</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder='Ex. "Lac Léman"'
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Type *</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as WaterBodyType)}
                  className={inputClass}
                >
                  {(Object.entries(WATER_BODY_TYPE_LABELS) as [WaterBodyType, string][]).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Pays *</label>
                <input
                  type="text"
                  value={formCountry}
                  onChange={(e) => setFormCountry(e.target.value)}
                  placeholder="CH"
                  maxLength={2}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Région</label>
              <input
                type="text"
                value={formRegion}
                onChange={(e) => setFormRegion(e.target.value)}
                placeholder='Ex. "Vaud"'
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Identifiant Alplakes</label>
              <input
                type="text"
                value={formAlplakesId}
                onChange={(e) => setFormAlplakesId(e.target.value)}
                placeholder='Ex. "geneva"'
                className={`${inputClass} transition-shadow duration-500 ${flashAlplakesId ? flashRingClass : ''}`}
              />

              {/* Alplakes suggestion based on coordinates proximity */}
              {alplakesSuggestion && (
                <div className={`mt-1.5 flex items-center gap-2 text-xs ${
                  alplakesSuggestion.distance < 10
                    ? 'text-teal-600 dark:text-teal-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}>
                  {formAlplakesId === alplakesSuggestion.lake.key ? (
                    <>
                      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>
                        {alplakesSuggestion.lake.name} ({alplakesSuggestion.distance.toFixed(1)} km)
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="flex-1">
                        {alplakesSuggestion.distance < 10 ? 'Suggestion :' : 'Possible :'}{' '}
                        <strong>{alplakesSuggestion.lake.key}</strong> — {alplakesSuggestion.lake.name}{' '}
                        ({alplakesSuggestion.distance.toFixed(1)} km)
                      </span>
                      <button
                        type="button"
                        onClick={handleApplyAlplakesSuggestion}
                        className="shrink-0 px-2 py-0.5 rounded bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                      >
                        Utiliser
                      </button>
                    </>
                  )}
                </div>
              )}

              {!alplakesSuggestion && (
                <p className="mt-1 text-xs text-slate-400">
                  Laisser vide si pas de données de température disponibles
                </p>
              )}
            </div>

            {/* Coordinates section with Nominatim search */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Centre — Latitude</label>
                  <input
                    type="text"
                    value={formCenterLat}
                    onChange={(e) => setFormCenterLat(e.target.value)}
                    placeholder="46.45"
                    className={`${inputClass} transition-shadow duration-500 ${flashLat ? flashRingClass : ''}`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Centre — Longitude</label>
                  <input
                    type="text"
                    value={formCenterLng}
                    onChange={(e) => setFormCenterLng(e.target.value)}
                    placeholder="6.55"
                    className={`${inputClass} transition-shadow duration-500 ${flashLng ? flashRingClass : ''}`}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleNominatimSearch}
                disabled={formName.trim().length < 3 || nominatimLoading}
                className="w-full py-2 rounded-lg border border-teal-600 dark:border-teal-500 text-teal-600 dark:text-teal-400 font-medium text-sm hover:bg-teal-50 dark:hover:bg-teal-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {nominatimLoading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                    </svg>
                    Recherche en cours...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    Rechercher les coordonnées
                  </>
                )}
              </button>

              {nominatimError && (
                <p className="text-xs text-amber-600 dark:text-amber-400">{nominatimError}</p>
              )}

              {nominatimResults.length > 0 && (
                <div className="rounded-lg border border-slate-200 dark:border-slate-600 divide-y divide-slate-200 dark:divide-slate-600 overflow-hidden">
                  {nominatimResults.map((r, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-slate-700">
                      <p className="text-xs text-slate-700 dark:text-slate-300 truncate flex-1" title={r.display_name}>
                        {r.display_name}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleSelectNominatimResult(r)}
                        className="shrink-0 px-2 py-1 text-xs rounded bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                      >
                        Utiliser
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {validationError && (
              <p className="text-sm text-red-600 dark:text-red-400">{validationError}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 text-sm"
              >
                {saving ? 'Enregistrement...' : editingId ? 'Enregistrer' : 'Ajouter'}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2.5 rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors text-sm"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>

      {/* List */}
      <div className="space-y-2">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {waterBodies.length} plan{waterBodies.length > 1 ? 's' : ''} d'eau configuré{waterBodies.length > 1 ? 's' : ''}
        </p>

        <div className="space-y-1 max-h-64 overflow-y-auto">
          {[...waterBodies].sort((a, b) => a.name.localeCompare(b.name)).map((wb) => {
            const count = spotCount(wb.id);
            return (
              <div
                key={wb.id}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="min-w-0 flex-1" onClick={() => handleEdit(wb)}>
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {wb.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {WATER_BODY_TYPE_LABELS[wb.type]} · {wb.country}
                    {wb.alplakesId ? ` · Alplakes: ${wb.alplakesId}` : ''}
                    {` · ${count} spot${count > 1 ? 's' : ''}`}
                  </p>
                </div>

                {count > 0 ? (
                  <span
                    className="p-1 text-slate-300 dark:text-slate-600 cursor-not-allowed"
                    title={`Associé à ${count} spot${count > 1 ? 's' : ''}. Dissociez-les d'abord.`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </span>
                ) : confirmDeleteId === wb.id ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleDelete(wb.id)}
                      disabled={deletingId === wb.id}
                      className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {deletingId === wb.id ? '...' : 'Oui'}
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
                    onClick={() => setConfirmDeleteId(wb.id)}
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
            );
          })}
        </div>
      </div>
    </div>
  );
}
