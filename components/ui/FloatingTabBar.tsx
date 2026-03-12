import React from "react";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { StyleSheet, View, Pressable, Text, useColorScheme } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/Colors";
import { BorderRadius, Spacing } from "@/constants/Spacing";

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const scheme = useColorScheme();
  const t = scheme === "dark" ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { bottom: insets.bottom + 12 }]}>
      <BlurView intensity={80} tint={scheme === "dark" ? "dark" : "light"} style={[StyleSheet.absoluteFill, styles.blur]} />
      <View style={[StyleSheet.absoluteFill, styles.background, { borderColor: t.glass.border, backgroundColor: t.glass.primary }]} />
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
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

            if (!isFocused && !event.defaultPrevented) {
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
                { opacity: pressed ? 0.75 : 1 },
              ]}
            >
              {typeof options.tabBarIcon === "function" ? (
                options.tabBarIcon({
                  focused: isFocused,
                  color: isFocused ? t.text.primary : t.text.secondary,
                  size: 20,
                })
              ) : (
                <IconSymbol
                  name={"house.fill"}
                  size={20}
                  color={isFocused ? t.text.primary : t.text.secondary}
                />
              )}
              <Text style={{ color: isFocused ? t.text.primary : t.text.secondary, fontWeight: "700", fontSize: 11 }}>
                {label as string}
              </Text>
              <View
                style={[
                  styles.dot,
                  {
                    opacity: isFocused ? 1 : 0,
                    backgroundColor: t.accent.primary,
                  },
                ]}
              />
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
    left: 18,
    right: 18,
    height: 74,
    borderRadius: BorderRadius.xxl,
    overflow: "hidden",
    elevation: 12,
  },
  blur: {
    borderRadius: BorderRadius.xxl,
  },
  background: {
    borderWidth: 1,
    borderRadius: BorderRadius.xxl,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    height: "100%",
    paddingHorizontal: Spacing.md,
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
