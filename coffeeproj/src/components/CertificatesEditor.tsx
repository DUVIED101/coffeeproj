import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../config/constants';

type Props = {
  certificates: string[];
  isBusy?: boolean;
  onAdd: (name: string) => Promise<void> | void;
  onRemove: (cert: string) => Promise<void> | void;
};

const MAX_NAME_LENGTH = 120;

export const CertificatesEditor: React.FC<Props> = ({
  certificates,
  isBusy = false,
  onAdd,
  onRemove,
}) => {
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const startAdding = (): void => {
    setDraft('');
    setIsAdding(true);
  };

  const cancelAdding = (): void => {
    setDraft('');
    setIsAdding(false);
  };

  const submitDraft = async (): Promise<void> => {
    const name = draft.trim();
    if (!name || isBusy) return;
    if (certificates.includes(name)) {
      Alert.alert(
        t('certificatesEditor.duplicateTitle', { defaultValue: 'Уже добавлено' }),
        t('certificatesEditor.duplicateBody', {
          name,
          defaultValue: `"${name}" уже в списке.`,
        })
      );
      return;
    }
    await onAdd(name);
    setDraft('');
    setIsAdding(false);
  };

  const confirmRemove = (cert: string): void => {
    Alert.alert(
      t('certificatesEditor.removeTitle', { defaultValue: 'Удалить сертификат' }),
      t('certificatesEditor.removeBody', { name: cert, defaultValue: `Удалить "${cert}"?` }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => onRemove(cert) },
      ]
    );
  };

  return (
    <View>
      {certificates.map((cert, index) => (
        <View key={`${index}-${cert}`} style={styles.row}>
          <Text style={styles.indexText}>{index + 1}.</Text>
          <Text style={styles.nameText} numberOfLines={3}>
            {cert}
          </Text>
          <TouchableOpacity
            onPress={() => confirmRemove(cert)}
            hitSlop={8}
            accessibilityLabel={t('certificatesEditor.removeA11y', {
              name: cert,
              defaultValue: `Удалить ${cert}`,
            })}
            style={styles.removeButton}>
            <Text style={styles.removeText}>×</Text>
          </TouchableOpacity>
        </View>
      ))}

      {isAdding ? (
        <View style={styles.editorRow}>
          <Text style={styles.indexText}>{certificates.length + 1}.</Text>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder={t('certificatesEditor.draftPlaceholder', {
              defaultValue: 'Название сертификата',
            })}
            placeholderTextColor={COLORS.textSecondary}
            maxLength={MAX_NAME_LENGTH}
            editable={!isBusy}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={submitDraft}
          />
          <TouchableOpacity
            onPress={submitDraft}
            disabled={isBusy || draft.trim().length === 0}
            style={[
              styles.saveButton,
              (isBusy || draft.trim().length === 0) && styles.saveButtonDisabled,
            ]}>
            <Text style={styles.saveButtonText}>OK</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={cancelAdding} hitSlop={8} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>×</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity onPress={startAdding} disabled={isBusy} style={styles.addButton}>
          <Text style={styles.addButtonText}>
            {t('certificatesEditor.addButton', { defaultValue: '+ Добавить' })}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  editorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  indexText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    minWidth: 22,
  },
  nameText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeText: {
    color: COLORS.textSecondary,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 20,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: '#fff',
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: 22,
    lineHeight: 24,
  },
  addButton: {
    marginTop: 8,
    paddingVertical: 10,
    alignItems: 'flex-start',
  },
  addButtonText: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '600',
  },
});
