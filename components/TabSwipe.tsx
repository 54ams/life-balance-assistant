import React, { useMemo } from "react";
import { Dimensions, View } from "react-native";
import {
  PanGestureHandler,
  State,
  type HandlerStateChangeEvent,
} from "react-native-gesture-handler";
import { usePathname, useRouter, type Href } from "expo-router";

const { width } = Dimensions.get("window");
const THRESHOLD = Math.round(width * 0.18);

type Props = {
  children: React.ReactNode;
  /** Order of the 5 tab roots. Example: ["/", "/checkin", "/insights", "/history", "/profile"] */
  order: readonly Href[];
};

function hrefToPath(href: Href): string {
  if (typeof href === "string") return href;
  const maybePathname = (href as any)?.pathname;
  return typeof maybePathname === "string" ? maybePathname : "/";
}

export function TabSwipe({ children, order }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const currentIndex = useMemo(() => {
    const clean = (p: string) => (p.length > 1 ? p.replace(/\/$/, "") : p);
    const path = clean(pathname);

    return order.findIndex((h) => {
      const s = clean(hrefToPath(h));
      return s === path || (s !== "/" && path.startsWith(s + "/"));
    });
  }, [order, pathname]);

  const onStateChange = (
    e: HandlerStateChangeEvent<Record<string, unknown>>
  ) => {
    if (e.nativeEvent.state !== State.END) return;

    const dx = (e.nativeEvent as any).translationX as number;
    if (typeof dx !== "number") return;

    if (currentIndex < 0) return;

    // swipe left -> next tab
    if (dx <= -THRESHOLD && currentIndex < order.length - 1) {
      router.replace(order[currentIndex + 1] as any);
      return;
    }

    // swipe right -> previous tab
    if (dx >= THRESHOLD && currentIndex > 0) {
      router.replace(order[currentIndex - 1] as any);
    }
  };

  return (
    <PanGestureHandler onHandlerStateChange={onStateChange}>
      <View style={{ flex: 1 }}>{children}</View>
    </PanGestureHandler>
  );
}
