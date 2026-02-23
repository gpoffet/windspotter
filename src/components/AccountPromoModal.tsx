import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { PromoTrigger } from '../hooks/useAccountPromo';

interface AccountPromoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateAccount: () => void;
  onLogin: () => void;
  trigger?: PromoTrigger;
}

const TITLES: Record<PromoTrigger, string> = {
  favorites: 'Sauvegarde tes spots préférés',
  settings: 'Personnalise ton expérience',
  notifications: 'Ne rate plus aucune session',
  proactive: 'Il y a du vent aujourd\u2019hui ! \ud83c\udf2c\ufe0f',
  default: 'Profite de WindSpotter à 100\u202f%',
};

interface Benefit {
  emoji: string;
  title: string;
  desc: string;
}

const ALL_BENEFITS: Benefit[] = [
  { emoji: '\ud83d\udd14', title: 'Notifications matinales', desc: 'Reçois une alerte quand les conditions sont bonnes' },
  { emoji: '\u2b50', title: 'Spots favoris', desc: 'Accède rapidement à tes spots préférés' },
  { emoji: '\ud83c\udfda\ufe0f', title: 'Seuils personnalisés', desc: 'Ajuste les seuils de vent selon ton niveau' },
  { emoji: '\ud83d\udccd', title: 'Choix des spots', desc: 'Sélectionne les spots que tu veux surveiller' },
];

// Index of the benefit to promote first for each trigger
const TRIGGER_FIRST: Record<PromoTrigger, number> = {
  notifications: 0,
  favorites: 1,
  settings: 2,
  proactive: 0,
  default: 0,
};

function orderedBenefits(trigger: PromoTrigger): Benefit[] {
  const first = TRIGGER_FIRST[trigger];
  return [ALL_BENEFITS[first], ...ALL_BENEFITS.filter((_, i) => i !== first)];
}

export function AccountPromoModal({
  isOpen,
  onClose,
  onCreateAccount,
  onLogin,
  trigger = 'default',
}: AccountPromoModalProps) {
  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const benefits = orderedBenefits(trigger);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          aria-label="Fermer"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Title */}
        <h2 className="text-lg font-bold text-slate-900 dark:text-white pr-8">
          {TITLES[trigger]}
        </h2>

        {/* Subtitle */}
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Crée ton compte gratuit pour débloquer toutes les fonctionnalités
        </p>

        {/* Benefits list */}
        <ul className="mt-5 flex flex-col gap-3">
          {benefits.map((b) => (
            <li key={b.title} className="flex items-start gap-3">
              <span className="shrink-0 w-8 h-8 rounded-full bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center text-base">
                {b.emoji}
              </span>
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{b.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{b.desc}</p>
              </div>
            </li>
          ))}
        </ul>

        {/* Reassurance */}
        <p className="mt-5 text-xs text-slate-400 dark:text-slate-500 text-center">
          100% gratuit · Sans pub · Par un rider, pour les riders
        </p>

        {/* CTA buttons */}
        <button
          onClick={onCreateAccount}
          className="mt-4 w-full rounded-lg bg-teal-600 py-2.5 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
        >
          Créer un compte
        </button>

        <button
          onClick={onLogin}
          className="mt-2 w-full text-sm text-teal-600 dark:text-teal-400 hover:underline"
        >
          J'ai déjà un compte
        </button>
      </div>
    </div>,
    document.body,
  );
}
