import { useTranslation } from "react-i18next";
import { useState, useCallback } from "react";
import { Alert, StyleSheet, ScrollView, Platform } from "react-native";
import { Text, View } from "../../components/Themed";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy"; // Corrected import
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import ButtonTT from "../../components/Jhonatanrs/ButtonTT";
import {
  buscarTransacoes,
  salvarTransacao,
  recriarTabela,
} from "../../database/db";
import { formatarData } from "../../utils/formatacao";
import Colors from "../../constants/Colors";
import { useColorScheme } from "../../components/useColorScheme";
import DateTimePicker from "@react-native-community/datetimepicker"; // Import for date picker
import { useFocusEffect } from "expo-router";

type TipoTransacao =
  | "PIX"
  | "Dinheiro"
  | "Boleto"
  | "Débito"
  | "Crédito"
  | "TED"
  | "DOC"
  | "Distinto";
type Acao = "entrada" | "saida";

type Transacao = {
  id: number;
  descricao: string;
  caixa: string;
  categoria: string;
  quantidade: number;
  valor: number; // Valor unitário em centavos
  tipo_transacao: TipoTransacao;
  acao: Acao;
  data: string;
};

// Interface para o resumo por Categoria dentro de um Mês (e Caixa)
interface CategoriaResumoDetalhe {
  totalEntradasCategoria: number;
  totalSaidasCategoria: number;
}

// Interface para o resumo por Mês dentro de uma Caixa
interface MesResumoDetalhe {
  totalEntradasMes: number; // Total geral de entradas para este mês nesta caixa
  totalSaidasMes: number; // Total geral de saídas para este mês nesta caixa
  categorias: Record<string, CategoriaResumoDetalhe>; // Detalhes por categoria dentro deste mês
}

// Interface atualizada para o resumo por Caixa, incluindo o detalhe por Mês
interface CaixaResumo {
  totalEntradasCaixa: number; // Total acumulado de entradas no Caixa (geral)
  totalSaidasCaixa: number; // Total acumulado de saídas no Caixa (geral)
  meses: Record<string, MesResumoDetalhe>; // Detalhes por mês dentro desta caixa
}

