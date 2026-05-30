import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../../config/constants';
import type { LegalForm } from '../../types';
import type { AuthStackParamList } from '../../navigation/AuthStack';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'EmployerSubtype'>;
  route: RouteProp<AuthStackParamList, 'EmployerSubtype'>;
};

type SubtypeOption = {
  legalForm: LegalForm;
  titleKey: string;
  descriptionKey: string;
  icon: string;
};

const OPTIONS: SubtypeOption[] = [
  {
    legalForm: 'organization',
    titleKey: 'auth.employerSubtype.organizationTitle',
    descriptionKey: 'auth.employerSubtype.organizationDescription',
    icon: 'office-building',
  },
  {
    legalForm: 'individual_entrepreneur',
    titleKey: 'auth.employerSubtype.ipTitle',
    descriptionKey: 'auth.employerSubtype.ipDescription',
    icon: 'account-tie',
  },
];

export const EmployerSubtypeScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { email, password, hasSession } = route.params;

  const handleSelect = (legalForm: LegalForm): void => {
    navigation.navigate('EmployerDetails', {
      email,
      password,
      legalForm,
      hasSession,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('auth.common.back')}
          style={styles.backButton}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>{t('auth.employerSubtype.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.employerSubtype.subtitle')}</Text>
        </View>

        <View style={styles.options}>
          {OPTIONS.map(option => {
            const title = t(option.titleKey);
            return (
              <TouchableOpacity
                key={option.legalForm}
                style={styles.option}
                onPress={() => handleSelect(option.legalForm)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={title}>
                <MaterialCommunityIcons name={option.icon} size={36} color={COLORS.primary} />
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>{title}</Text>
                  <Text style={styles.optionDescription}>{t(option.descriptionKey)}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  backArrow: {
    fontSize: 36,
    lineHeight: 36,
    color: COLORS.text,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  options: {
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 16,
  },
  optionText: {
    flex: 1,
    gap: 4,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  optionDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  chevron: {
    fontSize: 28,
    color: COLORS.textSecondary,
  },
});
