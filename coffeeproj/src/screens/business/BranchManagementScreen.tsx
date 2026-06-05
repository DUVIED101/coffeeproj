import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { COLORS } from '../../config/constants';
import { EquipmentChips } from '../../components/EquipmentChips';
import {
  BusinessService,
  BranchHasActiveJobsError,
  BranchPhotoLimitError,
} from '../../services/BusinessService';
import { MetroSelector } from '../../components/MetroSelector';
import { CityToggle } from '../../components/CityToggle';
import { BranchPhotoGallery } from '../../components/BranchPhotoGallery';
import { AddFab } from '../../components/AddFab';
import { useAuthStore } from '../../stores/authStore';
import type { Branch, Equipment, GeoPoint, CityCode } from '../../types';
import { DEFAULT_CITY, toCityCode } from '../../types/city';
import { PHOTO_LIMIT } from '../../utils/storage';
import { pickPhotos, reportRejections } from '../../utils/pickPhotos';
import { geocodeAddress } from '../../utils/geocode';
import { SHORT_TEXT_MAX_LENGTH, ADDRESS_MAX_LENGTH } from '../../utils/validation';

type BusinessStackParamList = {
  BusinessProfileSetup: undefined;
  BranchManagement: { businessId: string };
};

type Props = {
  navigation: NativeStackNavigationProp<BusinessStackParamList, 'BranchManagement'>;
  route: RouteProp<BusinessStackParamList, 'BranchManagement'>;
};

type BranchRowProps = {
  branch: Branch;
  onEdit: (branch: Branch) => void;
  onDelete: (branchId: string, branchName: string) => void;
  onAddPhoto: (branchId: string) => void;
  onRemovePhoto: (branchId: string, photoUrl: string) => void;
};

const BranchRow = React.memo<BranchRowProps>(
  ({ branch, onEdit, onDelete, onAddPhoto, onRemovePhoto }) => {
    const { t } = useTranslation();
    const handleAdd = useCallback(() => onAddPhoto(branch.id), [branch.id, onAddPhoto]);
    const handleRemove = useCallback(
      (photoUrl: string) => onRemovePhoto(branch.id, photoUrl),
      [branch.id, onRemovePhoto]
    );

    return (
      <View style={styles.branchCard}>
        <View style={styles.branchHeader}>
          <Text style={styles.branchName}>{branch.name}</Text>
          <View style={styles.branchActions}>
            <TouchableOpacity onPress={() => onEdit(branch)}>
              <Text style={styles.editButton}>{t('common.edit')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(branch.id, branch.name)}>
              <Text style={styles.deleteButton}>{t('common.delete')}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.branchAddress}>{branch.address}</Text>
        {branch.metroStation && (
          <View style={styles.metroRow}>
            <Text style={styles.metroIcon}>Ⓜ</Text>
            <Text style={styles.branchMetro}>{branch.metroStation}</Text>
          </View>
        )}
        {branch.equipment.length > 0 && (
          <View style={styles.equipmentContainer}>
            {branch.equipment.map(eq => (
              <View key={eq} style={styles.equipmentBadge}>
                <Text style={styles.equipmentText}>{eq}</Text>
              </View>
            ))}
          </View>
        )}
        <BranchPhotoGallery
          photos={branch.photos}
          editable
          onAdd={handleAdd}
          onRemove={handleRemove}
        />
      </View>
    );
  }
);

