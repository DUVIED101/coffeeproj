import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../config/constants';
import { CITY_CODES } from '../types/city';
import type { CityCode } from '../types/city';

type CityToggleProps = {
  value: CityCode;
  onChange: (city: CityCode) => void;
};

export const CityToggle: React.FC<CityToggleProps> = ({ value, onChange }) => {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      {CITY_CODES.map(code => {
        const active = code === value;
        return (
          <TouchableOpacity
            key={code}
            style={[styles.tab, active && styles.tabActive]}
            onPress={() => onChange(code)}>
            <Text style={[styles.tabText, active && styles.tabTextActive]}>
              {t(`city.codes.${code}`)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 999,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.text,
    fontWeight: '600',
  },
});
