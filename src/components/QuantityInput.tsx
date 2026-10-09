import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import Colors from '../constants/Colors'; // Ajuste o caminho conforme necessário

interface QuantityInputProps {
    value: string;
    onIncrement: () => void;
    onDecrement: () => void;
    onIncrement2: () => void;
    onDecrement2: () => void;
}

export function QuantityInput({
    value,
    onIncrement,
    onDecrement,
    onIncrement2,
    onDecrement2,
}: QuantityInputProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];

    // Replicando o estilo do 'seasonGroup' do DynamicSeasonInput
    const seasonGroupStyle = {
        backgroundColor: colors.background_secondary,
    };

    return (
        <View style={styles.container}>

         
            <View style={[styles.seasonGroup, seasonGroupStyle]}>

              
                <TouchableOpacity
                    // Replicando styles.valueButton do DynamicSeasonInput
                    style={[styles.valueButton, { backgroundColor: colors.button_primary }]}
                    onPress={onDecrement}
                    onLongPress={onDecrement2}
                >
                    <Text style={styles.valueButtonText}>−</Text>
                </TouchableOpacity>

              
                <Text
                    // Replicando styles.valueDisplay do DynamicSeasonInput
                    style={[
                        styles.valueDisplay,
                        {
                            borderColor: colors.border,
                            color: colors.text_primary,
                            backgroundColor: colors.background_secondary, // Mantém o fundo, embora o pai já o tenha
                        },
                    ]}
                >
                    {value || '0'} 
                </Text>

    
                <TouchableOpacity
                    // Replicando styles.valueButton do DynamicSeasonInput
                    style={[styles.valueButton, { backgroundColor: colors.button_primary }]}
                    onPress={onIncrement}
                    onLongPress={onIncrement2}
                >
                    <Text style={styles.valueButtonText}>+</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginBottom: 0, // Espaçamento inferior para campos
    },
    // Estilo replicado de 'seasonGroup' do DynamicSeasonInput
    seasonGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 0,
        height: 60,
        borderRadius: 0,
        borderWidth: 0,
    },
    // Estilo replicado de 'valueButton' do DynamicSeasonInput
    valueButton: {
        width: 40,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 0,
    },
    // Estilo replicado de 'valueButtonText' do DynamicSeasonInput
    valueButtonText: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
    },
    // Estilo replicado de 'valueDisplay' do DynamicSeasonInput
    valueDisplay: {
        flex: 1,
        paddingHorizontal: 15,
        textAlign: 'center',
        fontSize: 16,
        borderRadius: 0,
        borderWidth: 0,
        height: '100%',
        textAlignVertical: 'center', // Para Android
        // Linha abaixo é crucial para centralização vertical em iOS
        lineHeight: 60, // Deve ser igual à altura (height) para centralização vertical em iOS
        backgroundColor: 'transparent',
    },
});