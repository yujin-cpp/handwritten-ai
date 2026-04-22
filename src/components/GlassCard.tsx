import React from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { UI_GLASS } from '../constants/DesignTokens';

type GlassCardProps = {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  intensity?: number;
  color?: string;
  borderRadius?: number;
};

export function GlassCard({ style, children, intensity = 90, color, borderRadius = 24 }: GlassCardProps) {
  const isColored = Boolean(color);
  const supportsBlur = Platform.OS === 'ios' || Platform.OS === 'web';
  const useBlur = supportsBlur;
  const resolvedIntensity = Platform.OS === 'web'
    ? Math.min(intensity, UI_GLASS.blurWeb)
    : Math.min(intensity, UI_GLASS.blurNative);
  const surfaceStyle = [
    styles.surface,
    { borderRadius },
    isColored
      ? {
          backgroundColor: 'transparent',
          borderColor: 'rgba(255,255,255,0.28)',
        }
      : {
          backgroundColor: 'transparent',
          borderColor: UI_GLASS.borderSoft,
        },
  ];
  const fillStyle = [
    styles.fillLayer,
    {
      backgroundColor: isColored
        ? color
        : useBlur
          ? UI_GLASS.backgroundStrong
          : UI_GLASS.backgroundFallback,
    },
  ];
  const edgeRadius = Math.max(borderRadius - 1, 1);

  return (
    <View style={[styles.glassContainer, { borderRadius }, style]}>
      <View style={surfaceStyle}>
        {useBlur ? (
          <BlurView intensity={resolvedIntensity} tint="light" style={StyleSheet.absoluteFill} />
        ) : null}

        <View style={fillStyle} />

        {!isColored ? (
          <>
            <LinearGradient
              colors={[UI_GLASS.highlight, 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0.04)']}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 0.8 }}
              pointerEvents="none"
              style={[styles.topGlow, { borderRadius: edgeRadius }]}
            />
            <LinearGradient
              colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              pointerEvents="none"
              style={[styles.sheen, { borderRadius: edgeRadius }]}
            />
            <LinearGradient
              colors={['rgba(15,23,42,0.08)', 'rgba(15,23,42,0.01)', 'rgba(255,255,255,0)']}
              start={{ x: 0.5, y: 1 }}
              end={{ x: 0.5, y: 0 }}
              pointerEvents="none"
              style={[styles.depthShade, { borderRadius: edgeRadius }]}
            />
            <View
              pointerEvents="none"
              style={[styles.innerStroke, { borderRadius: edgeRadius }]}
            />
          </>
        ) : (
          <LinearGradient
            colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.04)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            pointerEvents="none"
            style={[styles.coloredGlow, { borderRadius: edgeRadius }]}
          />
        )}

        <View style={styles.contentLayer}>
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  glassContainer: {
    shadowColor: UI_GLASS.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 5,
    backgroundColor: 'transparent',
    borderRadius: 24,
  },
  surface: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderTopColor: UI_GLASS.border,
    borderLeftColor: UI_GLASS.border,
    borderRightColor: UI_GLASS.borderSoft,
    borderBottomColor: UI_GLASS.borderSoft,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  fillLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  topGlow: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
  },
  sheen: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.75,
  },
  depthShade: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.45,
  },
  innerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: UI_GLASS.glow,
  },
  coloredGlow: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.7,
  },
  contentLayer: {
    flex: 1,
    position: 'relative',
  },
});
