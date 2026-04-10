import { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

export default function PerfilScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u));
  }, []);

  const cerrarSesion = () => {
    Alert.alert("Cerrar sesión", "¿Seguro que quieres salir?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Salir", style: "destructive", onPress: async () => {
        await supabase.auth.signOut();
        router.replace("/login");
      }},
    ]);
  };

  const nombre = user?.user_metadata?.nombre || user?.email?.split("@")[0] || "Usuario";
  const email  = user?.email || "";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👤 Perfil</Text>
      </View>

      <ScrollView style={{ flex: 1, padding: 20 }}>
        {/* Avatar */}
        <View style={styles.avatarBox}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{nombre.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.nombre}>{nombre}</Text>
          <Text style={styles.email}>{email}</Text>
        </View>

        {/* Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Profesión</Text>
            <Text style={styles.infoValue}>{user?.user_metadata?.profesion || "—"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Cargo</Text>
            <Text style={styles.infoValue}>{user?.user_metadata?.cargo || "—"}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aplicación</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Versión</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Plataforma</Text>
            <Text style={styles.infoValue}>APUdesk Mobile</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.btnLogout} onPress={cerrarSesion} activeOpacity={0.85}>
          <Text style={styles.btnLogoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: "#f8fafc" },
  header:       { backgroundColor: "#6366f1", paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle:  { fontSize: 20, fontWeight: "800", color: "#fff" },
  avatarBox:    { alignItems: "center", paddingVertical: 32 },
  avatar:       { width: 88, height: 88, borderRadius: 24, backgroundColor: "#6366f1",
                  alignItems: "center", justifyContent: "center", marginBottom: 12,
                  shadowColor: "#6366f1", shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  avatarText:   { fontSize: 40, fontWeight: "900", color: "#fff" },
  nombre:       { fontSize: 20, fontWeight: "800", color: "#0f172a" },
  email:        { fontSize: 13, color: "#64748b", marginTop: 4 },
  section:      { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16,
                  shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase",
                  letterSpacing: 1, marginBottom: 12 },
  infoRow:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center",
                  paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  infoLabel:    { fontSize: 13, color: "#64748b", fontWeight: "500" },
  infoValue:    { fontSize: 13, color: "#0f172a", fontWeight: "600", flex: 1, textAlign: "right" },
  btnLogout:    { backgroundColor: "#fee2e2", borderRadius: 14, paddingVertical: 16,
                  alignItems: "center", marginTop: 8 },
  btnLogoutText:{ color: "#ef4444", fontWeight: "700", fontSize: 15 },
});
