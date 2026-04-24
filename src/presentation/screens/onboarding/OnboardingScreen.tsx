import React, { useRef, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, shadows } from '../../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PageMotion } from '../../../components/PageMotion';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Automated Grading',
    description: 'Instantly grade handwritten position papers using advanced AI recognition.',
    icon: 'zap',
  },
  {
    id: '2',
    title: 'Manage Classes',
    description: 'Organize your students, sections, and subjects all in one place easily.',
    icon: 'users',
  },
  {
    id: '3',
    title: 'Insightful Analytics',
    description: 'Track student progress and performance with beautiful, exportable reports.',
    icon: 'pie-chart',
  },
];

interface OnboardingScreenProps {
  onFinish: () => void;
}

export const OnboardingScreen = ({ onFinish }: OnboardingScreenProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  const handleNext = async () => {
    if (currentIndex < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: width * (currentIndex + 1), animated: true });
    } else {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      onFinish();
    }
  };

  const handleScroll = (event: any) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / width);
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  return (
    <LinearGradient colors={["#0B8C70", "#0E7E99", "#14546F"]} style={styles.container}>
      <View style={styles.backdropOrbOne} />
      <View style={styles.backdropOrbTwo} />

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
      >
        {SLIDES.map((slide, index) => (
          <View key={slide.id} style={[styles.slide, { width, paddingTop: insets.top }]}>
            <PageMotion delay={100} style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <Feather name={slide.icon as any} size={48} color={colors.primary} />
              </View>
            </PageMotion>
            
            <View style={styles.textContainer}>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.description}>{slide.description}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <View style={styles.dotsContainer}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                currentIndex === index ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>
            {currentIndex === SLIDES.length - 1 ? "Get Started" : "Next"}
          </Text>
          <Feather 
            name={currentIndex === SLIDES.length - 1 ? "check" : "arrow-right"} 
            size={20} 
            color={colors.primary} 
          />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdropOrbOne: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(255,255,255,0.1)",
    top: -40,
    right: -70,
  },
  backdropOrbTwo: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(255,255,255,0.06)",
    bottom: -60,
    left: -80,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.medium,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    fontFamily: typography.fontFamily.medium,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    marginBottom: 32,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    width: 24,
    backgroundColor: colors.white,
  },
  inactiveDot: {
    width: 8,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  button: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    ...shadows.soft,
  },
  buttonText: {
    fontSize: 18,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
    marginRight: 8,
  },
});
