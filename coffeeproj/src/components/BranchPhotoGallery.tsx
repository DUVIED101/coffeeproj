import React, { memo, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS, RADII } from '../config/constants';
import { PHOTO_LIMIT } from '../utils/storage';

type BranchPhotoGalleryProps = {
  photos: string[];
  editable?: boolean;
  busyIndex?: number;
  onAdd?: () => void;
  onRemove?: (photoUrl: string, index: number) => void;
};

const Thumbnail = memo(function Thumbnail({
  uri,
  index,
  editable,
  busy,
  onRemove,
}: {
  uri: string;
  index: number;
  editable: boolean;
  busy: boolean;
  onRemove?: (uri: string, index: number) => void;
}) {
  const handleRemove = useCallback(() => onRemove?.(uri, index), [onRemove, uri, index]);

  return (
    <View style={styles.thumbnailWrap}>
      <Image source={{ uri }} style={styles.thumbnail} resizeMode="cover" />
      {index === 0 && (
        <View style={styles.coverBadge}>
          <Text style={styles.coverBadgeText}>★</Text>
        </View>
      )}
      {editable && (
        <TouchableOpacity
          style={styles.removeButton}
          disabled={busy}
          onPress={handleRemove}
          accessibilityRole="button"
          accessibilityLabel="Remove photo">
          {busy ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.removeButtonText}>×</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
});

export const BranchPhotoGallery: React.FC<BranchPhotoGalleryProps> = ({
  photos,
  editable = false,
  busyIndex,
  onAdd,
  onRemove,
}) => {
  const { t } = useTranslation();
  const canAdd = editable && photos.length < PHOTO_LIMIT;

  const renderItem = useCallback(
    ({ item, index }: { item: string; index: number }) => (
      <Thumbnail
        uri={item}
        index={index}
        editable={editable}
        busy={busyIndex === index}
        onRemove={onRemove}
      />
    ),
    [editable, busyIndex, onRemove]
  );

  const keyExtractor = useCallback((url: string, idx: number) => `${idx}-${url}`, []);

  if (photos.length === 0 && !editable) {
    return null;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={photos}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          editable ? <Text style={styles.emptyHint}>{t('branchPhotos.empty')}</Text> : null
        }
        ListFooterComponent={
          canAdd ? (
            <TouchableOpacity
              style={styles.addTile}
              onPress={onAdd}
              accessibilityRole="button"
              accessibilityLabel={t('branchPhotos.add')}>
              <Text style={styles.addTilePlus}>+</Text>
              <Text style={styles.addTileLabel}>{t('branchPhotos.add')}</Text>
            </TouchableOpacity>
          ) : null
        }
      />
      {editable && (
        <Text style={styles.counter}>
          {t('branchPhotos.counter', { count: photos.length, max: PHOTO_LIMIT })}
        </Text>
      )}
    </View>
  );
};

const THUMB_SIZE = 96;

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  list: {
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  thumbnailWrap: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    marginHorizontal: 4,
    borderRadius: RADII.card,
    overflow: 'hidden',
    backgroundColor: COLORS.backgroundSecondary,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  coverBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADII.pill,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  coverBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '700',
  },
  addTile: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    marginHorizontal: 4,
    borderRadius: RADII.card,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  addTilePlus: {
    fontSize: 28,
    color: COLORS.textSecondary,
    lineHeight: 30,
  },
  addTileLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  emptyHint: {
    paddingHorizontal: 12,
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  counter: {
    paddingHorizontal: 12,
    paddingTop: 4,
    color: COLORS.textSecondary,
    fontSize: 12,
  },
});
