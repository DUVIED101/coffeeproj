import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../../config/constants';
import type { AccountType } from '../../types';

type AuthStackParamList = {
  AccountType: undefined;
  Signup: { accountType: AccountType };
  Login: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'AccountType'>;
};

export const AccountTypeScreen: React.FC<Props> = ({ navigation }) => {
  const handleSelectType = (accountType: AccountType) => {
    navigation.navigate('Signup', { accountType });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to CoffeeProj</Text>
          <Text style={styles.subtitle}>
            Connect baristas with coffee shops across Russia
          </Text>
        </View>

        {/* Account Type Selection */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.baristaButton]}
            onPress={() => handleSelectType('barista')}
            activeOpacity={0.8}>
            <Text style={styles.buttonIcon}>☕</Text>
            <Text style={styles.buttonTitle}>I'm a Barista</Text>
            <Text style={styles.buttonDescription}>
              Find coffee shop jobs and opportunities
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.businessButton]}
            onPress={() => handleSelectType('business')}
            activeOpacity={0.8}>
            <Text style={styles.buttonIcon}>🏪</Text>
            <Text style={styles.buttonTitle}>I'm a Business</Text>
            <Text style={styles.buttonDescription}>
              Post jobs and hire talented baristas
            </Text>
          </TouchableOpacity>
        </View>

        {/* Login Link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>Log In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    gap: 16,
  },
  button: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  baristaButton: {
    borderColor: COLORS.primary,
  },
  businessButton: {
    borderColor: COLORS.secondary,
  },
  buttonIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  buttonTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  buttonDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  linkText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
});
