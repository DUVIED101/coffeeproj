import React, { useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../config/constants';
import { useBlockedUsersStore } from '../../stores/blockedUsersStore';

export const BlockedUsersScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const blocked = useBlockedUsersStore(s => s.blocked);
  const hydrate = useBlockedUsersStore(s => s.hydrate);
  const unblock = useBlockedUsersStore(s => s.unblock);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('settings.blockedUsers.title') });
  }, [navigation, t]);

  const confirmUnblock = (userId: string, displayName: string) => {
    Alert.alert(
      t('settings.blockedUsers.unblockTitle'),
      t('settings.blockedUsers.unblockBody', { name: displayName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.blockedUsers.unblockCta'),
          style: 'destructive',
          onPress: () => {
            void unblock(userId);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <FlatList
        data={blocked}
        keyExtractor={item => item.userId}
        contentContainerStyle={blocked.length === 0 ? styles.emptyContent : styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>{t('settings.blockedUsers.emptyTitle')}</Text>
            <Text style={styles.emptyBody}>{t('settings.blockedUsers.emptyBody')}</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name} numberOfLines={1}>
              {item.displayName || t('settings.blockedUsers.unknownUser')}
            </Text>
            <TouchableOpacity
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => confirmUnblock(item.userId, item.displayName)}
              accessibilityRole="button"
              accessibilityLabel={t('settings.blockedUsers.unblockCta')}>
              <Text style={styles.action}>{t('settings.blockedUsers.unblockCta')}</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundSecondary },
  listContent: { paddingVertical: 16 },
  emptyContent: { flexGrow: 1, justifyContent: 'center' },
  emptyWrap: { paddingHorizontal: 32, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  emptyBody: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    borderRadius: 12,
    minHeight: 44,
  },
  separator: { height: 8 },
  name: { fontSize: 16, color: COLORS.text, flex: 1, marginRight: 12 },
  action: { fontSize: 15, color: COLORS.primary, fontWeight: '600' },
});
