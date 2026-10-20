import { useTranslation } from "react-i18next";
import { useState, useCallback, useEffect } from "react";
import { Alert, StyleSheet, ScrollView, Platform, KeyboardAvoidingView } from "react-native";
import { Text, View } from "../../components/Themed";
import ButtonTT from "../../components/Jhonatanrs/ButtonTT";
import { buscarTarefas, recriarTabelaTarefas } from "../../database/db";
import { formatarData } from "../../utils/formatacao";
import Colors from "../../constants/Colors";
import { useColorScheme } from "../../components/useColorScheme";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect, Stack } from "expo-router";
import { Tarefa } from "./index";

export default function TodoSummary() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [tempoTotalGeral, setTempoTotalGeral] = useState(0);
  const [tempoJaGasto, setTempoJaGasto] = useState(0);
  const [tempoFalta, setTempoFalta] = useState(0);

  const [resumoPorDia, setResumoPorDia] = useState<
    Record<string, { tempoPendente: number; concluidas: number; total: number }>
  >({});
  const [carregandoResumo, setCarregandoResumo] = useState(false);

  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [showDatePickerStart, setShowDatePickerStart] = useState(false);
  const [showDatePickerEnd, setShowDatePickerEnd] = useState(false);

  const calcularResumo = useCallback(async () => {
    setCarregandoResumo(true);
    try {
      const todas = (await buscarTarefas()) as Tarefa[];

      const startOfDay = startDate ? new Date(startDate) : undefined;
      if (startOfDay) startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = endDate ? new Date(endDate) : undefined;
      if (endOfDay) endOfDay.setHours(23, 59, 59, 999);

      let filtradas = todas;
      if (startOfDay || endOfDay) {
        filtradas = todas.filter((t) => {
          const [day, month, year] = t.data.split("/").map(Number);
          const itemDate = new Date(year, month - 1, day, 12, 0, 0);

          if (startOfDay && endOfDay)
            return itemDate >= startOfDay && itemDate <= endOfDay;
          if (startOfDay) return itemDate >= startOfDay;
          if (endOfDay) return itemDate <= endOfDay;
          return true;
        });
      }

      let acumuladoGeral = 0;
      let gasto = 0;
      let falta = 0;

      filtradas.forEach((t) => {
        const tempo = t.tempoMinutos || 0;
        acumuladoGeral += tempo;
        if (t.concluida) {
          gasto += tempo;
        } else {
          falta += tempo;
        }
      });

      setTempoTotalGeral(acumuladoGeral);
      setTempoJaGasto(gasto);
      setTempoFalta(falta);

      const agrupado: Record<
        string,
        { tempoPendente: number; concluidas: number; total: number }
      > = {};

      filtradas.forEach((item) => {
        if (!agrupado[item.data]) {
          agrupado[item.data] = { tempoPendente: 0, concluidas: 0, total: 0 };
        }
        agrupado[item.data].total += 1;
        if (item.concluida) {
          agrupado[item.data].concluidas += 1;
        } else {
          agrupado[item.data].tempoPendente += item.tempoMinutos || 0;
        }
      });

      setResumoPorDia(agrupado);
    } catch (error) {
      console.error("Erro ao gerar resumo:", error);
    } finally {
      setCarregandoResumo(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    calcularResumo();
  }, [calcularResumo]);

  useFocusEffect(
    useCallback(() => {
      calcularResumo();
    }, [calcularResumo]),
  );

  function limparFiltro() {
    setStartDate(undefined);
    setEndDate(undefined);
  }

  async function limparBanco() {
    Alert.alert(
      t("return.confirm_delete") || "Limpar Dados",
      t("return.confirm_delete_desc") || "Deseja apagar todas as tarefas permanentemente?",
      [
        { text: t("button.cancel"), style: "cancel" },
        {
          text: t("button.clean"),
          style: "destructive",
          onPress: async () => {
            await recriarTabelaTarefas();
            calcularResumo();
          },
        },
      ],
    );
  }

  const formatarMinutos = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m} min`;
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background_primary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen
        options={{
          headerTitle: t("task.summary") || "Resumo",
        }}
      />

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.filterCard,
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
          <View style={styles.dateRow}>
            <Text style={[styles.label, { color: colors.text_primary }]}>
              {t("return.from")}:
            </Text>
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
              onValueChange={(e, d) => {
                setShowDatePickerStart(Platform.OS === "ios");
                if (d) setStartDate(d);
              }}
            />
          )}

          <View style={styles.dateRow}>
            <Text style={[styles.label, { color: colors.text_primary }]}>
              {t("return.to")}:
            </Text>
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
                setShowDatePickerEnd(Platform.OS === "ios");
                if (d) setEndDate(d);
              }}
            />
          )}

          <ButtonTT
            buttonStyle={{ marginTop: 10 }}
            title={t("button.clean") || "Limpar Filtro"}
            onPress={limparFiltro}
            color={colors.info}
          />
        </View>

        <View
          style={[
            styles.totalCard,
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
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.text_primary }]}>
              {t("summary.total_time") || "Tempo Total"}:
            </Text>
            <Text style={[styles.totalValor, { color: colors.text_primary }]}>
              {formatarMinutos(tempoTotalGeral)}
            </Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.text_primary }]}>
              {t("summary.realized_workload") || "Carga horária realizada"}:
            </Text>
            <Text style={[styles.totalValor, { color: colors.success }]}>
              {formatarMinutos(tempoJaGasto)}
            </Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.text_primary }]}>
              {t("summary.remaining_workload") || "Carga horária restante"}:
            </Text>
            <Text style={[styles.totalValor, { color: colors.warning || "#f0ad4e" }]}>
              {formatarMinutos(tempoFalta)}
            </Text>
          </View>
        </View>

        {carregandoResumo ? (
          <Text style={{ color: colors.text_primary, textAlign: "center", marginTop: 20 }}>
            {t("return.loading") || "Carregando dados..."}
          </Text>
        ) : (
          Object.entries(resumoPorDia).map(([data, info]) => (
            <View
              key={data}
              style={[
                styles.dayCard,
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
              <Text style={[styles.dayTitle, { color: colors.text_primary }]}>
                📅 {data}
              </Text>
              
              {info.tempoPendente > 0 ? (
                <Text style={[styles.dayDetail, { color: colors.text_primary }]}>
                  ⏱️ {t("summary.remaining_workload") || "Carga horária restante"}:{" "}
                  <Text style={{ fontWeight: "bold", color: colors.warning || "#f0ad4e" }}>
                    {formatarMinutos(info.tempoPendente)}
                  </Text>
                </Text>
              ) : null}

              <Text style={[styles.dayDetail, { color: colors.text_primary }]}>
                ✅ {t("summary.completed_tasks") || "Tarefas concluídas"}: {info.concluidas} / {info.total}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      <View style={[styles.footerContainer, { backgroundColor: colors.background_primary }]}>
        <ButtonTT
          title={t("button.clear_database")}
          onLongPress={limparBanco}
          color={colors.danger}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15 },
  scrollContainer: { flex: 1, marginBottom: 10 },
  scrollContent: { paddingBottom: 20 },
  separator: { height: 1, marginBottom: 10 },
  filterCard: { padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 15 },
  dateRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  label: { width: 50, fontSize: 15 },
  totalCard: { padding: 15, borderRadius: 10, borderWidth: 1, marginBottom: 15, gap: 8 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 15, fontWeight: "bold" },
  totalValor: { fontSize: 16, fontWeight: "bold" },
  dayCard: { padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
  dayTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 5 },
  dayDetail: { fontSize: 14, marginTop: 2 },
  footerContainer: { paddingBottom: Platform.OS === 'ios' ? 15 : 5 },
});