import { useState, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Image, Alert, ActivityIndicator, TextInput, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../../lib/supabase";

export default function BitacoraScreen() {
  const [fotos, setFotos]         = useState<any[]>([]);
  const [obras, setObras]         = useState<any[]>([]);
  const [obraSelec, setObraSelec] = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [subiendo, setSubiendo]   = useState(false);
  const [modalFoto, setModalFoto] = useState<any>(null);
  const [desc, setDesc]           = useState("");

  const cargar = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [obrasR, fotosR] = await Promise.all([
      supabase.from("obras").select("id,nombre").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("bitacora_fotos").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setObras(obrasR.data || []);
    if (!obraSelec && obrasR.data?.[0]) setObraSelec(obrasR.data[0]);
    setFotos(fotosR.data || []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const seleccionarFoto = async (fuente: "camara" | "galeria") => {
    let result;
    if (fuente === "camara") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") { Alert.alert("Permiso denegado", "Necesitamos acceso a la cámara."); return; }
      result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") { Alert.alert("Permiso denegado", "Necesitamos acceso a tus fotos."); return; }
      result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: true });
    }
    if (!result.canceled && result.assets[0]) {
      setModalFoto(result.assets[0]);
      setDesc("");
    }
  };

  const subirFoto = async () => {
    if (!modalFoto || !obraSelec) return;
    setSubiendo(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const ext  = (modalFoto.uri.split(".").pop() || "jpg").split("?")[0];
      const mime = ext === "png" ? "image/png" : "image/jpeg";
      const path = `bitacora/${user.id}/${Date.now()}.${ext}`;

      // FormData upload — compatible con emulador y dispositivo físico
      const formData = new FormData();
      formData.append("file", { uri: modalFoto.uri, name: `foto.${ext}`, type: mime } as any);

      const { data: { session } } = await supabase.auth.getSession();
      const uploadResp = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/obra-archivos/${path}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "x-upsert": "false",
          },
          body: formData,
        }
      );
      if (!uploadResp.ok) {
        const errText = await uploadResp.text();
        throw new Error(errText);
      }
      const uploadError = null;
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("obra-archivos").getPublicUrl(path);

      await supabase.from("bitacora_fotos").insert({
        user_id:     user.id,
        obra_id:     obraSelec.id,
        url:         publicUrl,
        storage_path: path,
        descripcion: desc.trim() || null,
      });

      setModalFoto(null);
      setDesc("");
      cargar();
      Alert.alert("✅ Foto subida", "La foto ya está disponible en la web.");
    } catch (e: any) {
      Alert.alert("Error", e.message || "No se pudo subir la foto.");
    } finally {
      setSubiendo(false);
    }
  };

  const fotosFiltradas = obraSelec
    ? fotos.filter(f => f.obra_id === obraSelec.id)
    : fotos;

  if (loading) return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc" }}>
      <ActivityIndicator color="#6366f1" size="large" />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📸 Bitácora</Text>
        <Text style={styles.headerSub}>Fotos de obra</Text>
      </View>

      {/* Selector de obra */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.obraScroll} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 12 }}>
        {obras.map(o => (
          <TouchableOpacity
            key={o.id}
            onPress={() => setObraSelec(o)}
            style={[styles.obraChip, obraSelec?.id === o.id && styles.obraChipActive]}
            activeOpacity={0.8}
          >
            <Text style={[styles.obraChipText, obraSelec?.id === o.id && { color: "#fff" }]} numberOfLines={1}>
              {o.nombre}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Botones subir */}
      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.btnFoto} onPress={() => seleccionarFoto("camara")} activeOpacity={0.85}>
          <Text style={styles.btnFotoIcon}>📷</Text>
          <Text style={styles.btnFotoText}>Cámara</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnFoto, { backgroundColor: "#8b5cf6" }]} onPress={() => seleccionarFoto("galeria")} activeOpacity={0.85}>
          <Text style={styles.btnFotoIcon}>🖼️</Text>
          <Text style={styles.btnFotoText}>Galería</Text>
        </TouchableOpacity>
      </View>

      {/* Grid de fotos */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {fotosFiltradas.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>📸</Text>
            <Text style={styles.emptyText}>Sin fotos aún</Text>
            <Text style={styles.emptySubtext}>Toma una foto o sube desde la galería</Text>
          </View>
        ) : (
          fotosFiltradas.map(f => (
            <View key={f.id} style={styles.fotoCard}>
              <Image source={{ uri: f.url }} style={styles.fotoImg} resizeMode="cover" />
              {f.descripcion && <Text style={styles.fotoDesc} numberOfLines={2}>{f.descripcion}</Text>}
              <Text style={styles.fotoFecha}>{new Date(f.created_at).toLocaleString("es-CL")}</Text>
            </View>
          ))
        )}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Modal confirmación foto */}
      <Modal visible={!!modalFoto} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Confirmar foto</Text>
          {modalFoto && <Image source={{ uri: modalFoto.uri }} style={styles.modalImg} resizeMode="cover" />}
          <Text style={styles.modalLabel}>Descripción (opcional)</Text>
          <TextInput
            style={styles.modalInput}
            value={desc}
            onChangeText={setDesc}
            placeholder="Ej: Excavación zona norte, avance 40%"
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={3}
          />
          <Text style={styles.modalLabel}>Obra: <Text style={{ color: "#6366f1", fontWeight: "700" }}>{obraSelec?.nombre || "—"}</Text></Text>
          <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
            <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalFoto(null)} activeOpacity={0.8}>
              <Text style={{ color: "#64748b", fontWeight: "600" }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtnOk, subiendo && { opacity: 0.7 }]} onPress={subirFoto} disabled={subiendo} activeOpacity={0.85}>
              {subiendo ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700" }}>Subir foto</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: "#f8fafc" },
  header:         { backgroundColor: "#6366f1", paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle:    { fontSize: 20, fontWeight: "800", color: "#fff" },
  headerSub:      { fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  obraScroll:     { maxHeight: 60, flexGrow: 0 },
  obraChip:       { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, backgroundColor: "#fff",
                    borderWidth: 1.5, borderColor: "#e2e8f0", maxWidth: 160 },
  obraChipActive: { backgroundColor: "#6366f1", borderColor: "#6366f1" },
  obraChipText:   { fontSize: 12, fontWeight: "600", color: "#374151" },
  btnRow:         { flexDirection: "row", gap: 12, paddingHorizontal: 16, marginBottom: 12 },
  btnFoto:        { flex: 1, backgroundColor: "#6366f1", borderRadius: 14, paddingVertical: 14,
                    alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  btnFotoIcon:    { fontSize: 20 },
  btnFotoText:    { color: "#fff", fontWeight: "700", fontSize: 14 },
  grid:           { paddingHorizontal: 16, gap: 12 },
  fotoCard:       { backgroundColor: "#fff", borderRadius: 14, overflow: "hidden",
                    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  fotoImg:        { width: "100%", height: 200 },
  fotoDesc:       { fontSize: 13, color: "#374151", padding: 10, paddingBottom: 4 },
  fotoFecha:      { fontSize: 10, color: "#94a3b8", paddingHorizontal: 10, paddingBottom: 10 },
  empty:          { alignItems: "center", marginTop: 60, gap: 8 },
  emptyText:      { fontSize: 16, fontWeight: "700", color: "#64748b" },
  emptySubtext:   { fontSize: 13, color: "#94a3b8", textAlign: "center" },
  modal:          { flex: 1, padding: 24, backgroundColor: "#fff" },
  modalTitle:     { fontSize: 18, fontWeight: "800", color: "#0f172a", marginBottom: 16 },
  modalImg:       { width: "100%", height: 220, borderRadius: 14, marginBottom: 16 },
  modalLabel:     { fontSize: 12, fontWeight: "600", color: "#374151", marginBottom: 6, marginTop: 8 },
  modalInput:     { borderWidth: 1.5, borderColor: "#e2e8f0", borderRadius: 10, padding: 12,
                    fontSize: 14, color: "#0f172a", backgroundColor: "#f8fafc", minHeight: 80,
                    textAlignVertical: "top" },
  modalBtnCancel: { flex: 1, borderWidth: 1.5, borderColor: "#e2e8f0", borderRadius: 12,
                    paddingVertical: 14, alignItems: "center" },
  modalBtnOk:     { flex: 1, backgroundColor: "#6366f1", borderRadius: 12,
                    paddingVertical: 14, alignItems: "center" },
});
