import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Alert, Platform, ScrollView } from 'react-native';
import { Text, View } from '../../components/Themed';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard'; // <- Importe o expo-clipboard aqui
import Colors from '../../constants/Colors';
import { useColorScheme } from '../../components/useColorScheme';
import ButtonTT from "../../components/Jhonatanrs/ButtonTT";

type HistoryItem = {
  product: string;
  unitValue: number;
  quantity: number;
};

export default function ProductsScreen() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<string[]>([]);

  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const loadProducts = async () => {
    const saved = await AsyncStorage.getItem('products');
    if (saved) setProducts(JSON.parse(saved));
  };

  const saveProducts = async (newProducts: string[]) => {
    setProducts(newProducts);
    await AsyncStorage.setItem('products', JSON.stringify(newProducts));
  };

  useFocusEffect(
    React.useCallback(() => {
      loadProducts();
    }, [])
  );

  const clearProducts = async () => {
    Alert.alert(
      t('button.clean'),
      t('return.warning_clean_database'),
      [
        { text: t('button.cancel'), style: "cancel" },
        {
          text: t('button.clean'),
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.removeItem('products');
            setProducts([]);
          }
        }
      ]
    );
  };

  const exportProductsToFile = async () => {
    try {
      if (!products.length) {
        Alert.alert(t('return.warning'), t('return.error_export_items'));
        return;
      }

      const content = products.join(';\n') + ';';
      const fileUri = FileSystem.documentDirectory + 'products.txt';

      await FileSystem.writeAsStringAsync(fileUri, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      await Sharing.shareAsync(fileUri);
    } catch (error) {
      console.error(t('return.error'), error);
      Alert.alert(t('return.error'), t('return.error_export_market'));
    }
  };

  const importProductsFromFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/plain',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const fileUri = result.assets[0].uri;
      const content = await FileSystem.readAsStringAsync(fileUri);

      const newItems = content
        .split(';')
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      const saved = await AsyncStorage.getItem('products');
      const current = saved ? JSON.parse(saved) : [];

      const updated = [...new Set([...current, ...newItems])];

      await saveProducts(updated);
    } catch (error) {
      console.error('Erro ao importar:', error);
      Alert.alert(t('return.error'), t('return.error_import_format'));
    }
  };

  const clearMarketHistory = async () => {
    Alert.alert(
      t('return.clear_history'),
      t('return.clear_history_msg'),
      [
        { text: t('button.cancel'), style: 'cancel' },
        {
          text: t('button.clean'),
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('history');
            Alert.alert(t('return.success'), t('return.clear_history'));
          }
        }
      ]
    );
  };

  // Função auxiliar para gerar o texto formatado do histórico
 const getFormattedHistoryContent = async (): Promise<string | null> => {
    const stored = await AsyncStorage.getItem('history');
    const history: HistoryItem[] = stored ? JSON.parse(stored) : [];

    if (history.length === 0) {
      Alert.alert(t('return.warning'), t('return.none'));
      return null;
    }

    let totalGeral = 0;

    const linhas = history.map((item) => {
      const totalItem = item.unitValue * item.quantity;
      totalGeral += totalItem;

      return `${item.product} ${item.quantity}x ${item.unitValue.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      })} (${totalItem.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      })})`;
    });

    const totalFormatado = totalGeral.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    // Junta as linhas dos produtos e adiciona o Total no final
    return `${linhas.join('\n')}\n\nTotal: ${totalFormatado}`;
  };

  
  const exportMarketHistory = async () => {
    try {
      const content = await getFormattedHistoryContent();
      if (!content) return;

      const fileUri = FileSystem.documentDirectory + 'history.txt';

      await FileSystem.writeAsStringAsync(fileUri, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      await Sharing.shareAsync(fileUri);
    } catch (error) {
      console.error('Erro ao exportar histórico:', error);
    }
  };

  // Nova função para copiar o histórico para a área de transferência
  const copyMarketHistoryToClipboard = async () => {
    try {
      const content = await getFormattedHistoryContent();
      if (!content) return;

      await Clipboard.setStringAsync(content);
      Alert.alert(t('return.success'), t('return.clipboard'));
    } catch (error) {
      console.error('Erro ao copiar histórico:', error);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background_primary }]}>

      <View style={styles.header}>
        <View style={styles.rowButtons}>
          <Pressable
            onPress={importProductsFromFile}
            style={[styles.button, styles.halfButton, { backgroundColor: colors.info }]}
          >
            <Text style={styles.buttonText}>{t('button.import')} TXT</Text>
          </Pressable>

          <Pressable
            onPress={exportProductsToFile}
            style={[styles.button, styles.halfButton, { backgroundColor: colors.warning }]}
          >
            <Text style={styles.buttonText}>{t('button.export')} TXT</Text>
          </Pressable>
        </View>

        <View style={styles.rowButtons}>
          <Pressable
            onPress={exportMarketHistory}
            onLongPress={copyMarketHistoryToClipboard} // <- Adicionado o evento de toque longo aqui
            style={[styles.button, styles.halfButton, { backgroundColor: colors.success }]}
          >
            <Text style={styles.buttonText}>{t('return.export_history')}</Text>
          </Pressable>

          <Pressable
            onLongPress={clearMarketHistory}
            style={[styles.button, styles.halfButton, { backgroundColor: colors.danger || '#FF3B30' }]}
          >
            <Text style={styles.buttonText}>{t('return.clear_history')}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable
          onLongPress={clearProducts}
          style={[styles.button, { backgroundColor: colors.danger || '#FF3B30' }]}
        >
          <Text style={styles.buttonText}>{t('button.clear_database')}</Text>
        </Pressable>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  header: {
    paddingTop: 10,
    backgroundColor: 'transparent',
  },
  footer: {
    paddingBottom: 0,
    backgroundColor: 'transparent',
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginHorizontal:5,
    borderRadius: 8, // Ajustado para ser um pouco mais arredondado
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
    // Sombras / Elevação (simulando botão padrão)
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  halfButton: {
    flex: 1,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  rowButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
    backgroundColor: 'transparent',
  },
});