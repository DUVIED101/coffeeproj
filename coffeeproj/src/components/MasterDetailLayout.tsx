import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { MasterDetailContext, type MasterDetailContextValue } from './MasterDetailContext';
import { COLORS } from '../config/constants';

type RenderArg = { selectedId: string | null; select: (id: string | null) => void };

type Props = {
  master: (arg: RenderArg) => React.ReactNode;
  detail: (arg: { selectedId: string | null; clear: () => void }) => React.ReactNode;
  placeholder?: React.ReactNode;
  placeholderText?: string;
  storageKey?: string;
  masterWidthRatio?: number;
  minMasterWidth?: number;
  maxMasterWidth?: number;
};

const DEFAULT_RATIO = 0.38;
const DEFAULT_MIN = 320;
const DEFAULT_MAX = 420;

export const computeMasterWidth = (
  totalWidth: number,
  ratio: number,
  minWidth: number,
  maxWidth: number
): number => Math.min(maxWidth, Math.max(minWidth, totalWidth * ratio));

export const MasterDetailLayout: React.FC<Props> = ({
  master,
  detail,
  placeholder,
  placeholderText,
  storageKey,
  masterWidthRatio = DEFAULT_RATIO,
  minMasterWidth = DEFAULT_MIN,
  maxMasterWidth = DEFAULT_MAX,
}) => {
  const { width, isTablet } = useResponsiveLayout();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!storageKey) return;
    let cancelled = false;
    void AsyncStorage.getItem(storageKey).then(value => {
      if (cancelled || !value) return;
      setSelectedId(value);
    });
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  const select = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      if (storageKey) {
        if (id == null) {
          void AsyncStorage.removeItem(storageKey);
        } else {
          void AsyncStorage.setItem(storageKey, id);
        }
      }
    },
    [storageKey]
  );

  const contextValue = useMemo<MasterDetailContextValue>(
    () => ({ selectedId, select, isTablet }),
    [selectedId, select, isTablet]
  );

  if (!isTablet) {
    return (
      <MasterDetailContext.Provider value={contextValue}>
        <View style={styles.flex}>{master({ selectedId, select })}</View>
      </MasterDetailContext.Provider>
    );
  }

  const masterWidth = computeMasterWidth(width, masterWidthRatio, minMasterWidth, maxMasterWidth);
  const clear = () => select(null);

  return (
    <MasterDetailContext.Provider value={contextValue}>
      <View style={styles.row}>
        <View style={[styles.master, { width: masterWidth }]}>
          {master({ selectedId, select })}
        </View>
        <View style={styles.detail}>
          {selectedId ? (
            detail({ selectedId, clear })
          ) : (
            <View style={styles.placeholderWrap}>
              {placeholder ?? <Text style={styles.placeholderText}>{placeholderText ?? ''}</Text>}
            </View>
          )}
        </View>
      </View>
    </MasterDetailContext.Provider>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flex: 1, flexDirection: 'row', backgroundColor: COLORS.background },
  master: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  detail: { flex: 1, backgroundColor: COLORS.background },
  placeholderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  placeholderText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
});
