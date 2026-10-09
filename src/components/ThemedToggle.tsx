import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme, ViewStyle } from 'react-native';
import Colors from '../constants/Colors'; // AJUSTE O CAMINHO CONFORME NECESSÁRIO

// Define o formato de cada opção que o componente aceita
export interface ToggleOption<T> {
  label: string; // O texto visível no botão (ex: "Assistindo")
  value: T;     // O valor que será retornado (ex: "assistindo")
}

interface ThemedToggleProps<T> {
  options: ToggleOption<T>[]; // Array de opções
  selectedValue: T;
  onValueChange: (value: T) => void;
  style?: ViewStyle; // Permite estilizar o container externo
  activeColor?: string;
}

// O componente é genérico (<T>) para aceitar diferentes tipos de valores
export function ThemedToggle<T>({ options, selectedValue, onValueChange, style, activeColor }: ThemedToggleProps<T>) {
  const theme = useColorScheme() ?? 'light';
  const colors = Colors[theme];
  
  // O componente funciona melhor com 2 opções, mas aceita mais (exibindo as 2 primeiras)
  const effectiveOptions = options.slice(0, 7);

  return (
    <View style={[styles.toggleContainer, style, { 
        backgroundColor: colors.background_secondary, 
        borderColor: colors.border 
    }]}>
      {effectiveOptions.map((option) => {
        const isSelected = selectedValue === option.value;
        
        // Estilo do botão: Fundo temático
        const buttonStyle = [
            styles.button,
            { backgroundColor: colors.background_secondary }, // Fundo padrão
            isSelected && { 
                // Fundo quando selecionado: usa a cor primária para destaque
                backgroundColor: activeColor || colors.button_primary,
            },
        ];

        // Estilo do texto: Cores temáticas
        const textStyle = [
            styles.buttonText,
            { color: colors.text_primary }, // Cor do texto padrão
            isSelected && { 
                // Cor do texto quando selecionado: Branco para contraste
                color: colors.text_primary || '#FFFFFF', 
            },
        ];

        return (
          <TouchableOpacity
            key={option.label}
            style={buttonStyle}
            onPress={() => onValueChange(option.value)}
          >
            <Text style={textStyle}>{option.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 0, // Borda arredondada
    height: 60,
    overflow: 'hidden',
    borderWidth: 0, // Borda sutil
    width: '100%',
  },
  button: {
    flex: 1, // Distribui o espaço igualmente
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});