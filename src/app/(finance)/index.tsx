import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, StyleSheet, TextInput, FlatList } from 'react-native';
import { Text, View } from '../../components/Themed';
import { buscarTransacoes, deletarTransacao } from '../../database/db';
import { formatarMoeda } from '../../utils/formatacao';
import { useFocusEffect, useRouter } from 'expo-router';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../../components/useColorScheme';
import ButtonTT from '../../components/Jhonatanrs/ButtonTT';

type TipoTransacao = 'PIX' | 'Dinheiro' | 'Boleto' | 'Débito' | 'Crédito' | 'TED' | 'DOC' | 'Distinto';
type Acao = 'entrada' | 'saida';

interface Transacao {
  id: number;
  descricao: string;
  caixa: string;
  categoria: string;
  quantidade: number;
  valor: number;
  tipo_transacao: TipoTransacao;
  acao: Acao;
  data: string; // Esperamos 'DD/MM/AAAA'
}

export default function Finance() {
  const { t } = useTranslation();
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [busca, setBusca] = useState('');
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();

  async function carregarTransacoes() {
    try {
      const resultado = await buscarTransacoes();
      let transacoesCarregadas = resultado as Transacao[];

      // Ordenar transações (mais recente primeiro)
      transacoesCarregadas.sort((a, b) => {
        const dataA = a.data.split('/').reverse().join('-');
        const dataB = b.data.split('/').reverse().join('-');

        if (dataA < dataB) return 1;
        if (dataA > dataB) return -1;

        return b.id - a.id;
      });

      setTransacoes(transacoesCarregadas);
    } catch (error) {
      console.error('Error loading transactions:', error);
      Alert.alert(t('return.error'), t('return.error_load_transaction'));
    }
  }

  useFocusEffect(
    useCallback(() => {
      carregarTransacoes();
    }, [])
  );

  async function confirmarExclusao(id: number) {
    Alert.alert(
      t('return.confirm_delete'),
      t('return.confirm_delete_transaction'),
      [
        { text: t('button.cancel'), style: 'cancel' },
        {
          text: t('button.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deletarTransacao(id);
              await carregarTransacoes();
            } catch (error) {
              console.error('Error deleting:', error);
              Alert.alert(t('return.error'), t('return.error_delete_transaction'));
            }
          }
        }
      ]
    );
  }

  function editarTransacao(transacao: Transacao) {
    router.push({
      pathname: '/input',
      params: {
        id: transacao.id,
        descricao: transacao.descricao,
        caixa: transacao.caixa,
        categoria: transacao.categoria,
        quantidade: transacao.quantidade,
        valor: transacao.valor,
        tipo_transacao: transacao.tipo_transacao,
        acao: transacao.acao,
        data: transacao.data
      }
    });
  }

  // --- FILTRO OTIMIZADO COM useMemo ---
  const transacoesFiltradas = useMemo(() => {
    if (!busca.trim()) return transacoes;

    const termoBusca = busca.toLowerCase().trim();

    return transacoes.filter(transacao => {
      // Busca em campos de texto simples
      const emTexto =
        transacao.descricao.toLowerCase().includes(termoBusca) ||
        transacao.caixa.toLowerCase().includes(termoBusca) ||
        transacao.categoria.toLowerCase().includes(termoBusca);

      if (emTexto) return true;

      // Busca numérica sem chamar formatarMoeda em tempo real
      const valorTotal = (transacao.quantidade * transacao.valor).toString();
      const valorUnitario = transacao.valor.toString();

      return valorTotal.includes(termoBusca) || valorUnitario.includes(termoBusca);
    });
  }, [transacoes, busca]);

  // --- RENDERIZADOR DE ITEM OTIMIZADO COM useCallback ---
  const renderItem = useCallback(({ item: transacao }: { item: Transacao }) => (
    <View
      style={[
        styles.transacaoContainer,
        {
          backgroundColor: colors.inputBackground,
          borderColor: colors.borderColor,
          borderWidth: 1,
          shadowColor: colors.text,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3
        }
      ]}
    >
      <View style={[styles.transacaoHeader, { backgroundColor: colors.inputBackground }]}>
        <View style={[styles.transacaoInfoPrincipal, { backgroundColor: colors.inputBackground }]}>
          <Text style={[styles.transacaoDescricao, { color: colors.text }]}>
            {transacao.descricao}
          </Text>
          <Text style={[styles.transacaoCategoria, { color: colors.text }]}>
            {transacao.caixa}
          </Text>
          <Text style={[styles.transacaoCategoria, { color: colors.text }]}>
            {transacao.categoria}
          </Text>
        </View>
        <Text style={[
          styles.transacaoValor,
          {
            color: transacao.acao === 'entrada' ? colors.success : colors.error,
            backgroundColor: transacao.acao === 'entrada'
              ? `${colors.success}20`
              : `${colors.error}20`,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 8,
            overflow: 'hidden'
          }
        ]}>
          {transacao.acao === 'entrada' ? '+' : '-'} {formatarMoeda(transacao.quantidade * transacao.valor)}
        </Text>
      </View>

      <View style={[styles.transacaoDetalhes, { borderTopColor: colors.borderColor, backgroundColor: colors.inputBackground }]}>
        <View style={[styles.detalheItem, { backgroundColor: colors.inputBackground }]}>
          <Text style={[styles.detalheLabel, { color: colors.text }]}>{t('item_finance.quantity')}:</Text>
          <Text style={[styles.detalheValor, { color: colors.text }]}>{transacao.quantidade}</Text>
        </View>
        <View style={[styles.detalheItem, { backgroundColor: colors.inputBackground }]}>
          <Text style={[styles.detalheLabel, { color: colors.text }]}>{t('item_finance.type')}:</Text>
          <Text style={[styles.detalheValor, { color: colors.text }]}>{transacao.tipo_transacao}</Text>
        </View>
        <View style={[styles.detalheItem, { backgroundColor: colors.inputBackground }]}>
          <Text style={[styles.detalheLabel, { color: colors.text }]}>{t('item_finance.date')}:</Text>
          <Text style={[styles.detalheValor, { color: colors.text }]}>{transacao.data}</Text>
        </View>
      </View>

      <View style={[styles.transacaoAcoes, { borderTopColor: colors.borderColor, backgroundColor: colors.inputBackground }]}>
        <ButtonTT
          title={t('button.edit')}
          onPress={() => editarTransacao(transacao)}
          color="info"
        />
        <ButtonTT
          title="X"
          onLongPress={() => confirmarExclusao(transacao.id)}
          color="error"
        />
      </View>
    </View>
  ), [colors, t]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.buscaContainer, { borderColor: colors.tabIconDefault, backgroundColor: colors.inputBackground }]}>
        <TextInput
          style={[
            styles.buscaInput,
            {
              color: colors.text,
              backgroundColor: colors.background,
              borderColor: colors.borderColor
            }
          ]}
          placeholder={t('placeholder.search_transactions')}
          placeholderTextColor={"gray"}
          value={busca}
          onChangeText={setBusca}
        />
      </View>

      <FlatList
        data={transacoesFiltradas}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.flatList}
        contentContainerStyle={styles.flatListContent}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}

        // Otimizações de renderização da FlatList
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
  },
  buscaContainer: {
    marginTop: 10,
    borderRadius: 12,
    borderTopWidth: 0,
    borderBottomWidth: 0,
    padding: 10,
    margin: 10,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buscaInput: {
    height: 50,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  flatList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  flatListContent: {
    paddingTop: 15,
    paddingBottom: 20,
  },
  transacaoContainer: {
    borderRadius: 12,
    marginBottom: 25,
    overflow: 'hidden',
  },
  transacaoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  transacaoInfoPrincipal: {
    flex: 1,
    marginRight: 10,
  },
  transacaoDescricao: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  transacaoCategoria: {
    fontSize: 14,
    opacity: 0.8,
  },
  transacaoValor: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  transacaoDetalhes: {
    padding: 15,
    borderTopWidth: 1,
  },
  detalheItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detalheLabel: {
    fontSize: 14,
    opacity: 0.8,
  },
  detalheValor: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  transacaoAcoes: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 15,
    borderTopWidth: 1,
  },
  spacer: {
    width: 10,
  },
});