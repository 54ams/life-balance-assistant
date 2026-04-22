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
            if (isFocused) {
              // Re-tapping the active tab pops its nested stack back to the
              // root screen (iOS convention). Prevents dead-ends where a user
              // on a sub-page can't find their way back to the tab root.
              navigation.dispatch({
                ...CommonActions.navigate({ name: route.name }),
                target: state.key,
              });
              // Fire popToTop on the nested stack (if any).
              const nested = state.routes[index].state;
              if (nested && nested.key) {
                navigation.dispatch({ type: "POP_TO_TOP", target: nested.key } as any);
              }
            } else {
              navigation.navigate(route.name);
            }
          };

          return (
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
