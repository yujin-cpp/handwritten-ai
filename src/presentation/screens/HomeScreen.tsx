import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, shadows } from '../theme';
import { classRepository } from '../../data/repositories/FirebaseClassRepository';
import { useAuthSession } from '../../hooks/useAuthSession';

const { width } = Dimensions.get('window');

const AppCard = ({ children, onPress, style }: any) => (
  <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.card, style]}>
    {children}
  </TouchableOpacity>
);

export const HomeScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { uid, user } = useAuthSession();

  const [stats, setStats] = useState({ totalClasses: 0, totalGraded: 0 });

  useEffect(() => {
    if (!uid) return;
    const unsubscribe = classRepository.listenToClassesRaw(uid, (data) => {
      if (data) {
        let gradedCount = 0;
        const classEntries = Object.entries(data);
        classEntries.forEach(([_, cls]: any) => {
          if (cls.students) {
            Object.values(cls.students).forEach((student: any) => {
              if (student.activities) {
                Object.values(student.activities).forEach((act: any) => {
                  if (act.status === "graded" || act.score !== undefined) {
                    gradedCount++;
                  }
                });
              }
            });
          }
        });
        setStats({ totalClasses: classEntries.length, totalGraded: gradedCount });
      }
    });
    return () => unsubscribe();
  }, [uid]);

  return (
    <View style={styles.container}>
      {/* Background Shapes matching the web design */}
      <View style={styles.bgWrapper}>
        <LinearGradient
          colors={['rgb(0, 200, 151)', 'rgb(151, 255, 229)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.bgCurve1}
        />
        <View style={styles.bgCurve2Wrapper}>
          <View style={styles.bgCurve3} />
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 40 }]} showsVerticalScrollIndicator={false}>

        <View style={styles.headerRow}>
          <Text style={styles.headerText}>
            Ready for today,{'\n'}
            <Text style={{ color: colors.white }}>{user?.displayName || 'Professor'}</Text>?
          </Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={styles.avatarContainer}>
            <Image source={{ uri: user?.photoURL || 'https://i.imgur.com/4YQZ6uM.png' }} style={styles.avatar} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>You have {stats.totalClasses} classes and {stats.totalGraded} graded papers.</Text>
        </View>

        <AppCard onPress={() => router.push('/(tabs)/capture')} style={styles.actionCard}>
          <Text style={styles.cardTitle}>Scan Papers</Text>
          <View style={styles.cardContentPlaceholder}>
            <Feather name="camera" size={28} color={colors.primary} />
          </View>
        </AppCard>

        <AppCard onPress={() => router.push('/(tabs)/classes')} style={styles.actionCard}>
          <Text style={styles.cardTitle}>Manage Classes</Text>
          <View style={styles.cardContentPlaceholder}>
            <Feather name="users" size={28} color={colors.primary} />
          </View>
        </AppCard>

        <AppCard onPress={() => router.push('/(tabs)/analytics')} style={styles.actionCard}>
          <Text style={styles.cardTitle}>View Reports</Text>
          <View style={styles.cardContentPlaceholder}>
            <Feather name="bar-chart-2" size={28} color={colors.primary} />
          </View>
        </AppCard>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bgWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  bgCurve1: {
    height: 160,
    borderBottomRightRadius: 150,
  },
  bgCurve2Wrapper: {
    height: 92,
    backgroundColor: colors.primary,
    borderBottomRightRadius: 116,
  },
  bgCurve3: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    borderTopLeftRadius: 141,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerText: {
    fontSize: 26,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.text,
    lineHeight: 34,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: colors.white,
    overflow: 'hidden',
    ...shadows.soft,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  statsContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  statsText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 21,
    paddingVertical: 20,
    paddingHorizontal: 28,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.soft,
  },
  actionCard: {
    height: 110,
  },
  cardTitle: {
    fontSize: 21,
    fontFamily: typography.fontFamily.medium,
    color: colors.text,
  },
  cardContentPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
  }
});
