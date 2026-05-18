import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../config/constants';
import { ReviewService } from '../services/ReviewService';
import type { ApplicationId, UserId } from '../types/ids';
import type { ApplicationReview, RaterRole, StarRating } from '../types/review';

const MAX_COMMENT_LENGTH = 500;

type ReviewModalProps = {
  visible: boolean;
  applicationId: ApplicationId;
  raterRole: RaterRole;
  rateeId: UserId;
  onSubmitted: (review: ApplicationReview) => void;
  onSkip: () => void;
};

export const ReviewModal: React.FC<ReviewModalProps> = ({
  visible,
  applicationId,
  raterRole,
  rateeId,
  onSubmitted,
  onSkip,
}) => {
  const { t } = useTranslation();
  const [rating, setRating] = useState<StarRating | 0>(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = useCallback(() => {
    setRating(0);
    setComment('');
    setIsSubmitting(false);
  }, []);

  const handleSkip = useCallback(() => {
    reset();
    onSkip();
  }, [onSkip, reset]);

  const handleSubmit = useCallback(async () => {
    if (rating === 0) return;
    setIsSubmitting(true);
    try {
      const review = await ReviewService.createReview({
        applicationId,
        raterRole,
        rateeId,
        rating: rating as StarRating,
        comment: comment.trim() ? comment.trim() : undefined,
      });
      reset();
      onSubmitted(review);
    } catch (error) {
      console.error('Error submitting review:', error);
      const detail =
        error instanceof Error && error.message ? error.message : String(error ?? 'Unknown error');
      Alert.alert(t('common.error'), `${t('reviews.errors.submitFailed')}\n\n${detail}`);
      setIsSubmitting(false);
    }
  }, [rating, comment, applicationId, raterRole, rateeId, t, onSubmitted, reset]);

  const stars = [1, 2, 3, 4, 5] as const;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleSkip}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
          <Text style={styles.title} maxFontSizeMultiplier={1.6}>
            {t('reviews.modal.title')}
          </Text>
          <Text style={styles.subtitle} maxFontSizeMultiplier={1.6}>
            {t('reviews.modal.subtitle')}
          </Text>

          <View style={styles.starsRow}>
            {stars.map(n => {
              const filled = n <= rating;
              return (
                <TouchableOpacity
                  key={n}
                  onPress={() => setRating(n)}
                  accessibilityRole="button"
                  accessibilityLabel={t('reviews.modal.starLabel', { n })}
                  style={styles.starTouchable}>
                  <Text style={[styles.star, filled && styles.starFilled]}>
                    {filled ? '★' : '☆'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            value={comment}
            onChangeText={text =>
              setComment(
                text.length <= MAX_COMMENT_LENGTH ? text : text.slice(0, MAX_COMMENT_LENGTH)
              )
            }
            placeholder={t('reviews.modal.commentPlaceholder')}
            placeholderTextColor={COLORS.textSecondary}
            style={styles.input}
            multiline
            maxLength={MAX_COMMENT_LENGTH}
            textAlignVertical="top"
            maxFontSizeMultiplier={1.6}
          />
          <Text style={styles.counter}>
            {t('reviews.modal.charCounter', { count: comment.length })}
          </Text>

          <TouchableOpacity
            style={[styles.submitButton, rating === 0 && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={rating === 0 || isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>{t('reviews.modal.submit')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={handleSkip} disabled={isSubmitting}>
            <Text style={styles.skipText}>{t('reviews.modal.skip')}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  starTouchable: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  star: {
    fontSize: 36,
    color: COLORS.border,
  },
  starFilled: {
    color: COLORS.warning,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 80,
    backgroundColor: COLORS.background,
  },
  counter: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: 6,
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 10,
  },
  skipText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
});
