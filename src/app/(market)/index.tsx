import { useTranslation } from 'react-i18next';
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, TextInput } from 'react-native';
import { Text, View } from '../../components/Themed';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../../components/useColorScheme';
import ButtonTT from '../../components/Jhonatanrs/ButtonTT';

type HistoryItem = {
  product: string;
  unitValue: number;
  quantity: number;
};

export default function MarketHistoryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [busca, setBusca] = useState('');

  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const loadHistory = async () => {
    const stored = await AsyncStorage.getItem('history');
    if (stored) {
      setHistory(JSON.parse(stored));
    } else {
      setHistory([]);
    }
  };

  const editItem = (itemToEdit: HistoryItem) => {
    // Busca o índice real dentro do array original
    const realIndex = history.findIndex(
      (item) =>
        item.product === itemToEdit.product &&
        item.unitValue === itemToEdit.unitValue &&
        item.quantity === itemToEdit.quantity
    );

    if (realIndex !== -1) {
      router.push({
        pathname: '/input', // Ajuste a rota para a sua tela de input se o caminho for diferente
        params: {
          index: realIndex.toString(),
          product: itemToEdit.product,
          unitValue: itemToEdit.unitValue.toString(),
          quantity: itemToEdit.quantity.toString(),
        },
      });
    }
  };

  const deleteItem = (itemToDelete: HistoryItem) => {
    Alert.alert(
      t('return.remove_item'),
      t('return.remove_item_msg'),
      [
        { text: t('button.cancel'), style: 'cancel' },
        {
          text: t('button.delete'),
          style: 'destructive',
          onPress: async () => {
            const realIndex = history.findIndex(
              (item) =>
                item.product === itemToDelete.product &&
                item.unitValue === itemToDelete.unitValue &&
                item.quantity === itemToDelete.quantity
            );

            if (realIndex !== -1) {
              const newHistory = [...history];
              newHistory.splice(realIndex, 1);
              setHistory(newHistory);
              await AsyncStorage.setItem('history', JSON.stringify(newHistory));
            }
          },
        },
      ]
    );
  };

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const historyReversed = [...history].reverse();
  const historyFiltrado = historyReversed.filter((item) =>
    item.product.toLowerCase().includes(busca.toLowerCase())
  );

  const renderItem = ({ item }: { item: HistoryItem }) => {
    const totalItem = item.unitValue * item.quantity;

    return (
      <View
        style={[
          styles.transacaoContainer,
          {
            backgroundColor: colors.background_secondary,
            borderColor: colors.border,
            borderWidth: 1,
            shadowColor: colors.text_primary,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }
        ]}
      >
        <View style={[styles.transacaoHeader, { backgroundColor: colors.background_secondary }]}>
          <View style={[styles.transacaoInfoPrincipal, { backgroundColor: colors.background_secondary }]}>
            <Text style={[styles.transacaoDescricao, { color: colors.text_primary }]}>
              {item.product}
            </Text>
          </View>
          <Text
            style={[
              styles.transacaoValor,
              {
                color: colors.success,
                backgroundColor: `${colors.success}20`,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 8,
                overflow: 'hidden',
              }
            ]}
          >
            {totalItem.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
          </Text>
        </View>

        <View
          style={[
            styles.transacaoDetalhes,
            { borderTopColor: colors.border, backgroundColor: colors.background_secondary }
          ]}
        >
          <View style={[styles.detalheItem, { backgroundColor: colors.background_secondary }]}>
            <Text style={[styles.detalheLabel, { color: colors.text_primary }]}>
              {t('item_market.quantity')}:
            </Text>
            <Text style={[styles.detalheValor, { color: colors.text_primary }]}>
              {item.quantity}
            </Text>
          </View>

          <View style={[styles.detalheItem, { backgroundColor: colors.background_secondary }]}>
            <Text style={[styles.detalheLabel, { color: colors.text_primary }]}>
              {t('item_market.value')}:
            </Text>
            <Text style={[styles.detalheValor, { color: colors.text_primary }]}>
              {item.unitValue.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.transacaoAcoes,
            { borderTopColor: colors.border, backgroundColor: colors.background_secondary }
          ]}
        >
          <ButtonTT
            title={t('button.edit') || "Editar"}
            onPress={() => editItem(item)}
            color="button_primary"
            buttonStyle={{ marginRight: 10 }}
          />
          <ButtonTT
            title="X"
            onPress={() => deleteItem(item)}
            color="danger"
          />
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background_primary }]}>
      <View
        style={[
          styles.buscaContainer,
          { borderColor: colors.tabIconDefault, backgroundColor: colors.background_secondary }
        ]}
      >
        <TextInput
          style={[
            styles.buscaInput,
            {
              color: colors.text_primary,
              backgroundColor: colors.background_primary,
              borderColor: colors.border,
            }
          ]}
          placeholder={t('placeholder.search_products')}
          placeholderTextColor={'gray'}
          value={busca}
          onChangeText={setBusca}
        />
      </View>

      <FlatList
        data={historyFiltrado}
        renderItem={renderItem}
        keyExtractor={(_, index) => index.toString()}
        style={styles.flatList}
        contentContainerStyle={styles.flatListContent}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
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
});