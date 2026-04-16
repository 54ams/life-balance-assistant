// hooks/useReduceMotion.ts
//
// Single source of truth for the system "reduce motion" preference.
// Used by the orb, aurora, breath overlay, and ripple so that users
// who opt out of motion still get the calm colour-first experience.

import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((val) => {
        if (mounted) setReduce(!!val);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.("reduceMotionChanged", (val: boolean) => {
      if (mounted) setReduce(!!val);
    });
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  return reduce;
}