export default function Import() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const [importando, setImportando] = useState(false);
  const [exportando, setExportando] = useState(false);
  // Estado para armazenar o resumo por Caixa, que agora contém detalhes por mês e categoria
  const [resumoPorCaixa, setResumoPorCaixa] = useState<
    Record<string, CaixaResumo>
  >({});
  const [carregandoResumo, setCarregandoResumo] = useState(false);
  const [valorAtual, setValorAtual] = useState(0); // Saldo geral em reais (após divisão por 100)

  // New state variables for date filtering
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [showDatePickerStart, setShowDatePickerStart] = useState(false);
  const [showDatePickerEnd, setShowDatePickerEnd] = useState(false);

  // State to control if filters are applied, showing more details in the summary section
  const [filtersApplied, setFiltersApplied] = useState(false);

  async function limparFiltro() {
    setFiltersApplied(true);
    setStartDate(undefined);
    setEndDate(undefined);
  }

  // --- Função para calcular o valor atual total (sempre com todas as transações) ---
  const calcularValorAtualTotal = useCallback(async () => {
    try {
      const allTransacoes = (await buscarTransacoes()) as Transacao[];
      let totalEntradasGeral = 0;
      let totalSaidasGeral = 0;

      allTransacoes.forEach((t) => {
        const valorTotalTransacao = t.valor * t.quantidade;
        if (t.acao === "saida") {
          totalSaidasGeral += valorTotalTransacao;
        } else if (t.acao === "entrada") {
          totalEntradasGeral += valorTotalTransacao;
        }
      });
      setValorAtual((totalEntradasGeral - totalSaidasGeral) / 100);
    } catch (error) {
      console.error("Error calculating total present value:", error);
      Alert.alert(t("return.error"), t("return.error_calc_value"));
    }
  }, [t]);

  // Effect to calculate total value on initial load and whenever data changes
  useFocusEffect(
    useCallback(() => {
      calcularValorAtualTotal();
    }, [calcularValorAtualTotal]),
  );

  // --- Função para calcular o resumo por Caixa, Mês e Categoria (com filtro) ---
  const calcularResumoDados = useCallback(async () => {
    setCarregandoResumo(true);
    try {
      const allTransacoes = (await buscarTransacoes()) as Transacao[];
      let transacoes = allTransacoes;

      // Determine if any date filter is applied for the *detailed summary*
      const isDateFilterActive =
        startDate !== undefined || endDate !== undefined;
      setFiltersApplied(isDateFilterActive); // Update the filter status for rendering

      // Normaliza as datas de início e fim zerando horas / ajustando limites
      const startOfDay = startDate ? new Date(startDate) : undefined;
      if (startOfDay) {
        startOfDay.setHours(0, 0, 0, 0);
      }

      const endOfDay = endDate ? new Date(endDate) : undefined;
      if (endOfDay) {
        endOfDay.setHours(23, 59, 59, 999);
      }

      // Aplica a filtragem por data nas transações
      if (startOfDay || endOfDay) {
        transacoes = allTransacoes.filter((t) => {
          const [day, month, year] = t.data.split("/").map(Number);
          // Usamos meio-dia (12:00) para evitar variações por fuso horário/horário de verão
          const transactionDate = new Date(year, month - 1, day, 12, 0, 0);

          if (startOfDay && endOfDay) {
            return transactionDate >= startOfDay && transactionDate <= endOfDay;
          } else if (startOfDay) {
            return transactionDate >= startOfDay;
          } else if (endOfDay) {
            return transactionDate <= endOfDay;
          }
          return true;
        });
      }

      const resumoCaixas: Record<string, CaixaResumo> = {};

      transacoes.forEach((t) => {
        const valorTotalTransacao = t.valor * t.quantidade;

        const dataPartes = t.data.split("/");
        const mesAnoChave = `${dataPartes[1]}/${dataPartes[2]}`; // MM/AAAA

        if (!resumoCaixas[t.caixa]) {
          resumoCaixas[t.caixa] = {
            totalEntradasCaixa: 0,
            totalSaidasCaixa: 0,
            meses: {},
          };
        }

        // Always accumulate totals for the specific box (general box total)
        if (t.acao === "saida") {
          resumoCaixas[t.caixa].totalSaidasCaixa += valorTotalTransacao;
        } else if (t.acao === "entrada") {
          resumoCaixas[t.caixa].totalEntradasCaixa += valorTotalTransacao;
        }

        // 2. Inicializa o mês dentro do Caixa se ele não existir
        if (!resumoCaixas[t.caixa].meses[mesAnoChave]) {
          resumoCaixas[t.caixa].meses[mesAnoChave] = {
            totalEntradasMes: 0,
            totalSaidasMes: 0,
            categorias: {},
          };
        }

        // Acumula os totais para o mês específico dentro do Caixa
        if (t.acao === "saida") {
          resumoCaixas[t.caixa].meses[mesAnoChave].totalSaidasMes +=
            valorTotalTransacao;
        } else if (t.acao === "entrada") {
          resumoCaixas[t.caixa].meses[mesAnoChave].totalEntradasMes +=
            valorTotalTransacao;
        }

        // 3. Inicializa a categoria dentro do mês e do Caixa se ela não existir
        if (!resumoCaixas[t.caixa].meses[mesAnoChave].categorias[t.categoria]) {
          resumoCaixas[t.caixa].meses[mesAnoChave].categorias[t.categoria] = {
            totalEntradasCategoria: 0,
            totalSaidasCategoria: 0,
          };
        }

        // Acumula os totais para a categoria específica dentro do mês e do Caixa
        if (t.acao === "saida") {
          resumoCaixas[t.caixa].meses[mesAnoChave].categorias[
            t.categoria
          ].totalSaidasCategoria += valorTotalTransacao;
        } else if (t.acao === "entrada") {
          resumoCaixas[t.caixa].meses[mesAnoChave].categorias[
            t.categoria
          ].totalEntradasCategoria += valorTotalTransacao;
        }
      });
      setResumoPorCaixa(resumoCaixas);
    } catch (error) {
      console.error("Error calculating summary:", error);
      Alert.alert(t("return.error"), t("return.error_calc_resume"));
    } finally {
      setCarregandoResumo(false);
    }
  }, [startDate, endDate, t]);

  useFocusEffect(
    useCallback(() => {
      calcularResumoDados();
    }, [calcularResumoDados]),
  );

  // --- Exportar Transações (CSV) ---
  async function exportarTransacoes() {
    try {
      setExportando(true);
      const transacoes = (await buscarTransacoes()) as Transacao[];

      transacoes.sort((a, b) => a.id - b.id);

      const cabecalho =
        "Description;Wallet;Category;Quantity;Value;Type;Action;Date\n";

      const linhas = transacoes.map((t) => {
        const escapeAndQuote = (text: string | number | null) => {
          if (text === null || text === undefined) return "";
          const str = String(text);
          const displayValue =
            typeof text === "number" && ["valor"].includes("valor")
              ? text
              : str;

          if (
            String(displayValue).includes(";") ||
            String(displayValue).includes('"') ||
            String(displayValue).includes("\n")
          ) {
            return `"${String(displayValue).replace(/"/g, '""')}"`;
          }
          return String(displayValue);
        };

        return `${escapeAndQuote(t.descricao)};${escapeAndQuote(t.caixa)};${escapeAndQuote(t.categoria)};${escapeAndQuote(t.quantidade)};${escapeAndQuote(t.valor)};${escapeAndQuote(t.tipo_transacao)};${escapeAndQuote(t.acao)};${escapeAndQuote(t.data)}`;
      });

      const conteudo = cabecalho + linhas.join("\n");
      const dataAtual = new Date()
        .toLocaleDateString("pt-BR")
        .replace(/\//g, "-");
      const nomeArquivo = `finance_${dataAtual}.txt`;

      const fileUri = FileSystem.cacheDirectory + nomeArquivo;
      await FileSystem.writeAsStringAsync(fileUri, conteudo, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(t("return.error"), t("return.error_share"));
        return;
      }

      await Sharing.shareAsync(fileUri, {
        UTI: "public.plain-text",
        mimeType: "text/plain",
        dialogTitle: "Save Transactions",
      });

      //Alert.alert(t('return.success'), t('return.success_export_finance'));
    } catch (error: unknown) {
      console.error("Error exporting transactions:", error);
      let errorMessage = t("return.error_export_finance");
      if (error instanceof Error) {
        errorMessage = `The transactions could not be exported. ${error.message}`;
      }
      Alert.alert(t("return.error"), errorMessage);
    } finally {
      setExportando(false);
    }
  }

  // --- Importar Transações (CSV) ---
  async function importarTransacoes() {
    try {
      setImportando(true);

      const resultado = await DocumentPicker.getDocumentAsync({
        type: "*/*",
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

      const camposEssenciais = [
        "Description",
        "Wallet",
        "Category",
        "Quantity",
        "Value",
        "Type",
        "Action",
        "Date",
      ];
      const camposMinimosValidos = camposEssenciais.every((campo) =>
        cabecalho.includes(campo),
      );

      if (!camposMinimosValidos) {
        Alert.alert(t("return.error"), t("return.error_import_format_finance"));
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

        const indices = camposEssenciais.map((campo) =>
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
          linhasComErro.push(
            `Line ${i + 1}: "${linhas[i].substring(0, Math.min(linhas[i].length, 50))}..." - Campos essenciais faltando ou número incorreto de colunas.`,
          );
          erros++;
          continue;
        }

        try {
          const rawTipoTransacao = valores[cabecalho.indexOf("Type")];
          const tipoTransacaoValues: TipoTransacao[] = [
            "PIX",
            "Dinheiro",
            "Boleto",
            "Débito",
            "Crédito",
            "TED",
            "DOC",
            "Distinto",
          ];
          if (
            !tipoTransacaoValues.includes(rawTipoTransacao as TipoTransacao)
          ) {
            throw new Error(`Invalid transaction type: "${rawTipoTransacao}"`);
          }
          const tipo_transacao: TipoTransacao =
            rawTipoTransacao as TipoTransacao;

          const rawAcao = valores[cabecalho.indexOf("Action")].toLowerCase();
          let acao: Acao;
          if (rawAcao === "entrada" || rawAcao === "ganho") {
            acao = "entrada";
          } else if (rawAcao === "saida" || rawAcao === "gasto") {
            acao = "saida";
          } else {
            throw new Error(`Invalid action: "${rawAcao}"`);
          }

          let dataBruta = valores[cabecalho.indexOf("Date")];
          if (dataBruta.includes("-")) {
            dataBruta = dataBruta.replace(/-/g, "/");
          }
          const data = formatarData(dataBruta);

          const valorParsed = parseFloat(valores[cabecalho.indexOf("Value")]);

          const transacao: Omit<Transacao, "id"> = {
            descricao: valores[cabecalho.indexOf("Description")],
            caixa: valores[cabecalho.indexOf("Wallet")],
            categoria: valores[cabecalho.indexOf("Category")],
            quantidade: parseInt(valores[cabecalho.indexOf("Quantity")]),
            valor: valorParsed,
            tipo_transacao: tipo_transacao,
            acao: acao,
            data: data,
          };

          if (isNaN(transacao.quantidade) || isNaN(transacao.valor)) {
            throw new Error("Quantity or Value are not valid numbers.");
          }

          await salvarTransacao(transacao);
          importadas++;
        } catch (error: unknown) {
          console.error(
            "Error importing transaction:",
            error,
            "Line:",
            linhas[i],
          );
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

      Alert.alert(
        t("return.import_completed"),
        `${t("return.imported")}: ${importadas}\n${t("return.failed")}: ${erros}`,
      );
      calcularResumoDados(); // Recalculate filtered summary
      calcularValorAtualTotal(); // Recalculate total value
    } catch (error: unknown) {
      console.error("General error when importing:", error);
      let errorMessage = t("return.error_import_format");
      if (error instanceof Error) {
        errorMessage += `\nDetails: ${error.message}`;
      }
      Alert.alert(t("return.error"), errorMessage);
    } finally {
      setImportando(false);
    }
  }

  // --- Importar Dados de Teste ---
  async function importarDadosTeste() {
    try {
      setImportando(true);
      let importadas = 0;
      let erros = 0;

      const dadosTeste = [
        {
          descricao: "Produto 1",
          caixa: "Pai",
          categoria: "Contas",
          quantidade: 2,
          valor: 15000,
          tipo_transacao: "PIX",
          acao: "saida",
          data: formatarData(new Date()),
        },
        {
          descricao: "Salário",
          caixa: "Pai",
          categoria: "Renda",
          quantidade: 1,
          valor: 500000,
          tipo_transacao: "PIX",
          acao: "entrada",
          data: formatarData(new Date()),
        },
        {
          descricao: "Aluguel",
          caixa: "Pai",
          categoria: "Moradia",
          quantidade: 1,
          valor: 120000,
          tipo_transacao: "Boleto",
          acao: "saida",
          data: formatarData(new Date()),
        },
        {
          descricao: "Lanche",
          caixa: "Filho",
          categoria: "Alimentação",
          quantidade: 1,
          valor: 2500,
          tipo_transacao: "Dinheiro",
          acao: "saida",
          data: formatarData(new Date()),
        },
        {
          descricao: "Venda Extra",
          caixa: "Filho",
          categoria: "Renda Extra",
          quantidade: 1,
          valor: 7500,
          tipo_transacao: "Débito",
          acao: "entrada",
          data: formatarData(new Date()),
        },
        {
          descricao: "Supermercado",
          caixa: "Mãe",
          categoria: "Alimentação",
          quantidade: 1,
          valor: 30000,
          tipo_transacao: "Crédito",
          acao: "saida",
          data: formatarData(new Date()),
        },
        {
          descricao: "Presente",
          caixa: "Mãe",
          categoria: "Lazer",
          quantidade: 1,
          valor: 5000,
          tipo_transacao: "Dinheiro",
          acao: "entrada",
          data: formatarData(new Date()),
        },
        {
          descricao: "Conta de Luz",
          caixa: "Pai",
          categoria: "Contas",
          quantidade: 1,
          valor: 8000,
          tipo_transacao: "Boleto",
          acao: "saida",
          data: formatarData(new Date("2025-05-15")),
        }, // Mês anterior
        {
          descricao: "Receita Antiga",
          caixa: "Filho",
          categoria: "Renda",
          quantidade: 1,
          valor: 10000,
          tipo_transacao: "PIX",
          acao: "entrada",
          data: formatarData(new Date("2025-05-20")),
        }, // Mês anterior
      ];

      for (const transacao of dadosTeste) {
        try {
          await salvarTransacao(transacao as Omit<Transacao, "id">);
          importadas++;
        } catch (error: unknown) {
          console.error("Error importing test transaction:", error);
          let errorMessage = t("return.error_import_format");
          if (error instanceof Error) {
            errorMessage += `\nDetails: ${error.message}`;
          } else if (typeof error === "string") {
            errorMessage += `\nDetails: ${error}`;
          }
          erros++;
        }
      }

      Alert.alert(
        t("return.import_test"),
        `${t("return.imported")}: ${importadas}\n${t("return.failed")}: ${erros}`,
      );
      calcularResumoDados(); // Recalculate filtered summary
      calcularValorAtualTotal(); // Recalculate total value
    } catch (error: unknown) {
      console.error("General error when importing test data:", error);
      let errorMessage = t("return.error_import_format");
      if (error instanceof Error) {
        errorMessage += `\nDetails: ${error.message}`;
      }
      Alert.alert(t("return.error"), errorMessage);
    } finally {
      setImportando(false);
    }
  }

  // --- Função Dev para cadastrar 'Corte de Cabelo' ---
  async function cadastrarCorteCabelo() {
    try {
      setImportando(true);

      const novoCadastro: Omit<Transacao, "id"> = {
        descricao: "Cortei Cabelo",
        caixa: "Barbearia",
        categoria: "Corte",
        quantidade: 1,
        valor: 1500,
        tipo_transacao: "Dinheiro",
        acao: "entrada",
        data: formatarData(new Date()),
      };

      await salvarTransacao(novoCadastro);

      Alert.alert(t("return.success"), t("return.success_add"));

      // Atualiza os valores na interface
      calcularResumoDados();
      calcularValorAtualTotal();
    } catch (error: unknown) {
      console.error("Erro ao cadastrar transação de teste:", error);
      Alert.alert(t("return.error"), t("return.error_add"));
    } finally {
      setImportando(false);
    }
  }

  // --- Limpar Banco de Dados ---
  async function limparBancoDados() {
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
              const sucesso = await recriarTabela();
              if (sucesso) {
                Alert.alert(
                  t("return.success"),
                  t("return.cleaned_finance_database"),
                );
              } else {
                Alert.alert(t("return.error"), t("return.clear_error"));
              }
              calcularResumoDados(); // Recalculate filtered summary
              calcularValorAtualTotal(); // Recalculate total value
            } catch (error: unknown) {
              console.error("Error clearing database:", error);
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

  // --- Função para gerar dados para o relatório (agrupamento por mês, caixa, categoria) ---
  const gerarDadosParaRelatorio = useCallback(async () => {
    const allTransacoes = (await buscarTransacoes()) as Transacao[];
    let transacoes = allTransacoes;

    // Normaliza as datas limite para abranger todo o dia inicial e final
    const startOfDay = startDate ? new Date(startDate) : undefined;
    if (startOfDay) {
      startOfDay.setHours(0, 0, 0, 0);
    }

    const endOfDay = endDate ? new Date(endDate) : undefined;
    if (endOfDay) {
      endOfDay.setHours(23, 59, 59, 999);
    }

    // Aplica o filtro de data no relatório
    if (startOfDay || endOfDay) {
      transacoes = allTransacoes.filter((t) => {
        const [day, month, year] = t.data.split("/").map(Number);
        const transactionDate = new Date(year, month - 1, day, 12, 0, 0);

        if (startOfDay && endOfDay) {
          return transactionDate >= startOfDay && transactionDate <= endOfDay;
        } else if (startOfDay) {
          return transactionDate >= startOfDay;
        } else if (endOfDay) {
          return transactionDate <= endOfDay;
        }
        return true;
      });
    }

    const resumoMensal: Record<
      string,
      Record<
        string,
        {
          combinacoes: Record<
            string,
            {
              caixa: string;
              categoria: string;
              totalEntradas: number;
              totalSaidas: number;
            }
          >;
          totalEntradasMes: number;
          totalSaidasMes: number;
        }
      >
    > = {};

    transacoes.forEach((t) => {
      const valorTotalTransacao = t.valor * t.quantidade;

      const [_, mes, ano] = t.data.split("/");
      const chaveMesAno = `${ano}-${mes}`; // YYYY-MM

      const chaveCombinacao = `${t.caixa}:::${t.categoria}`;

      if (!resumoMensal[ano]) {
        resumoMensal[ano] = {};
      }
      if (!resumoMensal[ano][chaveMesAno]) {
        resumoMensal[ano][chaveMesAno] = {
          combinacoes: {},
          totalEntradasMes: 0,
          totalSaidasMes: 0,
        };
      }

      if (t.acao === "entrada") {
        resumoMensal[ano][chaveMesAno].totalEntradasMes += valorTotalTransacao;
      } else {
        resumoMensal[ano][chaveMesAno].totalSaidasMes += valorTotalTransacao;
      }

      if (!resumoMensal[ano][chaveMesAno].combinacoes[chaveCombinacao]) {
        resumoMensal[ano][chaveMesAno].combinacoes[chaveCombinacao] = {
          caixa: t.caixa,
          categoria: t.categoria,
          totalEntradas: 0,
          totalSaidas: 0,
        };
      }
      if (t.acao === "entrada") {
        resumoMensal[ano][chaveMesAno].combinacoes[
          chaveCombinacao
        ].totalEntradas += valorTotalTransacao;
      } else {
        resumoMensal[ano][chaveMesAno].combinacoes[
          chaveCombinacao
        ].totalSaidas += valorTotalTransacao;
      }
    });

    return { resumoMensal };
  }, [startDate, endDate]);

  // --- Função para gerar conteúdo HTML do relatório PDF ---
  const gerarConteudoHtmlRelatorio = useCallback(async () => {
    const { resumoMensal } = await gerarDadosParaRelatorio();
    const dataGeracao = new Date().toLocaleDateString("pt-BR", {
      dateStyle: "short",
    });

    let htmlContent = `
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <title>${t("return.Report")}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1, h2, h3 { color: #333; text-align: center; margin-bottom: 10px; }
          .section { margin-bottom: 30px; border: 1px solid #eee; padding: 15px; border-radius: 8px; }
          .subsection {
            margin-top: 20px;
            margin-bottom: 15px;
            padding: 10px;
            border: 1px solid #f9f9f9;
            background-color: #fcfcfc;
            border-radius: 5px;
            page-break-before: always;
          }
          .subsection:first-of-type {
            page-break-before: auto;
          }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .total-row td { font-weight: bold; background-color: #e6e6e6; }
          .entry { color: #28a745; font-weight: bold; }
          .exit { color: #dc3545; font-weight: bold; }
          .balance { color: #007bff; font-weight: bold; }
          .footer { text-align: center; margin-top: 50px; font-size: 0.8em; color: #777; }
        </style>
      </head>
      <body>
        <h1>${t("return.detailed_report")}</h1>
        <p style="text-align: center;">${t("return.generated_in")}: ${dataGeracao}</p>
    `;

    if (startDate || endDate) {
      const startText = startDate ? formatarData(startDate) : "Início";
      const endText = endDate ? formatarData(endDate) : "Fim";
      htmlContent += `<p style="text-align: center;">Período: ${startText} a ${endText}</p>`;
    }

    const mesesNomes = [
      t("months.january"),
      t("months.february"),
      t("months.march"),
      t("months.april"),
      t("months.may"),
      t("months.june"),
      t("months.july"),
      t("months.august"),
      t("months.september"),
      t("months.october"),
      t("months.november"),
      t("months.december"),
    ];

    const anosOrdenados = Object.keys(resumoMensal).sort();

    if (anosOrdenados.length === 0) {
      htmlContent += `<p style="text-align: center;">Nenhum dado disponível para o relatório no período selecionado.</p>`;
    } else {
      anosOrdenados.forEach((ano) => {
        htmlContent += `
          <div class="section">
            <h2>${t("year")}: ${ano}</h2>
        `;

        const mesesDoAnoOrdenados = Object.keys(resumoMensal[ano]).sort(
          (a, b) => {
            const [anoA, mesA] = a.split("-");
            const [anoB, mesB] = b.split("-");
            if (anoA !== anoB) return parseInt(anoA) - parseInt(anoB);
            return parseInt(mesA) - parseInt(mesB);
          },
        );

        mesesDoAnoOrdenados.forEach((chaveMesAno) => {
          const [anoStrMes, mesNumeroStr] = chaveMesAno.split("-");
          const mesIndex = parseInt(mesNumeroStr, 10) - 1;
          const nomeMes = mesesNomes[mesIndex];

          const dadosMes = resumoMensal[ano][chaveMesAno];
          const entradasMesReais = (
            dadosMes.totalEntradasMes / 100
          ).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
          const saidasMesReais = (dadosMes.totalSaidasMes / 100).toLocaleString(
            "pt-BR",
            { style: "currency", currency: "BRL" },
          );
          const saldoMesReais = (
            (dadosMes.totalEntradasMes - dadosMes.totalSaidasMes) /
            100
          ).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

          htmlContent += `
            <div class="subsection">
              <h3>${t("month")}: ${nomeMes}/${anoStrMes}</h3>
              <p style="font-weight: bold;">${t("return.generated_income_month")}: <span class="entry">${entradasMesReais}</span></p>
              <p style="font-weight: bold;">${t("return.generated_expense_month")}: <span class="exit">${saidasMesReais}</span></p>
              <p style="font-weight: bold;">${t("return.generated_balance_month")}: <span class="balance">${saldoMesReais}</span></p>

              <h4>${t("return.generated_title")}</h4>
              <table>
                <thead>
                  <tr>
                    <th>${t("input_finance.wallet")}</th>
                    <th>${t("input_finance.category")}</th>
                    <th>${t("action.inflow")}</th>
                    <th>${t("action.outflow")}</th>
                    <th>${t("input_finance.value")}</th>
                  </tr>
                </thead>
                <tbody>
          `;

          type CaixaCategoriaItem = {
            caixa: string;
            categoria: string;
            totalEntradas: number;
            totalSaidas: number;
          };

          const caixaCategoriaItens: CaixaCategoriaItem[] = Object.values(
            dadosMes.combinacoes,
          );

          caixaCategoriaItens.sort((a, b) => {
            const caixaCompare = a.caixa.localeCompare(b.caixa);
            if (caixaCompare !== 0) {
              return caixaCompare;
            }
            return a.categoria.localeCompare(b.categoria);
          });

          if (caixaCategoriaItens.length === 0) {
            htmlContent += `<tr><td colspan="5">Nenhum detalhe disponível para este mês.</td></tr>`;
          } else {
            caixaCategoriaItens.forEach((item) => {
              const entradasReais = (item.totalEntradas / 100).toLocaleString(
                "pt-BR",
                { style: "currency", currency: "BRL" },
              );
              const saidasReais = (item.totalSaidas / 100).toLocaleString(
                "pt-BR",
                { style: "currency", currency: "BRL" },
              );
              const saldoReais = (
                (item.totalEntradas - item.totalSaidas) /
                100
              ).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

              htmlContent += `
                <tr>
                  <td>${item.caixa}</td>
                  <td>${item.categoria}</td>
                  <td class="entry">${entradasReais}</td>
                  <td class="exit">${saidasReais}</td>
                  <td class="balance">${saldoReais}</td>
                </tr>
              `;
            });
          }

          htmlContent += `
                </tbody>
              </table>
            </div> `;
        });
        htmlContent += `</div> `;
      });
    }

    htmlContent += `
        <div class="footer">
          <p>${t("return.generated_by")}</p>
          <p>By Jhonatanrs</p>
        </div>
      </body>
      </html>
    `;

    return htmlContent;
  }, [gerarDadosParaRelatorio, startDate, endDate, t]);

  // --- Função para gerar o relatório PDF ---
  async function gerarRelatorioPdf() {
    try {
      setExportando(true);

      const html = await gerarConteudoHtmlRelatorio();
      const { uri } = await Print.printToFileAsync({ html });

      if (Platform.OS === "ios") {
        await Sharing.shareAsync(uri);
      } else {
        await Sharing.shareAsync(uri, {
          UTI: ".pdf",
          mimeType: "application/pdf",
        });
      }

      //Alert.alert('Sucesso', 'Relatório PDF gerado e pronto para ser compartilhado!');
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      Alert.alert(t("return.error"), t("pdf.error-perm"));
    } finally {
      setExportando(false);
    }
  }

  const mesesNomes = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      style={[styles.container, { backgroundColor: colors.background_primary }]}
    >
      <View style={styles.header}>
        <ButtonTT
          buttonStyle={{ marginVertical: 5 }}
          title={t("button.import") + " CSV"}
          onPress={importarTransacoes}
          disabled={importando}
          color={colors.info}
        />
        <ButtonTT
          buttonStyle={{ marginVertical: 5 }}
          title={t("button.export") + " CSV"}
          onPress={exportarTransacoes}
          disabled={importando}
          color={colors.warning}
        />

        <ButtonTT
          buttonStyle={{ marginVertical: 5 }}
          title={t("button.haircut")}
          onPress={cadastrarCorteCabelo}
          disabled={importando}
          color={colors.success}
        />

        <View
          style={[
            styles.dateFilterContainer,
            { backgroundColor: colors.background_secondary },
          ]}
        >
          <View
            style={[
              styles.datePickerRow,
              { backgroundColor: colors.background_secondary },
            ]}
          >
            <Text style={[styles.dateLabel, { color: colors.text_primary }]}>
              {t("return.from")}:
            </Text>
            <ButtonTT
              title={
                startDate ? formatarData(startDate) : t("return.date_start")
              }
              onPress={() => setShowDatePickerStart(true)}
              color={colors.button_primary}
              buttonStyle={styles.datePickerButton}
            />
          </View>
          {showDatePickerStart && (
            <DateTimePicker
              value={startDate || new Date()}
              mode="date"
              display="default"
              onValueChange={(event, selectedDate) => {
                setShowDatePickerStart(Platform.OS === "ios");
                setStartDate(selectedDate || undefined);
              }}
            />
          )}

          <View
            style={[
              styles.datePickerRow,
              { backgroundColor: colors.background_secondary },
            ]}
          >
            <Text style={[styles.dateLabel, { color: colors.text_primary }]}>
              {t("return.to")}:
            </Text>
            <ButtonTT
              title={endDate ? formatarData(endDate) : t("return.date_end")}
              onPress={() => setShowDatePickerEnd(true)}
              color={colors.button_primary}
              buttonStyle={styles.datePickerButton}
            />
          </View>
          {showDatePickerEnd && (
            <DateTimePicker
              value={endDate || new Date()}
              mode="date"
              display="default"
              onValueChange={(event, selectedDate) => {
                setShowDatePickerEnd(Platform.OS === "ios");
                setEndDate(selectedDate || undefined);
              }}
            />
          )}
          <ButtonTT
            buttonStyle={{ marginVertical: 10 }}
            title={t("button.apply")}
            displayButton={false}
            onPress={calcularResumoDados}
            disabled={carregandoResumo}
            color={colors.info}
          />
          <ButtonTT
            buttonStyle={{ marginVertical: 5 }}
            title={t("button.clean")}
            onPress={limparFiltro}
            color={colors.info}
          />

          <ButtonTT
            buttonStyle={{ marginVertical: 5 }}
            title={t("button.generated_pdf")}
            onPress={gerarRelatorioPdf}
            disabled={exportando}
            color={colors.warning}
          />
        </View>

        <View
          style={[
            styles.resumoGeralContainer,
            { backgroundColor: colors.background_secondary },
          ]}
        >
          <Text
            style={[styles.resumoGeralLabel, { color: colors.text_primary }]}
          >
            {t("return.current_value_total")}:
          </Text>
          <Text
            style={[
              styles.resumoGeralValor,
              { color: valorAtual >= 0 ? colors.success : colors.danger },
            ]}
          >
            {valorAtual.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </Text>
        </View>

        {carregandoResumo ? (
          <Text style={{ color: colors.text_primary }}>
            Calculando resumo...
          </Text>
        ) : (
          <>
            {Object.keys(resumoPorCaixa).length > 0 ? (
              Object.entries(resumoPorCaixa)
                .sort(([caixaA], [caixaB]) => caixaA.localeCompare(caixaB))
                .map(([caixa, dadosCaixa]) => (
                  <View
                    key={caixa}
                    style={[
                      styles.resumoCaixaContainer,
                      { backgroundColor: colors.background_secondary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.resumoCaixaTitulo,
                        { color: colors.text_primary },
                      ]}
                    >
                      {t("input_finance.wallet")}: {caixa}
                    </Text>
                    <Text
                      style={[
                        styles.resumoValorGeral,
                        { color: colors.text_primary },
                      ]}
                    >
                      {t("return.total_cash_inflow")}:{" "}
                      {(dadosCaixa.totalEntradasCaixa / 100).toLocaleString(
                        "pt-BR",
                        { style: "currency", currency: "BRL" },
                      )}
                    </Text>
                    <Text
                      style={[
                        styles.resumoValorGeral,
                        { color: colors.text_primary },
                      ]}
                    >
                      {t("return.total_cash_outflow")}:{" "}
                      {(dadosCaixa.totalSaidasCaixa / 100).toLocaleString(
                        "pt-BR",
                        { style: "currency", currency: "BRL" },
                      )}
                    </Text>
                    <Text
                      style={[
                        styles.resumoValorGeral,
                        { color: colors.text_primary },
                      ]}
                    >
                      {t("return.total_cash_balance")}:{" "}
                      {(
                        (dadosCaixa.totalEntradasCaixa -
                          dadosCaixa.totalSaidasCaixa) /
                        100
                      ).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </Text>

                    {filtersApplied && (
                      <>
                        {Object.entries(dadosCaixa.meses)
                          .sort(([mesAnoA], [mesAnoB]) => {
                            const [mesA, anoA] = mesAnoA.split("/");
                            const [mesB, anoB] = mesAnoB.split("/");
                            if (anoA !== anoB)
                              return parseInt(anoA) - parseInt(anoB);
                            return parseInt(mesA) - parseInt(mesB);
                          })
                          .map(([mesAnoChave, dadosMes]) => {
                            const [mesNumeroStr, anoStr] =
                              mesAnoChave.split("/");
                            const nomeMes =
                              mesesNomes[parseInt(mesNumeroStr, 10) - 1];

                            return (
                              <View
                                key={`${caixa}-${mesAnoChave}`}
                                style={[
                                  styles.resumoMesContainer,
                                  {
                                    backgroundColor:
                                      colors.background_secondary,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.resumoMesTitulo,
                                    { color: colors.text_primary },
                                  ]}
                                >
                                  {t("month")}: {nomeMes}/{anoStr}
                                </Text>
                                <Text
                                  style={[
                                    styles.resumoValorMes,
                                    { color: colors.text_primary },
                                  ]}
                                >
                                  {t("return.generated_income_month")}:{" "}
                                  {(
                                    dadosMes.totalEntradasMes / 100
                                  ).toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  })}
                                </Text>
                                <Text
                                  style={[
                                    styles.resumoValorMes,
                                    { color: colors.text_primary },
                                  ]}
                                >
                                  {t("return.generated_expense_month")}:{" "}
                                  {(
                                    dadosMes.totalSaidasMes / 100
                                  ).toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  })}
                                </Text>
                                <Text
                                  style={[
                                    styles.resumoValorMes,
                                    { color: colors.text_primary },
                                  ]}
                                >
                                  {t("return.generated_balance_month")}:{" "}
                                  {(
                                    (dadosMes.totalEntradasMes -
                                      dadosMes.totalSaidasMes) /
                                    100
                                  ).toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  })}
                                </Text>

                                <View
                                  style={[
                                    styles.linhaDivisoriaInterna,
                                    { backgroundColor: colors.border },
                                  ]}
                                />

                                {Object.entries(dadosMes.categorias)
                                  .sort(([catA], [catB]) =>
                                    catA.localeCompare(catB),
                                  )
                                  .map(([categoria, dadosCategoria]) => (
                                    <View
                                      key={`${caixa}-${mesAnoChave}-${categoria}`}
                                      style={[
                                        styles.resumoCategoriaItem,
                                        {
                                          backgroundColor:
                                            colors.background_secondary,
                                        },
                                      ]}
                                    >
                                      <Text
                                        style={[
                                          styles.resumoCategoriaNome,
                                          { color: colors.text_primary },
                                        ]}
                                      >
                                        - {categoria}:
                                      </Text>
                                      <Text
                                        style={[
                                          styles.resumoValor,
                                          { color: colors.text_primary },
                                        ]}
                                      >
                                        {t("return.generated_income")}:{" "}
                                        {(
                                          dadosCategoria.totalEntradasCategoria /
                                          100
                                        ).toLocaleString("pt-BR", {
                                          style: "currency",
                                          currency: "BRL",
                                        })}
                                      </Text>
                                      <Text
                                        style={[
                                          styles.resumoValor,
                                          { color: colors.text_primary },
                                        ]}
                                      >
                                        {t("return.generated_expense")}:{" "}
                                        {(
                                          dadosCategoria.totalSaidasCategoria /
                                          100
                                        ).toLocaleString("pt-BR", {
                                          style: "currency",
                                          currency: "BRL",
                                        })}
                                      </Text>
                                      <Text
                                        style={[
                                          styles.resumoValor,
                                          { color: colors.text_primary },
                                        ]}
                                      >
                                        {t("return.generated_balance")}:{" "}
                                        {(
                                          (dadosCategoria.totalEntradasCategoria -
                                            dadosCategoria.totalSaidasCategoria) /
                                          100
                                        ).toLocaleString("pt-BR", {
                                          style: "currency",
                                          currency: "BRL",
                                        })}
                                      </Text>
                                    </View>
                                  ))}
                              </View>
                            );
                          })}
                      </>
                    )}
                    <View
                      style={[
                        styles.linhaDivisoria,
                        { backgroundColor: colors.border },
                      ]}
                    />
                  </View>
                ))
            ) : (
              <Text style={{ color: colors.text_primary }}>
                {t("return.generated_resume")}
              </Text>
            )}
          </>
        )}
      </View>
      <View style={[styles.bottomSpacer, { backgroundColor: 'orange' }]} />
      {__DEV__ && (
        <ButtonTT
          buttonStyle={{ marginVertical: 5 }}
          displayButton={true}
          title={t("button.import_test")}
          onLongPress={importarDadosTeste}
          disabled={importando}
          color={colors.info}
        />
      )}
      <ButtonTT
        buttonStyle={{ marginVertical: 5, marginBottom: '11%' }}
        title={t("button.clear_database")}
        onLongPress={limparBancoDados}
        disabled={importando}
        color={colors.danger}
      />
    </ScrollView>
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
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
  },
  spacer: {
    width: 10,
  },
  dateFilterContainer: {
    marginTop: 10,
    marginBottom: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
  },
  datePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  dateLabel: {
    fontSize: 16,
    marginRight: 10,
    minWidth: 40,
  },
  datePickerButton: {
    flex: 1,
  },
  resumoGeralContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginBottom: 15,
  },
  resumoGeralLabel: {
    fontSize: 18,
    fontWeight: "bold",
  },
  resumoGeralValor: {
    fontSize: 20,
    fontWeight: "bold",
  },
  resumoCaixaContainer: {
    marginBottom: 15,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
  },
  resumoCaixaTitulo: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  resumoValorGeral: {
    fontSize: 15,
    marginLeft: 10,
    fontWeight: "bold",
  },
  resumoMesContainer: {
    marginTop: 10,
    marginBottom: 10,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: "#eee",
  },
  resumoMesTitulo: {
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 5,
  },
  resumoValorMes: {
    fontSize: 15,
    marginLeft: 10,
  },
  linhaDivisoriaInterna: {
    height: 0.5,
    marginVertical: 10,
    width: "100%",
    alignSelf: "center",
  },
  resumoCategoriaItem: {
    marginBottom: 5,
    marginLeft: 20,
  },
  resumoCategoriaNome: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 2,
  },
  resumoValor: {
    fontSize: 14,
    marginLeft: 10,
  },
  linhaDivisoria: {
    height: 1,
    marginTop: 15,
    marginBottom: 5,
  },
  bottomSpacer: {
    height: 0,
  },
  header: {
    flex: 1,
  },
});
