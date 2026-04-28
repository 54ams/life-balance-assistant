import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';
import { BorderRadius, Spacing } from '@/constants/Spacing';
import { Shadows } from '@/constants/Shadows';
import { BlurView } from 'expo-blur';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: 'primary' | 'secondary' | 'elevated';
  padding?: keyof typeof Spacing;
}

export function GlassCard({
  children,
  style,
  intensity = 'primary',
  padding = 'base',
}: GlassCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const shadows = isDark ? Shadows.dark : Shadows.light;

  return (
    <BlurView
      intensity={80}
      tint={'light'}
      style={[
        styles.container,
        {
          backgroundColor: colors.glass[intensity],
          borderColor: colors.border.heavy,
          borderRadius: BorderRadius.xl,
          padding: Spacing[padding],
        },
        shadows.md,
        style,
      ]}
    >
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    overflow: 'hidden',
  },
});
