import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { MasterDetailLayout } from '../../components/MasterDetailLayout';
import { JobFeedScreen } from '../barista/JobFeedScreen';
import { JobDetailsScreen } from '../barista/JobDetailsScreen';
import { COLORS } from '../../config/constants';
import type { BaristaStackParamList } from '../../navigation/BaristaStack';

type Props = {
  navigation: NativeStackNavigationProp<BaristaStackParamList, 'JobFeed'>;
};

export const JobsTabletScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  return (
    <MasterDetailLayout
      storageKey="tablet:selectedJobId"
      placeholderText={t('jobFeed.tabletPlaceholder', {
        defaultValue: 'Выберите вакансию из списка',
      })}
      master={() => <JobFeedScreen navigation={navigation as never} />}
      detail={({ selectedId }) => (
        <View key={selectedId ?? 'empty'} style={styles.flex}>
          <JobDetailsScreen
            navigation={navigation as never}
            route={
              {
                key: `tabletJobDetails-${selectedId}`,
                name: 'JobDetails',
                params: { jobId: selectedId as string },
              } as RouteProp<BaristaStackParamList, 'JobDetails'>
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
