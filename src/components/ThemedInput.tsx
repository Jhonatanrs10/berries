import { TextInput as DefaultTextInput, useColorScheme } from 'react-native';
import Colors from '../constants/Colors';

export type ThemedInputProps = DefaultTextInput['props'];

export function ThemedInput(props: ThemedInputProps) {
  const { style, ...otherProps } = props;
  const theme = useColorScheme() ?? 'light';
  const colors = Colors[theme];

  return (
    <DefaultTextInput
      style={[
        {
          color: colors.text_primary,
          backgroundColor: colors.background_secondary,
          borderColor: colors.border,
          borderWidth: 0,
          borderRadius: 0,
          padding: 10,
          fontSize: 16,
          height: 60,
          paddingHorizontal: 15
        },
        style,
      ]}
      placeholderTextColor={colors.text_primary + '80'}
      {...otherProps}
    />
  );
} 