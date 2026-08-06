import { useEffect, useRef, useCallback } from "react";
import { useClerk } from "@clerk/react";

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousemove",
  "keydown",
  "mousedown",
  "touchstart",
  "scroll",
  "wheel",
];

export function useAutoLogout() {
  const { signOut, user } = useClerk();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const signingOutRef = useRef(false);

  const doLogout = useCallback(async () => {
    if (signingOutRef.current || !user) return;
    signingOutRef.current = true;
    try {
      await signOut();
    } finally {
      signingOutRef.current = false;
    }
  }, [signOut, user]);

  const resetTimer = useCallback(() => {
    if (!user) return;
    lastActivityRef.current = Date.now();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      doLogout();
    }, IDLE_TIMEOUT_MS);
  }, [user, doLogout]);

  useEffect(() => {
    if (!user) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      return;
    }

    resetTimer();

    const handler = () => resetTimer();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, handler, { passive: true }));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, handler));
    };
  }, [user, resetTimer]);
}
