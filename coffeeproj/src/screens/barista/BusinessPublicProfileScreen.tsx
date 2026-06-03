import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  SafeAreaView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { TFunction } from 'i18next';
import { COLORS, RADII } from '../../config/constants';
import { BusinessService } from '../../services/BusinessService';
import { ReviewService } from '../../services/ReviewService';
import { StarRow } from '../../components/StarRow';
import { FullscreenImageViewer } from '../../components/FullscreenImageViewer';
import type { BaristaStackParamList } from '../../navigation/BaristaStack';
import type { Business, Branch, SocialLink, SocialPlatform } from '../../types/business';
import type { UserId } from '../../types/ids';
import type { UserReviewAggregate } from '../../types/review';

type Props = NativeStackScreenProps<BaristaStackParamList, 'BusinessPublicProfile'>;

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

export const BusinessPublicProfileScreen: React.FC<Props> = ({ route, navigation }) => {
  const { businessOwnerId } = route.params;
  const { t } = useTranslation();

  const [business, setBusiness] = useState<Business | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [aggregate, setAggregate] = useState<UserReviewAggregate | null>(null);
  const [businessReliability, setBusinessReliability] = useState<{
    disputes30d: number;
    reliabilityScore: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [avatarViewerVisible, setAvatarViewerVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const fetched = await BusinessService.getBusinessByOwnerId(businessOwnerId);
        if (cancelled) return;
        setBusiness(fetched);
        if (fetched) {
          const [branchList, agg, rel] = await Promise.all([
            BusinessService.getBranches(fetched.id),
            ReviewService.getAggregateForUser(businessOwnerId as UserId),
            BusinessService.getBusinessReliabilityScore(businessOwnerId),
          ]);
          if (cancelled) return;
          setBranches(branchList);
          setAggregate(agg);
          setBusinessReliability(rel);
        }
      } catch (error) {
        console.error('Error loading public business profile:', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [businessOwnerId]);

  const handleOpenJobs = useCallback(() => {
    navigation.navigate('BusinessJobs', { businessOwnerId, businessName: business?.name });
  }, [navigation, businessOwnerId, business?.name]);

  const handleOpenLink = useCallback(async (url: string) => {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) await Linking.openURL(url);
  }, []);

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
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyText}>
            {t('businessPublicProfile.notFound', { defaultValue: 'Профиль бизнеса не найден' })}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          {business.logoUrl ? (
            <TouchableOpacity
              onPress={() => setAvatarViewerVisible(true)}
              activeOpacity={0.85}
              accessibilityRole="button">
              <Image source={{ uri: business.logoUrl }} style={styles.avatarImage} />
            </TouchableOpacity>
          ) : (
            <View style={styles.avatarPlaceholder}>
              <MaterialCommunityIcons name="storefront" size={36} color={COLORS.primary} />
            </View>
          )}
          <Text style={styles.businessName}>{business.name}</Text>
          {!!business.description && (
            <Text style={styles.businessDescription}>{business.description}</Text>
          )}
          {aggregate && aggregate.reviewCount > 0 && (
            <View style={styles.aggregateRow}>
              <StarRow
                rating={aggregate.averageRating}
                count={aggregate.reviewCount}
                showValue
                size={14}
              />
            </View>
          )}
          {businessReliability && (
            <Text style={styles.reliabilityText}>
              {t('reliability.sectionTitle')}: {businessReliability.reliabilityScore.toFixed(1)}/5
              {businessReliability.disputes30d > 0
                ? ` · ${t('reliability.incidents', { count: businessReliability.disputes30d })}`
                : ''}
            </Text>
          )}
          <TouchableOpacity style={styles.jobsCta} onPress={handleOpenJobs}>
            <Text style={styles.jobsCtaText}>
              {t('businessPublicProfile.viewJobs', { defaultValue: 'Посмотреть вакансии' })}
            </Text>
          </TouchableOpacity>
        </View>

        {(business.website || business.socialLinks.length > 0 || business.foundedYear) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('businessProfile.brandSection', { defaultValue: 'Бренд' })}
            </Text>
            {business.website && (
              <TouchableOpacity
                style={styles.row}
                onPress={() => handleOpenLink(business.website!)}>
                <View style={styles.rowIcon}>
                  <MaterialCommunityIcons name="web" size={22} color={COLORS.text} />
                </View>
                <View style={styles.rowLabelWrap}>
                  <Text style={styles.rowLabel}>
                    {t('businessProfile.website', { defaultValue: 'Сайт' })}
                  </Text>
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
            {business.foundedYear && (
              <View style={styles.row}>
                <View style={styles.rowIcon}>
                  <MaterialCommunityIcons name="calendar" size={22} color={COLORS.text} />
                </View>
                <View style={styles.rowLabelWrap}>
                  <Text style={styles.rowLabel}>
                    {t('businessProfile.foundedYear', { defaultValue: 'Год основания' })}
                  </Text>
                  <Text style={styles.rowSubLabel}>{business.foundedYear}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {branches.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('businessPublicProfile.branchesSection', { defaultValue: 'Точки' })}
            </Text>
            {branches.map(branch => (
              <View key={branch.id} style={styles.row}>
                <View style={styles.rowIcon}>
                  <MaterialCommunityIcons name="map-marker" size={22} color={COLORS.text} />
                </View>
                <View style={styles.rowLabelWrap}>
                  <Text style={styles.rowLabel}>{branch.name}</Text>
                  <Text style={styles.rowSubLabel} numberOfLines={2}>
                    {branch.address}
                    {branch.metroStation ? ` · ${branch.metroStation}` : ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
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
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
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
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 12,
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
  businessDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  aggregateRow: {
    marginTop: 4,
    marginBottom: 4,
  },
  reliabilityText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  jobsCta: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: RADII.pill,
    marginTop: 8,
  },
  jobsCtaText: {
    color: '#fff',
    fontSize: 15,
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
