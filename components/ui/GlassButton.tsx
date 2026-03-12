import React from 'react';
import { 
  TouchableOpacity, 
  View, 
  Text, 
  StyleSheet, 
  ViewStyle,
  Animated 
} from 'react-native';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';
import { BorderRadius, Spacing } from '@/constants/Spacing';
import { Shadows } from '@/constants/Shadows';
import { Typography } from '@/constants/Typography';
import { BlurView } from 'expo-blur';

interface GlassButtonProps {
  title: string;
  onPress: () => void;
  icon?: React.ReactNode;
  style?: ViewStyle;
  variant?: 'primary' | 'secondary';
}

export function GlassButton({ 
  title, 
  onPress, 
  icon, 
  style,
  variant = 'secondary',
}: GlassButtonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const shadows = isDark ? Shadows.dark : Shadows.light;
  
  const scaleAnim = new Animated.Value(1);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      tension: 300,
      friction: 30,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 30,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <BlurView
          intensity={80}
          tint={isDark ? 'dark' : 'light'}
          style={[
            styles.container,
            {
              backgroundColor: variant === 'primary' 
                ? colors.accent.primary
                : colors.glass.primary,
              borderColor: variant === 'primary'
                ? 'rgba(255, 255, 255, 0.15)'
                : colors.border.medium,
              borderRadius: BorderRadius.xl,
              padding: Spacing.base,
            },
            shadows.lg,
            style,
          ]}
        >
          {/* Glass reflection */}
          <View style={[
            styles.reflection,
            {
              backgroundColor: variant === 'primary'
                ? 'rgba(255, 255, 255, 0.2)'
                : isDark 
                  ? 'rgba(255, 255, 255, 0.06)' 
                  : 'rgba(255, 255, 255, 0.5)',
            }
          ]} />
          
          <View style={styles.content}>
            {icon && <View style={styles.icon}>{icon}</View>}
            <Text style={[
              styles.text,
              {
                color: variant === 'primary' 
                  ? '#FFFFFF'
                  : colors.text.primary,
                fontSize: Typography.fontSize.base,
                fontWeight: Typography.fontWeight.bold,
              }
            ]}>
              {title}
            </Text>
          </View>
        </BlurView>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  reflection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    position: 'relative',
    zIndex: 1,
  },
  icon: {
    marginRight: Spacing.xs,
  },
  text: {
    fontFamily: Typography.fontFamily.bold,
  },
});
