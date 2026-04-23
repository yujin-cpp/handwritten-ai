import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import PieChart from "react-native-pie-chart";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typography, shadows } from "../../theme";
import { useAuthSession } from "../../../hooks/useAuthSession";

import { classRepository } from "../../../data/repositories/FirebaseClassRepository";
import { activityRepository } from "../../../data/repositories/FirebaseActivityRepository";
import { studentRepository } from "../../../data/repositories/FirebaseStudentRepository";

type PickerType = "section" | "activity" | null;

interface StudentScore {
  name: string;
  score: number;
}

function DonutChart({ passed, failed }: { passed: number, failed: number }) {
  const widthAndHeight = 120;
  const total = passed + failed;
  const percent = total === 0 ? 0 : Math.round((passed / total) * 100);

  const series = total === 0
    ? [{ value: 1, color: colors.grayLight }]
    : [
      { value: passed, color: colors.primary },
      { value: failed, color: colors.danger },
    ];

  return (
    <View style={styles.donutWrapper}>
      <PieChart
        widthAndHeight={widthAndHeight}
        series={series}
        cover={{ radius: 0.7, color: colors.white }}
      />
      <View style={styles.donutCenter}>
        <Text style={styles.donutCenterNumber}>{percent}%</Text>
        <Text style={styles.donutCenterLabel}>Passed</Text>
      </View>
    </View>
  );
}

