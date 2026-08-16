import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { MasterDetailLayout } from '../../components/MasterDetailLayout';
import { ApplicationsScreen } from '../barista/ApplicationsScreen';
import { ApplicationDetailsScreen } from '../barista/ApplicationDetailsScreen';
import { COLORS } from '../../config/constants';
import type { ApplicationsStackParamList } from '../../navigation/ApplicationsStack';

type Props = {
  navigation: NativeStackNavigationProp<ApplicationsStackParamList, 'ApplicationsList'>;
};

export const ApplicationsTabletScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  return (
    <MasterDetailLayout
      storageKey="tablet:selectedApplicationId"
      placeholderText={t('applications.tabletPlaceholder', {
        defaultValue: 'Выберите отклик из списка',
      })}
      master={() => <ApplicationsScreen navigation={navigation as never} />}
      detail={({ selectedId }) => (
        <View key={selectedId ?? 'empty'} style={styles.flex}>
          <ApplicationDetailsScreen
            navigation={navigation as never}
            route={
              {
                key: `tabletApplicationDetails-${selectedId}`,
                name: 'ApplicationDetails',
                params: { applicationId: selectedId as string },
              } as RouteProp<ApplicationsStackParamList, 'ApplicationDetails'>
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
