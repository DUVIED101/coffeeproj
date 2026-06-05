import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import FastImage from 'react-native-fast-image';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../../config/constants';
import { BusinessService } from '../../services/BusinessService';
import { ProgressIndicator } from '../../components/ProgressIndicator';
import { CityToggle } from '../../components/CityToggle';
import { MetroSelector } from '../../components/MetroSelector';
import { BranchPhotoGallery } from '../../components/BranchPhotoGallery';
import { SocialLinksEditor } from '../../components/SocialLinksEditor';
import { EquipmentChips } from '../../components/EquipmentChips';
import { useAuthStore } from '../../stores/authStore';
import type { Business, Branch, BusinessType, Equipment, GeoPoint, LegalForm } from '../../types';
import type { SocialLink } from '../../types/business';
import type { CityCode } from '../../types/city';
import { DEFAULT_CITY, toCityCode } from '../../types/city';
import { PHOTO_LIMIT } from '../../utils/storage';
import { pickPhotos, reportRejections } from '../../utils/pickPhotos';
import { pickAndCropAvatar } from '../../utils/imageCrop';
import { geocodeAddress } from '../../utils/geocode';
import { clampToEffectiveLength } from '../../utils/textLength';
import {
  sanitizeDigitsInput,
  SHORT_TEXT_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  ADDRESS_MAX_LENGTH,
  URL_MAX_LENGTH,
  YEAR_MAX_DIGITS,
  FOUNDED_YEAR_MIN,
} from '../../utils/validation';
import { showErrorToast } from '../../stores/errorToastStore';

type SetupStackParamList = {
  BusinessProfileSetup: undefined;
  BusinessProfileHome: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<
    SetupStackParamList & Record<string, object | undefined>,
    'BusinessProfileSetup'
  >;
};

const STEP_KEYS = ['basics', 'brand', 'branch', 'photos'] as const;

