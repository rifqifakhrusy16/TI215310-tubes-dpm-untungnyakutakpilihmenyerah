import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, Modal, TouchableWithoutFeedback, Platform, Alert } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useNavigation, useIsFocused, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../api';

const LoanScreen = ({ navigation }) => {
  const [loans, setLoans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const [totals, setTotals] = useState({
    get: 0,
    give: 0
  });

  const loadLoans = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching loans...');
      
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('No token found, redirecting to login');
        navigation.replace('Login');
        return;
      }

      console.log('Token found:', token.substring(0, 20) + '...');

      const response = await fetch('http://192.168.10.21:5000/api/loans', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Response status:', response.status);
      
      // Handle unauthorized error
      if (response.status === 401) {
        console.log('Token invalid or expired');
        await AsyncStorage.removeItem('token');
        navigation.replace('Login');
        return;
      }

      const responseText = await response.text();
      console.log('Raw response:', responseText);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
        console.log('Parsed loans:', data);
      } catch (e) {
        console.error('Error parsing response:', e);
        throw new Error('Invalid response format');
      }

      if (Array.isArray(data)) {
        const formattedLoans = data.map(loan => ({
          id: loan._id.toString(),
          name: loan.name,
          amount: parseInt(loan.amount),
          type: loan.type.toLowerCase(),
          date: new Date(loan.date).toISOString().split('T')[0],
          status: loan.status || 'unpaid',
          note: loan.note || '',
          wallet_id: loan.wallet_id,
          account: loan.account || ''
        }));

        console.log('Formatted loans:', formattedLoans);
        setLoans(formattedLoans);

        // Calculate totals
        const calculatedTotals = formattedLoans.reduce((acc, loan) => {
          if (loan.status !== 'paid') {
            if (loan.type === 'get') {
              acc.get += loan.amount;
            } else {
              acc.give += loan.amount;
            }
          }
          return acc;
        }, { get: 0, give: 0 });

        console.log('Calculated totals:', calculatedTotals);
        setTotals(calculatedTotals);

        // Update local storage
        await AsyncStorage.setItem('loans', JSON.stringify(formattedLoans));
      }
    } catch (error) {
      console.error('Error loading loans:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      
      if (error.message.includes('401')) {
        console.log('Authentication error, redirecting to login');
        await AsyncStorage.removeItem('token');
        navigation.navigate('Login');
        return;
      }
      
      // Try to load from cache if network fails
      try {
        const cachedData = await AsyncStorage.getItem('loans');
        if (cachedData) {
          const parsedLoans = JSON.parse(cachedData);
          console.log('Using cached loans:', parsedLoans);
          setLoans(parsedLoans);
          
          const calculatedTotals = parsedLoans.reduce((acc, loan) => {
            if (loan.status !== 'paid') {
              if (loan.type === 'get') {
                acc.get += loan.amount;
              } else {
                acc.give += loan.amount;
              }
            }
            return acc;
          }, { get: 0, give: 0 });
          
          setTotals(calculatedTotals);
        }
      } catch (storageError) {
        console.error('Error loading from cache:', storageError);
      }
      
      Alert.alert(
        'Error',
        'Failed to load loans. Please check your connection and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Add useEffect to check token on mount
  useEffect(() => {
    const checkToken = async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        navigation.replace('Login');
      }
    };
    
    checkToken();
  }, []);

  // Update useFocusEffect untuk refresh data
  useFocusEffect(
    React.useCallback(() => {
      loadLoans();
    }, [])
  );

  const handleAddLoan = (type) => {
    setShowOptions(false);
    navigation.navigate('LoanForm', { type });
  };

  const formatCurrency = (amount) => {
    return amount.toLocaleString('id-ID');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#C8FB00" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Loan</Text>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryContent}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Get</Text>
            <Text style={[styles.summaryValue, styles.greenText]}>
              + {formatCurrency(totals.get)}
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Give</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(totals.give)}
            </Text>
          </View>
        </View>
      </View>

      {/* Loan List */}
      <ScrollView style={styles.loanList}>
        {loans.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No debt yet</Text>
            <Text style={styles.emptyStateSubText}>Tap button + to add</Text>
          </View>
        ) : (
          loans.map((loan) => (
            <TouchableOpacity
              key={loan.id}
              style={styles.loanItem}
              onPress={() => navigation.navigate('DetailLoan', { 
                loan,
                onUpdate: loadLoans
              })}
            >
              <View style={styles.loanContent}>
                <Text style={[
                  styles.loanName,
                  loan.status === 'paid' && styles.paidText
                ]}>
                  {loan.name}
                </Text>
                <Text style={styles.loanAmount}>
                  Rp{formatCurrency(loan.amount)}
                </Text>
                <Text style={styles.loanDate}>
                  {new Date(loan.date).toLocaleDateString()}
                </Text>
              </View>
              <View style={[
                styles.loanIndicator,
                loan.type === 'get' ? styles.greenIndicator : styles.redIndicator,
                loan.status === 'paid' && styles.paidIndicator
              ]} />
            </TouchableOpacity>
          ))
        )}
        <View style={styles.listPadding} />
      </ScrollView>

      {/* Add Button */}
      <TouchableOpacity 
        style={[styles.addButton, showOptions && styles.addButtonActive]}
        onPress={() => setShowOptions(true)}
      >
        <Plus size={24} color={showOptions ? "#FFFFFF" : "#000000"} />
      </TouchableOpacity>

      {/* Options Modal */}
      <Modal
        visible={showOptions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOptions(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowOptions(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.optionsWrapper}>
              <View style={styles.optionsContainer}>
                <TouchableOpacity
                  style={[styles.optionButton, styles.giveButton]}
                  onPress={() => handleAddLoan('give')}
                >
                  <View style={styles.optionInner}>
                    <Text style={styles.giveButtonText}>Give</Text>
                    <View style={styles.verticalSeparator} />
                    <View style={styles.grayCircle} />
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.optionButton, styles.getButton]}
                  onPress={() => handleAddLoan('get')}
                >
                  <View style={styles.optionInner}>
                    <Text style={styles.getButtonText}>Get</Text>
                    <View style={styles.verticalSeparator} />
                    <View style={styles.greenCircle} />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8
  },
  summaryCard: {
    margin: 16,
    backgroundColor: '#000000',
    borderRadius: 15,
    padding: 20,
    marginTop: 3
  },
  summaryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 35,
  },
  summaryItem: {
    alignItems: 'flex-start',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  greenText: {
    color: '#22C55E',
  },
  loanList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loanItem: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  loanContent: {
    flex: 1,
  },
  loanName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  loanAmount: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  loanDate: {
    fontSize: 12,
    color: '#666666',
  },
  loanIndicator: {
    width: 2,
    alignSelf: 'stretch',
    borderRadius: 5,
    marginLeft: 1,
  },
  greenIndicator: {
    backgroundColor: '#22C55E',
  },
  redIndicator: {
    backgroundColor: '#EF4444',
  },
  paidIndicator: {
    backgroundColor: '#9CA3AF',
  },
  paidText: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 8,
  },
  emptyStateSubText: {
    fontSize: 14,
    color: '#666666',
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
  },
  addButtonActive: {
    backgroundColor: '#000000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  optionsWrapper: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 130,
  },
  optionsContainer: {
    gap: 10,
  },
  optionButton: {
    width: 90,
    borderRadius: 20,
    overflow: 'hidden',
  },
  optionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingLeft: 16,
    paddingRight: 8,
  },
  giveButton: {
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  getButton: {
    backgroundColor: '#C8FB00',
    marginBottom: 24,
  },
  giveButtonText: {
    flex: 1,
    color: '#000000',
    fontSize: 16,
    fontWeight: '500',
  },
  getButtonText: {
    flex: 1,
    color: '#000000',
    fontSize: 16,
    fontWeight: '500',
  },
  verticalSeparator: {
    width: 8,
  },
  grayCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#000000',
  },
  greenCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
});

export default LoanScreen;