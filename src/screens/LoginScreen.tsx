import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { User } from '../types';
import { API_URL } from '../config';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [deliveryBoys, setDeliveryBoys] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/users`)
      .then(r => r.json())
      .then((data: User[]) => {
        setDeliveryBoys(data.filter(u => u.role === 'delivery'));
        setLoading(false);
      })
      .catch(() => {
        setError(`Could not connect to server at ${API_URL}.`);
        setLoading(false);
      });
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconWrapper}>
            <Ionicons name="bicycle" size={36} color="#fff" />
          </View>
          <Text style={styles.title}>AirO Delivery</Text>
          <Text style={styles.subtitle}>Select your profile to continue</Text>
        </View>

        {/* Body */}
        <View style={styles.card}>
          {loading ? (
            <ActivityIndicator size="large" color="#4f46e5" style={{ marginVertical: 32 }} />
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <FlatList
              data={deliveryBoys}
              keyExtractor={item => item.id.toString()}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.profileButton}
                  onPress={() => onLogin(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.avatar}>
                    <Ionicons name="person" size={20} color="#4f46e5" />
                  </View>
                  <View style={styles.profileInfo}>
                    <Text style={styles.profileName}>{item.name}</Text>
                    <Text style={styles.profilePhone}>{item.phone}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No delivery partners found.</Text>
              }
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#4f46e5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  header: {
    backgroundColor: '#4f46e5',
    paddingTop: 48,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 8,
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
    paddingHorizontal: 20,
    paddingTop: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    gap: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  profilePhone: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 32,
    fontSize: 14,
    lineHeight: 22,
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 32,
    fontSize: 14,
  },
});
