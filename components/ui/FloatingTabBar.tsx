import React from "react";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { StyleSheet, View, Pressable, Text, useColorScheme } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CommonActions } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";
import { TourTarget } from "@/components/ui/TourOverlay";

const TOUR_TAB_TARGET: Record<string, "checkin_tab" | "insights_tab" | "profile_tab"> = {
  checkin: "checkin_tab",
  insights: "insights_tab",
  profile: "profile_tab",
};

// Only show the four main tabs — sub-screens like calendar and history
// are navigated to from within these, not from the bar itself.
const VISIBLE_TABS = new Set(["index", "checkin", "insights", "profile"]);

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const scheme = useColorScheme();
  const c = scheme === "dark" ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { bottom: Math.max(insets.bottom, 12) }]}>
      <BlurView
        intensity={90}
        tint={scheme === "dark" ? "dark" : "light"}
        style={[StyleSheet.absoluteFill, styles.blur]}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.background,
          { borderColor: c.glass.border, backgroundColor: c.glass.primary },
        ]}
      />
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];

          // Skip hidden routes
          if (!VISIBLE_TABS.has(route.name)) return null;

          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (event.defaultPrevented) return;
            Haptics.selectionAsync().catch(() => {});

            // Tapping the bottom-tab icon should ALWAYS land the user on the
            // tab's root screen — whether they're already on this tab (re-tap
            // pops to top) or coming from a different tab and that tab still
            // has a nested-stack history (e.g. they jumped into
            // /insights/explain from the check-in saved page, then later
            // tapped the Insights tab — without this, Expo Router would just
            // re-focus the explain subpage rather than the Insights index).
            //
            // Read fresh navigation state at press time — the props-level
            // `state.routes[index].state` can be stale if the nested stack
            // mounted after the bar last rendered, leaving POP_TO_TOP a no-op.
            const liveRoot: any = (navigation as any).getState?.() ?? state;
            const liveRoute = liveRoot?.routes?.[index];
            const nestedKey = liveRoute?.state?.key;
            const nestedRoutes: unknown[] = liveRoute?.state?.routes ?? [];
            const hasNestedHistory = nestedRoutes.length > 1;

            if (isFocused) {
              if (nestedKey && hasNestedHistory) {
                navigation.dispatch({ type: "POP_TO_TOP", target: nestedKey } as any);
              } else {
                navigation.dispatch({
                  ...CommonActions.navigate({ name: route.name }),
                  target: state.key,
                });
              }
            } else {
              // Switch to the tab first, then pop its nested stack to root
              // if it has any history left over. The explicit POP_TO_TOP is
              // what aligns Insights' behaviour with Me's: stale subpages
              // never become the landing screen for a tab tap.
              navigation.navigate(route.name);
              if (nestedKey && hasNestedHistory) {
                navigation.dispatch({ type: "POP_TO_TOP", target: nestedKey } as any);
              }
            }
          };

          const tourTargetId = TOUR_TAB_TARGET[route.name];
          const tabContent = (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityLabel={`${label}`}
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              style={({ pressed }) => [
                styles.tab,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View
                style={[
                  styles.iconWrap,
                  isFocused && { backgroundColor: `${c.accent.primary}15` },
                ]}
              >
                {typeof options.tabBarIcon === "function" ? (
                  options.tabBarIcon({
                    focused: isFocused,
                    color: isFocused ? c.accent.primary : c.text.secondary,
                    size: 22,
                  })
                ) : (
                  <IconSymbol
                    name="house.fill"
                    size={22}
                    color={isFocused ? c.accent.primary : c.text.secondary}
                  />
                )}
              </View>
              <Text
                style={{
                  color: isFocused ? c.accent.primary : c.text.secondary,
                  fontWeight: isFocused ? "700" : "500",
                  fontSize: 10,
                  marginTop: 2,
                }}
              >
                {label as string}
              </Text>
            </Pressable>
          );
          if (tourTargetId) {
            return (
              <TourTarget key={route.key} id={tourTargetId} style={styles.tab}>
                {tabContent}
              </TourTarget>
            );
          }
          return tabContent;
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 20,
    right: 20,
    height: 68,
    borderRadius: 22,
    overflow: "hidden",
    elevation: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
  },
  blur: {
    borderRadius: 22,
  },
  background: {
    borderWidth: 1,
    borderRadius: 22,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    height: "100%",
    paddingHorizontal: Spacing.sm,
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: 6,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
