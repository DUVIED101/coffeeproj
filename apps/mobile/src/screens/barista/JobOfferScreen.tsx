import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { COLORS } from '../../config/constants';
import { JobDetailsContent } from '../../components/JobDetailsContent';
import {
  JobOfferJobUnavailableError,
  JobOfferService,
  JobOfferTerminalError,
} from '../../services/JobOfferService';
import { ReviewService } from '../../services/ReviewService';
import { useNotificationFeedStore } from '../../stores/notificationFeedStore';
import type { JobOffer } from '../../types/jobOffer';
import type { JobOfferId, UserId } from '../../types/ids';
import type { UserReviewAggregate } from '../../types/review';
import type { BaristaStackParamList } from '../../navigation/BaristaStack';
import { showErrorToast } from '../../stores/errorToastStore';

type Props = {
  navigation: NativeStackNavigationProp<BaristaStackParamList, 'JobOffer'>;
  route: RouteProp<BaristaStackParamList, 'JobOffer'>;
};

export const JobOfferScreen: React.FC<Props> = ({ navigation, route }) => {
  const { offerId } = route.params;
  const { t } = useTranslation();
  const [offer, setOffer] = useState<JobOffer | null>(null);
  const [ownerAggregate, setOwnerAggregate] = useState<UserReviewAggregate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const deleteByOfferId = useNotificationFeedStore(s => s.deleteByOfferId);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        const result = await JobOfferService.getOfferById(offerId as JobOfferId);
        if (cancelled) return;
        setOffer(result);
        if (result?.job?.businessOwnerId) {
          try {
            const agg = await ReviewService.getAggregateForUser(
              result.job.businessOwnerId as UserId
            );
            if (!cancelled) setOwnerAggregate(agg);
          } catch (err) {
            console.error('Error loading owner aggregate:', err);
          }
        }
      } catch (error) {
        console.error('Error loading job offer:', error);
        Alert.alert(t('common.error'), t('jobOffer.loadFailure'), [
          { text: t('common.ok'), onPress: () => navigation.goBack() },
        ]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigation, offerId, t]);

  const handleAccept = useCallback(async () => {
    if (!offer) return;
    setIsProcessing(true);
    try {
      const result = await JobOfferService.respondToOffer(offer.id, 'accepted');
      if (result.status === 'accepted') {
        Alert.alert(t('common.success'), t('jobOffer.acceptedToast'), [
          {
            text: t('common.ok'),
            onPress: () => {
              navigation.getParent()?.navigate('Chats', {
                screen: 'Chat',
                initial: false,
                params: { applicationId: result.applicationId },
              });
            },
          },
        ]);
      }
    } catch (error) {
      if (error instanceof JobOfferJobUnavailableError) {
        showErrorToast(t('jobOffer.jobUnavailable'));
      } else if (error instanceof JobOfferTerminalError) {
        showErrorToast(t('jobOffer.alreadyResolved'));
      } else {
        console.error('Error accepting job offer:', error);
        showErrorToast(t('jobOffer.respondFailure'));
      }
    } finally {
      setIsProcessing(false);
    }
  }, [navigation, offer, t]);

  const handleDecline = useCallback(async () => {
    if (!offer) return;
    setIsProcessing(true);
    try {
      await JobOfferService.respondToOffer(offer.id, 'declined');
      try {
        await deleteByOfferId(offer.id);
      } catch (cleanupError) {
        console.warn('deleteByOfferId failed', cleanupError);
      }
      navigation.goBack();
    } catch (error) {
      if (error instanceof JobOfferTerminalError) {
        showErrorToast(t('jobOffer.alreadyResolved'));
      } else {
        console.error('Error declining job offer:', error);
        showErrorToast(t('jobOffer.respondFailure'));
      }
    } finally {
      setIsProcessing(false);
    }
  }, [deleteByOfferId, navigation, offer, t]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!offer) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('jobOffer.notFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isPending = offer.status === 'pending';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.offerIntro}>
          <Text style={styles.offerIntroTitle}>{t('jobOffer.title')}</Text>
          {offer.businessName && (
            <Text style={styles.offerIntroBusiness}>
              {t('jobOffer.fromBusiness', { name: offer.businessName })}
            </Text>
          )}
        </View>
        {offer.message && (
          <View style={styles.messageBlock}>
            <Text style={styles.messageLabel}>{t('jobOffer.businessNote')}</Text>
            <Text style={styles.messageText}>{offer.message}</Text>
          </View>
        )}
        {offer.job && (
          <JobDetailsContent
            job={offer.job}
            ownerAggregate={ownerAggregate}
            onBusinessPress={
              offer.job.businessOwnerId
                ? () =>
                    navigation.navigate('BusinessPublicProfile', {
                      businessOwnerId: offer.job!.businessOwnerId,
                    })
                : undefined
            }
          />
        )}

        {!isPending && (
          <View style={styles.statusBanner}>
            <Text style={styles.statusBannerText}>
              {t(`jobOffer.statusBanner.${offer.status}`, {
                defaultValue: t('jobOffer.alreadyResolved'),
              })}
            </Text>
          </View>
        )}

        {isPending && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.declineButton, isProcessing && styles.buttonDisabled]}
              onPress={handleDecline}
              disabled={isProcessing}>
              {isProcessing ? (
                <ActivityIndicator color="#EF4444" />
              ) : (
                <Text style={styles.declineButtonText}>{t('jobOffer.notInterested')}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.acceptButton, isProcessing && styles.buttonDisabled]}
              onPress={handleAccept}
              disabled={isProcessing}>
              {isProcessing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.acceptButtonText}>{t('jobOffer.interested')}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 40 },
  offerIntro: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  offerIntroTitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 4 },
  offerIntroBusiness: { fontSize: 16, color: COLORS.text, fontWeight: '500' },
  messageBlock: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    marginTop: 12,
  },
  messageLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  messageText: { fontSize: 15, color: COLORS.text, lineHeight: 22 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center' },
  statusBanner: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
    marginTop: 16,
    marginHorizontal: 20,
  },
  statusBannerText: { color: '#92400E', fontSize: 14, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24, paddingHorizontal: 20 },
  button: { flex: 1, paddingVertical: 16, borderRadius: 999, alignItems: 'center' },
  acceptButton: { backgroundColor: COLORS.primary },
  acceptButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  declineButton: { borderWidth: 1, borderColor: '#EF4444' },
  declineButtonText: { color: '#EF4444', fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.6 },
});
