import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Linking,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { transformedImageUrl } from '../../utils/imageTransform';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS, RADII } from '../../config/constants';
import { BusinessService } from '../../services/BusinessService';
import { ReviewService } from '../../services/ReviewService';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationFeedStore } from '../../stores/notificationFeedStore';
import { ScreenHeaderWithActions } from '../../components/ScreenHeaderWithActions';
import { FullscreenImageViewer } from '../../components/FullscreenImageViewer';
import type { Business } from '../../types';
import type { SocialLink, SocialPlatform } from '../../types/business';
import type { UserId } from '../../types/ids';
import type { UserReviewAggregate } from '../../types/review';
import type { BusinessProfileStackParamList } from '../../navigation/BusinessProfileStack';
import type { TFunction } from 'i18next';

type Props = NativeStackScreenProps<BusinessProfileStackParamList, 'BusinessProfileHome'>;

const stripAt = (handle: string): string => handle.replace(/^@+/, '').trim();

const buildSocialLinkUrl = (link: SocialLink): string | null => {
  const value = link.value.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  switch (link.platform) {
    case 'instagram':
      return `https://instagram.com/${stripAt(value)}`;
    case 'telegram':
      return `https://t.me/${stripAt(value)}`;
    case 'vk':
      return value.startsWith('vk.com') ? `https://${value}` : `https://vk.com/${stripAt(value)}`;
    case 'website':
      return `https://${value}`;
    case 'other':
      return null;
  }
};

const socialIconName = (platform: SocialPlatform): string => {
  switch (platform) {
    case 'instagram':
      return 'instagram';
    case 'telegram':
      return 'send';
    case 'vk':
      return 'alpha-v-circle';
    case 'website':
      return 'web';
    case 'other':
      return 'link-variant';
  }
};

const socialLabel = (platform: SocialPlatform, t: TFunction): string =>
  t(`socialLinks.${platform}`, { defaultValue: platform });

