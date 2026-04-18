import React from "react";
import { View } from "react-native";
import { type Href } from "expo-router";

type Props = {
  children: React.ReactNode;
  /**
   * Order of the tab ring. Kept for API compatibility with screens that
   * still pass it — the parent `(tabs)/_layout.tsx` now owns the swipe
   * gesture (with edge-bounce), so this component is a transparent
   * wrapper. Leaving it in place means existing screens compile while
   * the gesture lives in one place.
   */
  order?: readonly (Href | string)[];
};

export function TabSwipe({ children }: Props) {
  return <View style={{ flex: 1 }}>{children}</View>;
}
