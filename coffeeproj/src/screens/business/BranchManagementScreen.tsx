import React, { useState, useEffect, useCallback } from 'react';
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
import { launchImageLibrary } from 'react-native-image-picker';
import { COLORS } from '../../config/constants';
import {
  BusinessService,
  BranchHasActiveJobsError,
  BranchPhotoLimitError,
} from '../../services/BusinessService';
import { MetroSelector } from '../../components/MetroSelector';
import { CityToggle } from '../../components/CityToggle';
import { BranchPhotoGallery } from '../../components/BranchPhotoGallery';
import { useAuthStore } from '../../stores/authStore';
import type { Branch, Equipment, GeoPoint, CityCode } from '../../types';
import { DEFAULT_CITY, toCityCode, CITY_LABELS_RU } from '../../types/city';
import { PHOTO_LIMIT, MAX_PHOTO_BYTES, isFileTooLarge } from '../../utils/storage';

type BusinessStackParamList = {
  BusinessProfileSetup: undefined;
  BranchManagement: { businessId: string };
};

type Props = {
  navigation: NativeStackNavigationProp<BusinessStackParamList, 'BranchManagement'>;
  route: RouteProp<BusinessStackParamList, 'BranchManagement'>;
};

const EQUIPMENT_OPTIONS: Equipment[] = [
  'La Marzocco',
  'Victoria Arduino',
  'Nuova Simonelli',
  'Synesso',
  'Slayer',
  'Dalla Corte',
  'Sanremo',
  'Rocket Espresso',
];

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
    setCity(toCityCode(branch.city));
    setMetroStation(branch.metroStation ?? '');
    setSelectedEquipment(branch.equipment);
    setNameError(null);
    setAddressError(null);
    setMetroError(null);
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

  const geocodeAddress = async (
    addressLine: string,
    cityLine: string
  ): Promise<GeoPoint | null> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);
    try {
      const fullAddress = `${addressLine}, ${cityLine}, Russia`;
      const encodedAddress = encodeURIComponent(fullAddress);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`,
        {
          headers: {
            'User-Agent': 'CoffeeProj/1.0',
          },
          signal: controller.signal,
        }
      );

      const data = await response.json();

      if (data && data.length > 0) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
        };
      }

      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const handleSaveBranch = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      const trimmedAddress = address.trim();
      const cityLabel = CITY_LABELS_RU[city];

      let coordinates: GeoPoint | null;

      if (
        editingBranch &&
        trimmedAddress === editingBranch.address &&
        city === editingBranch.city
      ) {
        coordinates = editingBranch.coordinates;
      } else {
        coordinates = await geocodeAddress(trimmedAddress, cityLabel);
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

      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: remaining,
      });
      if (result.didCancel || !result.assets?.length) return;

      const accepted: string[] = [];
      let oversizedCount = 0;
      for (const asset of result.assets) {
        if (!asset.uri) continue;
        if (isFileTooLarge(asset.fileSize)) {
          oversizedCount += 1;
          continue;
        }
        accepted.push(asset.uri);
      }

      let uploadedCount = 0;
      for (const uri of accepted) {
        try {
          await BusinessService.addBranchPhoto(branchId, ownerId, uri);
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

      if (oversizedCount > 0) {
        Alert.alert(
          t('common.warning'),
          t('branchPhotos.someTooLarge', {
            count: oversizedCount,
            maxMb: MAX_PHOTO_BYTES / (1024 * 1024),
          })
        );
      } else if (uploadedCount < accepted.length) {
        Alert.alert(t('common.error'), t('branchPhotos.uploadFailed'));
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
        <TouchableOpacity style={styles.addButton} onPress={toggleHeaderForm}>
          <Text style={styles.addButtonText}>
            {isAddingBranch ? t('common.cancel') : t('branches.add')}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.content}
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
                  editable={!isSaving}
                  returnKeyType="done"
                />
                {addressError && <Text style={styles.errorText}>{addressError}</Text>}
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
                />
                {metroError && <Text style={styles.errorText}>{metroError}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('branches.form.equipment')}</Text>
                <View style={styles.equipmentGrid}>
                  {EQUIPMENT_OPTIONS.map(equipment => (
                    <TouchableOpacity
                      key={equipment}
                      style={[
                        styles.equipmentChip,
                        selectedEquipment.includes(equipment) && styles.equipmentChipSelected,
                      ]}
                      onPress={() => toggleEquipment(equipment)}
                      disabled={isSaving}>
                      <Text
                        style={[
                          styles.equipmentChipText,
                          selectedEquipment.includes(equipment) && styles.equipmentChipTextSelected,
                        ]}>
                        {equipment}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
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
