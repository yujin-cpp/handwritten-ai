import { BlurView } from 'expo-blur';
import { GlassCard } from '../../components/GlassCard';
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FloatMotion, PageMotion } from "../../components/PageMotion";
import { auth } from "../../firebase/firebaseConfig";
import { useAuthSession } from "../../hooks/useAuthSession";
import { listenToClasses } from "../../services/class.service";
import { getProfessorProfile } from "../../services/professor.service";

const DEFAULT_AVATAR = "https://i.imgur.com/4YQZ6uM.png";
const EMPTY_STATS = {
  totalClasses: 0,
  totalGraded: 0,
  lastActivityText: "No recent activity",
  resumeClassId: "",
  resumeClassName: "",
  resumeClassSection: "",
  resumeClassColor: "",
  resumeAcademicYear: "",
};

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, uid, initializing } = useAuthSession();
  const supportsBlur = Platform.OS === "ios" || Platform.OS === "web";

  const [professor, setProfessor] = useState<any>(null);
  const [classes, setClasses] = useState<any>({});
  const [stats, setStats] = useState(EMPTY_STATS);

  // 1. Fetch Professor Profile & Photo
  useFocusEffect(
    useCallback(() => {
      const loadProfile = async () => {
        const currentUser = auth.currentUser ?? user;
        if (currentUser) {
          await currentUser.reload();
          const profData = await getProfessorProfile(currentUser.uid);
          setProfessor({
            ...profData,
            photoURL: currentUser.photoURL || DEFAULT_AVATAR,
          });
        } else {
          setProfessor(null);
        }
      };
      loadProfile();
    }, [user]),
  );

  // 2. REAL-TIME LISTENER FOR CLASSES & STATS CALCULATION
  useEffect(() => {
    if (!uid) {
      setClasses({});
      setStats(EMPTY_STATS);
      return;
    }

    const unsubscribe = listenToClasses(uid, (data) => {
      setClasses(data || {});
      
      if (data) {
        let gradedCount = 0;
        let recentClass: any = null;
        let recentClassId = "";

        const classEntries = Object.entries(data);
        
        // Just pick the first class to resume for now, or the last one added
        if (classEntries.length > 0) {
           recentClassId = classEntries[0][0];
           recentClass = classEntries[0][1];
        }

        classEntries.forEach(([classId, cls]: any) => {
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

        setStats({
          totalClasses: classEntries.length,
          totalGraded: gradedCount,
          lastActivityText: recentClass ? `Last accessed: ${recentClass.className}` : "No recent activity",
          resumeClassId: recentClassId,
          resumeClassName: recentClass?.className || "",
          resumeClassSection: recentClass?.section || "",
          resumeClassColor: recentClass?.themeColor || "#00b679",
          resumeAcademicYear: recentClass?.semester || ""
        });
      }
    });

    return () => unsubscribe();
  }, [uid]);

  if (initializing || !professor) {
    return (
      <View style={[styles.loadingPage, { paddingTop: insets.top + 20 }]}>
        <ActivityIndicator size="large" color="#0EA47A" />
      </View>
    );
  }

  const handleResume = () => {
    if (stats.resumeClassId) {
      router.push({
        pathname: "/(tabs)/classes/classinformation",
        params: {
          classId: stats.resumeClassId,
          name: stats.resumeClassName,
          section: stats.resumeClassSection,
          color: stats.resumeClassColor,
          academicYear: stats.resumeAcademicYear,
        },
      });
    }
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={{ paddingBottom: 150 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ABSTRACT BACKGROUND ORBS FOR GLASS REFRACTION */}
                  
      {/* HERO HEADER */}
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 20 }}>
        <PageMotion delay={30}>
          <LinearGradient
            colors={["#0EA47A", "#0079B2"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.heroCard}
          >
            <View style={styles.heroContent}>
              <FloatMotion amplitude={6} duration={2300}>
                <Image
                  source={{ uri: professor.photoURL }}
                  style={styles.avatar}
                />
              </FloatMotion>
              <View style={{ flex: 1, marginLeft: 15 }}>
                <Text style={styles.welcomeText} numberOfLines={2}>
                  Welcome, {professor.name}!
                </Text>
                <Text style={styles.welcomeSub}>
                  Ready to score your next class.
                </Text>
              </View>
            </View>

            {stats.resumeClassId ? (
              <View style={styles.resumeGlassContainer}>
                {supportsBlur ? (
                  <BlurView intensity={45} tint="light" style={styles.resumeBtnBlur}>
                    <TouchableOpacity style={styles.resumeBtnHeroContent} onPress={handleResume}>
                      <Feather name="book-open" size={14} color="#ffffff" />
                      <Text style={styles.resumeBtnHeroTextGlass}>
                        Resume {stats.resumeClassName} - {stats.resumeClassSection}
                      </Text>
                      <Feather name="chevron-right" size={14} color="#ffffff" />
                    </TouchableOpacity>
                  </BlurView>
                ) : (
                  <View style={[styles.resumeBtnBlur, styles.resumeBtnFallback]}>
                    <TouchableOpacity style={styles.resumeBtnHeroContent} onPress={handleResume}>
                      <Feather name="book-open" size={14} color="#ffffff" />
                      <Text style={styles.resumeBtnHeroTextGlass}>
                        Resume {stats.resumeClassName} - {stats.resumeClassSection}
                      </Text>
                      <Feather name="chevron-right" size={14} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.resumeGlassContainer}>
                {supportsBlur ? (
                  <BlurView intensity={45} tint="light" style={styles.resumeBtnBlur}>
                    <TouchableOpacity style={styles.resumeBtnHeroContent} onPress={() => router.push("/(tabs)/classes/addclass")}>
                      <Feather name="plus" size={14} color="#ffffff" />
                      <Text style={styles.resumeBtnHeroTextGlass}>Create your first class</Text>
                      <Feather name="chevron-right" size={14} color="#ffffff" />
                    </TouchableOpacity>
                  </BlurView>
                ) : (
                  <View style={[styles.resumeBtnBlur, styles.resumeBtnFallback]}>
                    <TouchableOpacity style={styles.resumeBtnHeroContent} onPress={() => router.push("/(tabs)/classes/addclass")}>
                      <Feather name="plus" size={14} color="#ffffff" />
                      <Text style={styles.resumeBtnHeroTextGlass}>Create your first class</Text>
                      <Feather name="chevron-right" size={14} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </LinearGradient>
        </PageMotion>

        {/* OVERLAPPING ANALYTICS CARD */}
        <PageMotion delay={100}>
          <GlassCard style={{ marginTop: -25, marginHorizontal: 5 }}>
            <View style={{ padding: 20 }}>
              <View style={styles.analyticsRow}>
                <View style={styles.analyticsIconBox}>
                  <Feather name="book" size={20} color="#0EA47A" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.analyticsTitle}>{stats.totalClasses} Classes Today</Text>
                </View>
              </View>

              <View style={[styles.analyticsRow, { marginTop: 15 }]}>
                <View style={[styles.analyticsIconBox, { backgroundColor: "#f0f4f8" }]}>
                  <Feather name="users" size={20} color="#5c6b7a" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.analyticsTitle}>{stats.totalGraded} Students graded</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.lastActivityRow}>
                <View style={styles.dotIcon}>
                  <Feather name="clock" size={12} color="#fff" />
                </View>
                <Text style={styles.lastActivityText}>{stats.lastActivityText}</Text>
              </View>
            </View>
          </GlassCard>
        </PageMotion>
      </View>



      {/* QUICK ACTIONS ROW */}
      <PageMotion delay={180} style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={{ flex: 1 }}
            activeOpacity={0.8}
            onPress={() => router.push("/(tabs)/capture")}
          >
            <GlassCard style={{ aspectRatio: 1 }}>
              <View style={styles.actionCardContent}>
                <Feather name="camera" size={28} color="#0EA47A" style={[styles.glassIcon, { shadowColor: '#0EA47A' }]} />
                <Text style={styles.actionText}>Scan Papers</Text>
              </View>
            </GlassCard>
          </TouchableOpacity>

          <TouchableOpacity 
            style={{ flex: 1 }}
            activeOpacity={0.8}
            onPress={() => router.push("/(tabs)/classes/addclass")}
          >
            <GlassCard style={{ aspectRatio: 1 }}>
              <View style={styles.actionCardContent}>
                <Feather name="plus" size={28} color="#0079B2" style={[styles.glassIcon, { shadowColor: '#0079B2' }]} />
                <Text style={styles.actionText}>Add Class</Text>
              </View>
            </GlassCard>
          </TouchableOpacity>

          <TouchableOpacity 
            style={{ flex: 1 }}
            activeOpacity={0.8}
            onPress={() => router.push("/(tabs)/analytics")}
          >
            <GlassCard style={{ aspectRatio: 1 }}>
              <View style={styles.actionCardContent}>
                <Feather name="bar-chart-2" size={28} color="#f39c12" style={[styles.glassIcon, { shadowColor: '#f39c12' }]} />
                <Text style={styles.actionText}>View Reports</Text>
              </View>
            </GlassCard>
          </TouchableOpacity>
        </View>
      </PageMotion>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  loadingPage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  bgOrb: {
    position: 'absolute',
    borderRadius: 200,
  },
  heroCard: {
    borderRadius: 24,
    padding: 24,
    paddingBottom: 45, // Leave room for overlapping card
    shadowColor: "#0079B2",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  heroContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.8)",
  },
  welcomeText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
  },
  welcomeSub: {
    color: "rgba(255,255,255,0.9)",
    marginTop: 4,
    fontSize: 14,
  },
  resumeGlassContainer: {
    alignSelf: "flex-start",
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  resumeBtnBlur: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.8)',
    borderLeftColor: 'rgba(255, 255, 255, 0.5)',
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  resumeBtnFallback: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  resumeBtnHeroContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  resumeBtnHeroTextGlass: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
    textShadowColor: "rgba(0,0,0,0.1)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  analyticsCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginTop: -25, // Overlap the hero card
    marginHorizontal: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  analyticsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  analyticsIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#e6f7f2",
    justifyContent: "center",
    alignItems: "center",
  },
  analyticsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  resumeBtnSmall: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0EA47A",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 4,
  },
  resumeBtnSmallText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: 16,
  },
  lastActivityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dotIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#0EA47A",
    justifyContent: "center",
    alignItems: "center",
  },
  lastActivityText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },

  section: {
    paddingHorizontal: 20,
    marginTop: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  glassContainer: {
    flex: 1,
    aspectRatio: 1, // Ensures perfect squares
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
    backgroundColor: 'transparent',
  },
  actionCardBlur: {
    flex: 1, // Stretches to fill square
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderTopColor: 'rgba(255, 255, 255, 1)',
    borderLeftColor: 'rgba(255, 255, 255, 0.7)',
    borderRightColor: 'rgba(255, 255, 255, 0.2)',
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  actionCardContent: {
    flex: 1, // Centers content perfectly within the square
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  glassIcon: {
    marginBottom: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 2,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
  },
});
