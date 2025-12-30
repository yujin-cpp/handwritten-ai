import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Platform, SafeAreaView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function ForgotPass() {
  const router = useRouter();

  return (
    <LinearGradient colors={['#0EA47A', '#017EBA']} style={styles.background}>
      <SafeAreaView style={styles.safeArea}>
        
        {/* Top Header Section */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>

        {/* Centered Content Section */}
        <View style={styles.content}>
          <Text style={styles.title}>Reset Password</Text>

          <TextInput 
            style={styles.input} 
            placeholder="University Email Address" 
            placeholderTextColor="#888" 
          />

          <TouchableOpacity style={styles.button} onPress={() => router.push('/(auth)/otp')}>
            <Text style={styles.buttonText}>Send code</Text>
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
    // Android safe area padding
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    justifyContent: 'flex-start',
  },
  content: {
    flex: 1,
    justifyContent: "center", // Vertically centers the inputs
    paddingHorizontal: 30,
    paddingBottom: 100, // Visual balance to push content slightly up
  },
  backBtn: { 
    flexDirection: 'row', 
    alignItems: 'center',
    marginBottom: 20 
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
    backgroundColor: "#DCFCE7", // Light mint green tint per image
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
    alignSelf: "flex-end", // Moves button to the right
  },
  buttonText: { 
    color: "#000", 
    fontWeight: "bold",
    fontSize: 14
  },
});