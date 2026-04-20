import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
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
          borderColor: colors.border.medium,
          borderRadius: BorderRadius.xl,
          padding: Spacing[padding],
        },
        shadows.md,
        style,
      ]}
    >
      {/* Glass shine effect */}
      <View style={[
        styles.shine,
        {
          backgroundColor: isDark 
            ? 'rgba(255, 255, 255, 0.04)' 
            : 'rgba(255, 255, 255, 0.4)',
        }
      ]} />
      
      <View style={styles.content}>
        {children}
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '33%',
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
});
