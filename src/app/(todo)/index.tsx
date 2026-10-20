import { useTranslation } from "react-i18next";
import { useState, useCallback, useMemo } from "react";
import {
  Alert,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  View as RNView,
} from "react-native";
import { Text, View } from "../../components/Themed";
import {
  buscarTarefas,
  deletarTarefa,
  alternarStatusTarefa,
} from "../../database/db";
import { useFocusEffect, useRouter, Stack } from "expo-router";
import Colors from "../../constants/Colors";
import { useColorScheme } from "../../components/useColorScheme";
import ButtonTT from "../../components/Jhonatanrs/ButtonTT";

export interface Tarefa {
  id: number;
  titulo: string;
  descricao: string;
  categoria: string;
  tempoMinutos: number;
  concluida: boolean;
  data: string; // 'DD/MM/AAAA'
}

export default function TodoList() {
  const { t } = useTranslation();
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [busca, setBusca] = useState("");
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const router = useRouter();

  const getTodayDateString = () => {
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, "0");
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const ano = hoje.getFullYear();
    return `${dia}/${mes}/${ano}`;
  };

  async function carregarTarefas() {
    try {
      const resultado = await buscarTarefas();
      let lista = resultado as Tarefa[];

      // Ordena por: 
      // 1. Concluídas por último
      // 2. Data (mais antiga para mais recente - ordem cronológica)
      // 3. ID
      lista.sort((a, b) => {
        if (a.concluida !== b.concluida) {
          return a.concluida ? 1 : -1;
        }

        const dataA = a.data.split("/").reverse().join("-");
        const dataB = b.data.split("/").reverse().join("-");
        
        if (dataA < dataB) return -1;
        if (dataA > dataB) return 1;
        
        return a.id - b.id;
      });

      setTarefas(lista);
    } catch (error) {
      console.error("Erro ao carregar tarefas:", error);
      Alert.alert(t("return.error"), t("return.load_error") || "Não foi possível carregar as tarefas.");
    }
  }

  useFocusEffect(
    useCallback(() => {
      carregarTarefas();
    }, []),
  );

  async function handleToggleStatus(id: number) {
    try {
      await alternarStatusTarefa(id);
      await carregarTarefas();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
    }
  }

  async function confirmarExclusao(id: number) {
    Alert.alert(
      t("return.confirm_delete"),
      t("return.confirm_delete_desc") || "Deseja realmente excluir esta tarefa?",
      [
        { text: t("button.cancel"), style: "cancel" },
        {
          text: t("button.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deletarTarefa(id);
              await carregarTarefas();
            } catch (error) {
              console.error("Erro ao deletar:", error);
            }
          },
        },
      ],
    );
  }

  function editarTarefa(tarefa: Tarefa) {
    router.push({
      pathname: "/input",
      params: {
        id: tarefa.id,
        titulo: tarefa.titulo,
        descricao: tarefa.descricao,
        categoria: tarefa.categoria,
        tempoMinutos: tarefa.tempoMinutos,
        concluida: tarefa.concluida ? 1 : 0,
        data: tarefa.data,
      },
    });
  }

  const tarefasFiltradas = useMemo(() => {
    if (!busca.trim()) return tarefas;
    const termo = busca.toLowerCase().trim();
    return tarefas.filter(
      (item) =>
        item.titulo.toLowerCase().includes(termo) ||
        item.descricao.toLowerCase().includes(termo) ||
        item.categoria.toLowerCase().includes(termo),
    );
  }, [tarefas, busca]);

  const formatarTempo = (minutos: number) => {
    if (minutos < 60) return `${minutos} min`;
    const hrs = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  };

  const hojeStr = getTodayDateString();

  const renderItem = useCallback(
    ({ item }: { item: Tarefa }) => {
      const ehHoje = item.data === hojeStr;

      return (
        <RNView
          style={[
            styles.card,
            {
              backgroundColor: colors.background_secondary,
              borderColor: colors.border,
              borderWidth: 1,
              shadowColor: colors.text_primary,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <TouchableOpacity
              onPress={() => handleToggleStatus(item.id)}
              style={[
                styles.checkbox,
                { borderColor: item.concluida ? colors.success : colors.border },
                item.concluida && { backgroundColor: colors.success },
              ]}
            >
              <Text style={styles.checkboxText}>{item.concluida ? "✓" : ""}</Text>
            </TouchableOpacity>

            <View style={styles.infoContainer}>
              <View style={styles.tituloRow}>
                <Text
                  style={[
                    styles.cardTitulo,
                    { color: colors.text_primary },
                    item.concluida && styles.textoRiscado,
                  ]}
                >
                  {item.titulo}
                </Text>
                {ehHoje && (
                  <Text
                    style={[
                      styles.hojeBadge,
                      {
                        color: colors.info,
                        backgroundColor: `${colors.info}20`,
                      },
                    ]}
                  >
                    📌 {t("badge.today") || "Hoje"}
                  </Text>
                )}
              </View>

              {item.descricao ? (
                <Text
                  style={[
                    styles.cardDescricao,
                    { color: colors.text_primary },
                    item.concluida && { opacity: 0.5 },
                  ]}
                >
                  {item.descricao}
                </Text>
              ) : null}
              <Text
                style={[
                  styles.cardTag,
                  { color: colors.text_primary },
                  item.concluida && { opacity: 0.5 },
                ]}
              >
                🏷️ {item.categoria || t("category.general") || "Geral"}
              </Text>
            </View>

            <Text
              style={[
                styles.tempoBadge,
                {
                  color: colors.text_primary,
                  backgroundColor: `${colors.button_primary}20`,
                  opacity: item.concluida ? 0.5 : 1,
                },
              ]}
            >
              ⏱️ {formatarTempo(item.tempoMinutos || 0)}
            </Text>
          </View>

          <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
            <Text
              style={[
                styles.dataText,
                { color: colors.text_primary },
                item.concluida && { opacity: 0.5 },
              ]}
            >
              📅 {item.data}
            </Text>
            <View style={styles.acoesContainer}>
              <ButtonTT
                title={t("button.edit")}
                onPress={() => editarTarefa(item)}
                color="button_primary"
              />
              <ButtonTT
                title="X"
                onLongPress={() => confirmarExclusao(item.id)}
                color="danger"
              />
            </View>
          </View>
        </RNView>
      );
    },
    [colors, t, hojeStr],
  );

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background_primary }]}
    >
      <Stack.Screen
        options={{
          headerTitle: t("task.tasks") || "Tarefas",
        }}
      />

      <View
        style={[
          styles.buscaContainer,
          {
            backgroundColor: colors.background_secondary,
            borderColor: colors.border,
            shadowColor: colors.text_primary,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          },
        ]}
      >
        <TextInput
          style={[
            styles.buscaInput,
            {
              color: colors.text_primary,
              backgroundColor: colors.background_primary,
              borderColor: colors.border,
            },
          ]}
          placeholder={t("placeholder.search_tasks") || "Buscar tarefas..."}
          placeholderTextColor="gray"
          value={busca}
          onChangeText={setBusca}
        />
      </View>

      <FlatList
        data={tarefasFiltradas}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.flatList}
        contentContainerStyle={styles.flatListContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  buscaContainer: { padding: 10, margin: 10, borderRadius: 12, borderWidth: 0 },
  buscaInput: {
    height: 48,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  flatList: { flex: 1, paddingHorizontal: 15 },
  flatListContent: { paddingTop: 10, paddingBottom: 20 },
  card: { borderRadius: 12, marginBottom: 15, overflow: "hidden" },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 2,
  },
  checkboxText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
  infoContainer: { flex: 1, marginRight: 10 },
  tituloRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 2,
  },
  cardTitulo: { fontSize: 17, fontWeight: "bold" },
  hojeBadge: {
    fontSize: 11,
    fontWeight: "bold",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  cardDescricao: { fontSize: 14, opacity: 0.8, marginBottom: 4 },
  cardTag: { fontSize: 12, opacity: 0.6 },
  textoRiscado: { textDecorationLine: "line-through", opacity: 0.5 },
  tempoBadge: {
    fontSize: 13,
    fontWeight: "bold",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
  },
  dataText: { fontSize: 12, opacity: 0.7 },
  acoesContainer: { flexDirection: "row", gap: 6 },
});