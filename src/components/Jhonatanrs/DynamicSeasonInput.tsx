import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ViewStyle,
  TextStyle,
} from 'react-native';

import Colors from '../../constants/Colors';
import { useColorScheme } from '../../components/useColorScheme';

interface SeasonItem {
  id: number;
  value: number;
}

export interface DynamicSeasonInputRef {
  getFilledSeasons: () => number[];
  clearAllSeasons: () => void;
  setInitialSeasons: (values: number[]) => void;
}

interface DynamicSeasonInputProps {
  onChange: (seasons: number[]) => void;
  initialValues?: number[];
  labelPrefix?: string;
  style?: ViewStyle;
  labelStyle?: TextStyle;
  seasonContainerStyle?: ViewStyle;
  addButtonStyle?: ViewStyle;
  addButtonTextStyle?: TextStyle;
}

const DynamicSeasonInput = forwardRef<DynamicSeasonInputRef, DynamicSeasonInputProps>(
  (
    { onChange, initialValues = [], labelPrefix = "Season", style, labelStyle, seasonContainerStyle },
    ref
  ) => {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];

    // --- MUDANÇA AQUI: Centralizando a gestão do ID ---
    // Usamos um useRef para um contador de IDs que persiste entre re-renderizações.
    // Inicializamos ele uma única vez para garantir IDs sequenciais e únicos.
    const uniqueIdCounter = useRef(0);

    // Função para obter o próximo ID único
    const getNextId = useCallback(() => {
        uniqueIdCounter.current += 1;
        return uniqueIdCounter.current;
    }, []);


    const [seasons, setSeasons] = useState<SeasonItem[]>(() => {
      // Quando o componente monta pela primeira vez ou initialValues são passados,
      // precisamos gerar IDs únicos para eles.
      if (initialValues.length > 0) {
        // Mapeia os valores iniciais para SeasonItems com IDs únicos.
        // É importante que getNextId() seja chamado para cada um aqui.
        const initialSeasonItems = initialValues.map(val => ({
          id: getNextId(), // Garante um ID único para cada item inicial
          value: val,
        }));

        // Adiciona um campo vazio extra se o último campo inicial tiver um valor > 0.
        // O ID deste campo também será único.
        const lastInitialValue = initialSeasonItems[initialSeasonItems.length - 1];
        if (lastInitialValue && lastInitialValue.value > 0) {
          initialSeasonItems.push({ id: getNextId(), value: 0 });
        }
        return initialSeasonItems;
      }
      // Se não houver valores iniciais, começa com um único campo vazio com um ID único.
      return [{ id: getNextId(), value: 0 }];
    });

    // Removido o useEffect para idCounterRef.current, pois o contador agora é gerido internamente
    // e inicializado de forma mais robusta no useState.

    const intervalRef = useRef<NodeJS.Timeout | number | null>(null);

    const getParsedValues = useCallback((items: SeasonItem[]): number[] => {
      return items
        .filter(s => s.value > 0)
        .map(s => s.value);
    }, []);

    useEffect(() => {
      const currentParsedValues = getParsedValues(seasons);
      onChange(currentParsedValues);
    }, [seasons, onChange, getParsedValues]);

    const applySeasonLogic = useCallback((updatedSeasons: SeasonItem[]) => {
      const lastFilledIndex = updatedSeasons.reduce((acc, season, index) => {
        if (season.value > 0) return index;
        return acc;
      }, -1);

      if (lastFilledIndex !== updatedSeasons.length - 1 && lastFilledIndex !== -1) {
        updatedSeasons = updatedSeasons.slice(0, lastFilledIndex + 1);
      }

      const lastSeasonItem = updatedSeasons[updatedSeasons.length - 1];
      if (lastSeasonItem && lastSeasonItem.value > 0) {
        updatedSeasons.push({ id: getNextId(), value: 0 });
      } else if (updatedSeasons.length === 0) {
        updatedSeasons.push({ id: getNextId(), value: 0 });
      }
      return updatedSeasons;
    }, [getNextId]);

    const changeSeasonValue = useCallback((id: number, amount: number) => {
      setSeasons(prevSeasons => {
        const updatedSeasons = prevSeasons.map(season =>
          season.id === id ? { ...season, value: Math.max(0, season.value + amount) } : season
        );
        return applySeasonLogic(updatedSeasons);
      });
    }, [applySeasonLogic]);

    const handlePressIn = useCallback((id: number, initialAmount: number, intervalAmount: number) => {
      changeSeasonValue(id, initialAmount);

      if (intervalRef.current) {
        clearInterval(intervalRef.current as number);
      }

      intervalRef.current = setInterval(() => {
        changeSeasonValue(id, intervalAmount);
      }, 250);
    }, [changeSeasonValue]);

    const handlePressOut = useCallback(() => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current as number);
        intervalRef.current = null;
      }
    }, []);

    const removeSeasonInput = useCallback((id: number) => {
      setSeasons(prevSeasons => {
        const updatedSeasons = prevSeasons.filter(season => season.id !== id);
        if (updatedSeasons.length === 0) {
          return [{ id: getNextId(), value: 0 }];
        }
        return applySeasonLogic(updatedSeasons);
      });
    }, [getNextId, applySeasonLogic]);

    useImperativeHandle(ref, () => ({
      getFilledSeasons: () => getParsedValues(seasons),
      clearAllSeasons: () => {
        setSeasons([{ id: getNextId(), value: 0 }]);
      },
      setInitialSeasons: (newInitialValues = []) => {
        if (newInitialValues && newInitialValues.length > 0) {
          // Ao definir novos valores iniciais, REGENERE TODOS os IDs para evitar conflitos
          const initialSeasonItems = newInitialValues.map(val => ({ id: getNextId(), value: val }));
          const lastInitialValue = initialSeasonItems[initialSeasonItems.length - 1];
          if (lastInitialValue && lastInitialValue.value > 0) {
            initialSeasonItems.push({ id: getNextId(), value: 0 });
          }
          setSeasons(applySeasonLogic(initialSeasonItems));
        } else {
          setSeasons([{ id: getNextId(), value: 0 }]);
        }
      },
    }));

    return (
      <KeyboardAvoidingView
        style={[styles.container, style]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.contentContainer}>
          {seasons.map((season, index) => (
            // A chave é o ID único da temporada, garantido pelo getNextId
            <View key={season.id}>
              <Text style={[styles.label, labelStyle, { color: colors.text_primary }]}>{labelPrefix} {index + 1}:</Text>
              <View style={[styles.seasonGroup, seasonContainerStyle, { backgroundColor: colors.background_secondary }]}>

                <TouchableOpacity
                  onPressIn={() => handlePressIn(season.id, -1, -10)}
                  onPressOut={handlePressOut}
                  style={[styles.valueButton, { backgroundColor: colors.button_primary }]}
                >
                  <Text style={styles.valueButtonText}>-</Text>
                </TouchableOpacity>

                <Text
                  style={[
                    styles.valueDisplay,
                    {
                      borderColor: colors.border,
                      color: colors.text_primary,
                      backgroundColor: colors.background_secondary,
                    },
                  ]}
                >
                  {season.value > 0 ? season.value : '0'}
                </Text>

                {seasons.length < 0 && (
                  <TouchableOpacity
                    onPress={() => removeSeasonInput(season.id)}
                    style={[styles.removeButton, { backgroundColor: colors.danger }]}
                  >
                    <Text style={styles.removeButtonText}>X</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPressIn={() => handlePressIn(season.id, 1, 10)}
                  onPressOut={handlePressOut}
                  style={[styles.valueButton, { backgroundColor: colors.button_primary }]}
                >
                  <Text style={styles.valueButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </KeyboardAvoidingView>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  contentContainer: {
    flexGrow: 0,
    paddingBottom: 20,
    justifyContent: 'center'
  },
  seasonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    padding: 0,
    height: 60,
    borderRadius: 0,
    borderWidth: 0,
    borderColor: '#ccc'
  },
  label: {
    marginRight: 10,
    minWidth: 80,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10
  },
  valueButton: {
    width: 40,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 0,
  },
  valueButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  valueDisplay: {
    flex: 1,
    paddingHorizontal: 15,
    textAlign: 'center',
    fontSize: 16,
    borderRadius: 0,
    borderWidth: 0,
    height: '100%',
    textAlignVertical: 'center',
    backgroundColor: 'transparent',
  },
  removeButton: {
    width: 45,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 0,
  },
  removeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  addButton: {
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default DynamicSeasonInput;