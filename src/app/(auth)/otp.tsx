import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Platform, SafeAreaView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function OTP() {
  const router = useRouter();

  return (
    <LinearGradient colors={['#0EA47A', '#017EBA']} style={styles.background}>
      <SafeAreaView style={styles.safeArea}>
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Reset Password</Text>

          <TextInput 
            style={styles.input} 
            placeholder="Enter One Time Password" 
            placeholderTextColor="#888" 
          />

          <TouchableOpacity style={styles.button} onPress={() => router.replace('/(auth)/newpass')}>
            <Text style={styles.buttonText}>Verify</Text>
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  safeArea: { 
    flex: 1, 
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingBottom: 100,
  },
  backBtn: { 
    flexDirection: 'row', 
    alignItems: 'center',
  },
  backText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 5
  },
  title: { 
    fontSize: 28, 
    color: "#fff", 
    fontWeight: "bold", 
    marginBottom: 40,
    textAlign: "center"
  },
  input: {
    backgroundColor: "#DCFCE7",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 14,
    marginBottom: 20,
    fontSize: 14,
    color: '#333'
  },
  button: {
    backgroundColor: "#DCFCE7",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
    alignSelf: "flex-end",
  },
  buttonText: { 
    color: "#000", 
    fontWeight: "bold" 
  },
});