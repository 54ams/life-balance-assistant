// hooks/useShowWorking.ts
//
// Tiny state helper for screens with "Show my maths" flip tiles.
// A screen has one page-level toggle AND the ability for any
// individual tile to be flipped on/off independently.
//
// Rules we want:
//   - Flipping the page-level toggle cascades to every tile (and
//     clears per-tile overrides so the cascade is visible).
//   - Tapping a tile overrides only that tile until the page-level
//     toggle is flipped again.
//   - `isFlipped(id)` is the single source of truth a tile reads.
//
// The hook is local component state, not global — each screen has
// its own copy.

import { useCallback, useState } from "react";

type OverrideMap = Record<string, boolean>;

export type UseShowWorking = {
  /** Page-level toggle value. */
  globalShow: boolean;
  /** Whether the tile with this id is currently flipped. */
  isFlipped: (id: string) => boolean;
  /** Toggle only the given tile (overrides the page-level value). */
  toggleTile: (id: string) => void;
  /** Toggle the page-level value and clear any per-tile overrides. */
  toggleGlobal: () => void;
  /** Explicit setter for the page-level value (also clears overrides). */
  setGlobal: (value: boolean) => void;
};

export function useShowWorking(initial: boolean = false): UseShowWorking {
  const [globalShow, setGlobalShow] = useState<boolean>(initial);
  const [overrides, setOverrides] = useState<OverrideMap>({});

  const isFlipped = useCallback(
    (id: string) => {
      if (id in overrides) return overrides[id];
      return globalShow;
    },
    [overrides, globalShow]
  );

  const toggleTile = useCallback(
    (id: string) => {
      setOverrides((prev) => {
        const current = id in prev ? prev[id] : globalShow;
        return { ...prev, [id]: !current };
      });
    },
    [globalShow]
  );

  const toggleGlobal = useCallback(() => {
    setGlobalShow((prev) => !prev);
    setOverrides({});
  }, []);

  const setGlobal = useCallback((value: boolean) => {
    setGlobalShow(value);
    setOverrides({});
  }, []);

  return { globalShow, isFlipped, toggleTile, toggleGlobal, setGlobal };
}
