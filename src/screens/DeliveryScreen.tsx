import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { API_URL } from '../config';
import { useSocket } from '../hooks/useSocket';
import { DeliveryDashboard, Order, User } from '../types';

interface DeliveryScreenProps {
  user: User;
  onLogout: () => void;
}

const emptyDashboard: DeliveryDashboard = {
  incoming_orders: [],
  active_order: null,
  recent_orders: [],
};

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatItems(order: Order) {
  return order.items.map(item => `${item.quantity}x ${item.name}`).join(', ');
}

export default function DeliveryScreen({ user, onLogout }: DeliveryScreenProps) {
  const { socket, isConnected } = useSocket();
  const [dashboard, setDashboard] = useState<DeliveryDashboard>(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  const refreshDashboard = async () => {
    try {
      const response = await fetch(`${API_URL}/api/delivery/${user.id}/dashboard`);
      const payload: DeliveryDashboard = await response.json();
      setDashboard(payload);
    } catch (error) {
      console.error(error);
      Alert.alert('Connection issue', 'Unable to refresh delivery feed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshDashboard();
  }, [user.id]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const sync = () => {
      refreshDashboard();
    };

    socket.on('order:created', sync);
    socket.on('order:updated', sync);

    return () => {
      socket.off('order:created', sync);
      socket.off('order:updated', sync);
    };
  }, [socket, user.id]);

  const submitDecision = async (orderId: number, action: 'accept' | 'reject' | 'status', status?: 'Delivered') => {
    try {
      setSubmittingId(orderId);
      const endpoint =
        action === 'status'
          ? `${API_URL}/api/orders/${orderId}/status`
          : `${API_URL}/api/orders/${orderId}/${action}`;
      const response = await fetch(endpoint, {
        method: action === 'status' ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:
          action === 'status'
            ? JSON.stringify({ status })
            : JSON.stringify({ delivery_boy_id: user.id }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.detail ?? 'Action failed');
      }

      await refreshDashboard();
    } catch (error) {
      Alert.alert('Action failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSubmittingId(null);
    }
  };

  const incomingOrders = dashboard.incoming_orders;
  const activeOrder = dashboard.active_order;
  const recentOrders = dashboard.recent_orders;

  const renderIncomingCard = ({ item }: { item: Order }) => (
    <View style={styles.offerCard}>
      <View style={styles.offerTopRow}>
        <View>
          <Text style={styles.offerEyebrow}>Incoming Request</Text>
          <Text style={styles.orderTitle}>Order #{item.id}</Text>
        </View>
        <View style={styles.pillPrimary}>
          <Ionicons name="navigate" size={13} color="#4f46e5" />
          <Text style={styles.pillPrimaryText}>{item.offered_distance_km?.toFixed(1) ?? '0.0'} km</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="person-circle-outline" size={16} color="#64748b" />
        <Text style={styles.metaText}>{item.customer_name}</Text>
      </View>
      <View style={styles.metaRow}>
        <Ionicons name="location-outline" size={16} color="#64748b" />
        <Text style={styles.metaText}>{item.customer_address}</Text>
      </View>
      <View style={styles.metaRow}>
        <Ionicons name="cube-outline" size={16} color="#64748b" />
        <Text style={styles.metaText}>{formatItems(item)}</Text>
      </View>

      <View style={styles.offerActions}>
        <TouchableOpacity
          style={[styles.secondaryAction, submittingId === item.id && styles.actionDisabled]}
          disabled={submittingId === item.id}
          onPress={() => submitDecision(item.id, 'reject')}
        >
          <Text style={styles.secondaryActionText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryAction, submittingId === item.id && styles.actionDisabled]}
          disabled={submittingId === item.id}
          onPress={() => submitDecision(item.id, 'accept')}
        >
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <Text style={styles.primaryActionText}>Accept Delivery</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#4f46e5" />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={onLogout} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>AirO Rider Console</Text>
            <Text style={styles.headerSubtitle}>{user.name}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.connectionDot, isConnected ? styles.connectionLive : styles.connectionIdle]} />
          <Text style={styles.connectionLabel}>{isConnected ? 'Live' : 'Offline'}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : (
        <FlatList
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          data={incomingOrders}
          keyExtractor={item => item.id.toString()}
          renderItem={renderIncomingCard}
          ListHeaderComponent={
            <>
              <View style={styles.heroCard}>
                <View>
                  <Text style={styles.heroKicker}>Service Zone</Text>
                  <Text style={styles.heroTitle}>{user.service_radius_km.toFixed(0)} km dispatch radius</Text>
                  <Text style={styles.heroSubtitle}>
                    Orders are offered only if they fall inside your nearby delivery range.
                  </Text>
                </View>
                <View style={styles.heroBadge}>
                  <Ionicons name="flash" size={18} color="#fff" />
                </View>
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Upcoming Requests</Text>
                <Text style={styles.sectionCount}>{incomingOrders.length}</Text>
              </View>

              {activeOrder ? (
                <View style={styles.activeCard}>
                  <View style={styles.offerTopRow}>
                    <View>
                      <Text style={styles.offerEyebrow}>Active Delivery</Text>
                      <Text style={styles.orderTitle}>Order #{activeOrder.id}</Text>
                    </View>
                    <View style={styles.activePill}>
                      <Ionicons name="bicycle" size={14} color="#047857" />
                      <Text style={styles.activePillText}>In Progress</Text>
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <Ionicons name="person-circle-outline" size={16} color="#64748b" />
                    <Text style={styles.metaText}>{activeOrder.customer_name}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Ionicons name="location-outline" size={16} color="#64748b" />
                    <Text style={styles.metaText}>{activeOrder.customer_address}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Ionicons name="call-outline" size={16} color="#64748b" />
                    <Text style={styles.metaText}>{activeOrder.customer_phone}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Ionicons name="cube-outline" size={16} color="#64748b" />
                    <Text style={styles.metaText}>{formatItems(activeOrder)}</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.completeButton, submittingId === activeOrder.id && styles.actionDisabled]}
                    disabled={submittingId === activeOrder.id}
                    onPress={() => submitDecision(activeOrder.id, 'status', 'Delivered')}
                  >
                    <Ionicons name="checkmark-done-circle" size={18} color="#fff" />
                    <Text style={styles.completeButtonText}>Mark Delivered</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.emptyActiveCard}>
                  <Ionicons name="time-outline" size={26} color="#94a3b8" />
                  <Text style={styles.emptyActiveTitle}>No active trip right now</Text>
                  <Text style={styles.emptyActiveText}>Accept the next nearby request to start your run.</Text>
                </View>
              )}

              {incomingOrders.length === 0 && (
                <View style={styles.queueEmptyCard}>
                  <Ionicons name="notifications-off-outline" size={24} color="#94a3b8" />
                  <Text style={styles.queueEmptyTitle}>No nearby offers in queue</Text>
                  <Text style={styles.queueEmptyText}>We will push the next request in your service area here.</Text>
                </View>
              )}

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Completed Recently</Text>
                <Text style={styles.sectionCount}>{recentOrders.length}</Text>
              </View>
            </>
          }
          ListFooterComponent={
            <View style={styles.historySection}>
              {recentOrders.length === 0 ? (
                <Text style={styles.historyEmpty}>Completed deliveries will appear here.</Text>
              ) : (
                recentOrders.map(order => (
                  <View key={order.id} style={styles.historyCard}>
                    <View>
                      <Text style={styles.historyOrderTitle}>Order #{order.id}</Text>
                      <Text style={styles.historyOrderText}>{order.customer_address}</Text>
                    </View>
                    <View style={styles.historyRight}>
                      <Text style={styles.historyTime}>{formatTime(order.created_at)}</Text>
                      <View style={styles.donePill}>
                        <Ionicons name="checkmark-circle" size={14} color="#059669" />
                        <Text style={styles.donePillText}>Done</Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#4f46e5',
  },
  header: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectionLive: {
    backgroundColor: '#22c55e',
  },
  connectionIdle: {
    backgroundColor: '#cbd5e1',
  },
  connectionLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  loadingWrap: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -4,
    marginBottom: 18,
  },
  heroKicker: {
    color: '#93c5fd',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 6,
  },
  heroSubtitle: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    maxWidth: 240,
  },
  heroBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 6,
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
  sectionCount: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
  },
  offerCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  activeCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  emptyActiveCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyActiveTitle: {
    marginTop: 10,
    color: '#334155',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyActiveText: {
    marginTop: 4,
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
  },
  queueEmptyCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  queueEmptyTitle: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
  },
  queueEmptyText: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  offerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  offerEyebrow: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  orderTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  pillPrimary: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillPrimaryText: {
    color: '#4f46e5',
    fontSize: 12,
    fontWeight: '700',
  },
  activePill: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  activePillText: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  metaText: {
    flex: 1,
    color: '#334155',
    fontSize: 14,
    lineHeight: 20,
  },
  offerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  secondaryAction: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  secondaryActionText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryAction: {
    flex: 1.6,
    borderRadius: 14,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    flexDirection: 'row',
    gap: 8,
  },
  primaryActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  completeButton: {
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    flexDirection: 'row',
    gap: 8,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  actionDisabled: {
    opacity: 0.6,
  },
  historySection: {
    paddingBottom: 8,
  },
  historyEmpty: {
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 12,
    fontSize: 13,
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  historyOrderTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },
  historyOrderText: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 3,
    maxWidth: 210,
  },
  historyRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  historyTime: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  donePill: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  donePillText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
  },
});
