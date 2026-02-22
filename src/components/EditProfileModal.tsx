import { useState, useEffect } from 'react';
import { updateProfile } from 'firebase/auth';
import { auth } from '../config/firebase';
import { Modal } from './Modal';

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
}

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm';

const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1';

export function EditProfileModal({ open, onClose }: EditProfileModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && auth.currentUser?.displayName) {
      const parts = auth.currentUser.displayName.split(' ');
      setFirstName(parts[0] || '');
      setLastName(parts.slice(1).join(' ') || '');
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!auth.currentUser) return;

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (!trimmedFirst) {
      setError('Le prénom est requis.');
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await updateProfile(auth.currentUser, {
        displayName: `${trimmedFirst} ${trimmedLast}`.trim(),
      });
      await auth.currentUser.reload();
      onClose();
    } catch {
      setError('Une erreur est survenue. Réessayez.');
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setError(null);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Modifier le profil">
      {error && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Prénom</label>
          <input
            type="text"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={inputClass}
            placeholder="Jean"
          />
        </div>
        <div>
          <label className={labelClass}>Nom</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={inputClass}
            placeholder="Dupont"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 text-sm"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </form>
    </Modal>
  );
}
