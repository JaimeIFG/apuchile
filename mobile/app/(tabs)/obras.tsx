import { useState, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

const ESTADO_ST: Record<string, { bg: string; color: string }> = {
  "En licitación": { bg: "#dbeafe", color: "#1d4ed8" },
  "En ejecución":  { bg: "#eef2ff", color: "#4338ca" },
  "Paralizada":    { bg: "#fee2e2", color: "#991b1b" },
  "Recepcionada":  { bg: "#fef3c7", color: "#92400e" },
  "Liquidada":     { bg: "#f1f5f9", color: "#475569" },
};

export default function ObrasScreen() {
  const router = useRouter();
  const [obras, setObras]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cargar = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("obras")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setObras(data || []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await cargar();
    setRefreshing(false);
  };

  if (loading) return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc" }}>
      <ActivityIndicator color="#6366f1" size="large" />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏗️ Mis Obras</Text>
        <Text style={styles.headerSub}>{obras.length} obra{obras.length !== 1 ? "s" : ""} registrada{obras.length !== 1 ? "s" : ""}</Text>
      </View>

      <ScrollView
        style={{ flex: 1, padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
        showsVerticalScrollIndicator={false}
      >
        {obras.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>🏗️</Text>
            <Text style={styles.emptyText}>Sin obras registradas</Text>
            <Text style={styles.emptySubtext}>Crea obras desde la web en apuchile.vercel.app</Text>
          </View>
        ) : (
          obras.map(o => {
            const st = ESTADO_ST[o.estado_obra] || ESTADO_ST["Liquidada"];
            const dias = o.fecha_termino_contractual
              ? Math.ceil((new Date(o.fecha_termino_contractual).getTime() - Date.now()) / 86400000)
              : null;
            return (
              <TouchableOpacity
                key={o.id}
                style={styles.card}
                onPress={() => router.push({ pathname: "/obra/[id]", params: { id: o.id } })}
                activeOpacity={0.85}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.estadoBadge, { backgroundColor: st.bg }]}>
                    <Text style={[styles.estadoText, { color: st.color }]}>{o.estado_obra || "—"}</Text>
                  </View>
                  {dias !== null && (
                    <View style={[styles.plazoChip, dias < 0 ? styles.plazoRojo : dias <= 30 ? styles.plazoAmarillo : styles.plazoAzul]}>
                      <Text style={[styles.plazoText, { color: dias < 0 ? "#991b1b" : dias <= 30 ? "#92400e" : "#4338ca" }]}>
                        {dias < 0 ? `Vencida ${Math.abs(dias)}d` : dias === 0 ? "Vence hoy" : `${dias}d`}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.nombre} numberOfLines={2}>{o.nombre}</Text>
                {o.mandante && <Text style={styles.mandante} numberOfLines={1}>👤 {o.mandante}</Text>}
                <View style={styles.cardBottom}>
                  {o.monto_contrato ? (
                    <Text style={styles.monto}>${(o.monto_contrato / 1_000_000).toFixed(1)}M</Text>
                  ) : null}
                  <Text style={styles.fecha}>
                    {o.fecha_termino_contractual
                      ? `Termino: ${new Date(o.fecha_termino_contractual).toLocaleDateString("es-CL")}`
                      : "Sin fecha de término"}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: "#f8fafc" },
  header:       { backgroundColor: "#6366f1", paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle:  { fontSize: 20, fontWeight: "800", color: "#fff" },
  headerSub:    { fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  empty:        { alignItems: "center", marginTop: 80, gap: 10 },
  emptyText:    { fontSize: 16, fontWeight: "700", color: "#64748b" },
  emptySubtext: { fontSize: 13, color: "#94a3b8", textAlign: "center" },
  card:         { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12,
                  shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardTop:      { flexDirection: "row", gap: 8, marginBottom: 8, flexWrap: "wrap" },
  estadoBadge:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  estadoText:   { fontSize: 11, fontWeight: "700" },
  plazoChip:    { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99 },
  plazoRojo:    { backgroundColor: "#fee2e2" },
  plazoAmarillo:{ backgroundColor: "#fef3c7" },
  plazoAzul:    { backgroundColor: "#eef2ff" },
  plazoText:    { fontSize: 11, fontWeight: "700" },
  nombre:       { fontSize: 15, fontWeight: "700", color: "#0f172a", marginBottom: 4 },
  mandante:     { fontSize: 12, color: "#64748b", marginBottom: 8 },
  cardBottom:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  monto:        { fontSize: 16, fontWeight: "800", color: "#6366f1" },
  fecha:        { fontSize: 11, color: "#94a3b8" },
});
