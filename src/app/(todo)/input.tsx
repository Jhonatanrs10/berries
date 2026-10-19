import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useCallback } from 'react';
import ButtonTT from '../../components/Jhonatanrs/ButtonTT';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Text, View } from '../../components/Themed';
import { ThemedInput } from '../../components/ThemedInput';
import { salvarTarefa, atualizarTarefa } from '../../database/db';
import { formatarData, validarData } from '../../utils/formatacao';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../../components/useColorScheme';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function TodoInput() {
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('');
  const [tempoMinutos, setTempoMinutos] = useState('');
  const [data, setData] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDateObject, setSelectedDateObject] = useState<Date>(new Date());

  const getTodayDate = useCallback(() => {
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, '0');
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();
    return `${dia}/${mes}/${ano}`;
  }, []);

  const limparFormulario = useCallback(() => {
    setTitulo('');
    setDescricao('');
    setCategoria('');
    setTempoMinutos('');
    const hoje = new Date();
    setData(getTodayDate());
    setSelectedDateObject(hoje);
    router.setParams({ id: undefined });
  }, [router, getTodayDate]);

  useFocusEffect(
    useCallback(() => {
      if (!params.id) {
        limparFormulario();
      }
    }, [params.id, limparFormulario])
  );

  useEffect(() => {
    if (params.id) {
      setTitulo((params.titulo as string) || '');
      setDescricao((params.descricao as string) || '');
      setCategoria((params.categoria as string) || '');
      setTempoMinutos(params.tempoMinutos?.toString() || '');

      if (params.data) {
        setData(params.data as string);
        const [day, month, year] = (params.data as string).split('/').map(Number);
        setSelectedDateObject(new Date(year, month - 1, day));
      }
    }
  }, [params.id]);

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || selectedDateObject;
    setShowDatePicker(Platform.OS === 'ios');
    setSelectedDateObject(currentDate);
    setData(formatarData(currentDate));
  };

  async function salvar() {
    try {
      if (!titulo.trim()) {
        Alert.alert(t('return.error'), 'Informe pelo menos o título da tarefa.');
        return;
      }

      if (!validarData(data)) {
        Alert.alert(t('return.error'), t('return.date_format'));
        return;
      }

      const duracao = parseInt(tempoMinutos, 10) || 0;

      const tarefaData = {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        categoria: categoria.trim() || 'Geral',
        tempoMinutos: duracao,
        concluida: false,
        data,
      };

      if (params.id) {
        await atualizarTarefa({
          id: Number(params.id),
          ...tarefaData,
          concluida: params.concluida === '1' || params.concluida === 'true',
        });
      } else {
        await salvarTarefa(tarefaData);
      }

      limparFormulario();
      router.replace('/');
    } catch (error) {
      console.error('Erro ao salvar tarefa:', error);
      Alert.alert(t('return.error'), 'Não foi possível salvar a tarefa.');
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background_primary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen
        options={{
          headerTitle: params.id ? `Editar Tarefa #${params.id}` : 'Nova Tarefa',
        }}
      />

      <ScrollView
        style={styles.formContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text_primary }]}>Título da Tarefa *</Text>
          <ThemedInput
            value={titulo}
            onChangeText={setTitulo}
            placeholder="Ex: Estudar React Native"
            placeholderTextColor={colors.text_primary}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text_primary }]}>Descrição / Observações</Text>
          <ThemedInput
            value={descricao}
            onChangeText={setDescricao}
            placeholder="Ex: Ler capítulo 3 da documentação"
            placeholderTextColor={colors.text_primary}
            multiline
            style={{ minHeight: 80 }}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text_primary }]}>Categoria</Text>
          <ThemedInput
            value={categoria}
            onChangeText={setCategoria}
            placeholder="Ex: Estudos, Trabalho, Pessoal"
            placeholderTextColor={colors.text_primary}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text_primary }]}>Tempo estimado/gasto (minutos)</Text>
          <ThemedInput
            value={tempoMinutos}
            onChangeText={setTempoMinutos}
            keyboardType="numeric"
            placeholder="Ex: 45"
            placeholderTextColor={colors.text_primary}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text_primary }]}>{t('input_finance.date')}</Text>
          <View style={[styles.combinedDateContainer, { borderColor: colors.border, backgroundColor: colors.background_secondary }]}>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={styles.dateInputButtonFlex}
            >
              <Text style={[styles.dateInputText, { color: colors.text_primary }]}>
                {data || getTodayDate()}
              </Text>
            </TouchableOpacity>

            <ButtonTT
              buttonStyle={styles.inlineButton}
              title={<MaterialIcons name="today" size={24} color="white" />}
              onPress={() => {
                const hoje = new Date();
                setData(getTodayDate());
                setSelectedDateObject(hoje);
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
              limparFormulario();
              router.replace('/');
            }}
            color={colors.danger}
          />
        )}
        <ButtonTT
          title={t('button.clean')}
          onPress={limparFormulario}
          color={colors.info}
        />
        <ButtonTT
          title={params.id ? t('button.save_edit') : t('button.save')}
          onPress={salvar}
          color={colors.success}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  formContainer: { flex: 1, marginBottom: 10 },
  formContent: { paddingBottom: 20 },
  separator: { height: 1, marginBottom: 10 },
  inputContainer: { marginBottom: 15 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  combinedDateContainer: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, overflow: 'hidden', height: 55,
  },
  dateInputButtonFlex: { flex: 1, paddingHorizontal: 15, justifyContent: 'center' },
  dateInputText: { fontSize: 16 },
  inlineButton: { height: '100%', paddingHorizontal: 15, justifyContent: 'center', alignItems: 'center' },
});