export const BranchManagementScreen: React.FC<Props> = ({ route }) => {
  const { businessId } = route.params;
  const { t } = useTranslation();
  const ownerId = useAuthStore(s => s.user?.id);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddingBranch, setIsAddingBranch] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState<CityCode>(DEFAULT_CITY);
  const [metroStation, setMetroStation] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment[]>([]);

  const [nameError, setNameError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [metroError, setMetroError] = useState<string | null>(null);

  const [addressCoords, setAddressCoords] = useState<GeoPoint | null>(null);
  const [addressLookupStatus, setAddressLookupStatus] = useState<
    'idle' | 'searching' | 'found' | 'notFound'
  >('idle');
  const geocodedKeyRef = useRef<string | null>(null);

  const loadBranches = useCallback(async () => {
    try {
      const data = await BusinessService.getBranches(businessId);
      setBranches(data);
    } catch (error) {
      console.error('Error loading branches:', error);
      Alert.alert(t('common.error'), t('branches.errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [businessId, t]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadBranches();
    } finally {
      setIsRefreshing(false);
    }
  }, [loadBranches]);

  const resetForm = useCallback(() => {
    setName('');
    setAddress('');
    setCity(DEFAULT_CITY);
    setMetroStation('');
    setSelectedEquipment([]);
    setNameError(null);
    setAddressError(null);
    setMetroError(null);
    setAddressCoords(null);
    setAddressLookupStatus('idle');
    geocodedKeyRef.current = null;
  }, []);

  const closeForm = useCallback(() => {
    setIsAddingBranch(false);
    setEditingBranch(null);
    resetForm();
  }, [resetForm]);

  const openCreateForm = useCallback(() => {
    setEditingBranch(null);
    resetForm();
    setIsAddingBranch(true);
  }, [resetForm]);

  const openEditForm = useCallback((branch: Branch) => {
    setEditingBranch(branch);
    setName(branch.name);
    setAddress(branch.address);
    const editCity = toCityCode(branch.city);
    setCity(editCity);
    setMetroStation(branch.metroStation ?? '');
    setSelectedEquipment(branch.equipment);
    setNameError(null);
    setAddressError(null);
    setMetroError(null);
    setAddressCoords(branch.coordinates);
    setAddressLookupStatus('found');
    geocodedKeyRef.current = `${branch.address.trim()}|${editCity}`;
    setIsAddingBranch(true);
  }, []);

  const toggleHeaderForm = useCallback(() => {
    if (isAddingBranch) {
      closeForm();
    } else {
      openCreateForm();
    }
  }, [isAddingBranch, closeForm, openCreateForm]);

  const validateForm = (): boolean => {
    let isValid = true;

    if (!name.trim()) {
      setNameError(t('branches.form.nameRequired'));
      isValid = false;
    } else {
      setNameError(null);
    }

    if (!address.trim()) {
      setAddressError(t('branches.form.addressRequired'));
      isValid = false;
    } else {
      setAddressError(null);
    }

    if (!metroStation.trim()) {
      setMetroError(t('branches.form.metroRequired'));
      isValid = false;
    } else {
      setMetroError(null);
    }

    return isValid;
  };

  useEffect(() => {
    if (!isAddingBranch) return;
    const trimmedAddress = address.trim();
    if (!trimmedAddress) {
      setAddressCoords(null);
      setAddressLookupStatus('idle');
      geocodedKeyRef.current = null;
      return;
    }
    const key = `${trimmedAddress}|${city}`;
    if (geocodedKeyRef.current === key) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setAddressLookupStatus('searching');
      const result = await geocodeAddress(trimmedAddress, city, controller.signal);
      if (controller.signal.aborted) return;
      geocodedKeyRef.current = key;
      setAddressCoords(result);
      setAddressLookupStatus(result ? 'found' : 'notFound');
      // Replace the typed address with the canonical form Nominatim returned so
      // the user can see exactly what was matched. Update the ref to the new
      // key before the state change to keep the effect from re-firing.
      if (result?.formattedAddress && result.formattedAddress !== trimmedAddress) {
        geocodedKeyRef.current = `${result.formattedAddress}|${city}`;
        setAddress(result.formattedAddress);
      }
    }, 3000);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [address, city, isAddingBranch]);

  const handleSaveBranch = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      const trimmedAddress = address.trim();
      const key = `${trimmedAddress}|${city}`;

      let coordinates: GeoPoint | null;
      if (addressCoords && geocodedKeyRef.current === key) {
        coordinates = addressCoords;
      } else if (
        editingBranch &&
        trimmedAddress === editingBranch.address &&
        city === editingBranch.city
      ) {
        coordinates = editingBranch.coordinates;
      } else {
        coordinates = await geocodeAddress(trimmedAddress, city);
      }

      if (!coordinates) {
        Alert.alert(
          t('branches.errors.addressNotFoundTitle'),
          t('branches.errors.addressNotFound')
        );
        setIsSaving(false);
        return;
      }

      if (editingBranch) {
        await BusinessService.updateBranch(editingBranch.id, {
          name: name.trim(),
          address: trimmedAddress,
          city,
          coordinates,
          metroStation: metroStation.trim(),
          equipment: selectedEquipment,
        });

        Alert.alert(t('common.success'), t('branches.save.updateSuccess'));
      } else {
        await BusinessService.createBranch({
          businessId,
          name: name.trim(),
          address: trimmedAddress,
          city,
          coordinates,
          metroStation: metroStation.trim(),
          equipment: selectedEquipment,
        });

        Alert.alert(t('common.success'), t('branches.save.success'));
      }

      closeForm();
      loadBranches();
    } catch (error) {
      console.error('Error saving branch:', error);
      Alert.alert(t('common.error'), t('branches.errors.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBranch = useCallback(
    (branchId: string, branchName: string) => {
      Alert.alert(t('branches.delete.title'), t('branches.delete.confirm', { name: branchName }), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await BusinessService.deleteBranch(branchId);
              Alert.alert(t('common.success'), t('branches.delete.success'));
              loadBranches();
            } catch (error) {
              if (error instanceof BranchHasActiveJobsError) {
                Alert.alert(
                  t('common.error'),
                  t('branches.errors.hasActiveJobs', { count: error.count })
                );
                return;
              }
              console.error('Error deleting branch:', error);
              Alert.alert(t('common.error'), t('branches.errors.deleteFailed'));
            }
          },
        },
      ]);
    },
    [loadBranches, t]
  );

  const toggleEquipment = (equipment: Equipment) => {
    setSelectedEquipment(prev =>
      prev.includes(equipment) ? prev.filter(e => e !== equipment) : [...prev, equipment]
    );
  };

  const handleAddPhoto = useCallback(
    async (branchId: string) => {
      if (!ownerId) {
        Alert.alert(t('common.error'), t('businessSetup.errors.notAuthenticated'));
        return;
      }
      const branch = branches.find(b => b.id === branchId);
      const remaining = PHOTO_LIMIT - (branch?.photos.length ?? 0);
      if (remaining <= 0) {
        Alert.alert(t('common.error'), t('branchPhotos.limitReached', { max: PHOTO_LIMIT }));
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

      let uploadedCount = 0;
      for (const asset of picked.accepted) {
        if (!asset.uri) continue;
        try {
          await BusinessService.addBranchPhoto(branchId, ownerId, asset.uri);
          uploadedCount += 1;
        } catch (error) {
          if (error instanceof BranchPhotoLimitError) {
            Alert.alert(t('common.error'), t('branchPhotos.limitReached', { max: PHOTO_LIMIT }));
            break;
          }
          console.error('Error adding branch photo:', error);
        }
      }

      if (uploadedCount > 0) await loadBranches();

      if (uploadedCount < picked.accepted.length) {
        Alert.alert(t('photoErrors.uploadFailedTitle'), t('photoErrors.uploadFailedBody'));
      }
    },
    [ownerId, branches, loadBranches, t]
  );

  const handleRemovePhoto = useCallback(
    async (branchId: string, photoUrl: string) => {
      try {
        await BusinessService.removeBranchPhoto(branchId, photoUrl);
        await loadBranches();
      } catch (error) {
        console.error('Error removing branch photo:', error);
        Alert.alert(t('common.error'), t('branchPhotos.removeFailed'));
      }
    },
    [loadBranches, t]
  );

  const renderBranch = useCallback(
    ({ item }: { item: Branch }) => (
      <BranchRow
        branch={item}
        onEdit={openEditForm}
        onDelete={handleDeleteBranch}
        onAddPhoto={handleAddPhoto}
        onRemovePhoto={handleRemovePhoto}
      />
    ),
    [openEditForm, handleDeleteBranch, handleAddPhoto, handleRemovePhoto]
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const isEditing = editingBranch !== null;
  const formTitle = isEditing ? t('branches.form.editTitle') : t('branches.form.addTitle');
  const saveLabel = isEditing ? t('branches.form.update') : t('branches.form.save');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <View style={styles.header}>
        <Text style={styles.title}>{t('branches.title')}</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
            />
          }>
          {isAddingBranch && (
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>{formTitle}</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  {t('branches.form.name')} <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, nameError ? styles.inputError : null]}
                  placeholder={t('branches.form.namePlaceholder')}
                  value={name}
                  onChangeText={text => {
                    setName(text);
                    setNameError(null);
                  }}
                  maxLength={SHORT_TEXT_MAX_LENGTH}
                  editable={!isSaving}
                  returnKeyType="done"
                />
                {nameError && <Text style={styles.errorText}>{nameError}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  {t('branches.form.address')} <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, addressError ? styles.inputError : null]}
                  placeholder={t('branches.form.addressPlaceholder')}
                  value={address}
                  onChangeText={text => {
                    setAddress(text);
                    setAddressError(null);
                  }}
                  maxLength={ADDRESS_MAX_LENGTH}
                  editable={!isSaving}
                  returnKeyType="done"
                />
                {addressError && <Text style={styles.errorText}>{addressError}</Text>}
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
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  {t('branches.form.city')} <Text style={styles.required}>*</Text>
                </Text>
                <CityToggle
                  value={city}
                  onChange={nextCity => {
                    setCity(nextCity);
                    setMetroStation('');
                  }}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  {t('branches.form.metro')} <Text style={styles.required}>*</Text>
                </Text>
                <MetroSelector
                  city={city}
                  onCityChange={nextCity => {
                    setCity(nextCity);
                    setMetroStation('');
                  }}
                  value={metroStation || null}
                  onChange={value => {
                    setMetroStation(value ?? '');
                    if (value) setMetroError(null);
                  }}
                  userLocation={addressCoords ?? undefined}
                  hideAnyOption
                />
                {metroError && <Text style={styles.errorText}>{metroError}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('branches.form.equipment')}</Text>
                <EquipmentChips
                  selected={selectedEquipment}
                  onToggle={brand => toggleEquipment(brand as Equipment)}
                  disabled={isSaving}
                />
              </View>

              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={handleSaveBranch}
                disabled={isSaving}>
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>{saveLabel}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.branchesSection}>
            <Text style={styles.sectionTitle}>
              {t('branches.sectionTitle', { count: branches.length })}
            </Text>
            {branches.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t('branches.empty')}</Text>
                <Text style={styles.emptySubtext}>{t('branches.addFirst')}</Text>
                <TouchableOpacity style={styles.emptyCta} onPress={openCreateForm}>
                  <Text style={styles.emptyCtaText}>{t('branches.add')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={branches}
                renderItem={renderBranch}
                keyExtractor={item => item.id}
                scrollEnabled={false}
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <AddFab
        onPress={toggleHeaderForm}
        accessibilityLabel={isAddingBranch ? t('common.cancel') : t('branches.add')}
        iconName={isAddingBranch ? 'close' : 'plus'}
      />
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 96,
  },
  formContainer: {
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
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
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
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
  hint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  coordinatesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  coordinateInput: {
    flex: 1,
  },
  equipmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  branchesSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyCta: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  emptyCtaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  branchCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  branchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  branchName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  branchActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editButton: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    color: COLORS.error,
    fontSize: 14,
  },
  branchAddress: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  metroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metroIcon: {
    fontSize: 16,
    marginRight: 4,
    color: COLORS.primary,
  },
  branchMetro: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  equipmentContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  equipmentBadge: {
    backgroundColor: COLORS.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  equipmentText: {
    fontSize: 12,
    color: COLORS.text,
  },
});
