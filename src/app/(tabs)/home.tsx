import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { VerificationNoticeCard } from "../../components/auth/VerificationNoticeCard";
import { AnimatedEntrance } from "../../components/ui/AnimatedEntrance";
import type { ProfessorProfile } from "../../domain/models/professor";
import { auth } from "../../firebase/firebaseConfig";
import { useVerificationGate } from "../../hooks/useVerificationGate";
import { listenToClasses } from "../../services/class.service";
import { getProfessorProfile } from "../../services/professor.service";

const DEFAULT_AVATAR = "https://i.imgur.com/4YQZ6uM.png";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isVerified, requireVerified } = useVerificationGate();

  const [professor, setProfessor] = useState<ProfessorProfile | null>(null);
  const [classes, setClasses] = useState<Record<string, any>>({});

  useFocusEffect(
    useCallback(() => {
      const loadProfile = async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          return;
        }

        await currentUser.reload();
        const profData = await getProfessorProfile(currentUser.uid);

        setProfessor({
          ...(profData || {}),
          name: profData?.name || currentUser.displayName || "Professor",
          photoURL: currentUser.photoURL || DEFAULT_AVATAR,
        });
      };

      void loadProfile();
    }, [])
  );

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      return;
    }

    const unsubscribe = listenToClasses(uid, (data) => {
      setClasses(data);
    });

    return () => unsubscribe();
  }, []);

  const classList = Object.entries(classes);
  const totalClasses = classList.length;
  const totalStudents = classList.reduce(
    (sum: number, [, classData]: any) =>
      sum + (classData.students ? Object.keys(classData.students).length : 0),
    0
  );

  if (!professor) {
    return null;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={["#00bb7a", "#009e60"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <AnimatedEntrance delay={40} distance={20} style={styles.headerContent}>
          <Image
            source={{ uri: professor.photoURL || DEFAULT_AVATAR }}
            style={styles.avatar}
          />
          <View style={styles.headerTextWrap}>
            <Text style={styles.welcomeText}>
              Welcome, {professor.name}!
            </Text>
            <Text style={styles.headerSubtext}>
              {isVerified
                ? "Your account is verified and ready to use."
                : "Verify your email to unlock protected features."}
            </Text>
          </View>
        </AnimatedEntrance>
      </LinearGradient>

      <AnimatedEntrance delay={120} distance={18} style={styles.section}>
        {!isVerified && <VerificationNoticeCard />}

        <Text style={styles.sectionTitle}>Here’s your recent activity</Text>

        <View style={styles.statsRow}>
          <StatCard value={String(totalClasses)} label="Total Classes" icon="book" />
          <StatCard value={String(totalStudents)} label="Total Students" icon="users" />
        </View>
      </AnimatedEntrance>

      <AnimatedEntrance delay={200} distance={18} style={styles.section}>
        <Text style={styles.sectionTitle}>Class List</Text>

        <View style={styles.classGrid}>
          {classList.map(([classId, cls]: any, index) => {
            const cardColor = cls.themeColor || COLORS[index % COLORS.length];

            return (
              <ClassCard
                key={classId}
                disabled={!isVerified}
                name={cls.className}
                section={cls.section}
                color={cardColor}
                onPress={() =>
                  void requireVerified(async () => {
                    router.push({
                      pathname: "/(tabs)/classes/classinformation",
                      params: {
                        classId,
                        name: cls.className,
                        section: cls.section,
                        color: cardColor,
                        academicYear: cls.semester,
                      },
                    });
                  })
                }
              />
            );
          })}

          <AddClassCard
            disabled={!isVerified}
            onPress={() =>
              void requireVerified(async () => {
                router.push("/(tabs)/classes/addclass");
              })
            }
          />
        </View>
      </AnimatedEntrance>
    </ScrollView>
  );
}

function StatCard({ value, label, icon }: { value: string; label: string; icon: keyof typeof Feather.glyphMap }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIconContainer}>
        <Feather name={icon} size={22} color="#009e60" />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

function ClassCard({
  name,
  section,
  color,
  onPress,
  disabled,
}: {
  name: string;
  section: string;
  color: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.classCard,
        { backgroundColor: color },
        disabled && styles.disabledCard,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={styles.className} numberOfLines={1}>{name}</Text>
      <Text style={styles.classSection} numberOfLines={1}>{section}</Text>
      {disabled && <Text style={styles.lockText}>Verify to open</Text>}
    </TouchableOpacity>
  );
}

function AddClassCard({
  onPress,
  disabled,
}: {
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.classCard, styles.addClass, disabled && styles.disabledCard]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Feather name="plus-circle" size={28} color="#009e60" />
      <Text style={styles.addClassText}>Add Class</Text>
      {disabled && <Text style={styles.lockTextMuted}>Verification needed</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    padding: 24,
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#009e60",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  headerTextWrap: {
    flex: 1,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  welcomeText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  headerSubtext: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    marginTop: 4,
    fontWeight: "500",
  },
  section: {
    padding: 20,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 12,
    color: "#1e293b",
    letterSpacing: 0.2,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#64748b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statIconContainer: {
    backgroundColor: "#ecfdf5",
    padding: 10,
    borderRadius: 14,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
  },
  statLabel: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
    fontWeight: "600",
  },
  classGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  classCard: {
    width: "47.5%",
    borderRadius: 20,
    padding: 18,
    marginVertical: 8,
    shadowColor: "#64748b",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    justifyContent: "center",
  },
  disabledCard: {
    opacity: 0.58,
  },
  className: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  classSection: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  lockText: {
    color: "#fff",
    fontSize: 12,
    marginTop: 14,
    fontWeight: "700",
    opacity: 0.95,
  },
  addClass: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
    alignItems: "center",
    shadowColor: "transparent",
    elevation: 0,
  },
  addClassText: {
    color: "#009e60",
    fontWeight: "700",
    fontSize: 16,
    marginTop: 10,
  },
  lockTextMuted: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 8,
    fontWeight: "700",
  },
});

const COLORS = ["#BB73E0", "#EE89B0", "#AEBAF8", "#F4A261", "#2A9D8F"];
