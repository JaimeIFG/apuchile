import { useState, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, Alert, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";

export default function NotasScreen() {
  const [notas, setNotas]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [editando, setEditando] = useState<any>(null);
  const [titulo, setTitulo]     = useState("");
  const [contenido, setContenido] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("notas_mobile")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    setNotas(data || []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const abrirNueva = () => {
    setEditando(null);
    setTitulo("");
    setContenido("");
    setModal(true);
  };

  const abrirEditar = (n: any) => {
    setEditando(n);
    setTitulo(n.titulo || "");
    setContenido(n.contenido || "");
    setModal(true);
  };

  const guardar = async () => {
    if (!contenido.trim()) { Alert.alert("Error", "La nota no puede estar vacía."); return; }
    setGuardando(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const now = new Date().toISOString();
    if (editando) {
      await supabase.from("notas_mobile").update({
        titulo:     titulo.trim() || null,
        contenido:  contenido.trim(),
        updated_at: now,
      }).eq("id", editando.id);
    } else {
      await supabase.from("notas_mobile").insert({
        user_id:    user.id,
        titulo:     titulo.trim() || null,
        contenido:  contenido.trim(),
        created_at: now,
        updated_at: now,
      });
    }
    setGuardando(false);
    setModal(false);
    cargar();
  };

  const eliminar = (id: string) => {
    Alert.alert("Eliminar nota", "¿Seguro que quieres eliminar esta nota?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: async () => {
        await supabase.from("notas_mobile").delete().eq("id", id);
        cargar();
      }},
    ]);
  };

  if (loading) return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc" }}>
      <ActivityIndicator color="#6366f1" size="large" />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>📝 Notas</Text>
          <Text style={styles.headerSub}>{notas.length} nota{notas.length !== 1 ? "s" : ""} guardada{notas.length !== 1 ? "s" : ""}</Text>
        </View>
        <TouchableOpacity style={styles.btnNueva} onPress={abrirNueva} activeOpacity={0.85}>
          <Text style={{ color: "#6366f1", fontWeight: "800", fontSize: 22 }}>＋</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator={false}>
        {notas.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>📝</Text>
            <Text style={styles.emptyText}>Sin notas aún</Text>
            <Text style={styles.emptySubtext}>Toca el botón ＋ para crear tu primera nota</Text>
            <TouchableOpacity style={styles.btnEmptyCreate} onPress={abrirNueva} activeOpacity={0.85}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>Crear nota</Text>
            </TouchableOpacity>
          </View>
        ) : (
          notas.map(n => (
            <TouchableOpacity key={n.id} style={styles.notaCard} onPress={() => abrirEditar(n)} activeOpacity={0.85}>
              <View style={styles.notaHeader}>
                <Text style={styles.notaTitulo} numberOfLines={1}>
                  {n.titulo || "Sin título"}
                </Text>
                <TouchableOpacity onPress={() => eliminar(n.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={{ color: "#ef4444", fontSize: 16 }}>🗑️</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.notaContenido} numberOfLines={4}>{n.contenido}</Text>
              <Text style={styles.notaFecha}>
                {new Date(n.updated_at || n.created_at).toLocaleString("es-CL", {
                  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                })}
              </Text>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Modal crear/editar */}
      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModal(false)}>
              <Text style={{ color: "#64748b", fontSize: 15 }}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editando ? "Editar nota" : "Nueva nota"}</Text>
            <TouchableOpacity onPress={guardar} disabled={guardando}>
              {guardando
                ? <ActivityIndicator color="#6366f1" />
                : <Text style={{ color: "#6366f1", fontWeight: "700", fontSize: 15 }}>Guardar</Text>
              }
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.inputTitulo}
            value={titulo}
            onChangeText={setTitulo}
            placeholder="Título (opcional)"
            placeholderTextColor="#94a3b8"
          />
          <TextInput
            style={styles.inputContenido}
            value={contenido}
            onChangeText={setContenido}
            placeholder="Escribe tu nota aquí..."
            placeholderTextColor="#94a3b8"
            multiline
            autoFocus
            textAlignVertical="top"
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: "#f8fafc" },
  header:         { backgroundColor: "#6366f1", paddingHorizontal: 20, paddingVertical: 16,
                    flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle:    { fontSize: 20, fontWeight: "800", color: "#fff" },
  headerSub:      { fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  btnNueva:       { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.2)",
                    alignItems: "center", justifyContent: "center" },
  empty:          { alignItems: "center", marginTop: 80, gap: 10 },
  emptyText:      { fontSize: 16, fontWeight: "700", color: "#64748b" },
  emptySubtext:   { fontSize: 13, color: "#94a3b8", textAlign: "center" },
  btnEmptyCreate: { backgroundColor: "#6366f1", paddingHorizontal: 24, paddingVertical: 12,
                    borderRadius: 12, marginTop: 8 },
  notaCard:       { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 10,
                    borderLeftWidth: 3, borderLeftColor: "#8b5cf6",
                    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  notaHeader:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  notaTitulo:     { fontSize: 14, fontWeight: "700", color: "#0f172a", flex: 1, marginRight: 8 },
  notaContenido:  { fontSize: 13, color: "#475569", lineHeight: 20 },
  notaFecha:      { fontSize: 10, color: "#94a3b8", marginTop: 8 },
  modal:          { flex: 1, backgroundColor: "#fff" },
  modalHeader:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center",
                    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  modalTitle:     { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  inputTitulo:    { fontSize: 20, fontWeight: "700", color: "#0f172a", paddingHorizontal: 20,
                    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  inputContenido: { flex: 1, fontSize: 16, color: "#374151", paddingHorizontal: 20,
                    paddingVertical: 16, lineHeight: 26 },
});
