import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { View, Text } from '../Themed';
import { ThemedInput } from '../ThemedInput';
import ButtonTT from './ButtonTT';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../useColorScheme';

interface LinkModalButtonProps {
  title?: string;
  storageKey: string; // CHAVE ÚNICA PARA CADA BOTÃO
  color?: string;
}

export default function LinkModalButton({
  title = 'Abrir Link',
  storageKey,
  color,
}: LinkModalButtonProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { t } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);
  const [savedLink, setSavedLink] = useState('');
  const [tempLink, setTempLink] = useState('');

  // Carrega o link usando a chave específica deste botão
  useEffect(() => {
    async function loadLink() {
      try {
        const storedLink = await AsyncStorage.getItem(storageKey);
        if (storedLink) {
          setSavedLink(storedLink);
          setTempLink(storedLink);
        }
      } catch (error) {
        console.error(`Erro ao carregar link para ${storageKey}:`, error);
      }
    }
    loadLink();
  }, [storageKey]);

  const handleOpenLink = async () => {
    if (!savedLink) {
      Alert.alert(
        t('linkModal.alerts.noLinkTitle'),
        t('linkModal.alerts.noLinkMessage')
      );
      return;
    }

    try {
      const supported = await Linking.canOpenURL(savedLink);
      if (supported) {
        await Linking.openURL(savedLink);
      } else {
        Alert.alert(
          t('linkModal.alerts.errorTitle'),
          t('linkModal.alerts.cannotOpenUrl', { url: savedLink })
        );
      }
    } catch (error) {
      console.error('Erro ao abrir link:', error);
      Alert.alert(
        t('linkModal.alerts.errorTitle'),
        t('linkModal.alerts.openUrlError')
      );
    }
  };

  const handlePasteLink = async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();
      if (clipboardContent) {
        const match = clipboardContent.match(/https?:\/\/.*/i);
        if (match) {
          setTempLink(match[0].trim());
        } else {
          Alert.alert(
            t('linkModal.alerts.warningTitle'),
            t('linkModal.alerts.noValidUrlClipboard')
          );
        }
      } else {
        Alert.alert(
          t('linkModal.alerts.warningTitle'),
          t('linkModal.alerts.emptyClipboard')
        );
      }
    } catch (error) {
      console.error('Erro ao colar link:', error);
      Alert.alert(
        t('linkModal.alerts.errorTitle'),
        t('linkModal.alerts.pasteError')
      );
    }
  };

  // Salva na chave específica definida pela prop storageKey
  const handleSave = async () => {
    try {
      await AsyncStorage.setItem(storageKey, tempLink);
      setSavedLink(tempLink);
      setModalVisible(false);
      Alert.alert(
        t('linkModal.alerts.successTitle'),
        t('linkModal.alerts.linkSaved')
      );
    } catch (error) {
      console.error('Erro ao salvar link:', error);
      Alert.alert(
        t('linkModal.alerts.errorTitle'),
        t('linkModal.alerts.saveError')
      );
    }
  };

  return (
    <View style={styles.container}>
      <ButtonTT
        title={title}
        onPress={handleOpenLink}
        onLongPress={() => {
          setTempLink(savedLink);
          setModalVisible(true);
        }}
        color={color || colors.success}
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.background_primary, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text_primary }]}>
              {t('linkModal.title')}
            </Text>

            <View style={styles.inputContainer}>
              <View style={styles.linkInputContainer}>
                <ThemedInput
                  value={tempLink}
                  onChangeText={setTempLink}
                  placeholder={t('linkModal.placeholder')}
                  placeholderTextColor={colors.text_primary}
                  style={styles.linkTextInput}
                />
                <TouchableOpacity
                  onPress={handlePasteLink}
                  onLongPress={() => setTempLink('')}
                  style={[
                    styles.buttonInInput,
                    { backgroundColor: colors.info },
                  ]}
                >
                  <MaterialIcons name="content-paste" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <ButtonTT
                title={t('linkModal.cancel')}
                onPress={() => setModalVisible(false)}
                color={colors.danger}
              />
              <View style={{ width: 10, backgroundColor: "transparent" }} />
              <ButtonTT
                title={t('linkModal.save')}
                onPress={handleSave}
                color={colors.success}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 5,
    backgroundColor: 'transparent',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  inputContainer: {
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  linkInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
  },
  linkTextInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 15,
    fontSize: 16,
  },
  buttonInInput: {
    width: 45,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
});