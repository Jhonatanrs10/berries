import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useRef } from 'react';
import { Text, View } from '../../components/Themed';
import {
  Modal,
  FlatList,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput as RNTextInput,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../../components/useColorScheme';

interface ProductSelectorProps {
  selectedProduct: string;
  onSelect: (product: string) => void;
  titleText?: string;
  placeholderText?: string;
  closeText?: string;
  addText?: string;
}

export default function ProductSelector({
  selectedProduct,
  onSelect,
  titleText = "Buscar ou Adicionar",
  placeholderText = "Nome do produto...",
  closeText = "Fechar",
  addText = "+ Adicionar"
}: ProductSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [products, setProducts] = useState<string[]>([]);
  const [isRendered, setIsRendered] = useState(false);

  const { t } = useTranslation();

  const inputRef = useRef<RNTextInput>(null);

  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const colors22 = {
    background: colorScheme === 'dark' ? '#000' : '#fff',
    inputBg: colorScheme === 'dark' ? '#1c1c1e' : '#f2f2f7',
    text: colorScheme === 'dark' ? '#fff' : '#000',
    itemBorder: colorScheme === 'dark' ? '#333' : '#eee',
  };

  const loadProducts = async () => {
    const saved = await AsyncStorage.getItem('products');
    if (saved) setProducts(JSON.parse(saved));
  };

  useFocusEffect(
    React.useCallback(() => {
      loadProducts();
    }, [])
  );

  useEffect(() => {
    if (isRendered) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isRendered]);

  const filteredProducts = products.filter((p) =>
    p.toLowerCase().includes(searchText.toLowerCase())
  );

  const productExists = products.some(
    (p) => p.toLowerCase() === searchText.trim().toLowerCase()
  );

  const addNewProduct = async () => {
    const newName = searchText.trim();
    if (!newName) return;
    try {
      const updatedProducts = [...products, newName];
      await AsyncStorage.setItem('products', JSON.stringify(updatedProducts));
      setProducts(updatedProducts);
      onSelect(newName);
      closeModalAndClearSearch();
    } catch (error) {
      // Trata erros de gravação se necessário
    }
  };

  const removeProduct = (productName: string) => {
    Alert.alert(t('return.remove_item'), t('return.remove_item_msg'),
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const updatedProducts = products.filter((p) => p !== productName);
            await AsyncStorage.setItem('products', JSON.stringify(updatedProducts));
            setProducts(updatedProducts);
            if (selectedProduct === productName) {
              onSelect('');
            }
          },
        },
      ]
    );
  };

  const closeModalAndClearSearch = () => {
    setIsRendered(false);
    setModalVisible(false);
    setSearchText('');
  };

  return (
    <View style={{ backgroundColor: 'transparent',alignItems: 'center', paddingTop: 10}}>
      <Pressable
        style={[styles.selectorButton, { backgroundColor: colors.background_secondary, elevation: 1, }]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={[styles.selectorText, { color: colors.text_primary }]}>
          {selectedProduct || placeholderText}
        </Text>
      </Pressable>

      <Modal
        visible={modalVisible}
        animationType="slide"
        onShow={() => setIsRendered(true)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: colors.background_primary }}
        >
          <View style={[styles.modalContainer, { backgroundColor: colors.background_primary }]}>
            <Text style={[styles.modalTitle, { color: colors.text_primary }]}>{titleText}</Text>

            <FlatList
              data={filteredProducts}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="always"
              renderItem={({ item }) => (
                <View style={[styles.productItem, { borderBottomColor: colors.border, backgroundColor: colors.background_secondary }]}>
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => {
                      onSelect(item);
                      closeModalAndClearSearch();
                    }}
                    onLongPress={() => removeProduct(item)}
                  >
                    <Text style={[styles.productText, { color: colors.text_primary }]}>{item}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => removeProduct(item)}
                    style={styles.removeButtonContainer}
                  >
                    <Text style={[styles.removeButtonText, { color: colors.danger }]}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
            />

            <Pressable onPress={closeModalAndClearSearch} style={[styles.cancelButton, { backgroundColor: colors.danger }]}>
              <Text style={styles.cancelText}>{closeText}</Text>
            </Pressable>

            {searchText.length > 0 && !productExists && (
              <TouchableOpacity onPress={addNewProduct} style={styles.addNewButton}>
                <Text style={styles.addNewText}>{addText}</Text>
              </TouchableOpacity>
            )}

            {isRendered && (
              <RNTextInput
                ref={inputRef}
                placeholder={placeholderText}
                placeholderTextColor="#888"
                value={searchText}
                onChangeText={setSearchText}
                style={[styles.searchInput, { backgroundColor: colors.background_secondary, color: colors.text_primary }]}
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (searchText.length > 0 && !productExists) addNewProduct();
                }}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  selectorButton: { borderRadius: 0, padding: 10, marginBottom: 10, height: 80, width: '90%', justifyContent: 'center', alignItems: 'center' },
  selectorText: { fontSize: 22, fontWeight: '500' },
  modalContainer: { flex: 1, padding: 10, paddingTop: 25 },
  modalTitle: { fontSize: 24, marginBottom: 20, textAlign: 'center', fontWeight: 'bold' },
  searchInput: { padding: 15, borderRadius: 10, fontSize: 22, height: 70, marginTop: 5 },
  addNewButton: { backgroundColor: '#28a745', padding: 15, borderRadius: 10, marginVertical: 5, alignItems: 'center' },
  addNewText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  productItem: {
    paddingVertical: 14,
    borderWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 5
  },
  productText: { fontSize: 22, marginStart: 10 },
  removeButtonContainer: {
    paddingHorizontal: 15,
    paddingVertical: 5,
  },
  removeButtonText: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  cancelButton: { backgroundColor: 'orange', padding: 15, borderRadius: 10, marginVertical: 5 },
  cancelText: { color: 'white', textAlign: 'center', fontSize: 20, fontWeight: 'bold' },
});