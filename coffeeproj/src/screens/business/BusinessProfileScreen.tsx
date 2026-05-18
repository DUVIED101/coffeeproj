import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS, RADII } from '../../config/constants';
import { BusinessService } from '../../services/BusinessService';
import { ReviewService } from '../../services/ReviewService';
import { useAuthStore } from '../../stores/authStore';
import type { Business } from '../../types';
import type { UserId } from '../../types/ids';
import type { UserReviewAggregate } from '../../types/review';
import type { BusinessProfileStackParamList } from '../../navigation/BusinessProfileStack';

type Props = NativeStackScreenProps<BusinessProfileStackParamList, 'BusinessProfileHome'>;

export const BusinessProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const userId = useAuthStore(s => s.user?.id) as UserId | undefined;

  const [business, setBusiness] = useState<Business | null>(null);
  const [branchCount, setBranchCount] = useState<number>(0);
  const [reviewAggregate, setReviewAggregate] = useState<UserReviewAggregate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    try {
      const fetchedBusiness = await BusinessService.getBusinessByOwnerId(userId);
      setBusiness(fetchedBusiness);

      if (fetchedBusiness) {
        const [branches, aggregate] = await Promise.all([
          BusinessService.getBranches(fetchedBusiness.id),
          ReviewService.getAggregateForUser(userId),
        ]);
        setBranchCount(branches.length);
        setReviewAggregate(aggregate);
      }
    } catch (error) {
      console.error('Error loading business profile:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await load();
  }, [load]);

  const handleManageBranches = useCallback(() => {
    if (!business) return;
    navigation.navigate('BranchManagement', { businessId: business.id });
  }, [business, navigation]);

  const handleReviews = useCallback(() => {
    navigation.navigate('BusinessReviews');
  }, [navigation]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!business) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>{t('businessProfile.noBusinessTitle')}</Text>
          <Text style={styles.emptySubtitle}>{t('businessProfile.noBusinessSubtitle')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const reviewSummary =
    reviewAggregate && reviewAggregate.reviewCount > 0
      ? `${reviewAggregate.averageRating.toFixed(1)} ★ · ${reviewAggregate.reviewCount}`
      : t('businessProfile.noReviews');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }>
        <View style={styles.header}>
          <View style={styles.avatarPlaceholder}>
            <MaterialCommunityIcons name="storefront" size={36} color={COLORS.primary} />
          </View>
          <Text style={styles.businessName}>{business.name}</Text>
          {business.isVerified ? (
            <View style={styles.verifiedBadge}>
              <MaterialCommunityIcons name="check-decagram" size={16} color={COLORS.success} />
              <Text style={styles.verifiedText}>{t('businessProfile.verified')}</Text>
            </View>
          ) : (
            <View style={styles.unverifiedBadge}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={16}
                color={COLORS.warning}
              />
              <Text style={styles.unverifiedText}>{t('businessProfile.unverified')}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('businessProfile.organizationSection')}</Text>

          <TouchableOpacity style={styles.row} onPress={handleManageBranches}>
            <View style={styles.rowIcon}>
              <MaterialCommunityIcons name="map-marker-multiple" size={22} color={COLORS.text} />
            </View>
            <View style={styles.rowLabelWrap}>
              <Text style={styles.rowLabel}>{t('businessProfile.branches')}</Text>
              <Text style={styles.rowSubLabel}>
                {t('businessProfile.branchesCount', { count: branchCount })}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.row} onPress={handleReviews}>
            <View style={styles.rowIcon}>
              <MaterialCommunityIcons name="star-outline" size={22} color={COLORS.text} />
            </View>
            <View style={styles.rowLabelWrap}>
              <Text style={styles.rowLabel}>{t('businessProfile.reviews')}</Text>
              <Text style={styles.rowSubLabel}>{reviewSummary}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    backgroundColor: COLORS.background,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  businessName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADII.pill,
    backgroundColor: 'rgba(39, 174, 96, 0.1)',
  },
  verifiedText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '600',
  },
  unverifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADII.pill,
    backgroundColor: 'rgba(243, 156, 18, 0.1)',
  },
  unverifiedText: {
    fontSize: 12,
    color: COLORS.warning,
    fontWeight: '600',
  },
  section: {
    marginTop: 16,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  rowIcon: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  rowLabelWrap: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 16,
    color: COLORS.text,
  },
  rowSubLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  chevron: {
    fontSize: 22,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
});
