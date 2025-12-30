import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Platform, SafeAreaView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function NewPassword() {
  const router = useRouter();

  const ruleText = `Passwords must contain:
• a minimum of 1 lower case letter [a-z] and
• a minimum of 1 upper case letter [A-Z] and
• a minimum of 1 numeric character [0-9] and
• a minimum of 1 special character: ~\`!@#$%^&*()-_+={}[]|\\;:"<>,./?`;

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
            placeholder="Enter New Password"
            placeholderTextColor="#888"
            secureTextEntry
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm New Password"
            placeholderTextColor="#888"
            secureTextEntry
          />

          <Text style={styles.rules}>{ruleText}</Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => router.replace("/(auth)/reset-success")}
          >
            <Text style={styles.buttonText}>Reset Password</Text>
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
    paddingBottom: 50,
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
    marginBottom: 30,
    textAlign: "center"
  },
  input: {
    backgroundColor: "#DCFCE7",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 14,
    marginBottom: 12,
    fontSize: 14,
    color: '#333'
  },
  rules: { 
    color: "#fff", 
    fontSize: 10, 
    marginTop: 5, 
    marginBottom: 25, 
    lineHeight: 16,
    opacity: 0.9 
  },
  button: {
    backgroundColor: "#DCFCE7",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    alignSelf: "flex-end"
  },
  buttonText: { 
    color: "#000", 
    fontWeight: "bold" 
  },
});