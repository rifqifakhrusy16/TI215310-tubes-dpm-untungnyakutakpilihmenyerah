import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Platform, Alert, Modal, KeyboardAvoidingView, } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronLeft, Calendar, ChevronDown } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '../../api';

const AddTransactionScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: '',
    account: '',
    date: new Date(),
    type: 'expense',
  });
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showWalletPicker, setShowWalletPicker] = useState(false);
  const [wallets, setWallets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState(null);

  useEffect(() => {
    loadWallets();
  }, []);

  const loadWallets = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Authentication required');
        return;
      }

      const response = await fetch('http://192.168.10.21:5000/api/wallets', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load wallets');
      }

      const data = await response.json();
      console.log('Loaded wallets:', data);
      setWallets(data);
    } catch (error) {
      console.error('Error loading wallets:', error);
      Alert.alert('Error', 'Failed to load wallets');
    }
  };

  const handleAmountChange = (text) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    
    if (numericValue === '') {
      setFormData({ ...formData, amount: '' });
      return;
    }

    const numberValue = parseInt(numericValue, 10);
    const formattedValue = numberValue.toLocaleString('id-ID').replace(/,/g, '.');

    setFormData({ ...formData, amount: formattedValue });
  };

  const parseFormattedAmount = (formattedAmount) => {
    if (!formattedAmount) return 0;
    const cleanAmount = formattedAmount.replace(/\./g, '');
    const parsedAmount = parseFloat(cleanAmount);
    if (isNaN(parsedAmount)) {
      throw new Error('Invalid amount format');
    }
    return parsedAmount;
  };

  const updateWalletBalance = async (walletId, amount, type) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }

      console.log('Updating wallet balance:', {
        walletId,
        amount,
        type
      });

      // Update di server terlebih dahulu
      const response = await fetch(`http://192.168.10.21:5000/api/wallets/update-balance/${walletId}`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          type: type
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server response:', errorData);
        throw new Error(`Failed to update wallet balance: ${errorData.message || response.status}`);
      }

      const updatedWalletData = await response.json();
      console.log('Server response:', updatedWalletData);

      // Update local wallet data
      const walletsData = await AsyncStorage.getItem('wallets');
      if (walletsData) {
        const parsedWallets = JSON.parse(walletsData);
        const updatedWallets = parsedWallets.map(wallet => {
          if (wallet.id === walletId) {
            return {
              ...wallet,
              balance: updatedWalletData.balance
            };
          }
          return wallet;
        });

        await AsyncStorage.setItem('wallets', JSON.stringify(updatedWallets));
        setWallets(updatedWallets);
      }

      // Refresh wallet data
      await refreshWalletData(token);

    } catch (error) {
      console.error('Error updating wallet balance:', error);
      throw error;
    }
  };

  const refreshWalletData = async (token) => {
    try {
      const response = await fetch('http://192.168.10.21:5000/api/wallets', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const freshWalletData = await response.json();
        await AsyncStorage.setItem('wallets', JSON.stringify(freshWalletData));
        setWallets(freshWalletData);
      }
    } catch (error) {
      console.error('Error refreshing wallet data:', error);
    }
  };

  const handleSave = async () => {
    try {
      // Validasi input dasar
      if (!formData.title.trim()) {
        Alert.alert('Error', 'Please enter a title');
        return;
      }

      if (!formData.amount) {
        Alert.alert('Error', 'Please enter an amount');
        return;
      }

      if (!selectedWallet) {
        Alert.alert('Error', 'Please select a wallet');
        return;
      }

      // Debug data sebelum dikirim
      console.log('Selected wallet:', selectedWallet);
      console.log('Form data:', formData);

      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Authentication required');
        navigation.replace('Login');
        return;
      }

      // Format amount dengan benar
      const numericAmount = formData.amount.replace(/\./g, '');
      
      // Prepare transaction data dengan field yang dibutuhkan
      const transactionData = {
        title: formData.title.trim(),
        amount: parseInt(numericAmount),
        type: formData.type.toLowerCase(),
        account: selectedWallet.name, // Tambahkan account name
        accountId: selectedWallet.id, // Tambahkan account ID
        wallet_id: selectedWallet.id,
        date: formData.date.toISOString().split('T')[0],
        category: formData.category || 'Uncategorized'
      };

      // Debug data yang akan dikirim
      console.log('Data to be sent:', transactionData);

      // Kirim request ke server
      const response = await fetch('http://192.168.10.21:5000/api/transactions', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(transactionData)
      });

      // Debug response
      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Response text:', responseText);

      if (!response.ok) {
        const errorData = JSON.parse(responseText);
        throw new Error(errorData.message || 'Failed to create transaction');
      }

      const responseData = JSON.parse(responseText);

      // Update wallet balance
      await updateWalletBalance(selectedWallet.id, parseInt(numericAmount), formData.type);

      // Update local storage
      const existingTransactions = await AsyncStorage.getItem('transactions');
      const transactions = existingTransactions ? JSON.parse(existingTransactions) : [];
      transactions.unshift(responseData);
      await AsyncStorage.setItem('transactions', JSON.stringify(transactions));

      // Navigate back
      navigation.navigate('MainApp', {
        screen: 'Transaction',
        params: { 
          refresh: true,
          newTransaction: responseData,
          timestamp: new Date().getTime()
        }
      });

      Alert.alert('Success', 'Transaction added successfully');

    } catch (error) {
      console.error('Transaction error:', {
        message: error.message,
        data: formData,
        wallet: selectedWallet
      });
      Alert.alert('Error', `Failed to save transaction: ${error.message}`);
    }
  };

  // Updated validation helper
  const validateTransactionData = (data) => {
    const errors = [];

    if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
      errors.push('Invalid title');
    }

    if (typeof data.amount !== 'number' || isNaN(data.amount) || data.amount <= 0) {
      errors.push(`Invalid amount: ${data.amount}`);
    }

    if (!['income', 'expense'].includes(data.type)) {
      errors.push(`Invalid type: ${data.type}`);
    }

    if (!data.wallet_id) {
      errors.push(`Missing wallet ID`);
    }

    if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      errors.push(`Invalid date format: ${data.date}`);
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    return true;
  };

  // Helper untuk format amount
  const formatAmount = (amount) => {
    if (!amount) return '';
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Helper untuk parse amount
  const parseAmount = (formattedAmount) => {
    if (!formattedAmount) return 0;
    return parseFloat(formattedAmount.replace(/\./g, ''));
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData({ ...formData, date: selectedDate });
    }
  };

  const selectWallet = (wallet) => {
    console.log('Selecting wallet:', wallet);
    if (!wallet || !wallet.id) {
      console.error('Invalid wallet selection:', wallet);
      Alert.alert('Error', 'Please select a valid wallet');
      return;
    }
    setSelectedWallet(wallet);
    setShowWalletPicker(false);
    setFormData({ ...formData, account: wallet.name });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
          >
            <ChevronLeft size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Transaction</Text>
        </View>

        <ScrollView style={styles.content}>
          {/* Title Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter transaction title"
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
              maxLength={50}
            />
          </View>

          {/* Amount Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Amount</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              value={formData.amount}
              onChangeText={handleAmountChange}
              keyboardType="numeric"
              returnKeyType="done"
              maxLength={15}
            />
          </View>

          {/* Type Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Type</Text>
            <View style={styles.categoryContainer}>
              <TouchableOpacity 
                style={[
                  styles.categoryTag,
                  formData.type === 'expense' && styles.categoryTagActive
                ]}
                onPress={() => setFormData({ ...formData, type: 'expense' })}
              >
                <Text style={[
                  styles.categoryTagText,
                  formData.type === 'expense' && styles.categoryTagTextActive
                ]}>Expense</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.categoryTag,
                  formData.type === 'income' && styles.categoryTagActive
                ]}
                onPress={() => setFormData({ ...formData, type: 'income' })}
              >
                <Text style={[
                  styles.categoryTagText,
                  formData.type === 'income' && styles.categoryTagTextActive
                ]}>Income</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Wallet Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Account</Text>
            <TouchableOpacity 
              style={styles.walletSelector}
              onPress={() => setShowWalletPicker(true)}
            >
              <Text style={[
                styles.walletSelectorText,
                !selectedWallet && styles.placeholderText
              ]}>
                {selectedWallet ? selectedWallet.name : 'Select Wallet'}
              </Text>
              <ChevronDown size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Date Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity 
              style={styles.dateInput}
              onPress={() => setShowDatePicker(true)}
            >
              <Text>{formData.date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</Text>
              <Calendar size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Save Button */}
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <DateTimePicker
            value={formData.date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            maximumDate={new Date()}
          />
        )}

        {/* Wallet Picker Modal */}
        <Modal
          visible={showWalletPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowWalletPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Wallet</Text>
              <ScrollView>
                {wallets.map((wallet) => (
                  <TouchableOpacity
                    key={wallet.id}
                    style={styles.walletOption}
                    onPress={() => selectWallet(wallet)}
                  >
                    <Text style={styles.walletName}>{wallet.name}</Text>
                    <Text style={styles.walletBalance}>
                      Balance: Rp{parseFloat(wallet.balance).toLocaleString('id-ID', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }).replace(/,/g, '.')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowWalletPicker(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    color: '#000000',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    paddingVertical: 8,
    color: '#000000',
  },
  placeholderText: {
    color: '#666666',
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  categoryTagActive: {
    backgroundColor: '#000000',
  },
  categoryTagText: {
    color: '#666666',
  },
  categoryTagTextActive: {
    color: '#C8FB00',
  },
  walletSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    paddingVertical: 8,
  },
  walletSelectorText: {
    fontSize: 16,
    color: '#000000',
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    paddingVertical: 8,
  },
  saveButton: {
    backgroundColor: '#C8FB00',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 16,
    textAlign: 'center',
  },
  walletOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  walletName: {
    fontSize: 16,
    color: '#000000',
    marginBottom: 4,
  },
  walletBalance: {
    fontSize: 14,
    color: '#666666',
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#EF4444',
  },
});

export default AddTransactionScreen;