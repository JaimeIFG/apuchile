import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser]         = useState<any>(null);
  const [obras, setObras]       = useState<any[]>([]);
  const [proyectos, setProyectos] = useState<any[]>([]);
  const [notas, setNotas]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cargar = async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) { router.replace("/login"); return; }
    setUser(u);
    const [obrasR, proyR, notasR] = await Promise.all([
      supabase.from("obras").select("id,nombre,estado_obra").eq("user_id", u.id).limit(5),
      supabase.from("proyectos").select("id,nombre,meta").eq("user_id", u.id).limit(5),
      supabase.from("notas_mobile").select("*").eq("user_id", u.id).order("created_at", { ascending: false }).limit(3),
    ]);
    setObras(obrasR.data || []);
    setProyectos(proyR.data || []);
    setNotas(notasR.data || []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await cargar();
    setRefreshing(false);
  };

  const nombre = user?.user_metadata?.nombre || user?.email?.split("@")[0] || "Usuario";

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc" }}>
        <ActivityIndicator color="#6366f1" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hola, {nombre} 👋</Text>
          <Text style={styles.subGreeting}>APUdesk Mobile</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{nombre.charAt(0).toUpperCase()}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard label="Obras" value={obras.length} emoji="🏗️" color="#6366f1" />
          <StatCard label="Proyectos" value={proyectos.length} emoji="📋" color="#8b5cf6" />
          <StatCard label="Notas" value={notas.length} emoji="📝" color="#06b6d4" />
        </View>

        {/* Accesos rápidos */}
        <Text style={styles.sectionTitle}>Acceso rápido</Text>
        <View style={styles.quickRow}>
          <QuickBtn emoji="📸" label="Subir foto" color="#6366f1" onPress={() => router.push("/(tabs)/bitacora")} />
          <QuickBtn emoji="📝" label="Nueva nota" color="#8b5cf6" onPress={() => router.push("/(tabs)/notas")} />
          <QuickBtn emoji="🏗️" label="Mis obras" color="#0891b2" onPress={() => router.push("/(tabs)/obras")} />
        </View>

        {/* Últimas notas */}
        {notas.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Últimas notas</Text>
            {notas.map(n => (
              <View key={n.id} style={styles.notaCard}>
                <Text style={styles.notaTitulo} numberOfLines={1}>{n.titulo || "Sin título"}</Text>
                <Text style={styles.notaTexto} numberOfLines={2}>{n.contenido}</Text>
                <Text style={styles.notaFecha}>{new Date(n.created_at).toLocaleDateString("es-CL")}</Text>
              </View>
            ))}
          </>
        )}

        {/* Obras recientes */}
        {obras.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Obras recientes</Text>
            {obras.map(o => (
              <View key={o.id} style={styles.obraCard}>
                <Text style={styles.obraNombre} numberOfLines={1}>{o.nombre}</Text>
                <View style={[styles.estadoBadge, { backgroundColor: estadoColor(o.estado_obra).bg }]}>
                  <Text style={[styles.estadoText, { color: estadoColor(o.estado_obra).text }]}>
                    {o.estado_obra || "—"}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, emoji, color }: any) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function QuickBtn({ emoji, label, color, onPress }: any) {
  return (
    <TouchableOpacity style={[styles.quickBtn, { borderColor: color + "33" }]} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.quickIcon, { backgroundColor: color + "15" }]}>
        <Text style={{ fontSize: 26 }}>{emoji}</Text>
      </View>
      <Text style={[styles.quickLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function estadoColor(estado: string) {
  const map: any = {
    "En ejecución":  { bg: "#eef2ff", text: "#4338ca" },
    "En licitación": { bg: "#dbeafe", text: "#1d4ed8" },
    "Paralizada":    { bg: "#fee2e2", text: "#991b1b" },
    "Recepcionada":  { bg: "#fef3c7", text: "#92400e" },
    "Liquidada":     { bg: "#f1f5f9", text: "#475569" },
  };
  return map[estado] || { bg: "#f1f5f9", text: "#475569" };
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: "#f8fafc" },
  header:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center",
                  backgroundColor: "#6366f1", paddingHorizontal: 20, paddingVertical: 18 },
  greeting:     { fontSize: 20, fontWeight: "800", color: "#fff" },
  subGreeting:  { fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  avatar:       { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.2)",
                  alignItems: "center", justifyContent: "center" },
  avatarText:   { fontSize: 20, fontWeight: "800", color: "#fff" },
  scroll:       { flex: 1, paddingHorizontal: 16 },
  statsRow:     { flexDirection: "row", gap: 10, marginTop: 16 },
  statCard:     { flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 14,
                  alignItems: "center", borderTopWidth: 3, gap: 4,
                  shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statValue:    { fontSize: 24, fontWeight: "800" },
  statLabel:    { fontSize: 11, color: "#64748b", fontWeight: "600" },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#0f172a", marginTop: 20, marginBottom: 10 },
  quickRow:     { flexDirection: "row", gap: 10 },
  quickBtn:     { flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 14,
                  alignItems: "center", gap: 8, borderWidth: 1.5,
                  shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  quickIcon:    { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  quickLabel:   { fontSize: 12, fontWeight: "700" },
  notaCard:     { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8,
                  borderLeftWidth: 3, borderLeftColor: "#8b5cf6",
                  shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  notaTitulo:   { fontSize: 13, fontWeight: "700", color: "#0f172a", marginBottom: 3 },
  notaTexto:    { fontSize: 12, color: "#64748b", lineHeight: 18 },
  notaFecha:    { fontSize: 10, color: "#94a3b8", marginTop: 6 },
  obraCard:     { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8,
                  flexDirection: "row", justifyContent: "space-between", alignItems: "center",
                  shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  obraNombre:   { fontSize: 13, fontWeight: "600", color: "#0f172a", flex: 1, marginRight: 8 },
  estadoBadge:  { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  estadoText:   { fontSize: 11, fontWeight: "700" },
});
