// Primary button. Primary variant: dark forest with cream text.
// Secondary variant: cream-glass with dark text and a visible rim.

import React, { useRef } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  ViewStyle,
  Animated,
} from 'react-native';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';
import { BorderRadius, Spacing } from '@/constants/Spacing';
import { Shadows } from '@/constants/Shadows';
import { Typography } from '@/constants/Typography';

interface GlassButtonProps {
  title: string;
  onPress: () => void;
  icon?: React.ReactNode;
  style?: ViewStyle;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export function GlassButton({
  title,
  onPress,
  icon,
  style,
  variant = 'secondary',
  disabled = false,
}: GlassButtonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const shadows = isDark ? Shadows.dark : Shadows.light;

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 300,
      friction: 30,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 30,
    }).start();
  };

  const isPrimary = variant === 'primary';

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, disabled && { opacity: 0.5 }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        disabled={disabled}
      >
        <View
          style={[
            styles.container,
            {
              backgroundColor: isPrimary
                ? colors.accent.primary
                : colors.glass.elevated,
              borderColor: isPrimary
                ? colors.accent.primary
                : colors.border.heavy,
              borderRadius: BorderRadius.xl,
              padding: Spacing.base,
            },
            shadows.md,
            style,
          ]}
        >
          <View style={styles.content}>
            {icon && <View style={styles.icon}>{icon}</View>}
            <Text
              style={[
                styles.text,
                {
                  color: isPrimary ? colors.onPrimary : colors.text.primary,
                  fontSize: Typography.fontSize.base,
                  fontWeight: Typography.fontWeight.bold,
                },
              ]}
            >
              {title}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  icon: {
    marginRight: Spacing.xs,
  },
  text: {
    fontFamily: Typography.fontFamily.bold,
  },
});
