import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  GestureResponderEvent,
  Platform,
  ImageSourcePropType, // Importar para tipar a fonte da imagem
  ViewStyle,
  TextStyle,
  ImageBackground
} from 'react-native';

import { Text, View } from '../../components/Themed';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../../components/useColorScheme';

interface ButtonTTAPPProps {
  title: string;
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  delayLongPress?: number;
  buttonStyle?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  color?: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' | string;

  displayButton?: boolean;
  // --- NOVA PROPRIEDADE PARA A IMAGEM ---
  imageSource?: ImageSourcePropType; // Adicionando a prop para a fonte da imagem
}

const ButtonTTAPP: React.FC<ButtonTTAPPProps> = ({
  title,
  onPress,
  onLongPress,
  delayLongPress = 500,
  buttonStyle,
  textStyle,
  disabled = false,
  color = 'primary',
  displayButton = true,
  imageSource, // Recebendo a nova prop
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme || 'light'];

  const getBackgroundColor = () => {
    if (colors[color as keyof typeof colors]) {
      return colors[color as keyof typeof colors];
    }
    if (typeof color === 'string' && color.startsWith('#')) {
      return color;
    }
    return colors.info;
  };

  const buttonBackgroundColor = getBackgroundColor();
  const displayStyle: ViewStyle = displayButton ? { display: 'flex' } : { display: 'none' };

  return (
    <TouchableOpacity
      style={[
        styles.buttonContainer,
        // Removendo a cor de fundo do TouchableOpacity se a intenção é que a ImageBackground preencha
        // { backgroundColor: colors.background_secondary },
        disabled && styles.buttonDisabled,
        displayStyle,
        buttonStyle,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={delayLongPress}
      activeOpacity={0.7}
      disabled={disabled || !displayButton}
    >
      {imageSource ? (
        <ImageBackground
          source={imageSource} // Usando a prop imageSource aqui
          style={styles.imageBackground}
          imageStyle={styles.imageStyle}
        >
          <Text
            style={[
              styles.buttonText,
              // Removendo a cor de texto dinâmica do colors.text_primary se a intenção é que seja sempre white para contraste
              // { color: colors.text_primary },
              disabled && styles.textDisabled,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </ImageBackground>
      ) : (
        // Renderiza apenas o Text se não houver imageSource, talvez com uma cor de fundo sólida
        <View style={[styles.imageBackground, { backgroundColor: buttonBackgroundColor }]}>
          <Text
            style={[
              styles.buttonText,
              { color: colors.text_primary }, // Aqui pode usar a cor do tema se não houver imagem
              disabled && styles.textDisabled,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    width: '90%',
    height: 120,
    borderRadius: 10,
    overflow: 'hidden',
    // Remover ou ajustar estas sombras se quiser que o ImageBackground cuide disso
    ...Platform.select({
      ios: {
        shadowColor: '#000', // Padrão
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  imageBackground: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  imageStyle: {
    resizeMode: 'cover',
    borderRadius: 10,
    
  },
  buttonText: {
    color: 'white', // GERALMENTE, texto em cima de imagem precisa ser branco ou preto
    fontSize: 18,
    fontWeight: 'bold',
    margin: 10,
    marginEnd: 15,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 1,
  },
  // Estes estilos de `buttonBase` parecem ser para um botão sem imagem de fundo
  // e podem estar em conflito ou não sendo utilizados com a estrutura atual.
  // Considere se são necessários ou se devem ser refatorados para um caso de uso diferente.
  buttonBase: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    borderRadius: 40,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    minWidth: 0,
    width: 350,
    height: 150,
    ...Platform.select({
      ios: {
        shadowColor: '#fff',
        shadowOffset: { width: 5, height: 5 },
        shadowOpacity: 0.0,
        shadowRadius: 0,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  buttonTextBase: {
    fontSize: 20,
    fontWeight: 'bold',
    margin: 10,
    marginEnd: 25
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  textDisabled: {
    color: '#A0A0A0',
  },
  image: {
    // Este estilo 'image' não está sendo usado. Pode ser removido.
  }
});

export default ButtonTTAPP;