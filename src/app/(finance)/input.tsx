import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useCallback } from 'react';
import ButtonTT from '../../components/Jhonatanrs/ButtonTT';
import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  Button,
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import { Text, View } from '../../components/Themed';
import { ThemedInput } from '../../components/ThemedInput';
import { ThemedPicker } from '../../components/ThemedPicker';
import { buscarTransacoes, salvarTransacao, atualizarTransacao } from '../../database/db';
import { formatarMoeda, formatarInput, formatarData, validarData, converterParaCentavos } from '../../utils/formatacao';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../../components/useColorScheme';
import { ThemedToggle, ToggleOption } from '../../components/ThemedToggle';
import DateTimePicker from '@react-native-community/datetimepicker';
import { QuantityInput } from '@/src/components/QuantityInput';

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
  data: string;
}

export default function Input() {
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  
  const [descricao, setDescricao] = useState('');
  const [caixa, setCaixa] = useState('');
  const [categoria, setCategoria] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [valor, setValor] = useState('');
  const [tipoTransacao, setTipoTransacao] = useState<TipoTransacao>('PIX');
  const [acao, setAcao] = useState<Acao>('saida');
  const [data, setData] = useState('');
  const [caixas, setCaixas] = useState<string[]>([]);
  const [caixasFiltradas, setCaixasFiltradas] = useState<string[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [categoriasFiltradas, setCategoriasFiltradas] = useState<string[]>([]);
  const [mostrarCategoriaSugestao, setMostrarCategoriaSugestao] = useState(false);
  const [mostrarCaixaSugestao, setMostrarCaixaSugestao] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDateObject, setSelectedDateObject] = useState<Date>(new Date());

  const acaoOptions: ToggleOption<Acao>[] = [
    { label: t('action.inflow'), value: 'entrada' },
    { label: t('action.outflow'), value: 'saida' },
  ];

  const getStatusColor = () => {
    if (acao === 'entrada') return colors.success;
    if (acao === 'saida') return colors.danger;
  };

  const [showCaixaModal, setShowCaixaModal] = useState(false);
  const [showCategoriaModal, setShowCategoriaModal] = useState(false);

  const handleIncrement = () => {
    const numericValue = parseInt(quantidade || '0', 10);
    setQuantidade(String(numericValue + 1));
  };

  const handleDecrement = () => {
    const numericValue = parseInt(quantidade || '0', 10);
    if (numericValue > 1) {
      setQuantidade(String(numericValue - 1));
    }
  };

  const handleIncrement2 = () => {
    const numericValue = parseInt(quantidade || '0', 10);
    setQuantidade(String(numericValue + 10));
  };

  const handleDecrement2 = () => {
    const numericValue = parseInt(quantidade || '0', 10);
    const calculatedValue = numericValue - 10;
    const newValue = Math.max(1, calculatedValue);
    setQuantidade(String(newValue));
  };

  const getTodayDate = useCallback(() => {
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, '0');
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();
    return `${dia}/${mes}/${ano}`;
  }, []);

  // 1. Limpa o formulário E cancela o modo de edição (remove o ID da rota)
  const limparCampos = useCallback(() => {
    setDescricao('');
    setCaixa('');
    setCategoria('');
    setQuantidade('1');
    setValor('');
    setTipoTransacao('PIX');
    setAcao('saida');
    const today = new Date();
    setData(getTodayDate());
    setSelectedDateObject(today);
    router.setParams({ id: undefined });
  }, [router, getTodayDate]);

  // 2. Limpa APENAS os valores dos inputs visuais (preserva a edição ativa)
  const limparApenasCamposFormulario = () => {
    setDescricao('');
    setCaixa('');
    setCategoria('');
    setQuantidade('1');
    setValor('');
    setTipoTransacao('PIX');
    setAcao('saida');
    const today = new Date();
    setData(getTodayDate());
    setSelectedDateObject(today);
  };

  // Garante que o formulário abra limpo para novos cadastros se acessado sem ID
  useFocusEffect(
    useCallback(() => {
      if (!params.id) {
        limparCampos();
      }
    }, [params.id, limparCampos])
  );

  useEffect(() => {
    if (params.id) {
      setDescricao(params.descricao as string || '');
      setCaixa(params.caixa as string || '');
      setCategoria(params.categoria as string || '');
      setQuantidade(params.quantidade?.toString() ?? '1');

      const valorNumerico = Number(params.valor || 0);
      setValor(formatarMoeda(valorNumerico));

      setTipoTransacao((params.tipo_transacao as TipoTransacao) || 'PIX');
      setAcao((params.acao as Acao) || 'saida');

      if (params.data) {
        setData(params.data as string);
        const [day, month, year] = (params.data as string).split('/').map(Number);
        setSelectedDateObject(new Date(year, month - 1, day));
      }
    }
  }, [params.id]);

  async function carregarCategorias() {
    try {
      const resultado = await buscarTransacoes();
      const categoriasUnicas = [...new Set((resultado as Transacao[]).map(t => t.categoria))];
      setCategorias(categoriasUnicas);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  async function carregarCaixas() {
    try {
      const resultado = await buscarTransacoes();
      const caixasUnicas = [...new Set((resultado as Transacao[]).map(t => t.caixa))];
      setCaixas(caixasUnicas);
    } catch (error) {
      console.error('Error loading wallets:', error);
    }
  }

  useEffect(() => {
    carregarCategorias();
    carregarCaixas();
  }, []);

  function filtrarCategorias(texto: string) {
    const filtradas = categorias.filter(cat =>
      cat.toLowerCase().includes(texto.toLowerCase())
    );
    setCategoriasFiltradas(filtradas);
    setMostrarCategoriaSugestao(true);
  }

  function filtrarCaixas(texto: string) {
    const filtradas = caixas.filter(cat =>
      cat.toLowerCase().includes(texto.toLowerCase())
    );
    setCaixasFiltradas(filtradas);
    setMostrarCaixaSugestao(true);
  }

  const handleValorChange = (text: string) => {
    const valorFormatado = formatarInput(text);
    setValor(valorFormatado);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || selectedDateObject;
    setShowDatePicker(Platform.OS === 'ios');
    setSelectedDateObject(currentDate);
    setData(formatarData(currentDate));
  };

  async function salvar() {
    try {
      if (!descricao || !caixa || !categoria || !quantidade || !valor || !data) {
        Alert.alert(t('return.error'), t('return.fill_fields'));
        return;
      }

      if (!validarData(data)) {
        Alert.alert(t('return.error'), t('return.date_format'));
        return;
      }

      const valorNumerico = Number(valor.replace(/\D/g, ''));

      const transacao = {
        descricao,
        caixa,
        categoria,
        quantidade: Number(quantidade),
        valor: valorNumerico,
        tipo_transacao: tipoTransacao,
        acao,
        data
      };

      if (params.id) {
        await atualizarTransacao({
          id: Number(params.id),
          ...transacao
        });
      } else {
        await salvarTransacao(transacao);
      }

      limparCampos();
      router.replace('/');
    } catch (error) {
      console.error('Error saving:', error);
      Alert.alert(t('return.error'), t('return.error_save_transaction'));
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background_primary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 10}
    >
      <Stack.Screen
        options={{
          headerTitle: params.id ? `${t('finance_tab.input')} ${t('action.editing')} #${params.id}` : t('finance_tab.input'),
        }}
      />

      <ScrollView
        style={styles.formContainer}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.inputContainer, { backgroundColor: colors.background_primary }]}>
          <Text style={[styles.label, { color: colors.text_primary }]}>{t('input_finance.description')}</Text>
          <ThemedInput
            value={descricao}
            onChangeText={setDescricao}
            placeholder={t('placeholder.transaction')}
            placeholderTextColor={colors.text_primary}
          />
        </View>

        <View style={[styles.inputContainer, { backgroundColor: colors.background_primary }]}>
          <Text style={[styles.label, { color: colors.text_primary }]}>{t('input_finance.wallet')}</Text>
          <View style={[
            styles.inputWithButtonContainer,
            {
              borderColor: colors.border,
              backgroundColor: colors.background_secondary,
            }
          ]}>
            <ThemedInput
              value={caixa}
              editable={false}
              onChangeText={(text) => {
                setCaixa(text);
                filtrarCaixas(text);
              }}
              placeholder={t('placeholder.wallet')}
              placeholderTextColor={colors.text_primary}
              style={styles.inputInsideButtonContainer}
            />
            <TouchableOpacity
              onPress={() => setShowCaixaModal(true)}
              style={[styles.buttonOnRight, { width: 40, backgroundColor: colors.button_primary }]}
            >
              <AntDesign name="select" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.inputContainer, { backgroundColor: colors.background_primary }]}>
          <Text style={[styles.label, { color: colors.text_primary }]}>{t('input_finance.category')}</Text>
          <View style={[
            styles.inputWithButtonContainer,
            {
              borderColor: colors.border,
              backgroundColor: colors.background_secondary,
            }
          ]}>
            <ThemedInput
              value={categoria}
              editable={false}
              onChangeText={(text) => {
                setCategoria(text);
                filtrarCategorias(text);
              }}
              placeholder={t('placeholder.category')}
              placeholderTextColor={colors.text_primary}
              style={styles.inputInsideButtonContainer}
            />
            <TouchableOpacity
              onPress={() => setShowCategoriaModal(true)}
              style={[styles.buttonOnRight, { width: 40, backgroundColor: colors.button_primary }]}
            >
              <AntDesign name="select" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.inputContainer, { backgroundColor: colors.background_primary }]}>
          <Text style={[styles.label, { color: colors.text_primary }]}>{t('input_finance.value')}</Text>
          <ThemedInput
            value={valor}
            onChangeText={handleValorChange}
            keyboardType="numeric"
            placeholder="R$ 0,00"
            placeholderTextColor={colors.text_primary}
          />
        </View>

        <View style={[styles.inputContainer, { backgroundColor: colors.background_primary }]}>
          <Text style={[styles.label, { color: colors.text_primary }]}>{t('input_finance.quantity')}</Text>
          <QuantityInput
            value={quantidade}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
            onIncrement2={handleIncrement2}
            onDecrement2={handleDecrement2}
          />
        </View>

        <View style={[styles.inputContainer, { backgroundColor: colors.background_primary }]}>
          <Text style={[styles.label, { color: colors.text_primary }]}>{t('input_finance.type')}</Text>
          <View style={[styles.chipGridContainer, { backgroundColor: colors.background_primary }]}>
            {(['PIX', 'Dinheiro', 'Boleto', 'Distinto', 'Débito', 'Crédito', 'TED', 'DOC'] as TipoTransacao[]).map((tipo) => {
              const isSelected = tipoTransacao === tipo;
              return (
                <TouchableOpacity
                  key={tipo}
                  onPress={() => setTipoTransacao(tipo)}
                  style={[
                    styles.chipButton,
                    {
                      backgroundColor: isSelected ? colors.button_primary : colors.background_secondary,
                      borderColor: isSelected ? colors.button_primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: isSelected ? '#FFFFFF' : colors.text_primary, fontWeight: isSelected ? 'bold' : 'normal' },
                    ]}
                  >
                    {tipo}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.inputContainer, { backgroundColor: colors.background_primary }]}>
          <Text style={[styles.label, { color: colors.text_primary }]}>{t('input_finance.action')}</Text>
          <ThemedToggle<Acao>
            options={acaoOptions}
            selectedValue={acao}
            onValueChange={setAcao}
            style={styles.typeButton}
            activeColor={getStatusColor()}
          />
        </View>

        <View style={[styles.inputContainer, { backgroundColor: colors.background_primary }]}>
          <Text style={[styles.label, { color: colors.text_primary }]}>{t('input_finance.date')}</Text>

          <View style={[styles.combinedDateContainer, { borderColor: colors.border, backgroundColor: colors.background_secondary }]}>

            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={styles.dateInputButtonFlex}
            >
              <Text style={[styles.dateInputText, { color: colors.text_primary }]}>
                {data || "Selecionar Data"}
              </Text>
            </TouchableOpacity>

            <ButtonTT
              buttonStyle={styles.inlineButton}
              title={<MaterialIcons name="today" size={24} color="white" />}
              onPress={() => {
                const today = new Date();
                setData(getTodayDate());
                setSelectedDateObject(today);
              }}
              color={colors.button_primary}
            />
          </View>

          {showDatePicker && (
            <DateTimePicker
              style={{ backgroundColor: colors.background_secondary }}
              value={selectedDateObject}
              mode="date"
              display="default"
              onValueChange={onDateChange}
            />
          )}
        </View>
      </ScrollView>

      <View style={[styles.separator, { backgroundColor: colors.border }]} />

      <View style={[styles.buttonContainer, { backgroundColor: colors.background_primary }]}>
        {params.id && (
          <ButtonTT
            title={t('button.cancel_edit')}
            onPress={() => {
              limparCampos();
              router.replace('/');
            }}
            color={colors.danger}
          />
        )}
        <ButtonTT
          title={t('button.clean')}
          onPress={limparApenasCamposFormulario}
          color={colors.info}
        />
        <ButtonTT
          title={params.id ? t('button.save_edit') : t('button.save')}
          onPress={salvar}
          color={colors.success}
        />
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={showCaixaModal}
        onRequestClose={() => setShowCaixaModal(false)}
      >
        <View style={styles.centeredView}>
          <View style={[styles.modalView, { backgroundColor: colors.background_primary, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text_primary }]}>{t('placeholder.wallet')}</Text>
            <ThemedInput
              placeholder={t('placeholder.wallet_create')}
              value={caixa}
              onChangeText={(text) => {
                setCaixa(text);
                filtrarCaixas(text);
              }}
              style={styles.modalSearchInput}
              placeholderTextColor={colors.text_primary}
            />
            <FlatList
              data={caixasFiltradas.length > 0 ? caixasFiltradas : caixas}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    {
                      borderBottomColor: colors.border,
                      backgroundColor: item === caixa ? `${colors.info}20` : 'transparent'
                    }
                  ]}
                  onPress={() => {
                    setCaixa(item);
                    setShowCaixaModal(false);
                  }}
                >
                  <Text style={{ color: colors.text_primary }}>{item}</Text>
                </TouchableOpacity>
              )}
              style={styles.modalList}
            />
            <View style={{ flexDirection: 'row', backgroundColor: colors.background_primary }}>
              <ButtonTT title={t('button.clean')} onPress={() => setCaixa('')} color={colors.info} />
              <ButtonTT title={t('button.create')} onPress={() => setShowCaixaModal(false)} color={colors.success} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={showCategoriaModal}
        onRequestClose={() => setShowCategoriaModal(false)}
      >
        <View style={styles.centeredView}>
          <View style={[styles.modalView, { backgroundColor: colors.background_primary, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text_primary }]}>{t('placeholder.category')}</Text>
            <ThemedInput
              placeholder={t('placeholder.category_create')}
              value={categoria}
              onChangeText={(text) => {
                setCategoria(text);
                filtrarCategorias(text);
              }}
              style={styles.modalSearchInput}
              placeholderTextColor={colors.text_primary}
            />
            <FlatList
              data={categoriasFiltradas.length > 0 ? categoriasFiltradas : categorias}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    {
                      borderBottomColor: colors.border,
                      backgroundColor: item === categoria ? `${colors.info}20` : 'transparent'
                    }
                  ]}
                  onPress={() => {
                    setCategoria(item);
                    setShowCategoriaModal(false);
                  }}
                >
                  <Text style={{ color: colors.text_primary }}>{item}</Text>
                </TouchableOpacity>
              )}
              style={styles.modalList}
            />
            <View style={{ flexDirection: 'row', backgroundColor: colors.background_primary }}>
              <ButtonTT title={t('button.clean')} onPress={() => setCategoria('')} color={colors.info} />
              <ButtonTT title={t('button.create')} onPress={() => setShowCategoriaModal(false)} color={colors.success} />
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  formContainer: {
    flex: 1,
    marginBottom: 10,
  },
  formContent: {
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  separator: {
    height: 1,
    marginBottom: 10,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 0,
  },
  spacer: {
    width: 10,
  },
  inputWithButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0,
    borderRadius: 0,
    overflow: 'hidden',
    height: 60,
    minHeight: 60,
  },
  inputInsideButtonContainer: {
    flex: 1,
    borderWidth: 0,
    minHeight: 60,
  },
  buttonOnRight: {
    paddingHorizontal: 10,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 0,
    borderColor: '#ccc',
  },
  dateInputButton: {
    borderWidth: 0,
    borderRadius: 0,
    padding: 15,
    minHeight: 60,
    justifyContent: 'center',
  },
  dateInputText: {
    fontSize: 16,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
    maxHeight: '80%',
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modalSearchInput: {
    width: '100%',
    marginBottom: 15,
    minHeight: 50,
  },
  modalList: {
    width: '100%',
    maxHeight: 300,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  modalItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  chipGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 5,
  },
  chipButton: {
    flexGrow: 1,
    minWidth: '22%',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 0,
    borderWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeButton: {
    borderWidth: 0,
  },
  chipText: {
    fontSize: 14,
    textAlign: 'center',
  },
  combinedDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0,
    borderRadius: 0,
    overflow: 'hidden',
    height: 60, // Mantém a altura fixa padronizada
  },
  dateInputButtonFlex: {
    flex: 1,
    paddingHorizontal: 15,
    justifyContent: 'center',
  },
  inlineButton: {
    height: '100%', // Faz o botão preencher exatamente a altura do input
    paddingHorizontal: 10,
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 0,
  }
});