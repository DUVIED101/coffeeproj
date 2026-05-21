import React from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../config/constants';
import type { SocialLink, SocialPlatform } from '../types/business';

type Props = {
  links: SocialLink[];
  onChange: (next: SocialLink[]) => void;
  disabled?: boolean;
};

const MAX_VALUE_LENGTH = 200;

const PLATFORM_OPTIONS: { value: SocialPlatform; label: string; placeholder: string }[] = [
  { value: 'instagram', label: 'Instagram', placeholder: '@handle' },
  { value: 'telegram', label: 'Telegram', placeholder: '@channel' },
  { value: 'vk', label: 'VK', placeholder: 'vk.com/...' },
  { value: 'website', label: 'Сайт', placeholder: 'https://...' },
  { value: 'other', label: 'Другое', placeholder: 'URL или контакт' },
];

const getPlaceholder = (platform: SocialPlatform): string =>
  PLATFORM_OPTIONS.find(o => o.value === platform)?.placeholder ?? '';

export const SocialLinksEditor: React.FC<Props> = ({ links, onChange, disabled = false }) => {
  const updateLink = (index: number, patch: Partial<SocialLink>): void => {
    const next = links.map((link, i) => (i === index ? { ...link, ...patch } : link));
    onChange(next);
  };

  const addLink = (): void => {
    onChange([...links, { platform: 'instagram', value: '' }]);
  };

  const confirmRemove = (index: number): void => {
    Alert.alert('Удалить запись', 'Удалить эту социальную сеть?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => onChange(links.filter((_, i) => i !== index)),
      },
    ]);
  };

  const rows = links.length > 0 ? links : [{ platform: 'instagram' as SocialPlatform, value: '' }];

  return (
    <View>
      {rows.map((link, index) => (
        <View key={index} style={styles.row}>
          <View style={styles.platformsRow}>
            {PLATFORM_OPTIONS.map(opt => {
              const isActive = link.platform === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  disabled={disabled}
                  onPress={() => {
                    if (links.length === 0) {
                      onChange([{ platform: opt.value, value: '' }]);
                    } else {
                      updateLink(index, { platform: opt.value });
                    }
                  }}
                  style={[styles.platformChip, isActive && styles.platformChipActive]}>
                  <Text
                    style={[styles.platformChipText, isActive && styles.platformChipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.valueRow}>
            <TextInput
              style={styles.input}
              value={link.value}
              onChangeText={text => {
                if (links.length === 0) {
                  onChange([{ platform: link.platform, value: text }]);
                } else {
                  updateLink(index, { value: text });
                }
              }}
              placeholder={getPlaceholder(link.platform)}
              placeholderTextColor={COLORS.textSecondary}
              maxLength={MAX_VALUE_LENGTH}
              editable={!disabled}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {links.length > 0 && (
              <TouchableOpacity
                onPress={() => confirmRemove(index)}
                hitSlop={8}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel="Удалить запись"
                style={styles.removeButton}>
                <Text style={styles.removeText}>×</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}

      <TouchableOpacity onPress={addLink} disabled={disabled} style={styles.addButton}>
        <Text style={styles.addButtonText}>+ Добавить</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    paddingVertical: 8,
    gap: 8,
  },
  platformsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  platformChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  platformChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  platformChipText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  platformChipTextActive: {
    color: '#fff',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: '#fff',
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeText: {
    color: COLORS.textSecondary,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 22,
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
