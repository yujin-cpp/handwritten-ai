import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

type GlassCardProps = {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  intensity?: number;
  color?: string;
  borderRadius?: number;
};

export function GlassCard({ style, children, borderRadius = 24 }: GlassCardProps) {
  return (
    <View style={[styles.card, { borderRadius }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    overflow: 'hidden',
  },
});
