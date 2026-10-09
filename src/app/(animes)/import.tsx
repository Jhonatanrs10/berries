import { useTranslation } from "react-i18next";
import { useState, useEffect, useCallback } from "react"; // Importar useEffect e useCallback
import ButtonTT from "../../components/Jhonatanrs/ButtonTT";
import LinkModalButton from "../../components/Jhonatanrs/LinkModalButton";
import {
  Button,
  Alert,
  StyleSheet,
  Share,
  Platform,
  ActivityIndicator,
} from "react-native"; // Adicionado ActivityIndicator
import { Text, View } from "../../components/Themed";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import {
  salvarAnime,
  buscarAnimes,
  recriarTabelaAnimes,
} from "../../database/db";
import Colors from "../../constants/Colors";
import { useColorScheme } from "../../components/useColorScheme";
import { useFocusEffect } from "expo-router"; // Para recarregar dados ao focar na tela

type StatusAnime = "watching" | "completed" | "plan_to_watch";
type ReleaseDay =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

interface Anime {
  id: number;
  nome: string;
  status: StatusAnime;
  release_day: ReleaseDay;
  observacao: string | null;
  link: string | null;
  seasons: string | null; // Guardado como string ex: "[25,12,10]"
}

export default function Import() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const [importando, setImportando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [animesCarregados, setAnimesCarregados] = useState<Anime[]>([]); // Estado para armazenar todos os animes
  const [carregandoDados, setCarregandoDados] = useState(true); // Estado para o spinner de carregamento

  // --- Cálculos das Estatísticas ---
  const totalAnimes = animesCarregados.length;
  const animes_watching = animesCarregados.filter(
    (anime) => anime.status === "watching",
  ).length;
  const animes_completed = animesCarregados.filter(
    (anime) => anime.status === "completed",
  ).length;
  const animes_plan_to_watch = animesCarregados.filter(
    (anime) => anime.status === "plan_to_watch",
  ).length;

  const calcularTotalHoras = useCallback(() => {
    let totalEpisodios = 0;
    animesCarregados.forEach((anime) => {
      if (anime.seasons) {
        try {
          const seasonsArray: number[] = JSON.parse(anime.seasons);
          totalEpisodios += seasonsArray.reduce((sum, num) => sum + num, 0);
        } catch (e) {
          console.warn(
            `Erro ao parsear seasons para ${anime.nome}:`,
            anime.seasons,
            e,
          );
        }
      }
    });

    const minutosPorEpisodio = 20; // 20 minutos por episódio
    const totalMinutos = totalEpisodios * minutosPorEpisodio;
    const totalHoras = Math.floor(totalMinutos / 60);
    const minutosRestantes = totalMinutos % 60;

    return `${totalHoras}h ${minutosRestantes}min`;
  }, [animesCarregados]); // Recalcula quando animesCarregados muda

  // --- Carregar Animes ao Focar na Tela ---
  const carregarDadosAnimes = useCallback(async () => {
    setCarregandoDados(true);
    try {
      const animes = (await buscarAnimes()) as Anime[];
      setAnimesCarregados(animes);
    } catch (error) {
      console.error("Error loading anime for statistics:", error);
      Alert.alert(t("return.error"), t("return.error_anime_stats"));
    } finally {
      setCarregandoDados(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregarDadosAnimes();
    }, [carregarDadosAnimes]),
  );

  // --- Exportar Animes ---
  async function exportarAnimes() {
    try {
      setExportando(true);
      // Usar animesCarregados para evitar nova busca no DB
      const animes = animesCarregados;

      animes.sort((a, b) => a.id - b.id);

      //const cabecalho = 'Nome;Status;Lançamento;Observação;Link;Temporadas\n';
      const cabecalho = "Name;Status;Release;Obs;Link;Seasons\n";

      const linhas = animes.map((a) => {
        const escapeAndQuote = (value: string | number | null): string => {
          if (value === null || value === undefined) return "";
          const str = String(value);
          if (
            str.includes(";") ||
            str.includes('"') ||
            str.includes("\n") ||
            str.startsWith(" ") ||
            str.endsWith(" ")
          ) {
            const escapedStr = str.replace(/"/g, '""');
            return `"${escapedStr}"`;
          }
          return str;
        };

        return `${escapeAndQuote(a.nome)};${escapeAndQuote(a.status)};${escapeAndQuote(a.release_day)};${escapeAndQuote(a.observacao)};${escapeAndQuote(a.link)};${escapeAndQuote(a.seasons)}`;
      });

      const conteudo = cabecalho + linhas.join("\n");
      const dataAtual = new Date()
        .toLocaleDateString("pt-BR")
        .replace(/\//g, "-");
      const nomeArquivo = `animes_${dataAtual}.txt`;

      const fileUri = FileSystem.cacheDirectory + nomeArquivo;

      await FileSystem.writeAsStringAsync(fileUri, conteudo, {
        encoding: "utf8",
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(t("return.error"), t("return.error_share"));
        return;
      }

      await Sharing.shareAsync(fileUri, {
        UTI: "public.plain-text",
        mimeType: "text/plain",
        dialogTitle: "Salvar Animes",
      });

      //Alert.alert(t('return.success'), t('return.success_export_anime'));
    } catch (error: unknown) {
      console.error("Error exporting anime:", error);
      let errorMessage = t("return.error_export_anime");
      if (error instanceof Error) {
        errorMessage = `It was not possible to export the anime: ${error.message}`;
      }
      Alert.alert(t("return.error"), errorMessage);
    } finally {
      setExportando(false);
    }
  }

  // --- Importar Animes ---
  async function importarAnimes() {
    try {
      setImportando(true);

      const resultado = await DocumentPicker.getDocumentAsync({
        type: "text/plain",
        copyToCacheDirectory: true,
      });

      if (resultado.canceled) {
        return;
      }

      const arquivo = resultado.assets[0];
      const conteudo = await FileSystem.readAsStringAsync(arquivo.uri);
      const linhas = conteudo.split("\n");

      if (linhas.length === 0) {
        Alert.alert(t("return.error"), t("return.import_empty"));
        return;
      }

      const cabecalhoLinha = linhas[0].trim();
      const cabecalho = cabecalhoLinha.split(";").map((h) => h.trim());

      const camposEsperados = [
        "Name",
        "Status",
        "Release",
        "Obs",
        "Link",
        "Seasons",
      ];
      const camposValidos = camposEsperados.every((campo) =>
        cabecalho.includes(campo),
      );

      if (!camposValidos) {
        Alert.alert(t("return.error"), t("return.error_import_format_anime"));
        return;
      }

      let importadas = 0;
      let erros = 0;
      const linhasComErro: string[] = [];

      function parseCsvLine(line: string): string[] {
        const result: string[] = [];
        let inQuote = false;
        let currentField = "";

        for (let i = 0; i < line.length; i++) {
          const char = line[i];

          if (char === '"') {
            if (!inQuote) {
              inQuote = true;
            } else {
              if (i + 1 < line.length && line[i + 1] === '"') {
                currentField += '"';
                i++;
              } else {
                inQuote = false;
              }
            }
          } else if (char === ";" && !inQuote) {
            result.push(currentField);
            currentField = "";
          } else {
            currentField += char;
          }
        }
        result.push(currentField);
        return result.map((field) => field.trim());
      }

      for (let i = 1; i < linhas.length; i++) {
        if (!linhas[i].trim()) continue;

        const valores = parseCsvLine(linhas[i]);

        const indices = camposEsperados.map((campo) =>
          cabecalho.indexOf(campo),
        );
        const todosIndicesValidos = indices.every(
          (index) => index !== -1 && index < valores.length,
        );

        if (!todosIndicesValidos) {
          console.log(
            "Line skipped - essential fields missing or incorrect number of columns:",
            linhas[i],
          );
          let detail =
            "Essential fields are missing or the number of columns is incorrect.";
          linhasComErro.push(
            `Line ${i + 1}: "${linhas[i].substring(0, Math.min(linhas[i].length, 50))}..." - ${detail}`,
          );
          erros++;
          continue;
        }

        try {
          const rawStatus = valores[cabecalho.indexOf("Status")]?.toLowerCase();
          const statusValues: StatusAnime[] = [
            "watching",
            "completed",
            "plan_to_watch",
          ];
          if (!statusValues.includes(rawStatus as StatusAnime)) {
            throw new Error(`Invalid status: "${rawStatus}"`);
          }
          const status: StatusAnime = rawStatus as StatusAnime;

          const rawReleaseDay =
            valores[cabecalho.indexOf("Release")]?.toLowerCase();
          const releaseDayValues: ReleaseDay[] = [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
          ];
          if (!releaseDayValues.includes(rawReleaseDay as ReleaseDay)) {
            throw new Error(`Invalid release date: "${rawReleaseDay}"`);
          }
          const release_day: ReleaseDay = rawReleaseDay as ReleaseDay;

          const nome = valores[cabecalho.indexOf("Name")];
          if (!nome) throw new Error("The anime title cannot be empty.");

          const observacao = valores[cabecalho.indexOf("Obs")] || null;
          const link = valores[cabecalho.indexOf("Link")] || null;
          const seasons = valores[cabecalho.indexOf("Seasons")] || null;

          const dadosAnime: Omit<Anime, "id"> = {
            nome: nome,
            status: status,
            release_day: release_day,
            observacao: observacao,
            link: link,
            seasons: seasons,
          };

          await salvarAnime(dadosAnime);
          importadas++;
        } catch (error: unknown) {
          console.error("Error importing anime: ", error, "Line:", linhas[i]);
          let detail = "";
          if (error instanceof Error) {
            detail = `: ${error.message}`;
          } else if (typeof error === "string") {
            detail = `: ${error}`;
          }
          linhasComErro.push(
            `Line ${i + 1}: "${linhas[i].substring(0, Math.min(linhas[i].length, 50))}..." - Erro${detail}`,
          );
          erros++;
        }
      }

      let mensagemFinal = `${t("return.imported")}: ${importadas}\n${t("return.failed")}: ${erros}`;
      if (erros > 0) {
        mensagemFinal += "\n\nError details (first 5):";
        linhasComErro
          .slice(0, 5)
          .forEach((msg) => (mensagemFinal += `\n- ${msg}`));
        if (erros > 5) {
          mensagemFinal +=
            "\n... and more errors. Check the console for full details.";
        }
      }

      Alert.alert(
        t("return.import_completed"),
        mensagemFinal,
        // Ao fechar o alerta, recarregar os dados para atualizar as estatísticas
        [{ text: "OK", onPress: carregarDadosAnimes }],
      );
    } catch (error: unknown) {
      console.error("Common error when importing anime:", error);
      let errorMessage = t("return.error_import_format_anime");
      if (error instanceof Error) {
        errorMessage += `\nDetails: ${error.message}`;
      }
      Alert.alert(t("return.error"), errorMessage);
    } finally {
      setImportando(false);
    }
  }

  async function importarDadosTesteAnimes() {
    try {
      setImportando(true);
      let importadas = 0;
      let erros = 0;

      const dadosTeste: Omit<Anime, "id">[] = [
        {
          nome: "Attack on Titan",
          status: "completed",
          release_day: "sunday",
          observacao: "Anime incrível, reviravoltas chocantes.",
          link: "https://myanimelist.net/anime/16498/Shingeki_no_Kyojin",
          seasons: "[25,12,10,16,12]",
        },
        {
          nome: "Jujutsu Kaisen",
          status: "watching",
          release_day: "thursday",
          observacao: "Animação fantástica e lutas intensas.",
          link: "https://myanimelist.net/anime/40748/Jujutsu_Kaisen",
          seasons: "[24,23]",
        },
        {
          nome: "Spy x Family",
          status: "watching",
          release_day: "saturday",
          observacao: "Muito divertido e com personagens carismáticos.",
          link: "https://myanimelist.net/anime/50265/Spy_x_Family",
          seasons: "[25,13]",
        },
        {
          nome: "Frieren: Beyond Journey's End",
          status: "plan_to_watch", // Alterado para teste
          release_day: "friday",
          observacao: "Uma jornada emocionante e reflexiva. Linda animação.",
          link: "https://myanimelist.net/anime/52991/Sousou_no_Frieren",
          seasons: "[28]",
        },
        {
          nome: "Solo Leveling",
          status: "plan_to_watch", // Alterado para teste
          release_day: "saturday",
          observacao: "Adaptação do webtoon, muito hype!",
          link: "https://myanimelist.net/anime/55026/Solo_Leveling",
          seasons: "[12]",
        },
        {
          nome: "Chainsaw Man",
          status: "completed",
          release_day: "tuesday",
          observacao: "Violento e único, estilo de arte marcante.",
          link: "https://myanimelist.net/anime/49378/Chainsaw_Man",
          seasons: "[12]",
        },
      ];

      for (const anime of dadosTeste) {
        try {
          await salvarAnime(anime);
          importadas++;
        } catch (error: unknown) {
          console.error("Erro ao importar anime de teste:", error);
          let errorMessage = "Erro ao importar anime de teste.";
          if (error instanceof Error) {
            errorMessage += `\nDetalhes: ${error.message}`;
          }
          erros++;
        }
      }

      Alert.alert(
        t("return.import_test"),
        `${t("return.imported")}: ${importadas}\n${t("return.failed")}: ${erros}`,
        // Ao fechar o alerta, recarregar os dados para atualizar as estatísticas
        [{ text: "OK", onPress: carregarDadosAnimes }],
      );
    } catch (error: unknown) {
      console.error("Error importing anime test data:", error);
      let errorMessage = "We were unable to import the anime test data.";
      if (error instanceof Error) {
        errorMessage += `\nDetalhes: ${error.message}`;
      }
      Alert.alert(t("return.error"), errorMessage);
    } finally {
      setImportando(false);
    }
  }

  async function limparBancoDadosAnimes() {
    Alert.alert(
      t("return.clear_database"),
      t("return.clear_anime_database_sure"),
      [
        { text: t("button.cancel"), style: "cancel" },
        {
          text: t("button.clean"),
          style: "destructive",
          onPress: async () => {
            try {
              setImportando(true);
              const sucesso = await recriarTabelaAnimes();
              if (sucesso) {
                Alert.alert(
                  t("return.success"),
                  t("return.cleaned_anime_database"),
                  // Recarregar dados após limpar o DB
                  [{ text: "OK", onPress: carregarDadosAnimes }],
                );
              } else {
                Alert.alert(t("return.error"), t("return.clear_error"));
              }
            } catch (error: unknown) {
              console.error("Error clearing anime database:", error);
              let errorMessage = t("return.clear_error");
              if (error instanceof Error) {
                errorMessage += `\nDetails: ${error.message}`;
              }
              Alert.alert(t("return.error"), errorMessage);
            } finally {
              setImportando(false);
            }
          },
        },
      ],
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background_primary }]}
    >
      <View style={styles.header}>
        <ButtonTT
          buttonStyle={{ marginVertical: 5 }}
          title={t("button.import") + " CSV"}
          onPress={importarAnimes}
          disabled={importando}
          color={colors.info}
        />
        <View style={styles.spacer} />
        <ButtonTT
          buttonStyle={{ marginVertical: 5 }}
          title={t("button.export") + " CSV"}
          onPress={exportarAnimes}
          disabled={exportando}
          color={colors.warning}
        />

        <LinkModalButton
          title={t("linkModal.button01")}
          storageKey="@link_ia_guide"
        />

        <View
          style={[
            styles.statsContainer,
            {
              backgroundColor: colors.background_secondary,
              borderColor: colors.border,
            },
          ]}
        >
          {carregandoDados ? (
            <ActivityIndicator size="large" color={colors.button_primary} />
          ) : (
            <>
              <View
                style={[
                  styles.statItem,
                  { backgroundColor: colors.background_secondary },
                ]}
              >
                <Text
                  style={[styles.statLabel, { color: colors.text_primary }]}
                >
                  {t("stats.total_animes")}:
                </Text>
                <Text
                  style={[styles.statValue, { color: colors.text_primary }]}
                >
                  {totalAnimes}
                </Text>
              </View>
              <View
                style={[
                  styles.statItem,
                  { backgroundColor: colors.background_secondary },
                ]}
              >
                <Text
                  style={[styles.statLabel, { color: colors.text_primary }]}
                >
                  {t("stats.watching")}:
                </Text>
                <Text style={[styles.statValue, { color: colors.info }]}>
                  {animes_watching}
                </Text>
              </View>
              <View
                style={[
                  styles.statItem,
                  { backgroundColor: colors.background_secondary },
                ]}
              >
                <Text
                  style={[styles.statLabel, { color: colors.text_primary }]}
                >
                  {t("stats.completed")}:
                </Text>
                <Text style={[styles.statValue, { color: colors.success }]}>
                  {animes_completed}
                </Text>
              </View>
              <View
                style={[
                  styles.statItem,
                  { backgroundColor: colors.background_secondary },
                ]}
              >
                <Text
                  style={[styles.statLabel, { color: colors.text_primary }]}
                >
                  {t("stats.plan_to_watch")}:
                </Text>
                <Text style={[styles.statValue, { color: colors.danger }]}>
                  {animes_plan_to_watch}
                </Text>
              </View>
              <View
                style={[
                  styles.statItem,
                  { backgroundColor: colors.background_secondary },
                ]}
              >
                <Text
                  style={[styles.statLabel, { color: colors.text_primary }]}
                >
                  {t("stats.total_hours")}:
                </Text>
                <Text
                  style={[styles.statValue, { color: colors.text_primary }]}
                >
                  {calcularTotalHoras()}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>
      {__DEV__ && (
        <ButtonTT
          title={t("button.import_test")}
          displayButton={true}
          buttonStyle={{ marginVertical: 5 }}
          onLongPress={importarDadosTesteAnimes}
          disabled={importando}
          color={colors.info}
        />
      )}

      <View style={styles.spacer} />
      <ButtonTT
        buttonStyle={{ marginVertical: 5, marginBottom: '0%' }}
        title={t("button.clear_database")}
        onLongPress={limparBancoDadosAnimes}
        disabled={importando}
        color={colors.danger}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 10,
  },
  separator: {
    height: 1,
    marginVertical: 20,
  },
  // --- Novos estilos para as estatísticas ---
  statsContainer: {
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 16,
    fontWeight: "bold",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  // --- Fim dos novos estilos ---
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 20,
  },
  spacer: {
    width: 10,
  },
  bottomSpacer: {
    height: 50,
  },
  header: {
    flex: 1, // Empurra o footer para o fundo
  },
});
