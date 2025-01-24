import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, RefreshControl, Alert, Dimensions, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useIsFocused, useFocusEffect } from '@react-navigation/native';
import { Plus, ChevronRight, AlertCircle } from 'lucide-react-native';
import { api } from '../../api';


const { width } = Dimensions.get('window');

const TransactionScreen = ({ route, navigation }) => {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totals, setTotals] = useState({
    income: 0,
    expense: 0
  });
  const [filterType, setFilterType] = useState(null);
  const [currentMonth] = useState(new Date());
  const isFocused = useIsFocused();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const getFilteredTransactions = () => {
    if (!filterType) return transactions;
    return transactions.filter(t => t.type === filterType);
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <AlertCircle size={48} color="#666666" />
      <Text style={styles.emptyStateText}>No transactions yet</Text>
      <Text style={styles.emptyStateSubtext}>
        Tap the + button to add your first transaction
      </Text>
    </View>
  );

  const calculateTotals = useCallback((transactionList) => {
    console.log('Calculating totals for:', transactionList);
    const newTotals = transactionList.reduce(
      (acc, transaction) => {
        const amount = parseFloat(transaction.amount);
        if (transaction.type === 'income') {
          acc.income += amount;
        } else if (transaction.type === 'expense') {
          acc.expense += amount;
        }
        return acc;
      },
      { income: 0, expense: 0 }
    );
    console.log('New totals calculated:', newTotals);
    setTotals(newTotals);
  }, []);
  
  const loadTransactions = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainApp' }],
        });
        return;
      }

      // Cek data di local storage dulu
      const cachedData = await AsyncStorage.getItem('transactions');
      if (cachedData) {
        const localTransactions = JSON.parse(cachedData);
        setTransactions(localTransactions);
        calculateTotals(localTransactions);
        setIsLoading(false);
        return;
      }

      // Jika tidak ada data di local storage, gunakan data kosong
      setTransactions([]);
      calculateTotals([]);
      
    } catch (error) {
      console.error('Error loading transactions:', error);
      // Gunakan data kosong jika terjadi error
      setTransactions([]);
      calculateTotals([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };
  

  useEffect(() => {
    if (isFocused) {
      loadTransactions();
    }
  }, [isFocused]);

  useEffect(() => {
    if (route.params?.refresh || route.params?.newTransaction) {
      console.log('Refreshing transactions with new data:', route.params);
      loadTransactions();
    }
  }, [route.params?.refresh, route.params?.newTransaction]);

  const handleAddTransaction = () => {
    navigation.navigate('AddTransaction');
  };

  const handleTransactionPress = (transaction) => {
    navigation.navigate('DetailTransaction', { 
      transaction,
      onDelete: async (deletedTransactionId) => {
        try {
          const currentTransactions = await AsyncStorage.getItem('transactions');
          const parsedTransactions = currentTransactions ? JSON.parse(currentTransactions) : [];
          const updatedTransactions = parsedTransactions.filter(t => t.id !== deletedTransactionId);
          await AsyncStorage.setItem('transactions', JSON.stringify(updatedTransactions));
          
          loadTransactions();
        } catch (error) {
          console.error('Error deleting transaction:', error);
          Alert.alert('Error', 'Failed to delete transaction');
        }
      }
    });
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadTransactions();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#C8FB00" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transaction</Text>
      </View>

      <View style={styles.summaryCards}>
        <TouchableOpacity 
          style={[
            styles.card, 
            styles.incomeCard,
            filterType === 'income' && styles.activeCard
          ]}
          onPress={() => setFilterType(filterType === 'income' ? null : 'income')}
        >
          <Text style={[styles.cardLabel, styles.incomeCardLabel]}>Your Income</Text>
          <Text style={[styles.cardAmount, styles.incomeCardAmount]}>
            {formatCurrency(totals.income)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.card, 
            styles.expenseCard,
            filterType === 'expense' && styles.activeCard
          ]}
          onPress={() => setFilterType(filterType === 'expense' ? null : 'expense')}
        >
          <Text style={[styles.cardLabel, styles.expenseCardLabel]}>Total Transaction</Text>
          <Text style={[styles.cardAmount, styles.expenseCardAmount]}>
            {formatCurrency(totals.expense)}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.transactionSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Last Transaction</Text>
          <TouchableOpacity 
            onPress={() => setFilterType(null)}
            style={styles.seeAllButton}
          >
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {transactions.length === 0 ? (
          renderEmptyState()
        ) : (
          <ScrollView 
            style={styles.transactionList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#C8FB00"
                colors={['#C8FB00']}
              />
            }
          >
           {getFilteredTransactions().map((transaction) => (
  <TouchableOpacity 
    key={transaction.id || Math.random().toString()}  // Fallback jika tidak ada id
    style={styles.transactionItem}
    onPress={() => handleTransactionPress(transaction)}
  >
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionName}>
                    {transaction.name || transaction.title}
                  </Text>
                  <Text style={styles.transactionDate}>
                    {formatDate(transaction.date)}
                  </Text>
                  <Text style={styles.transactionCategory}>
                    {transaction.category || 'Uncategorized'}
                  </Text>
                </View>
                <View style={styles.transactionAmount}>
                  <Text style={[
                    styles.amountText,
                    transaction.type === 'income' ? styles.incomeText : styles.expenseText
                  ]}>
                    {formatCurrency(transaction.amount)}
                  </Text>
                  <ChevronRight size={16} color="#666666" />
                </View>
              </TouchableOpacity>
            ))}
            <View style={styles.listPadding} />
          </ScrollView>
        )}
      </View>

      <TouchableOpacity 
        style={styles.addButton}
        onPress={handleAddTransaction}
        activeOpacity={0.8}
      >
        <Plus size={24} color="#000000" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
   
    textAlign: 'center',
  },
  summaryCards: {
    padding: 16,
    gap: 8,
  },
  card: {
    width: '100%',
    padding: 15,
    marginTop: 5,
    borderRadius: 12,
  },
  activeCard: {
    borderWidth: 2,
    borderColor: '#C8FB00',
  },
  incomeCard: {
    backgroundColor: '#000000',
  },
  expenseCard: {
    backgroundColor: '#C8FB00',
  },
  cardLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  cardAmount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  incomeCardLabel: {
    color: '#FFFFFF',
    opacity: 0.8,
  },
  incomeCardAmount: {
    color: '#FFFFFF',
  },
  expenseCardLabel: {
    color: '#000000',
    opacity: 0.8,
  },
  expenseCardAmount: {
    color: '#000000',
  },
  transactionSection: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  seeAllButton: {
    padding: 4,
  },
  seeAll: {
    fontSize: 14,
    color: '#C8FB00',
  },
  transactionList: {
    flex: 1,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  transactionInfo: {
    flex: 1,
    marginRight: 16,
  },
  transactionName: {
    fontSize: 16,
    color: '#000000',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#666666',
  },
  transactionCategory: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  transactionAmount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountText: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  incomeText: {
    color: '#22C55E',
  },
  expenseText: {
    color: '#EF4444',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  listPadding: {
    height: 80,
  },
  addButton: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#C8FB00',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  }
}); 

export default TransactionScreen;