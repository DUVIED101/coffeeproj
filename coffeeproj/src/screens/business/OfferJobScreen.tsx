import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { COLORS } from '../../config/constants';
import { JobService } from '../../services/JobService';
import {
  JobOfferAlreadyAppliedError,
  JobOfferDuplicatePendingError,
  JobOfferService,
} from '../../services/JobOfferService';
import { useAuthStore } from '../../stores/authStore';
import type { Job } from '../../types/job';
import type { JobId, UserId } from '../../types/ids';
import type { BusinessStackParamList } from '../../navigation/BusinessStack';

type Props = {
  navigation: NativeStackNavigationProp<BusinessStackParamList, 'OfferJob'>;
  route: RouteProp<BusinessStackParamList, 'OfferJob'>;
};

const MESSAGE_MAX = 280;

export const OfferJobScreen: React.FC<Props> = ({ navigation, route }) => {
  const { baristaId } = route.params;
  const { t } = useTranslation();
  const currentUser = useAuthStore(state => state.user);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [offeredJobIds, setOfferedJobIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!currentUser?.id) return;
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        const [jobsData, pendingOffers] = await Promise.all([
          JobService.getJobsByOwnerId(currentUser.id, true),
          JobOfferService.getPendingOffersFromOwnerToBarista(
            currentUser.id as UserId,
            baristaId as UserId
          ).catch(err => {
            console.error('Error loading pending offers for barista:', err);
            return [];
          }),
        ]);
        if (cancelled) return;
        setJobs(jobsData);
        setOfferedJobIds(new Set(pendingOffers.map(o => o.jobId)));
      } catch (error) {
        console.error('Error loading own jobs:', error);
        Alert.alert(t('common.error'), t('offerJob.loadFailure'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, baristaId, t]);

  const closeModal = useCallback(() => {
    if (isSending) return;
    setSelectedJob(null);
    setMessage('');
  }, [isSending]);

  const handleSend = useCallback(async () => {
    if (!currentUser?.id || !selectedJob) return;
    setIsSending(true);
    try {
      await JobOfferService.createOffer({
        businessOwnerId: currentUser.id as UserId,
        baristaId: baristaId as UserId,
        jobId: selectedJob.id as JobId,
        message: message.trim() ? message.trim() : undefined,
      });
      const sentJobId = selectedJob.id;
      setOfferedJobIds(prev => {
        const next = new Set(prev);
        next.add(sentJobId);
        return next;
      });
      setSelectedJob(null);
      setMessage('');
      Alert.alert(t('common.success'), t('offerJob.success'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      if (error instanceof JobOfferAlreadyAppliedError) {
        Alert.alert(t('common.error'), t('offerJob.baristaAlreadyApplied'));
      } else if (error instanceof JobOfferDuplicatePendingError) {
        Alert.alert(t('common.error'), t('offerJob.duplicatePending'));
        setOfferedJobIds(prev => {
          const next = new Set(prev);
          next.add(selectedJob.id);
          return next;
        });
        setSelectedJob(null);
        setMessage('');
      } else {
        console.error('Error creating job offer:', error);
        Alert.alert(t('common.error'), t('offerJob.sendFailure'));
      }
    } finally {
      setIsSending(false);
    }
  }, [baristaId, currentUser?.id, message, navigation, selectedJob, t]);

  const renderJob = useCallback(
    ({ item }: { item: Job }) => {
      const isOffered = offeredJobIds.has(item.id);
      return (
        <TouchableOpacity
          style={[styles.jobCard, isOffered && styles.jobCardDisabled]}
          onPress={() => {
            if (isOffered) return;
            setSelectedJob(item);
            setMessage('');
          }}
          disabled={isOffered}
          activeOpacity={0.7}>
          <View style={styles.jobCardHeader}>
            <Text style={[styles.jobTitle, isOffered && styles.jobTextDisabled]}>{item.title}</Text>
            {isOffered && (
              <View style={styles.offeredBadge}>
                <Text style={styles.offeredBadgeText}>{t('offerJob.alreadyOfferedBadge')}</Text>
              </View>
            )}
          </View>
          {item.branchName && (
            <Text style={[styles.jobBranch, isOffered && styles.jobTextDisabled]}>
              {item.branchName}
            </Text>
          )}
          {item.shiftDetails?.startDate && (
            <Text style={[styles.jobMeta, isOffered && styles.jobTextDisabled]}>
              {new Date(item.shiftDetails.startDate).toLocaleDateString('ru-RU')}
              {item.shiftDetails.startTime ? ` · ${item.shiftDetails.startTime}` : ''}
            </Text>
          )}
        </TouchableOpacity>
      );
    },
    [offeredJobIds, t]
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
      <FlatList
        data={jobs}
        keyExtractor={item => item.id}
        renderItem={renderJob}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>{t('offerJob.title')}</Text>
            <Text style={styles.subtitle}>{t('offerJob.subtitle')}</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('offerJob.empty')}</Text>
            <TouchableOpacity
              style={styles.emptyCtaButton}
              onPress={() => navigation.navigate('CreateJob')}>
              <Text style={styles.emptyCtaText}>{t('offerJob.emptyCta')}</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <Modal
        visible={selectedJob !== null}
        animationType="slide"
        transparent
        onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>
              {t('offerJob.confirmTitle', { title: selectedJob?.title ?? '' })}
            </Text>
            <Text style={styles.modalLabel}>{t('offerJob.note')}</Text>
            <TextInput
              style={styles.modalInput}
              value={message}
              onChangeText={setMessage}
              placeholder={t('offerJob.notePlaceholder')}
              placeholderTextColor={COLORS.textSecondary}
              multiline
              maxLength={MESSAGE_MAX}
              editable={!isSending}
            />
            <Text style={styles.modalCounter}>
              {t('offerJob.charCounter', { current: message.length, max: MESSAGE_MAX })}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancel]}
                onPress={closeModal}
                disabled={isSending}>
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSend, isSending && styles.modalDisabled]}
                onPress={handleSend}
                disabled={isSending}>
                {isSending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSendText}>{t('offerJob.send')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 24 },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 22, fontWeight: 'bold', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  jobCardDisabled: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
  jobCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  jobTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, flexShrink: 1 },
  jobTextDisabled: { color: '#9CA3AF' },
  jobBranch: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  jobMeta: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  offeredBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
  },
  offeredBadgeText: { fontSize: 11, fontWeight: '600', color: '#4B5563' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 16 },
  emptyCtaButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  emptyCtaText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 16 },
  modalLabel: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 8 },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    minHeight: 96,
    color: COLORS.text,
    textAlignVertical: 'top',
  },
  modalCounter: { textAlign: 'right', fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 999, alignItems: 'center' },
  modalCancel: { borderWidth: 1, borderColor: COLORS.border },
  modalCancelText: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  modalSend: { backgroundColor: COLORS.primary },
  modalSendText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  modalDisabled: { opacity: 0.6 },
});
