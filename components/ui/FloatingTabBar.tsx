import React from "react";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { StyleSheet, View, Pressable, Text, useColorScheme } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CommonActions } from "@react-navigation/native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";
import { TourTarget } from "@/components/ui/TourOverlay";

// Each tab has a canonical "root" URL. Tapping the tab — even from a
// deeply nested screen — should always land here. The names below match
// the file-system route names so a `route.name` lookup just works.
const TAB_ROOT_URL: Record<string, string> = {
  index: "/",
  checkin: "/checkin",
  insights: "/insights",
  profile: "/profile",
};

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

            // Tapping the bottom-tab icon should ALWAYS land the user on
            // the tab's root screen — whether they're already on this tab
            // (re-tap pops to top) or coming from a different tab and
            // that tab still has nested-stack history.
            //
            // Profile (Me) is special because its hierarchy goes deeper:
            // /profile/settings/data is profile-stack → settings-stack →
            // data. POP_TO_TOP on the outer Tabs navigator only pops the
            // profile-stack one level (back to settings root, not to
            // profile root). The reliable fix is to explicitly navigate
            // to the canonical tab-root URL using the imperative router
            // — Expo Router resolves it through every nested stack so
            // settings/data, settings, profile-root all collapse cleanly
            // back to /profile.
            //
            // We still emit POP_TO_TOP first as a no-cost optimisation
            // for shallow stacks (e.g. Insights), so the imperative
            // router.replace is only doing real work for the genuinely
            // deep case.
            const liveRoot: any = (navigation as any).getState?.() ?? state;
            const liveRoute = liveRoot?.routes?.[index];
            const nestedKey = liveRoute?.state?.key;
            const nestedRoutes: unknown[] = liveRoute?.state?.routes ?? [];
            const hasNestedHistory = nestedRoutes.length > 1;

            const tabRootUrl = TAB_ROOT_URL[route.name];

            if (isFocused) {
              if (nestedKey && hasNestedHistory) {
                navigation.dispatch({ type: "POP_TO_TOP", target: nestedKey } as any);
                // Backstop for double-nested stacks (Profile → Settings).
                // POP_TO_TOP only operates on the inner-most stack key it
                // was given, so a route like /profile/settings/data can
                // be left at /profile/settings after the dispatch. The
                // imperative replace finishes the job.
                if (tabRootUrl) {
                  router.replace(tabRootUrl as any);
                }
              } else {
                navigation.dispatch({
                  ...CommonActions.navigate({ name: route.name }),
                  target: state.key,
                });
              }
            } else {
              // Switch tabs by URL so we always land on the tab's root,
              // not whatever subpage was last open in that tab. This is
              // the single biggest UX fix vs. plain navigation.navigate
              // — which Expo Router otherwise interprets as "focus the
              // tab and keep its nested-stack state".
              if (tabRootUrl) {
                router.replace(tabRootUrl as any);
              } else {
                navigation.navigate(route.name);
              }
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
