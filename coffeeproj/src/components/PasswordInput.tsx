import React, { useState } from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import type { TextInputProps, StyleProp, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../config/constants';

type PasswordInputProps = Omit<TextInputProps, 'secureTextEntry'> & {
  hasError?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

export const PasswordInput: React.FC<PasswordInputProps> = ({
  hasError,
  containerStyle,
  style,
  ...textInputProps
}) => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  return (
    <View style={[styles.wrapper, hasError && styles.wrapperError, containerStyle]}>
      <TextInput
        {...textInputProps}
        style={[styles.input, style]}
        secureTextEntry={!isVisible}
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor={COLORS.textSecondary}
      />
      <Pressable
        onPress={() => setIsVisible(v => !v)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={isVisible ? t('auth.password.hide') : t('auth.password.show')}
        style={styles.toggle}>
        <Icon
          name={isVisible ? 'eye-off-outline' : 'eye-outline'}
          size={22}
          color={COLORS.textSecondary}
        />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  wrapperError: {
    borderColor: COLORS.error,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  toggle: {
    paddingLeft: 12,
    paddingVertical: 12,
  },
});
