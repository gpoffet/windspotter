import { useState, useCallback, useMemo } from 'react';

export type PromoTrigger = 'favorites' | 'settings' | 'notifications' | 'proactive' | 'default';

const PROMO_SHOWN_KEY = 'windspotter_promo_shown';
const VISIT_COUNT_KEY = 'windspotter_visit_count';
const LAST_VISIT_KEY = 'windspotter_last_visit';

// Increment visit counter once per distinct calendar day (runs at import time, before any hook)
const today = new Date().toISOString().slice(0, 10);
if (localStorage.getItem(LAST_VISIT_KEY) !== today) {
  localStorage.setItem(LAST_VISIT_KEY, today);
  const count = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10);
  localStorage.setItem(VISIT_COUNT_KEY, String(count + 1));
}

interface UseAccountPromoOptions {
  user: unknown | null;
  hasNavigableSpots: boolean;
}

export interface UseAccountPromoReturn {
  isOpen: boolean;
  trigger: PromoTrigger;
  promptAccountCreation: (trigger: PromoTrigger) => void;
  closePromo: () => void;
  shouldShowProactive: boolean;
}

export function useAccountPromo({ user, hasNavigableSpots }: UseAccountPromoOptions): UseAccountPromoReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [trigger, setTrigger] = useState<PromoTrigger>('default');

  const shouldShowProactive = useMemo(() => {
    if (user) return false;
    const visitCount = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10);
    const promoShown = localStorage.getItem(PROMO_SHOWN_KEY) === '1';
    return visitCount >= 2 && hasNavigableSpots && !promoShown;
  }, [user, hasNavigableSpots]);

  const promptAccountCreation = useCallback(
    (t: PromoTrigger) => {
      if (isOpen) return;
      setTrigger(t);
      setIsOpen(true);
      if (t === 'proactive') {
        localStorage.setItem(PROMO_SHOWN_KEY, '1');
      }
    },
    [isOpen],
  );

  const closePromo = useCallback(() => {
    setIsOpen(false);
  }, []);

  return { isOpen, trigger, promptAccountCreation, closePromo, shouldShowProactive };
}
