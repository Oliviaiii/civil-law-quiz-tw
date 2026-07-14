"use client";

import { useEffect, useState } from "react";
import {
  createDefaultPreferences,
  loadPreferences,
  savePreferences,
  type Preferences,
} from "../lib/preferences";

/** 本機偏好設定：載入、保存與更新。 */
export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(createDefaultPreferences());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setPreferences(loadPreferences());
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (ready) savePreferences(preferences);
  }, [preferences, ready]);

  function updatePreferences(patch: Partial<Preferences>) {
    setPreferences((previous) => ({ ...previous, ...patch }));
  }

  return { preferences, ready, updatePreferences };
}
