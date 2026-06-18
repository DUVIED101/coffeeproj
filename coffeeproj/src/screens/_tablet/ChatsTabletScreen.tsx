import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { MasterDetailLayout } from '../../components/MasterDetailLayout';
import { ConversationsListScreen } from '../chat/ConversationsListScreen';
import { ChatScreen } from '../chat/ChatScreen';
import { COLORS } from '../../config/constants';
import type { ChatsStackParamList } from '../../navigation/ChatsStack';

type Props = {
  navigation: NativeStackNavigationProp<ChatsStackParamList, 'ConversationsList'>;
};

export const ChatsTabletScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  return (
    <MasterDetailLayout
      storageKey="tablet:selectedConversationId"
      placeholderText={t('chat.tabletPlaceholder', { defaultValue: 'Выберите диалог' })}
      master={() => <ConversationsListScreen navigation={navigation as never} />}
      detail={({ selectedId }) => (
        <View key={selectedId ?? 'empty'} style={styles.flex}>
          <ChatScreen
            navigation={navigation as never}
            route={
              {
                key: `tabletChat-${selectedId}`,
                name: 'Chat',
                params: { conversationId: selectedId as string },
              } as RouteProp<ChatsStackParamList, 'Chat'>
            }
          />
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
});