export const AnalyticsScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { uid, initializing } = useAuthSession();

  const [classList, setClassList] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedClassName, setSelectedClassName] = useState<string>("Select Class");

  const [activityList, setActivityList] = useState<any[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<string>("");
  const [selectedActivityName, setSelectedActivityName] = useState<string>("Select Activity");

  const [studentScores, setStudentScores] = useState<StudentScore[]>([]);
  const [passedCount, setPassedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [distribution, setDistribution] = useState([0, 0, 0, 0]);
  const [loading, setLoading] = useState(true);

  const [pickerType, setPickerType] = useState<PickerType>(null);
  const [pickerY, setPickerY] = useState(0);

  useEffect(() => {
    if (!uid) {
      setClassList([]);
      setSelectedClassId("");
      setSelectedClassName("Select Class");
      setLoading(initializing);
      return;
    }

    const fetchClasses = async () => {
      try {
        const data = await classRepository.getClassesByProfessorId(uid);
        setClassList(data);
        if (data.length > 0) {
          setSelectedClassId(data[0].id);
          setSelectedClassName(data[0].className);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, [initializing, uid]);

  useEffect(() => {
    if (!uid || !selectedClassId) return;

    const fetchActivities = async () => {
      const data = await activityRepository.getActivities(uid, selectedClassId);
      setActivityList(data);
      if (data.length > 0) {
        setSelectedActivityId(data[0].id);
        setSelectedActivityName(data[0].title);
      } else {
        setSelectedActivityId("");
        setSelectedActivityName("No Activities");
      }
    };
    fetchActivities();
  }, [selectedClassId, uid]);

  useEffect(() => {
    if (!uid || !selectedClassId || !selectedActivityId) {
      setStudentScores([]);
      setPassedCount(0);
      setFailedCount(0);
      setDistribution([0, 0, 0, 0]);
      return;
    }

    const unsubscribe = studentRepository.listenToStudents(uid, selectedClassId, (students) => {
      const scores: StudentScore[] = [];
      let passed = 0, failed = 0;
      const dist = [0, 0, 0, 0];

      const activityMetadata = activityList.find(a => a.id === selectedActivityId);
      const totalScore = Number(
        activityMetadata?.examSettings?.totalScore ||
        activityMetadata?.total ||
        100,
      );
      const passingScore = Number(activityMetadata?.passingScore || Math.ceil(totalScore * 0.5));

      students.forEach(s => {
        const ad = s.activities?.[selectedActivityId];
        if (ad && (ad.status === "graded" || ad.score !== undefined)) {
          const score = Number(ad.score || 0);
          scores.push({ name: s.name, score });
          if (score >= passingScore) passed++; else failed++;

          const b1 = Math.floor(totalScore * 0.25);
          const b2 = Math.floor(totalScore * 0.5);
          const b3 = Math.floor(totalScore * 0.75);

          if (score <= b1) dist[0]++;
          else if (score <= b2) dist[1]++;
          else if (score <= b3) dist[2]++;
          else dist[3]++;
        }
      });

      setStudentScores(scores.sort((a, b) => b.score - a.score));
      setPassedCount(passed);
      setFailedCount(failed);
      setDistribution(dist);
    });

    return () => unsubscribe();
  }, [activityList, selectedActivityId, selectedClassId, uid]);

  const currentOptions = pickerType === "section" ? classList.map(c => c.className) : pickerType === "activity" ? activityList.map(a => a.title) : [];
  const currentValue = pickerType === "section" ? selectedClassName : selectedActivityName;

  const handleSelect = (val: string) => {
    if (pickerType === "section") {
      const s = classList.find(c => c.className === val);
      if (s) { setSelectedClassId(s.id); setSelectedClassName(s.className); }
    } else {
      const s = activityList.find(a => a.title === val);
      if (s) { setSelectedActivityId(s.id); setSelectedActivityName(s.title); }
    }
    setPickerType(null);
  };

  if (initializing || loading) return (
    <View style={styles.loaderPage}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#0EA47A", "#017EBA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Analytics</Text>
          <TouchableOpacity style={styles.headerInfoBtn}>
            <Feather name="info" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.pillsRow}>
          <TouchableOpacity style={styles.pill} onPress={(e) => { setPickerY(e.nativeEvent.pageY); setPickerType("section"); }}>
            <Feather name="users" size={16} color={colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.pillText} numberOfLines={1}>{selectedClassName}</Text>
            <Feather name="chevron-down" size={16} color={colors.white} style={{ marginLeft: 8 }} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.pill} onPress={(e) => { setPickerY(e.nativeEvent.pageY); setPickerType("activity"); }}>
            <Feather name="file-text" size={16} color={colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.pillText} numberOfLines={1}>{selectedActivityName}</Text>
            <Feather name="chevron-down" size={16} color={colors.white} style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.statLabel}>Avg. Score</Text>
            <Text style={styles.statValue}>
              {studentScores.length ? (studentScores.reduce((a, b) => a + b.score, 0) / studentScores.length).toFixed(1) : "0.0"}
            </Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftWidth: 1, borderColor: colors.grayLight }]}>
            <Text style={styles.statLabel}>Participation</Text>
            <Text style={styles.statValue}>{studentScores.length}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Score Distribution</Text>
            <Feather name="bar-chart-2" size={20} color={colors.grayLight} />
          </View>

          <View style={styles.chartContainer}>
            <View style={styles.yAxis}>
              {[5, 4, 3, 2, 1, 0].map(v => {
                const max = Math.max(...distribution, 0);
                const step = max <= 5 ? 1 : Math.ceil(max / 5);
                return <Text key={v} style={styles.axisLabel}>{v * step}</Text>;
              })}
            </View>
            <View style={styles.barArea}>
              <View style={styles.gridLines}>
                {[1, 2, 3, 4].map(i => <View key={i} style={styles.gridLine} />)}
              </View>
              <View style={styles.bars}>
                {distribution.map((count, idx) => {
                  const max = Math.ceil(Math.max(...distribution, 0) / 5) * 5 || 1;
                  const h = (count / max) * 120;
                  return (
                    <View key={idx} style={styles.barColumn}>
                      <View style={[styles.bar, { height: h || 4, backgroundColor: h ? colors.primary : colors.grayLight }]} />
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
          <View style={styles.xAxisLabels}>
            <Text style={styles.axisLabel}>Q1</Text>
            <Text style={styles.axisLabel}>Q2</Text>
            <Text style={styles.axisLabel}>Q3</Text>
            <Text style={styles.axisLabel}>Q4</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Success Rate</Text>
          <View style={styles.perfRow}>
            <DonutChart passed={passedCount} failed={failedCount} />
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                <View>
                  <Text style={styles.legPrimary}>Passed</Text>
                  <Text style={styles.legSecondary}>{passedCount} students</Text>
                </View>
              </View>
              <View style={[styles.legendItem, { marginTop: 16 }]}>
                <View style={[styles.dot, { backgroundColor: colors.danger }]} />
                <View>
                  <Text style={styles.legPrimary}>Failed</Text>
                  <Text style={styles.legSecondary}>{failedCount} students</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={[styles.cardHeader, { marginBottom: 12 }]}>
            <Text style={styles.cardTitle}>Top Performers</Text>
            <Feather name="award" size={20} color="#FFD700" />
          </View>
          <View style={styles.list}>
            {studentScores.slice(0, 5).map((s, idx) => (
              <View key={idx} style={[styles.listItem, idx === 4 && { borderBottomWidth: 0 }]}>
                <View style={styles.rankBox}>
                  <Text style={styles.rankText}>{idx + 1}</Text>
                </View>
                <Text style={styles.studentName} numberOfLines={1}>{s.name}</Text>
                <Text style={styles.studentScore}>{s.score}</Text>
              </View>
            ))}
            {studentScores.length === 0 && (
              <View style={styles.emptyResults}>
                <Feather name="slash" size={32} color={colors.grayLight} />
                <Text style={styles.emptyText}>No graded data available.</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.moreBtn}
            onPress={() => selectedClassId && router.push({
              pathname: "/(tabs)/classes/activities",
              params: { classId: selectedClassId, name: selectedClassName, color: colors.primary }
            })}
          >
            <Text style={styles.moreBtnText}>Go to Class Records</Text>
            <Feather name="arrow-right" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Choice Modal */}
      <Modal visible={!!pickerType} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setPickerType(null)} />
          <View style={[styles.popup, { top: Math.min(pickerY + 20, 500) }]}>
            <ScrollView style={{ maxHeight: 350 }} showsVerticalScrollIndicator={false}>
              <View style={styles.popupHead}>
                <Text style={styles.popupTitle}>Select {pickerType === 'section' ? 'Class' : 'Activity'}</Text>
              </View>
              {currentOptions.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.popupItem, opt === currentValue && { backgroundColor: colors.primary + "15" }]}
                  onPress={() => handleSelect(opt)}
                >
                  <Text style={[styles.popupItemText, opt === currentValue && { color: colors.primary, fontFamily: typography.fontFamily.bold }]}>{opt}</Text>
                  {opt === currentValue && <Feather name="check" size={20} color={colors.primary} />}
                </TouchableOpacity>
              ))}
              {currentOptions.length === 0 && <Text style={styles.noData}>No data available</Text>}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loaderPage: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingBottom: 24, ...shadows.medium },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerTitle: { color: colors.white, fontSize: 24, fontFamily: typography.fontFamily.bold },
  headerInfoBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  pillsRow: { flexDirection: 'row', gap: 12 },
  pill: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16 },
  pillText: { color: colors.white, fontSize: 14, fontFamily: typography.fontFamily.bold, flex: 1 },
  content: { padding: 24, paddingBottom: 150 },
  summaryGrid: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: 24, padding: 24, ...shadows.soft, marginBottom: 24 },
  summaryCard: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 12, fontFamily: typography.fontFamily.bold, color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 8 },
  statValue: { fontSize: 28, fontFamily: typography.fontFamily.bold, color: colors.text },
  card: { backgroundColor: colors.white, borderRadius: 24, padding: 24, ...shadows.soft, marginBottom: 24 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  cardTitle: { fontSize: 18, fontFamily: typography.fontFamily.bold, color: colors.text },
  chartContainer: { flexDirection: 'row', height: 140 },
  yAxis: { width: 30, justifyContent: 'space-between', paddingBottom: 10 },
  barArea: { flex: 1, position: 'relative' },
  gridLines: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  gridLine: { height: 1, backgroundColor: colors.grayLight },
  bars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around' },
  barColumn: { alignItems: 'center' },
  bar: { width: 36, borderRadius: 8 },
  xAxisLabels: { flexDirection: 'row', justifyContent: 'space-around', paddingLeft: 30, marginTop: 12 },
  axisLabel: { fontSize: 12, fontFamily: typography.fontFamily.bold, color: colors.textSecondary },
  perfRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  donutWrapper: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  donutCenter: { position: 'absolute', alignItems: 'center' },
  donutCenterNumber: { fontSize: 24, fontFamily: typography.fontFamily.bold, color: colors.text },
  donutCenterLabel: { fontSize: 12, color: colors.textSecondary, fontFamily: typography.fontFamily.bold },
  legend: { flex: 1, marginLeft: 32 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  legPrimary: { fontSize: 15, fontFamily: typography.fontFamily.bold, color: colors.text },
  legSecondary: { fontSize: 13, color: colors.textSecondary, fontFamily: typography.fontFamily.medium, marginTop: 4 },
  list: { marginTop: 12 },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.grayLight, gap: 16 },
  rankBox: { width: 32, height: 32, borderRadius: 12, backgroundColor: colors.grayLight, justifyContent: 'center', alignItems: 'center' },
  rankText: { fontSize: 14, fontFamily: typography.fontFamily.bold, color: colors.textSecondary },
  studentName: { flex: 1, fontSize: 16, fontFamily: typography.fontFamily.bold, color: colors.text },
  studentScore: { fontSize: 18, fontFamily: typography.fontFamily.bold, color: colors.text },
  emptyResults: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 14, color: colors.textSecondary, fontFamily: typography.fontFamily.medium, marginTop: 12 },
  moreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, gap: 8, borderTopWidth: 1, borderTopColor: colors.grayLight, paddingTop: 16 },
  moreBtnText: { fontSize: 15, fontFamily: typography.fontFamily.bold, color: colors.primary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  popup: { position: "absolute", left: 24, right: 24, backgroundColor: colors.white, borderRadius: 24, overflow: 'hidden', ...shadows.medium },
  popupHead: { padding: 24, borderBottomWidth: 1, borderBottomColor: colors.grayLight },
  popupTitle: { fontSize: 18, fontFamily: typography.fontFamily.bold, color: colors.text },
  popupItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20 },
  popupItemText: { fontSize: 16, color: colors.text, fontFamily: typography.fontFamily.medium },
  noData: { textAlign: 'center', padding: 40, color: colors.textSecondary, fontFamily: typography.fontFamily.medium },
});
