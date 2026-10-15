import { useTranslation } from "react-i18next";
import { useState, useCallback } from "react";
import { Alert, StyleSheet, ScrollView, Platform } from "react-native";
import { Text, View } from "../../components/Themed";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import ButtonTT from "../../components/Jhonatanrs/ButtonTT";
import { buscarTarefas, recriarTabelaTarefas } from "../../database/db";
import { formatarData } from "../../utils/formatacao";
import Colors from "../../constants/Colors";
import { useColorScheme } from "../../components/useColorScheme";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "expo-router";
import { Tarefa } from "./index";

export default function TodoSummary() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [exportando, setExportando] = useState(false);
  const [tempoTotalGeral, setTempoTotalGeral] = useState(0);
  const [resumoPorDia, setResumoPorDia] = useState<Record<string, { totalMinutos: number; concluidas: number; total: number }>>({});
  const [carregandoResumo, setCarregandoResumo] = useState(false);

  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [showDatePickerStart, setShowDatePickerStart] = useState(false);
  const [showDatePickerEnd, setShowDatePickerEnd] = useState(false);

  const calcularResumo = useCallback(async () => {
    setCarregandoResumo(true);
    try {
      const todas = (await buscarTarefas()) as Tarefa[];

      let acumuladoGeral = 0;
      todas.forEach(t => acumuladoGeral += (t.tempoMinutos || 0));
      setTempoTotalGeral(acumuladoGeral);

      // Filtro por data se aplicado
      const startOfDay = startDate ? new Date(startDate) : undefined;
      if (startOfDay) startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = endDate ? new Date(endDate) : undefined;
      if (endOfDay) endOfDay.setHours(23, 59, 59, 999);

      let filtradas = todas;
      if (startOfDay || endOfDay) {
        filtradas = todas.filter((t) => {
          const [day, month, year] = t.data.split("/").map(Number);
          const itemDate = new Date(year, month - 1, day, 12, 0, 0);

          if (startOfDay && endOfDay) return itemDate >= startOfDay && itemDate <= endOfDay;
          if (startOfDay) return itemDate >= startOfDay;
          if (endOfDay) return itemDate <= endOfDay;
          return true;
        });
      }

      const agrupado: Record<string, { totalMinutos: number; concluidas: number; total: number }> = {};

      filtradas.forEach((item) => {
        if (!agrupado[item.data]) {
          agrupado[item.data] = { totalMinutos: 0, concluidas: 0, total: 0 };
        }
        agrupado[item.data].totalMinutos += (item.tempoMinutos || 0);
        agrupado[item.data].total += 1;
        if (item.concluida) agrupado[item.data].concluidas += 1;
      });

      setResumoPorDia(agrupado);
    } catch (error) {
      console.error("Erro ao gerar resumo:", error);
    } finally {
      setCarregandoResumo(false);
    }
  }, [startDate, endDate]);

  useFocusEffect(
    useCallback(() => {
      calcularResumo();
    }, [calcularResumo])
  );

  async function exportarCSV() {
    try {
      setExportando(true);
      const tarefas = (await buscarTarefas()) as Tarefa[];
      const cabecalho = "Title;Description;Category;Minutes;Completed;Date\n";
      const linhas = tarefas.map((t) =>
        `"${t.titulo}";"${t.descricao}";"${t.categoria}";${t.tempoMinutos};${t.concluida ? 'SIM' : 'NAO'};${t.data}`
      );

      const fileUri = FileSystem.cacheDirectory + "todo_tasks.csv";
      await FileSystem.writeAsStringAsync(fileUri, cabecalho + linhas.join("\n"), {
        encoding: FileSystem.EncodingType.UTF8,
      });

      await Sharing.shareAsync(fileUri);
    } catch (error) {
      Alert.alert(t("return.error"), "Erro ao exportar tarefas.");
    } finally {
      setExportando(false);
    }
  }

  async function limparBanco() {
    Alert.alert(
      "Limpar Dados",
      "Deseja apagar todas as tarefas permanentemente?",
      [
        { text: t("button.cancel"), style: "cancel" },
        {
          text: t("button.clean"),
          style: "destructive",
          onPress: async () => {
            await recriarTabelaTarefas();
            calcularResumo();
          }
        }
      ]
    );
  }

  const formatarMinutos = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m} min`;
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background_primary }]}>
      <ButtonTT
        buttonStyle={{ marginVertical: 8 }}
        title="Exportar Tarefas (CSV)"
        onPress={exportarCSV}
        disabled={exportando}
        color={colors.warning}
      />

      <View style={[styles.filterCard, { backgroundColor: colors.background_secondary, borderColor: colors.border }]}>
        <View style={styles.dateRow}>
          <Text style={[styles.label, { color: colors.text_primary }]}>{t("return.from")}:</Text>
          <ButtonTT
            title={startDate ? formatarData(startDate) : t("return.date_start")}
            onPress={() => setShowDatePickerStart(true)}
            color={colors.button_primary}
            buttonStyle={{ flex: 1 }}
          />
        </View>
        {showDatePickerStart && (
          <DateTimePicker
            value={startDate || new Date()}
            mode="date"
            display="default"
            onChange={(e, d) => {
              setShowDatePickerStart(Platform.OS === 'ios');
              setStartDate(d || undefined);
            }}
          />
        )}

        <View style={styles.dateRow}>
          <Text style={[styles.label, { color: colors.text_primary }]}>{t("return.to")}:</Text>
          <ButtonTT
            title={endDate ? formatarData(endDate) : t("return.date_end")}
            onPress={() => setShowDatePickerEnd(true)}
            color={colors.button_primary}
            buttonStyle={{ flex: 1 }}
          />
        </View>
        {showDatePickerEnd && (
          <DateTimePicker
            value={endDate || new Date()}
            mode="date"
            display="default"
            onValueChange={(e, d) => {
              setShowDatePickerEnd(Platform.OS === 'ios');
              setEndDate(d || undefined);
            }}
          />
        )}

        <ButtonTT
          buttonStyle={{ marginTop: 10 }}
          title="Filtrar"
          onPress={calcularResumo}
          color={colors.info}
        />
      </View>

      <View style={[styles.totalCard, { backgroundColor: colors.background_secondary, borderColor: colors.border }]}>
        <Text style={[styles.totalLabel, { color: colors.text_primary }]}>Tempo Acumulado Total:</Text>
        <Text style={[styles.totalValor, { color: colors.success }]}>
          {formatarMinutos(tempoTotalGeral)}
        </Text>
      </View>

      {carregandoResumo ? (
        <Text style={{ color: colors.text_primary, textAlign: 'center' }}>Carregando dados...</Text>
      ) : (
        Object.entries(resumoPorDia).map(([data, info]) => (
          <View key={data} style={[styles.dayCard, { backgroundColor: colors.background_secondary, borderColor: colors.border }]}>
            <Text style={[styles.dayTitle, { color: colors.text_primary }]}>📅 {data}</Text>
            <Text style={[styles.dayDetail, { color: colors.text_primary }]}>
              ⏱️ Tempo gasto do dia: <Text style={{ fontWeight: 'bold', color: colors.success }}>{formatarMinutos(info.totalMinutos)}</Text>
            </Text>
            <Text style={[styles.dayDetail, { color: colors.text_primary }]}>
              ✅ Tarefas concluídas: {info.concluidas} / {info.total}
            </Text>
          </View>
        ))
      )}

      <ButtonTT
        buttonStyle={{ marginVertical: 20, marginBottom: '12%' }}
        title={t("button.clear_database")}
        onPress={limparBanco}
        color={colors.danger}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15 },
  filterCard: { padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 15 },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  label: { width: 50, fontSize: 15 },
  totalCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderRadius: 10, borderWidth: 1, marginBottom: 15 },
  totalLabel: { fontSize: 16, fontWeight: 'bold' },
  totalValor: { fontSize: 18, fontWeight: 'bold' },
  dayCard: { padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
  dayTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  dayDetail: { fontSize: 14, marginTop: 2 },
});