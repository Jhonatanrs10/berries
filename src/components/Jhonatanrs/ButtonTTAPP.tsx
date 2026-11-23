import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  GestureResponderEvent,
  Platform,
  ImageSourcePropType,
  ViewStyle,
  TextStyle,
  Image,
  Text as RNText,
  View as RNView,
} from 'react-native';

import { View } from '../../components/Themed';
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
  imageSource?: ImageSourcePropType;
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
  imageSource,
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
        <RNView style={styles.imageWrapper}>
          <Image
            source={imageSource}
            resizeMode="cover"
            style={styles.image}
          />
          <RNText
            numberOfLines={2}
            style={[
              styles.buttonText,
              styles.overlayText,
              disabled && styles.textDisabled,
              textStyle,
            ]}
          >
            {title}
          </RNText>
        </RNView>
      ) : (
        <View style={[styles.imageWrapper, { backgroundColor: buttonBackgroundColor }]}>
          <RNText
            numberOfLines={2}
            style={[
              styles.buttonText,
              { color: colors.text_primary },
              disabled && styles.textDisabled,
              textStyle,
            ]}
          >
            {title}
          </RNText>
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
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlayText: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    margin: 10,
    marginEnd: 15,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 1,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  textDisabled: {
    color: '#A0A0A0',
  },
});

export default ButtonTTAPP;