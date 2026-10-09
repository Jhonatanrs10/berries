import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../../components/useColorScheme';

type Props = {
    onQuantityChange: (newQuantity: number) => void;
    initialQuantity?: number;
};

const QuantitySelector = ({ onQuantityChange, initialQuantity = 1 }: Props) => {
    const [quantity, setQuantity] = useState(initialQuantity);

    // Ref para o temporizador de repetição ao segurar o botão
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        setQuantity(initialQuantity);
    }, [initialQuantity]);

    // Limpa o temporizador quando o componente é desmontado
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    const handleIncrement = () => {
        const newQuantity = quantity + 1;
        setQuantity(newQuantity);
        onQuantityChange(newQuantity);
    };

    const handleDecrement = () => {
        const newQuantity = quantity > 1 ? quantity - 1 : 1;
        setQuantity(newQuantity);
        onQuantityChange(newQuantity);
    };

    // Lógica para quando o botão de '+' é segurado
    const handleLongPressIncrementStart = () => {
        // Limpa qualquer temporizador anterior para evitar múltiplos intervalos
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        // Começa a incrementar de 10 em 10 a cada 100ms
        intervalRef.current = setInterval(() => {
            setQuantity(prevQuantity => {
                const newQuantity = prevQuantity + 10;
                onQuantityChange(newQuantity);
                return newQuantity;
            });
        }, 500); // Ajuste este valor para controlar a velocidade da repetição
    };

    // Lógica para quando o botão de '-' é segurado
    const handleLongPressDecrementStart = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        // Começa a decrementar de 10 em 10 a cada 100ms
        intervalRef.current = setInterval(() => {
            setQuantity(prevQuantity => {
                const newQuantity = prevQuantity > 10 ? prevQuantity - 10 : 1; // Garante que não vá abaixo de 1
                onQuantityChange(newQuantity);
                return newQuantity;
            });
        }, 500); // Ajuste este valor para controlar a velocidade da repetição
    };

    // Lógica para quando o toque longo é encerrado (soltar o botão)
    const handleLongPressEnd = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];

    return (
        <View style={[styles.container,{backgroundColor: colors.background_primaryColor}]}>
            <Pressable
                style={[styles.button,{backgroundColor: colors.background_secondary}]}
                onPress={handleDecrement}
                onLongPress={handleLongPressDecrementStart} // Inicia o decremento de 10 em 10
                onPressOut={handleLongPressEnd} // Para o decremento quando solta
                delayLongPress={300} // Segura por 2 segundos para ativar o -10
            >
                <Text style={[styles.buttonText,{color: colors.text_primary}]}>-</Text>
            </Pressable>

            <Pressable
                style={[styles.button,{backgroundColor: colors.background_secondary}]}
                onPress={handleIncrement}
                onLongPress={handleLongPressIncrementStart} // Inicia o incremento de 10 em 10
                onPressOut={handleLongPressEnd} // Para o incremento quando solta
                delayLongPress={300} // Segura por 2 segundos para ativar o +10
            >
                <Text style={[styles.buttonText,{color: colors.text_primary}]}>+</Text>
            </Pressable>
        </View>
    );
};

export default QuantitySelector;

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
        margin: 0,
        marginHorizontal: "5%",
        padding: 0,
        width: '90%',
    },
    button: {
        width: 180,
        height: 90,
        borderRadius: 0,
        backgroundColor: '#eee',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 0,
        elevation: 1,
    },
    buttonText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    quantityDisplay: {
        minWidth: 80,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 0,
        borderColor: '#ccc',
        elevation: 1,
    },
    quantityText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
});