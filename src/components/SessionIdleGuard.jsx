import { useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  clearSession,
  getSessionIdleRemainingMs,
  isSessionIdleExpired,
  touchSessionActivity,
} from "../utils/auth";

const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];
const ACTIVITY_THROTTLE_MS = 30 * 1000;

export default function SessionIdleGuard() {
  const navigate = useNavigate();
  const location = useLocation();
  const timeoutRef = useRef(null);
  const lastTouchRef = useRef(0);

  const logoutForIdle = useCallback(() => {
    clearSession();
    if (location.pathname !== "/") {
      navigate("/?idle=1", { replace: true });
    }
  }, [location.pathname, navigate]);

  const scheduleExpiry = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const remaining = getSessionIdleRemainingMs();
    if (remaining === null) {
      return;
    }

    if (remaining <= 0) {
      logoutForIdle();
      return;
    }

    timeoutRef.current = setTimeout(logoutForIdle, remaining);
  }, [logoutForIdle]);

  const handleActivity = useCallback(() => {
    if (!localStorage.getItem("token")) {
      return;
    }

    const now = Date.now();
    if (now - lastTouchRef.current < ACTIVITY_THROTTLE_MS) {
      return;
    }

    lastTouchRef.current = now;
    touchSessionActivity();
    scheduleExpiry();
  }, [scheduleExpiry]);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      return undefined;
    }

    if (isSessionIdleExpired()) {
      logoutForIdle();
      return undefined;
    }

    scheduleExpiry();

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      if (isSessionIdleExpired()) {
        logoutForIdle();
        return;
      }

      scheduleExpiry();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [handleActivity, location.pathname, logoutForIdle, scheduleExpiry]);

  return null;
}
