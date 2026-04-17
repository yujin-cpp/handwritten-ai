import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
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
import PieChart from "react-native-pie-chart";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth } from "../../../firebase/firebaseConfig";
import { getActivities, getClasses, listenToStudents } from "../../../services/class.service";

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
    ? [{ value: 1, color: "#f0f0f0" }]
    : [
      { value: passed, color: "#00b679" },
      { value: failed, color: "#ff3b30" },
    ];

  return (
    <View style={styles.donutWrapper}>
      <PieChart
        widthAndHeight={widthAndHeight}
        series={series}
        cover={{ radius: 0.7, color: "#ffffff" }}
      />
      <View style={styles.donutCenter}>
        <Text style={styles.donutCenterNumber}>{percent}%</Text>
        <Text style={styles.donutCenterLabel}>Passed</Text>
      </View>
    </View>
  );
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const fetchClasses = async () => {
      try {
        const data = await getClasses(uid);
        const formatted = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setClassList(formatted);
        if (formatted.length > 0) {
          setSelectedClassId(formatted[0].id);
          setSelectedClassName(formatted[0].className);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, []);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || !selectedClassId) return;

    const fetchActivities = async () => {
      const data = await getActivities(uid, selectedClassId);
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
  }, [selectedClassId]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || !selectedClassId || !selectedActivityId) {
      setStudentScores([]);
      setPassedCount(0);
      setFailedCount(0);
      setDistribution([0, 0, 0, 0]);
      return;
    }

    const unsubscribe = listenToStudents(uid, selectedClassId, (students) => {
      const scores: StudentScore[] = [];
      let passed = 0, failed = 0;
      const dist = [0, 0, 0, 0];

      const activityMetadata = activityList.find(a => a.id === selectedActivityId);
      const totalScore = Number(activityMetadata?.total || 100);
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
  }, [selectedClassId, selectedActivityId]);

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

  if (loading) return (
    <View style={styles.loaderPage}>
      <ActivityIndicator size="large" color="#00b679" />
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#00b679", "#008a5b"]} style={[styles.header, { paddingTop: insets.top + 15 }]}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Analytics Dashboard</Text>
          <TouchableOpacity style={styles.headerInfoBtn}>
            <Feather name="info" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.pillsRow}>
          <TouchableOpacity
            style={styles.pill}
            onPress={(e) => { setPickerY(e.nativeEvent.pageY); setPickerType("section"); }}
          >
            <Feather name="users" size={14} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.pillText} numberOfLines={1}>{selectedClassName}</Text>
            <Feather name="chevron-down" size={12} color="#fff" style={{ marginLeft: 4 }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.pill}
            onPress={(e) => { setPickerY(e.nativeEvent.pageY); setPickerType("activity"); }}
          >
            <Feather name="file-text" size={14} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.pillText} numberOfLines={1}>{selectedActivityName}</Text>
            <Feather name="chevron-down" size={12} color="#fff" style={{ marginLeft: 4 }} />
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
          <View style={[styles.summaryCard, { borderLeftWidth: 1, borderColor: '#f0f0f0' }]}>
            <Text style={styles.statLabel}>Participation</Text>
            <Text style={styles.statValue}>{studentScores.length}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Score Distribution</Text>
            <Feather name="bar-chart-2" size={16} color="#ddd" />
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
                      <View style={[styles.bar, { height: h || 4, backgroundColor: h ? '#00b679' : '#f0f0f0' }]} />
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

        <View style={[styles.card, { marginTop: 20 }]}>
          <Text style={styles.cardTitle}>Success Rate</Text>
          <View style={styles.perfRow}>
            <DonutChart passed={passedCount} failed={failedCount} />
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: '#00b679' }]} />
                <View>
                  <Text style={styles.legPrimary}>Passed</Text>
                  <Text style={styles.legSecondary}>{passedCount} students</Text>
                </View>
              </View>
              <View style={[styles.legendItem, { marginTop: 15 }]}>
                <View style={[styles.dot, { backgroundColor: '#ff3b30' }]} />
                <View>
                  <Text style={styles.legPrimary}>Failed</Text>
                  <Text style={styles.legSecondary}>{failedCount} students</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.card, { marginTop: 20, paddingBottom: 10 }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Top Performers</Text>
            <Feather name="award" size={18} color="#FFD700" />
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
                <Feather name="slash" size={32} color="#eee" />
                <Text style={styles.emptyText}>No graded data available.</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.moreBtn}
            onPress={() => selectedClassId && router.push({
              pathname: "/(tabs)/classes/activities",
              params: { classId: selectedClassId, name: selectedClassName, color: "#00b679" }
            })}
          >
            <Text style={styles.moreBtnText}>Go to Class Records</Text>
            <Feather name="arrow-right" size={14} color="#00b679" />
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
                  style={[styles.popupItem, opt === currentValue && { backgroundColor: '#00b67910' }]}
                  onPress={() => handleSelect(opt)}
                >
                  <Text style={[styles.popupItemText, opt === currentValue && { color: '#00b679', fontWeight: '700' }]}>{opt}</Text>
                  {opt === currentValue && <Feather name="check" size={16} color="#00b679" />}
                </TouchableOpacity>
              ))}
              {currentOptions.length === 0 && <Text style={styles.noData}>No data available</Text>}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7fb" },
  loaderPage: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingBottom: 25 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerInfoBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  pillsRow: { flexDirection: 'row', gap: 10 },
  pill: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14 },
  pillText: { color: '#fff', fontSize: 13, fontWeight: '700', flex: 1 },

  content: { padding: 20 },
  summaryGrid: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 24, padding: 20, elevation: 1, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 15, marginBottom: 20 },
  summaryCard: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 11, fontWeight: '800', color: '#bbb', textTransform: 'uppercase', marginBottom: 5 },
  statValue: { fontSize: 24, fontWeight: '800', color: '#111' },

  card: { backgroundColor: '#fff', borderRadius: 24, padding: 20, elevation: 1, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 15 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#111' },

  chartContainer: { flexDirection: 'row', height: 130 },
  yAxis: { width: 30, justifyContent: 'space-between', paddingBottom: 10 },
  barArea: { flex: 1, position: 'relative' },
  gridLines: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  gridLine: { height: 1, backgroundColor: '#f5f5f5' },
  bars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around' },
  barColumn: { alignItems: 'center' },
  bar: { width: 35, borderRadius: 8 },
  xAxisLabels: { flexDirection: 'row', justifyContent: 'space-around', paddingLeft: 30, marginTop: 10 },
  axisLabel: { fontSize: 10, fontWeight: '700', color: '#ccc' },

  perfRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  donutWrapper: { width: 130, height: 130, alignItems: 'center', justifyContent: 'center' },
  donutCenter: { position: 'absolute', alignItems: 'center' },
  donutCenterNumber: { fontSize: 22, fontWeight: '800', color: '#111' },
  donutCenterLabel: { fontSize: 10, color: '#999', fontWeight: '700' },
  legend: { flex: 1, marginLeft: 25 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  legPrimary: { fontSize: 14, fontWeight: '700', color: '#111' },
  legSecondary: { fontSize: 12, color: '#999', marginTop: 2 },

  list: { marginTop: 10 },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f9f9f9', gap: 15 },
  rankBox: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  rankText: { fontSize: 12, fontWeight: '800', color: '#666' },
  studentName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#333' },
  studentScore: { fontSize: 16, fontWeight: '800', color: '#111' },
  emptyResults: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { fontSize: 13, color: '#ccc', marginTop: 10 },

  moreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 15, gap: 8, borderTopWidth: 1, borderTopColor: '#f9f9f9', paddingTop: 15 },
  moreBtnText: { fontSize: 13, fontWeight: '800', color: '#00b679' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 20 },
  popup: { backgroundColor: '#fff', borderRadius: 28, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 30, elevation: 20, borderWidth: 1, borderColor: '#f0f0f0' },
  popupHead: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#f9f9f9' },
  popupTitle: { fontSize: 16, fontWeight: '800', color: '#111' },
  popupItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  popupItemText: { fontSize: 15, color: '#444' },
  noData: { textAlign: 'center', padding: 30, color: '#bbb' },
});
