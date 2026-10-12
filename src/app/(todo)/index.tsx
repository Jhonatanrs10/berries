import { useTranslation } from 'react-i18next';
import { useState, useCallback, useMemo } from 'react';
import { Alert, StyleSheet, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { Text, View } from '../../components/Themed';
import { buscarTarefas, deletarTarefa, alternarStatusTarefa } from '../../database/db';
import { useFocusEffect, useRouter } from 'expo-router';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../../components/useColorScheme';
import ButtonTT from '../../components/Jhonatanrs/ButtonTT';

export interface Tarefa {
  id: number;
  titulo: string;
  descricao: string;
  categoria: string;
  tempoMinutos: number; // Duração / Tempo gasto
  concluida: boolean;
  data: string; // 'DD/MM/AAAA'
}

export default function TodoList() {
  const { t } = useTranslation();
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [busca, setBusca] = useState('');
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();

  async function carregarTarefas() {
    try {
      const resultado = await buscarTarefas();
      let lista = resultado as Tarefa[];

      // Ordena por data (mais recente) e por ID
      lista.sort((a, b) => {
        const dataA = a.data.split('/').reverse().join('-');
        const dataB = b.data.split('/').reverse().join('-');
        if (dataA < dataB) return 1;
        if (dataA > dataB) return -1;
        return b.id - a.id;
      });

      setTarefas(lista);
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
      Alert.alert(t('return.error'), 'Não foi possível carregar as tarefas.');
    }
  }

  useFocusEffect(
    useCallback(() => {
      carregarTarefas();
    }, [])
  );

  async function handleToggleStatus(id: number) {
    try {
      await alternarStatusTarefa(id);
      await carregarTarefas();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
    }
  }

  async function confirmarExclusao(id: number) {
    Alert.alert(
      t('return.confirm_delete'),
      'Deseja realmente excluir esta tarefa?',
      [
        { text: t('button.cancel'), style: 'cancel' },
        {
          text: t('button.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deletarTarefa(id);
              await carregarTarefas();
            } catch (error) {
              console.error('Erro ao deletar:', error);
            }
          }
        }
      ]
    );
  }

  function editarTarefa(tarefa: Tarefa) {
    router.push({
      pathname: '/input',
      params: {
        id: tarefa.id,
        titulo: tarefa.titulo,
        descricao: tarefa.descricao,
        categoria: tarefa.categoria,
        tempoMinutos: tarefa.tempoMinutos,
        concluida: tarefa.concluida ? 1 : 0,
        data: tarefa.data
      }
    });
  }

  const tarefasFiltradas = useMemo(() => {
    if (!busca.trim()) return tarefas;
    const termo = busca.toLowerCase().trim();
    return tarefas.filter(item =>
      item.titulo.toLowerCase().includes(termo) ||
      item.descricao.toLowerCase().includes(termo) ||
      item.categoria.toLowerCase().includes(termo)
    );
  }, [tarefas, busca]);

  const formatarTempo = (minutos: number) => {
    if (minutos < 60) return `${minutos} min`;
    const hrs = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  };

  const renderItem = useCallback(({ item }: { item: Tarefa }) => (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.background_secondary,
          borderColor: item.concluida ? colors.success : colors.border,
          borderWidth: 1,
          opacity: item.concluida ? 0.75 : 1,
        }
      ]}
    >
      <View style={styles.cardHeader}>
        <TouchableOpacity
          onPress={() => handleToggleStatus(item.id)}
          style={[
            styles.checkbox,
            { borderColor: item.concluida ? colors.success : colors.border },
            item.concluida && { backgroundColor: colors.success }
          ]}
        >
          <Text style={styles.checkboxText}>{item.concluida ? '✓' : ''}</Text>
        </TouchableOpacity>

        <View style={styles.infoContainer}>
          <Text
            style={[
              styles.cardTitulo,
              { color: colors.text_primary },
              item.concluida && styles.textoRiscado
            ]}
          >
            {item.titulo}
          </Text>
          {item.descricao ? (
            <Text style={[styles.cardDescricao, { color: colors.text_primary }]}>
              {item.descricao}
            </Text>
          ) : null}
          <Text style={[styles.cardTag, { color: colors.text_primary }]}>
            🏷️ {item.categoria || 'Geral'}
          </Text>
        </View>

        <Text
          style={[
            styles.tempoBadge,
            {
              color: colors.text_primary,
              backgroundColor: `${colors.button_primary}20`
            }
          ]}
        >
          ⏱️ {formatarTempo(item.tempoMinutos || 0)}
        </Text>
      </View>

      <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
        <Text style={[styles.dataText, { color: colors.text_primary }]}>
          📅 {item.data}
        </Text>
        <View style={styles.acoesContainer}>
          <ButtonTT
            title={t('button.edit')}
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
    </View>
  ), [colors, t]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background_primary }]}>
      <View style={[styles.buscaContainer, { backgroundColor: colors.background_secondary, borderColor: colors.border }]}>
        <TextInput
          style={[
            styles.buscaInput,
            { color: colors.text_primary, backgroundColor: colors.background_primary, borderColor: colors.border }
          ]}
          placeholder="Buscar tarefas..."
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
  buscaContainer: { padding: 10, margin: 10, borderRadius: 12, borderWidth: 1 },
  buscaInput: { height: 48, paddingHorizontal: 15, borderRadius: 8, borderWidth: 1, fontSize: 16 },
  flatList: { flex: 1, paddingHorizontal: 15 },
  flatListContent: { paddingTop: 10, paddingBottom: 20 },
  card: { borderRadius: 12, marginBottom: 15, padding: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  checkbox: { width: 26, height: 26, borderRadius: 6, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 2 },
  checkboxText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  infoContainer: { flex: 1, marginRight: 10 },
  cardTitulo: { fontSize: 17, fontWeight: 'bold', marginBottom: 2 },
  cardDescricao: { fontSize: 14, opacity: 0.8, marginBottom: 4 },
  cardTag: { fontSize: 12, opacity: 0.6 },
  textoRiscado: { textDecorationLine: 'line-through', opacity: 0.5 },
  tempoBadge: { fontSize: 13, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTopWidth: 1 },
  dataText: { fontSize: 12, opacity: 0.7 },
  acoesContainer: { flexDirection: 'row', gap: 6 },
});