export const BusinessProfileSetupScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);

  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingBusiness, setExistingBusiness] = useState<Business | null>(null);
  const [existingFirstBranch, setExistingFirstBranch] = useState<Branch | null>(null);

  // Step 1 — Basics
  const [legalForm, setLegalForm] = useState<LegalForm>('organization');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('singleLocation');

  // Step 2 — Brand
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [pendingLogoUri, setPendingLogoUri] = useState<string | null>(null);
  const [website, setWebsite] = useState('');
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [foundedYear, setFoundedYear] = useState('');

  // Step 3 — First branch
  const [branchName, setBranchName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchCity, setBranchCity] = useState<CityCode>(DEFAULT_CITY);
  const [branchMetro, setBranchMetro] = useState('');
  const [branchEquipment, setBranchEquipment] = useState<Equipment[]>([]);
  const [addressCoords, setAddressCoords] = useState<GeoPoint | null>(null);
  const [addressLookupStatus, setAddressLookupStatus] = useState<
    'idle' | 'searching' | 'found' | 'notFound'
  >('idle');
  const geocodedKeyRef = useRef<string | null>(null);

  // Step 4 — Photos for the first branch (deferred URIs until finish)
  const [pendingBranchPhotoUris, setPendingBranchPhotoUris] = useState<string[]>([]);

  const steps = STEP_KEYS.map(k => t(`businessSetup.steps.${k}`));

  useEffect(() => {
    const load = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }
      try {
        const business = await BusinessService.getBusinessByOwnerId(user.id);
        if (business) {
          setExistingBusiness(business);
          setLegalForm(business.legalForm ?? 'organization');
          setName(business.name);
          setDescription(business.description ?? '');
          setBusinessType(business.businessType);
          setLogoUrl(business.logoUrl);
          setWebsite(business.website ?? '');
          setSocialLinks(business.socialLinks ?? []);
          setFoundedYear(business.foundedYear?.toString() ?? '');

          const branches = await BusinessService.getBranches(business.id);
          const first = branches[branches.length - 1] ?? null; // oldest = first created
          if (first) {
            setExistingFirstBranch(first);
            setBranchName(first.name);
            setBranchAddress(first.address);
            setBranchCity(toCityCode(first.city));
            setBranchMetro(first.metroStation ?? '');
            setBranchEquipment(first.equipment);
            setAddressCoords(first.coordinates);
            setAddressLookupStatus('found');
            geocodedKeyRef.current = `${first.address.trim()}|${toCityCode(first.city)}`;
          }
        }
      } catch (error) {
        console.error('Error loading existing business:', error);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user?.id]);

  useEffect(() => {
    const trimmedAddress = branchAddress.trim();
    if (!trimmedAddress) {
      setAddressCoords(null);
      setAddressLookupStatus('idle');
      geocodedKeyRef.current = null;
      return;
    }
    const key = `${trimmedAddress}|${branchCity}`;
    if (geocodedKeyRef.current === key) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setAddressLookupStatus('searching');
      const result = await geocodeAddress(trimmedAddress, branchCity, controller.signal);
      if (controller.signal.aborted) return;
      geocodedKeyRef.current = key;
      setAddressCoords(result);
      setAddressLookupStatus(result ? 'found' : 'notFound');
      if (result?.formattedAddress && result.formattedAddress !== trimmedAddress) {
        geocodedKeyRef.current = `${result.formattedAddress}|${branchCity}`;
        setBranchAddress(result.formattedAddress);
      }
    }, 3000);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [branchAddress, branchCity]);

  const handlePickLogo = useCallback(async () => {
    const outcome = await pickAndCropAvatar();
    if (!outcome.ok) {
      if (outcome.reason === 'cancelled') return;
      const bodyKey =
        outcome.reason === 'tooLarge'
          ? 'photoErrors.tooLarge_one'
          : outcome.reason === 'invalidFormat'
            ? 'photoErrors.invalidFormat_one'
            : 'photoErrors.uploadFailedBody';
      showErrorToast(t(bodyKey, { maxMb: 7, count: 1 }) as string);
      return;
    }
    setPendingLogoUri(outcome.uri);
  }, [t]);

  const handlePickBranchPhoto = useCallback(async () => {
    const remaining = PHOTO_LIMIT - pendingBranchPhotoUris.length;
    if (remaining <= 0) {
      showErrorToast(t('branchPhotos.limitReached', { max: PHOTO_LIMIT }));
      return;
    }
    const picked = await pickPhotos({
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: remaining,
    });
    if (!picked) return;
    const shouldProceed = reportRejections(t, picked);
    if (!shouldProceed) return;

    const acceptedUris = picked.accepted.map(a => a.uri).filter((u): u is string => !!u);
    if (acceptedUris.length > 0) {
      setPendingBranchPhotoUris(prev => [...prev, ...acceptedUris].slice(0, PHOTO_LIMIT));
    }
  }, [pendingBranchPhotoUris.length, t]);

  const handleRemoveBranchPhoto = useCallback((_url: string, index: number) => {
    setPendingBranchPhotoUris(prev => prev.filter((_, i) => i !== index));
  }, []);

  const toggleEquipment = useCallback((equipment: Equipment) => {
    setBranchEquipment(prev =>
      prev.includes(equipment) ? prev.filter(e => e !== equipment) : [...prev, equipment]
    );
  }, []);

  const validateStep = useCallback((): boolean => {
    if (currentStep === 0) {
      if (!name.trim() || name.trim().length < 2) {
        showErrorToast(t('businessSetup.basics.nameRequired'));
        return false;
      }
    }
    if (currentStep === 1) {
      if (foundedYear) {
        const year = parseInt(foundedYear, 10);
        if (year < FOUNDED_YEAR_MIN) {
          showErrorToast(t('businessSetup.errors.foundedYearInvalid', { min: FOUNDED_YEAR_MIN }));
          return false;
        }
      }
    }
    if (currentStep === 2) {
      if (!branchName.trim()) {
        showErrorToast(t('branches.form.nameRequired'));
        return false;
      }
      if (!branchAddress.trim()) {
        showErrorToast(t('branches.form.addressRequired'));
        return false;
      }
    }
    return true;
  }, [currentStep, name, branchName, branchAddress, t]);

  // Ref-trampoline: handleNext must always invoke the latest handleFinish,
  // which closes over photo/branch state that changes after handleNext is memoised.
  const handleFinishRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const handleNext = useCallback(() => {
    if (!validateStep()) return;
    if (currentStep < STEP_KEYS.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      void handleFinishRef.current();
    }
  }, [currentStep, validateStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  }, [currentStep]);

  const handleFinish = useCallback(async () => {
    if (!user?.id) {
      showErrorToast(t('businessSetup.errors.notAuthenticated'));
      return;
    }
    setIsSubmitting(true);
    const softFailures: string[] = [];
    try {
      // Re-fetch in case a previous attempt created the row but failed later;
      // prevents a 23505 on a second Finish tap.
      const currentBusiness =
        existingBusiness ?? (await BusinessService.getBusinessByOwnerId(user.id));

      // 1) Upsert business
      const sanitizedSocialLinks = socialLinks
        .map(link => ({ ...link, value: link.value.trim() }))
        .filter(link => link.value.length > 0);

      const business = currentBusiness
        ? await BusinessService.updateBusiness(currentBusiness.id, {
            name: name.trim(),
            description: description.trim() || undefined,
            businessType,
            legalForm,
            website: website.trim() || undefined,
            socialLinks: sanitizedSocialLinks,
            foundedYear: foundedYear ? parseInt(foundedYear, 10) : undefined,
          })
        : await BusinessService.createBusiness({
            ownerId: user.id,
            name: name.trim(),
            description: description.trim() || undefined,
            businessType,
            legalForm,
            website: website.trim() || undefined,
            socialLinks: sanitizedSocialLinks,
            foundedYear: foundedYear ? parseInt(foundedYear, 10) : undefined,
          });

      // 2) Upload logo if a new one was picked
      if (pendingLogoUri) {
        try {
          await BusinessService.uploadBusinessLogo(business.id, user.id, pendingLogoUri);
        } catch (error) {
          console.warn('Logo upload failed (non-fatal):', error);
          softFailures.push('logo');
        }
      }

      // 3) Upsert first branch — refresh branches in case load() ran without an existingBusiness.
      const currentFirstBranch =
        existingFirstBranch ?? (await BusinessService.getBranches(business.id))[0] ?? null;

      const trimmedAddress = branchAddress.trim();
      const cachedKey = `${trimmedAddress}|${branchCity}`;
      const coordinates =
        addressCoords && geocodedKeyRef.current === cachedKey
          ? addressCoords
          : currentFirstBranch &&
              trimmedAddress === currentFirstBranch.address &&
              branchCity === currentFirstBranch.city
            ? currentFirstBranch.coordinates
            : await geocodeAddress(trimmedAddress, branchCity);

      if (!coordinates) {
        Alert.alert(
          t('branches.errors.addressNotFoundTitle'),
          t('branches.errors.addressNotFound')
        );
        setIsSubmitting(false);
        return;
      }

      const branch = currentFirstBranch
        ? await BusinessService.updateBranch(currentFirstBranch.id, {
            name: branchName.trim(),
            address: branchAddress.trim(),
            city: branchCity,
            coordinates,
            metroStation: branchMetro.trim() || undefined,
            equipment: branchEquipment,
          })
        : await BusinessService.createBranch({
            businessId: business.id,
            name: branchName.trim(),
            address: branchAddress.trim(),
            city: branchCity,
            coordinates,
            metroStation: branchMetro.trim() || undefined,
            equipment: branchEquipment,
          });

      // 4) Upload pending branch photos (limit to PHOTO_LIMIT minus what's already there)
      const remaining = Math.max(PHOTO_LIMIT - branch.photos.length, 0);
      const toUpload = pendingBranchPhotoUris.slice(0, remaining);
      let failedPhotos = 0;
      for (const uri of toUpload) {
        try {
          await BusinessService.addBranchPhoto(branch.id, user.id, uri);
        } catch (error) {
          console.warn('Branch photo upload failed (non-fatal):', error);
          failedPhotos += 1;
        }
      }
      if (failedPhotos > 0) softFailures.push(`photos:${failedPhotos}`);

      if (softFailures.length > 0) {
        Alert.alert(
          t('common.warning'),
          t('businessSetup.errors.partialSuccess', { items: softFailures.join(', ') })
        );
      }

      if (currentBusiness) {
        navigation.goBack();
      } else {
        navigation.replace('BusinessProfileHome');
      }
    } catch (error) {
      console.error('Error finishing business setup:', error);
      showErrorToast(t('businessSetup.errors.saveFailed'));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    user?.id,
    existingBusiness,
    existingFirstBranch,
    legalForm,
    name,
    description,
    businessType,
    pendingLogoUri,
    website,
    socialLinks,
    foundedYear,
    branchName,
    branchAddress,
    branchCity,
    branchMetro,
    branchEquipment,
    addressCoords,
    pendingBranchPhotoUris,
    navigation,
    t,
  ]);

  useEffect(() => {
    handleFinishRef.current = handleFinish;
  }, [handleFinish]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const displayLogo = pendingLogoUri ?? logoUrl;
  const photosForGallery = pendingBranchPhotoUris.length
    ? pendingBranchPhotoUris
    : (existingFirstBranch?.photos ?? []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('businessSetup.title')}</Text>
        <Text style={styles.headerSubtitle}>{t('businessSetup.subtitle')}</Text>
      </View>

      <ProgressIndicator steps={steps} currentStep={currentStep} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          {currentStep === 0 && (
            <View>
              <Text style={styles.stepTitle}>{t('businessSetup.basics.title')}</Text>
              <Text style={styles.stepSubtitle}>{t('businessSetup.basics.subtitle')}</Text>

              <Text style={styles.label}>
                {t('auth.employerSubtype.title')} <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => setLegalForm('organization')}>
                  <View style={styles.radioButton}>
                    {legalForm === 'organization' && <View style={styles.radioButtonInner} />}
                  </View>
                  <View style={styles.radioTextContainer}>
                    <Text style={styles.radioLabel}>
                      {t('auth.employerSubtype.organizationTitle')}
                    </Text>
                    <Text style={styles.radioDescription}>
                      {t('auth.employerSubtype.organizationDescription')}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => setLegalForm('individual_entrepreneur')}>
                  <View style={styles.radioButton}>
                    {legalForm === 'individual_entrepreneur' && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                  <View style={styles.radioTextContainer}>
                    <Text style={styles.radioLabel}>{t('auth.employerSubtype.ipTitle')}</Text>
                    <Text style={styles.radioDescription}>
                      {t('auth.employerSubtype.ipDescription')}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>
                {legalForm === 'organization'
                  ? t('auth.employerDetails.nameOrgLabel')
                  : t('auth.employerDetails.nameIpLabel')}{' '}
                <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder={
                  legalForm === 'organization'
                    ? t('auth.employerDetails.nameOrgPlaceholder')
                    : t('auth.employerDetails.nameIpPlaceholder')
                }
                placeholderTextColor={COLORS.textSecondary}
                value={name}
                onChangeText={setName}
                maxLength={SHORT_TEXT_MAX_LENGTH}
                autoCapitalize="words"
              />

              <Text style={styles.label}>{t('businessSetup.basics.description')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={t('businessSetup.basics.descriptionPlaceholder')}
                placeholderTextColor={COLORS.textSecondary}
                value={description}
                onChangeText={text =>
                  setDescription(clampToEffectiveLength(text, DESCRIPTION_MAX_LENGTH))
                }
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <Text style={styles.label}>
                {t('businessSetup.basics.type')} <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => setBusinessType('singleLocation')}>
                  <View style={styles.radioButton}>
                    {businessType === 'singleLocation' && <View style={styles.radioButtonInner} />}
                  </View>
                  <View style={styles.radioTextContainer}>
                    <Text style={styles.radioLabel}>{t('businessSetup.basics.typeSingle')}</Text>
                    <Text style={styles.radioDescription}>
                      {t('businessSetup.basics.typeSingleDesc')}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => setBusinessType('multiLocation')}>
                  <View style={styles.radioButton}>
                    {businessType === 'multiLocation' && <View style={styles.radioButtonInner} />}
                  </View>
                  <View style={styles.radioTextContainer}>
                    <Text style={styles.radioLabel}>{t('businessSetup.basics.typeMulti')}</Text>
                    <Text style={styles.radioDescription}>
                      {t('businessSetup.basics.typeMultiDesc')}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {currentStep === 1 && (
            <View>
              <Text style={styles.stepTitle}>{t('businessSetup.brand.title')}</Text>
              <Text style={styles.stepSubtitle}>{t('businessSetup.brand.subtitle')}</Text>

              <Text style={styles.label}>{t('businessSetup.brand.logo')}</Text>
              <View style={styles.logoRow}>
                <View style={styles.logoPreview}>
                  {displayLogo ? (
                    <FastImage source={{ uri: displayLogo }} style={styles.logoImage} />
                  ) : (
                    <Text style={styles.logoPlaceholder}>{t('businessSetup.brand.noLogo')}</Text>
                  )}
                </View>
                <TouchableOpacity style={styles.logoButton} onPress={handlePickLogo}>
                  <Text style={styles.logoButtonText}>
                    {displayLogo
                      ? t('businessSetup.brand.changeLogo')
                      : t('businessSetup.brand.pickLogo')}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>{t('businessSetup.brand.website')}</Text>
              <TextInput
                style={styles.input}
                placeholder="https://example.com"
                placeholderTextColor={COLORS.textSecondary}
                value={website}
                onChangeText={setWebsite}
                maxLength={URL_MAX_LENGTH}
                autoCapitalize="none"
                keyboardType="url"
              />

              <Text style={styles.label}>{t('businessSetup.brand.socialLinks')}</Text>
              <SocialLinksEditor links={socialLinks} onChange={setSocialLinks} />

              <Text style={styles.label}>{t('businessSetup.brand.foundedYear')}</Text>
              <TextInput
                style={styles.input}
                placeholder="2024"
                placeholderTextColor={COLORS.textSecondary}
                value={foundedYear}
                onChangeText={text => setFoundedYear(sanitizeDigitsInput(text, YEAR_MAX_DIGITS))}
                keyboardType="number-pad"
                maxLength={YEAR_MAX_DIGITS}
              />
            </View>
          )}

          {currentStep === 2 && (
            <View>
              <Text style={styles.stepTitle}>{t('businessSetup.branch.title')}</Text>
              <Text style={styles.stepSubtitle}>{t('businessSetup.branch.subtitle')}</Text>

              <Text style={styles.label}>
                {t('branches.form.name')} <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder={t('branches.form.namePlaceholder')}
                placeholderTextColor={COLORS.textSecondary}
                value={branchName}
                onChangeText={setBranchName}
                maxLength={SHORT_TEXT_MAX_LENGTH}
              />

              <Text style={styles.label}>
                {t('branches.form.address')} <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder={t('branches.form.addressPlaceholder')}
                placeholderTextColor={COLORS.textSecondary}
                value={branchAddress}
                onChangeText={setBranchAddress}
                maxLength={ADDRESS_MAX_LENGTH}
              />
              {addressLookupStatus === 'searching' && (
                <Text style={styles.addressHintMuted}>
                  {t('branches.form.addressLookup.searching', { defaultValue: 'Ищем адрес…' })}
                </Text>
              )}
              {addressLookupStatus === 'found' && (
                <Text style={styles.addressHintFound}>
                  {t('branches.form.addressLookup.found', {
                    defaultValue: 'Адрес найден — внизу подсказки по метро',
                  })}
                </Text>
              )}
              {addressLookupStatus === 'notFound' && (
                <Text style={styles.addressHintNotFound}>
                  {t('branches.form.addressLookup.notFound', {
                    defaultValue: 'Адрес не найден — уточните формулировку',
                  })}
                </Text>
              )}

              <Text style={styles.label}>
                {t('branches.form.city')} <Text style={styles.required}>*</Text>
              </Text>
              <CityToggle
                value={branchCity}
                onChange={next => {
                  setBranchCity(next);
                  setBranchMetro('');
                }}
              />

              <Text style={styles.label}>{t('branches.form.metro')}</Text>
              <MetroSelector
                city={branchCity}
                onCityChange={next => {
                  setBranchCity(next);
                  setBranchMetro('');
                }}
                value={branchMetro || null}
                onChange={v => setBranchMetro(v ?? '')}
                userLocation={addressCoords ?? undefined}
                hideAnyOption
              />

              <Text style={styles.label}>{t('branches.form.equipment')}</Text>
              <EquipmentChips
                selected={branchEquipment}
                onToggle={brand => toggleEquipment(brand as Equipment)}
              />
            </View>
          )}

          {currentStep === 3 && (
            <View>
              <Text style={styles.stepTitle}>{t('businessSetup.photos.title')}</Text>
              <Text style={styles.stepSubtitle}>
                {t('businessSetup.photos.subtitle', { max: PHOTO_LIMIT })}
              </Text>

              <BranchPhotoGallery
                photos={photosForGallery}
                editable
                onAdd={handlePickBranchPhoto}
                onRemove={handleRemoveBranchPhoto}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          {currentStep > 0 && (
            <TouchableOpacity style={styles.secondaryButton} onPress={handleBack}>
              <Text style={styles.secondaryButtonText}>{t('common.back')}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
            onPress={handleNext}
            disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {currentStep === STEP_KEYS.length - 1
                  ? t('businessSetup.finish')
                  : t('common.continue')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  flex: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 16,
  },
  required: {
    color: COLORS.error,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: COLORS.text,
  },
  addressHintMuted: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  addressHintFound: {
    color: COLORS.success,
    fontSize: 12,
    marginTop: 4,
  },
  addressHintNotFound: {
    color: COLORS.warning,
    fontSize: 12,
    marginTop: 4,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  radioGroup: { gap: 12, marginTop: 8 },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  radioTextContainer: { flex: 1 },
  radioLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  radioDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  logoPreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoPlaceholder: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 6,
  },
  logoButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  logoButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  equipmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  equipmentChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
  },
  equipmentChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  equipmentChipText: {
    fontSize: 14,
    color: COLORS.text,
  },
  equipmentChipTextSelected: {
    color: '#fff',
  },
  footer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 999,
    alignItems: 'center',
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
  },
  secondaryButtonText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
});
