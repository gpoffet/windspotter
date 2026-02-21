import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { Modal } from './Modal';

type AuthView = 'login' | 'signup' | 'verify-email' | 'reset-sent';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
}

function firebaseErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    'auth/email-already-in-use': 'Cette adresse email est déjà utilisée.',
    'auth/invalid-email': 'Adresse email invalide.',
    'auth/user-not-found': 'Aucun compte trouvé avec cette adresse.',
    'auth/wrong-password': 'Mot de passe incorrect.',
    'auth/weak-password': 'Le mot de passe doit contenir au moins 6 caractères.',
    'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard.',
    'auth/invalid-credential': 'Email ou mot de passe incorrect.',
  };
  return messages[code] ?? 'Une erreur est survenue. Réessayez.';
}

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm';

const primaryBtnClass =
  'w-full py-2.5 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 text-sm';

const linkClass = 'text-teal-600 dark:text-teal-400 hover:underline text-sm';

export function AuthModal({ open, onClose, onAuthenticated }: AuthModalProps) {
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function resetForm() {
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setError(null);
    setLoading(false);
    setView('login');
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      resetForm();
      onAuthenticated();
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      setError(firebaseErrorMessage(code));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, {
        displayName: `${firstName} ${lastName}`.trim(),
      });
      await sendEmailVerification(cred.user);
      setView('verify-email');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      setError(firebaseErrorMessage(code));
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!email) {
      setError('Entrez votre adresse email ci-dessus.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setView('reset-sent');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      setError(firebaseErrorMessage(code));
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      await sendEmailVerification(auth.currentUser);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      setError(firebaseErrorMessage(code));
    } finally {
      setLoading(false);
    }
  }

  const title =
    view === 'login'
      ? 'Connexion'
      : view === 'signup'
        ? 'Créer un compte'
        : view === 'verify-email'
          ? 'Vérification email'
          : 'Email envoyé';

  return (
    <Modal open={open} onClose={handleClose} title={title}>
      {error && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {view === 'login' && (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="votre@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Mot de passe
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="••••••••"
            />
          </div>
          <button type="submit" disabled={loading} className={primaryBtnClass}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
          <div className="flex items-center justify-between">
            <button type="button" onClick={handleResetPassword} className={linkClass}>
              Mot de passe oublié ?
            </button>
            <button type="button" onClick={() => { setError(null); setView('signup'); }} className={linkClass}>
              Créer un compte
            </button>
          </div>
        </form>
      )}

      {view === 'signup' && (
        <form onSubmit={handleSignup} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Prénom
              </label>
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
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nom
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inputClass}
                placeholder="Dupont"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="votre@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Mot de passe
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="6 caractères minimum"
            />
          </div>
          <button type="submit" disabled={loading} className={primaryBtnClass}>
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>
          <div className="text-center">
            <button type="button" onClick={() => { setError(null); setView('login'); }} className={linkClass}>
              Déjà un compte ? Se connecter
            </button>
          </div>
        </form>
      )}

      {view === 'verify-email' && (
        <div className="space-y-4 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-teal-600 dark:text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <p className="text-slate-700 dark:text-slate-300 text-sm">
            Un email de vérification a été envoyé à <strong>{email}</strong>.
            Cliquez sur le lien dans l'email pour vérifier votre compte.
          </p>
          <button
            onClick={handleResendVerification}
            disabled={loading}
            className={linkClass}
          >
            Renvoyer l'email
          </button>
          <button
            onClick={() => {
              resetForm();
              onAuthenticated();
            }}
            className={primaryBtnClass}
          >
            Continuer
          </button>
        </div>
      )}

      {view === 'reset-sent' && (
        <div className="space-y-4 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-teal-600 dark:text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <p className="text-slate-700 dark:text-slate-300 text-sm">
            Si un compte existe pour <strong>{email}</strong>, un email de réinitialisation a été envoyé.
            Vérifiez votre boîte de réception.
          </p>
          <button
            onClick={() => { setError(null); setView('login'); }}
            className={primaryBtnClass}
          >
            Retour à la connexion
          </button>
        </div>
      )}
    </Modal>
  );
}