export const BusinessProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const userId = useAuthStore(s => s.user?.id) as UserId | undefined;
  const unreadCount = useNotificationFeedStore(s => s.unreadCount);

  const [business, setBusiness] = useState<Business | null>(null);
  const [branchCount, setBranchCount] = useState<number>(0);
  const [reviewAggregate, setReviewAggregate] = useState<UserReviewAggregate | null>(null);
  const [reliability, setReliability] = useState<{
    disputes30d: number;
    reliabilityScore: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [avatarViewerVisible, setAvatarViewerVisible] = useState(false);

  const load = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    try {
      const fetchedBusiness = await BusinessService.getBusinessByOwnerId(userId);
      setBusiness(fetchedBusiness);

      if (fetchedBusiness) {
        const [branches, aggregate, rel] = await Promise.all([
          BusinessService.getBranches(fetchedBusiness.id),
          ReviewService.getAggregateForUser(userId),
          BusinessService.getBusinessReliabilityScore(userId),
        ]);
        setBranchCount(branches.length);
        setReviewAggregate(aggregate);
        setReliability(rel);
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

  const handleEditProfile = useCallback(() => {
    navigation.navigate('BusinessProfileSetup');
  }, [navigation]);

  const handleOpenLink = useCallback(async (url: string) => {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) await Linking.openURL(url);
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!business) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <ScreenHeaderWithActions
          title={t('businessProfile.title')}
          actions={[
            {
              icon: 'bell-outline',
              badgeCount: unreadCount,
              onPress: () => navigation.navigate('NotificationFeed'),
              testID: 'bell',
            },
            {
              icon: 'cog-outline',
              onPress: () => navigation.navigate('Settings'),
              testID: 'settings',
            },
          ]}
        />
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="storefront-outline"
            size={56}
            color={COLORS.textSecondary}
          />
          <Text style={styles.emptyTitle}>{t('businessProfile.noBusinessTitle')}</Text>
          <Text style={styles.emptySubtitle}>{t('businessProfile.noBusinessSubtitle')}</Text>
          <TouchableOpacity style={styles.emptyCta} onPress={handleEditProfile}>
            <Text style={styles.emptyCtaText}>{t('businessProfile.createCta')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const reviewSummary =
    reviewAggregate && reviewAggregate.reviewCount > 0
      ? `${reviewAggregate.averageRating.toFixed(1)} ★ · ${reviewAggregate.reviewCount}`
      : t('businessProfile.noReviews');

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScreenHeaderWithActions
        title={t('businessProfile.title')}
        actions={[
          {
            icon: 'bell-outline',
            badgeCount: unreadCount,
            onPress: () => navigation.navigate('NotificationFeed'),
            testID: 'bell',
          },
          {
            icon: 'cog-outline',
            onPress: () => navigation.navigate('Settings'),
            testID: 'settings',
          },
        ]}
      />
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
          {business.logoUrl ? (
            <TouchableOpacity
              onPress={() => setAvatarViewerVisible(true)}
              activeOpacity={0.85}
              accessibilityRole="button">
              <FastImage
                source={{ uri: transformedImageUrl(business.logoUrl, 72) }}
                style={styles.avatarImage}
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.avatarPlaceholder}>
              <MaterialCommunityIcons name="storefront" size={36} color={COLORS.primary} />
            </View>
          )}
          <Text style={styles.businessName}>{business.name}</Text>
          {!!business.description && (
            <Text style={styles.businessDescription} numberOfLines={4}>
              {business.description}
            </Text>
          )}
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
          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <MaterialCommunityIcons name="pencil-outline" size={16} color={COLORS.primary} />
            <Text style={styles.editButtonText}>{t('businessProfile.editProfile')}</Text>
          </TouchableOpacity>
        </View>

        {(business.website || business.socialLinks.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('businessProfile.brandSection')}</Text>
            {business.website && (
              <TouchableOpacity
                style={styles.row}
                onPress={() => handleOpenLink(business.website!)}>
                <View style={styles.rowIcon}>
                  <MaterialCommunityIcons name="web" size={22} color={COLORS.text} />
                </View>
                <View style={styles.rowLabelWrap}>
                  <Text style={styles.rowLabel}>{t('businessProfile.website')}</Text>
                  <Text style={styles.rowSubLabel} numberOfLines={1}>
                    {business.website}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            )}
            {business.socialLinks.map((link, index) => {
              const url = buildSocialLinkUrl(link);
              const inner = (
                <>
                  <View style={styles.rowIcon}>
                    <MaterialCommunityIcons
                      name={socialIconName(link.platform)}
                      size={22}
                      color={COLORS.text}
                    />
                  </View>
                  <View style={styles.rowLabelWrap}>
                    <Text style={styles.rowLabel}>{socialLabel(link.platform, t)}</Text>
                    <Text style={styles.rowSubLabel} numberOfLines={1}>
                      {link.value}
                    </Text>
                  </View>
                  {url && <Text style={styles.chevron}>›</Text>}
                </>
              );
              return url ? (
                <TouchableOpacity
                  key={`${link.platform}-${index}`}
                  style={styles.row}
                  onPress={() => handleOpenLink(url)}>
                  {inner}
                </TouchableOpacity>
              ) : (
                <View key={`${link.platform}-${index}`} style={styles.row}>
                  {inner}
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('businessProfile.organizationSection')}</Text>

          <TouchableOpacity style={styles.row} onPress={handleManageBranches}>
            <View style={styles.rowIcon}>
              <MaterialCommunityIcons name="map-marker-multiple" size={22} color={COLORS.text} />
            </View>
            <View style={styles.rowLabelWrap}>
              <Text style={styles.rowLabel}>{t('businessProfile.branches')}</Text>
              <Text style={styles.rowSubLabel}>{branchCount}</Text>
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

          {reliability && (
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate('Settings', { screen: 'MyDisputes' })}>
              <View style={styles.rowIcon}>
                <MaterialCommunityIcons name="shield-check-outline" size={22} color={COLORS.text} />
              </View>
              <View style={styles.rowLabelWrap}>
                <Text style={styles.rowLabel}>{t('reliability.sectionTitle')}</Text>
                <Text style={styles.rowSubLabel}>
                  {t('reliability.scoreOf', { score: reliability.reliabilityScore.toFixed(1) })}
                  {reliability.disputes30d > 0
                    ? ` · ${t('reliability.incidents', { count: reliability.disputes30d })}`
                    : ` · ${t('reliability.noIncidents')}`}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
      {business.logoUrl && (
        <FullscreenImageViewer
          visible={avatarViewerVisible}
          photos={[business.logoUrl]}
          onClose={() => setAvatarViewerVisible(false)}
        />
      )}
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
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyCta: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: RADII.pill,
  },
  emptyCtaText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
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
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 12,
  },
  businessDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADII.pill,
    backgroundColor: COLORS.backgroundSecondary,
    marginTop: 12,
  },
  editButtonText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
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
