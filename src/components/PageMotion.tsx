import React, { useEffect, useRef } from "react";
import { Animated, Easing, ViewStyle } from "react-native";

type PageMotionProps = {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  duration?: number;
  style?: ViewStyle | ViewStyle[];
};

export function PageMotion({
  children,
  delay = 0,
  distance = 18,
  duration = 460,
  style,
}: PageMotionProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(distance)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
  }, [delay, distance, duration, opacity, translateY]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function FloatMotion({
  children,
  amplitude = 8,
  duration = 2800,
  style,
}: {
  children: React.ReactNode;
  amplitude?: number;
  duration?: number;
  style?: ViewStyle | ViewStyle[];
}) {
  const y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, {
          toValue: -amplitude,
          duration,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
        Animated.timing(y, {
          toValue: 0,
          duration,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [amplitude, duration, y]);

  return (
    <Animated.View style={[style, { transform: [{ translateY: y }] }]}>
      {children}
    </Animated.View>
  );
}
