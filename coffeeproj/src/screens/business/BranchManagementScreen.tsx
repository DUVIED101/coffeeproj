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
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { COLORS } from '../../config/constants';
import { BusinessService } from '../../services/BusinessService';
import { MetroSelector } from '../../components/MetroSelector';
import type { Branch, Equipment, GeoPoint } from '../../types';

type BusinessStackParamList = {
  CreateBusiness: undefined;
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

export const BranchManagementScreen: React.FC<Props> = ({ navigation, route }) => {
  const { businessId } = route.params;

  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingBranch, setIsAddingBranch] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Санкт-Петербург');
  const [metroStation, setMetroStation] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment[]>([]);

  // Form errors
  const [nameError, setNameError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

  const loadBranches = useCallback(async () => {
    try {
      const data = await BusinessService.getBranches(businessId);
      setBranches(data);
    } catch (error) {
      console.error('Error loading branches:', error);
      Alert.alert('Error', 'Failed to load branches');
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  const resetForm = () => {
    setName('');
    setAddress('');
    setCity('Санкт-Петербург');
    setMetroStation('');
    setSelectedEquipment([]);
    setNameError(null);
    setAddressError(null);
  };

  const validateForm = (): boolean => {
    let isValid = true;

    if (!name.trim()) {
      setNameError('Branch name is required');
      isValid = false;
    } else {
      setNameError(null);
    }

    if (!address.trim()) {
      setAddressError('Address is required');
      isValid = false;
    } else {
      setAddressError(null);
    }

    return isValid;
  };

  const geocodeAddress = async (address: string, city: string): Promise<GeoPoint | null> => {
    try {
      const fullAddress = `${address}, ${city}, Russia`;
      const encodedAddress = encodeURIComponent(fullAddress);

      // Using Nominatim (OpenStreetMap) geocoding service
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`,
        {
          headers: {
            'User-Agent': 'CoffeeProj/1.0',
          },
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
    }
  };

  const handleSaveBranch = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      // Geocode the address to get coordinates
      const coordinates = await geocodeAddress(address.trim(), city.trim());

      if (!coordinates) {
        Alert.alert(
          'Address not found',
          'Could not find coordinates for this address. Please check the address and city.'
        );
        setIsSaving(false);
        return;
      }

      await BusinessService.createBranch({
        businessId,
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        coordinates,
        metroStation: metroStation || undefined,
        equipment: selectedEquipment,
      });

      Alert.alert('Success', 'Branch added successfully');
      resetForm();
      setIsAddingBranch(false);
      loadBranches();
    } catch (error) {
      console.error('Error saving branch:', error);
      Alert.alert('Error', 'Failed to save branch');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBranch = (branchId: string, branchName: string) => {
    Alert.alert('Delete Branch', `Are you sure you want to delete "${branchName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await BusinessService.deleteBranch(branchId);
            Alert.alert('Success', 'Branch deleted successfully');
            loadBranches();
          } catch (error) {
            console.error('Error deleting branch:', error);
            Alert.alert('Error', 'Failed to delete branch');
          }
        },
      },
    ]);
  };

  const toggleEquipment = (equipment: Equipment) => {
    setSelectedEquipment(prev =>
      prev.includes(equipment) ? prev.filter(e => e !== equipment) : [...prev, equipment]
    );
  };

  const renderBranch = ({ item }: { item: Branch }) => (
    <View style={styles.branchCard}>
      <View style={styles.branchHeader}>
        <Text style={styles.branchName}>{item.name}</Text>
        <TouchableOpacity onPress={() => handleDeleteBranch(item.id, item.name)}>
          <Text style={styles.deleteButton}>Delete</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.branchAddress}>{item.address}</Text>
      {item.metroStation && <Text style={styles.branchMetro}>🚇 {item.metroStation}</Text>}
      {item.equipment.length > 0 && (
        <View style={styles.equipmentContainer}>
          {item.equipment.map(eq => (
            <View key={eq} style={styles.equipmentBadge}>
              <Text style={styles.equipmentText}>{eq}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <View style={styles.header}>
        <Text style={styles.title}>Branch Management</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setIsAddingBranch(!isAddingBranch)}>
          <Text style={styles.addButtonText}>{isAddingBranch ? 'Cancel' : '+ Add Branch'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {isAddingBranch && (
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Add New Branch</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Branch Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, nameError ? styles.inputError : null]}
                placeholder="e.g. Arbat Branch"
                value={name}
                onChangeText={text => {
                  setName(text);
                  setNameError(null);
                }}
                editable={!isSaving}
              />
              {nameError && <Text style={styles.errorText}>{nameError}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Address <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, addressError ? styles.inputError : null]}
                placeholder="e.g. Arbat St, 10"
                value={address}
                onChangeText={text => {
                  setAddress(text);
                  setAddressError(null);
                }}
                editable={!isSaving}
              />
              {addressError && <Text style={styles.errorText}>{addressError}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                City <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={setCity}
                editable={!isSaving}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Metro Station (Optional)</Text>
              <MetroSelector
                value={metroStation}
                onChange={value => setMetroStation(Array.isArray(value) ? value[0] || '' : value)}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Equipment (Optional)</Text>
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
                <Text style={styles.saveButtonText}>Save Branch</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.branchesSection}>
          <Text style={styles.sectionTitle}>Your Branches ({branches.length})</Text>
          {branches.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No branches yet</Text>
              <Text style={styles.emptySubtext}>Add your first branch to start posting jobs</Text>
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
    borderRadius: 8,
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
    borderRadius: 16,
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
    borderRadius: 8,
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
  },
  branchCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
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
  branchMetro: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
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
