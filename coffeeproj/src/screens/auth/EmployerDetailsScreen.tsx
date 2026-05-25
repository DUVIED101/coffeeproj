import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { COLORS } from '../../config/constants';
import { AuthService, type BusinessSignupData } from '../../services/AuthService';
import { BusinessService } from '../../services/BusinessService';
import { useAuthStore } from '../../stores/authStore';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { validateEmployerDetails } from '../../utils/employerSubtype';
import type { AuthStackParamList } from '../../navigation/AuthStack';
import type { SocialPlatform } from '../../types';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'EmployerDetails'>;
  route: RouteProp<AuthStackParamList, 'EmployerDetails'>;
};

type LinkMode = 'website' | 'social';

const SOCIAL_PLATFORMS: { value: SocialPlatform; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'vk', label: 'VK' },
];

export const EmployerDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { email, password, phoneNumber, legalForm, hasSession } = route.params;

  const isOrganization = legalForm === 'organization';
  const nameLabel = isOrganization
    ? t('auth.employerDetails.nameOrgLabel')
    : t('auth.employerDetails.nameIpLabel');
  const namePlaceholder = isOrganization
    ? t('auth.employerDetails.nameOrgPlaceholder')
    : t('auth.employerDetails.nameIpPlaceholder');

  const [businessName, setBusinessName] = useState('');
  const [linkMode, setLinkMode] = useState<LinkMode>('website');
  const [website, setWebsite] = useState('');
  const [socialPlatform, setSocialPlatform] = useState<SocialPlatform>('instagram');
  const [socialValue, setSocialValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const signupData = useMemo<BusinessSignupData>(() => {
    const trimmedWebsite = website.trim();
    const trimmedSocial = socialValue.trim();
    return {
      legalForm,
      businessName: businessName.trim(),
      ...(linkMode === 'website' && trimmedWebsite ? { website: trimmedWebsite } : {}),
      ...(linkMode === 'social' && trimmedSocial
        ? { socialLink: { platform: socialPlatform, value: trimmedSocial } }
        : {}),
    };
  }, [businessName, linkMode, website, socialPlatform, socialValue, legalForm]);

  const handleContinue = async (): Promise<void> => {
    const error = validateEmployerDetails(signupData);
    if (error) {
      Alert.alert(t('auth.employerDetails.validationTitle'), t(error));
      return;
    }

    setIsSubmitting(true);
    try {
      if (hasSession) {
        const session = useAuthStore.getState().session;
        if (!session?.user) throw new Error('No active session');
        await BusinessService.createBusiness({
          ownerId: session.user.id,
          name: signupData.businessName,
          legalForm: signupData.legalForm,
          businessType: 'singleLocation',
          website: signupData.website,
          socialLinks: signupData.socialLink ? [signupData.socialLink] : [],
        });

        navigation.reset({ index: 0, routes: [{ name: 'AccountType' }] });
        return;
      }

      if (!password) {
        throw new Error('missing_password');
      }

      await AuthService.signUpWithEmail(email, password, 'business', phoneNumber, signupData);
      navigation.navigate('EmailVerification', { email, accountType: 'business' });
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      let errorMessage = t('auth.employerDetails.errorGeneric');
      if (message.includes('already registered')) {
        errorMessage = t('auth.employerDetails.errorEmailTaken');
      } else if (message.includes('rate limit')) {
        errorMessage = t('auth.employerDetails.errorRateLimit');
      } else if (message.length > 0) {
        errorMessage = message;
      }
      Alert.alert(t('auth.employerDetails.errorTitle'), errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('auth.common.back')}
            style={styles.backButton}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>{t('auth.employerDetails.title')}</Text>
            <Text style={styles.subtitle}>{t('auth.employerDetails.subtitle')}</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{nameLabel}</Text>
              <TextInput
                style={styles.input}
                value={businessName}
                onChangeText={setBusinessName}
                placeholder={namePlaceholder}
                placeholderTextColor={COLORS.textSecondary}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {t('auth.employerDetails.linkLabel')}{' '}
                <Text style={styles.optional}>{t('auth.employerDetails.linkOptional')}</Text>
              </Text>

              <View style={styles.segment}>
                <TouchableOpacity
                  style={[styles.segmentItem, linkMode === 'website' && styles.segmentItemActive]}
                  onPress={() => setLinkMode('website')}
                  activeOpacity={0.8}>
                  <Text
                    style={[
                      styles.segmentText,
                      linkMode === 'website' && styles.segmentTextActive,
                    ]}>
                    {t('auth.employerDetails.tabWebsite')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segmentItem, linkMode === 'social' && styles.segmentItemActive]}
                  onPress={() => setLinkMode('social')}
                  activeOpacity={0.8}>
                  <Text
                    style={[styles.segmentText, linkMode === 'social' && styles.segmentTextActive]}>
                    {t('auth.employerDetails.tabSocial')}
                  </Text>
                </TouchableOpacity>
              </View>

              {linkMode === 'website' ? (
                <TextInput
                  style={styles.input}
                  value={website}
                  onChangeText={setWebsite}
                  placeholder={t('auth.employerDetails.websitePlaceholder')}
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="url"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              ) : (
                <View style={styles.socialRow}>
                  <View style={styles.platformPicker}>
                    {SOCIAL_PLATFORMS.map(platform => (
                      <TouchableOpacity
                        key={platform.value}
                        style={[
                          styles.platformChip,
                          socialPlatform === platform.value && styles.platformChipActive,
                        ]}
                        onPress={() => setSocialPlatform(platform.value)}
                        activeOpacity={0.8}>
                        <Text
                          style={[
                            styles.platformText,
                            socialPlatform === platform.value && styles.platformTextActive,
                          ]}>
                          {platform.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={styles.input}
                    value={socialValue}
                    onChangeText={setSocialValue}
                    placeholder={t('auth.employerDetails.socialPlaceholder')}
                    placeholderTextColor={COLORS.textSecondary}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.button, isSubmitting && styles.buttonDisabled]}
              onPress={handleContinue}
              disabled={isSubmitting}
              activeOpacity={0.8}>
              {isSubmitting ? (
                <ActivityIndicator color={COLORS.background} />
              ) : (
                <Text style={styles.buttonText}>
                  {hasSession
                    ? t('auth.employerDetails.saveCta')
                    : t('auth.employerDetails.continueCta')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardAvoid: {
    flex: 1,
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
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  optional: {
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  segment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  segmentItemActive: {
    backgroundColor: COLORS.primary,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  segmentTextActive: {
    color: COLORS.background,
  },
  socialRow: {
    gap: 8,
  },
  platformPicker: {
    flexDirection: 'row',
    gap: 8,
  },
  platformChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  platformChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  platformText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  platformTextActive: {
    color: COLORS.background,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
  },
});
