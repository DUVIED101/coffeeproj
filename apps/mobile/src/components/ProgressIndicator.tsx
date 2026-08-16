import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../config/constants';

type ProgressIndicatorProps = {
  steps: ReadonlyArray<string>;
  currentStep: number;
};

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ steps, currentStep }) => (
  <View style={styles.container}>
    {steps.map((step, index) => (
      <View key={step} style={styles.step}>
        <View
          style={[
            styles.dot,
            index <= currentStep && styles.dotActive,
            index < currentStep && styles.dotCompleted,
          ]}>
          <Text style={[styles.dotText, index <= currentStep && styles.dotTextActive]}>
            {index + 1}
          </Text>
        </View>
        {index < steps.length - 1 && (
          <View style={[styles.line, index < currentStep && styles.lineActive]} />
        )}
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  dotCompleted: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  dotText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  dotTextActive: {
    color: '#fff',
  },
  line: {
    width: 40,
    height: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: 4,
  },
  lineActive: {
    backgroundColor: COLORS.success,
  },
});
