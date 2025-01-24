import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Platform, ScrollView, Alert, Modal, } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronLeft, Calendar, ChevronDown } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '../../api';

const API_BASE_URL = 'http://192.168.10.21:5000'; // Sesuaikan dengan IP address komputer Anda

const LoanFormScreen = ({ navigation, route }) => {
  const { type } = route.params;
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    note: '',
    date: new Date(),
  });
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showWalletPicker, setShowWalletPicker] = useState(false);
  const [wallets, setWallets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState(null);

  useEffect(() => {
    loadWallets();
    loadDraft();
  }, []);

  useEffect(() => {
    saveDraft();
  }, [formData]);

  const loadWallets = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Authentication required');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/wallets`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Connection': 'keep-alive'
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
      Alert.alert(
        'Error', 
        'Failed to load wallets. Please check your connection.'
      );
    }
  };

  const loadDraft = async () => {
    try {
      const draftKey = `loan_draft_${type}`;
      const savedDraft = await AsyncStorage.getItem(draftKey);
      if (savedDraft) {
        const parsedDraft = JSON.parse(savedDraft);
        setFormData({
          ...parsedDraft,
          date: new Date(parsedDraft.date)
        });
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  const saveDraft = async () => {
    try {
      const draftKey = `loan_draft_${type}`;
      await AsyncStorage.setItem(draftKey, JSON.stringify(formData));
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  const clearDraft = async () => {
    try {
      const draftKey = `loan_draft_${type}`;
      await AsyncStorage.removeItem(draftKey);
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
  };

  const handleAmountChange = (text) => {
    // Hanya terima angka
    const numericValue = text.replace(/[^0-9]/g, '');
    
    if (numericValue === '') {
      setFormData({ ...formData, amount: '' });
      return;
    }

    // Format dengan pemisah ribuan
    const formattedValue = parseInt(numericValue).toLocaleString('id-ID').replace(/,/g, '.');
    setFormData({ ...formData, amount: formattedValue });
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData({ ...formData, date: selectedDate });
    }
  };

  const selectWallet = (wallet) => {
    console.log('Selected wallet:', wallet);
    setSelectedWallet(wallet);
    setShowWalletPicker(false);
  };

  const handleSave = async () => {
    try {
      // Validasi input
      if (!formData.name.trim()) {
        Alert.alert('Error', 'Please enter a name');
        return;
      }
  
      if (!formData.amount) {
        Alert.alert('Error', 'Please enter an amount');
        return;
      }
  
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Authentication required');
        navigation.replace('Login');
        return;
      }
  
      // Perbaikan: Hapus titik dan konversi ke number
      const numericAmount = parseInt(formData.amount.replace(/\./g, ''), 10);
      
      // Validasi amount
      if (isNaN(numericAmount) || numericAmount <= 0) {
        Alert.alert('Error', 'Invalid amount');
        return;
      }
  
      // Format tanggal
      const formattedDate = formData.date.toISOString().split('T')[0];
  
      // Prepare loan data
      const loanData = {
        name: formData.name.trim(),
        amount: numericAmount,
        note: formData.note?.trim() || '',
        date: formattedDate,
        type: type.toLowerCase(),
        // Hilangkan status, biarkan backend gunakan default
        wallet_id: selectedWallet?.id || null,
        account: selectedWallet?.name || ''
      };
  
      console.log('Loan data:', JSON.stringify(loanData, null, 2));
  
      const response = await fetch('http://192.168.10.21:5000/api/loans', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(loanData)
      });
  
      // Tambahkan logging response
      const responseText = await response.text();
      console.log('Response status:', response.status);
      console.log('Raw response:', responseText);
  
      // Cek response
      if (!response.ok) {
        throw new Error(responseText || 'Failed to save loan');
      }
  
      // Parse response
      const responseData = JSON.parse(responseText);
  
      // Update local storage dan navigasi
      const existingLoansJson = await AsyncStorage.getItem('loans');
      const existingLoans = existingLoansJson ? JSON.parse(existingLoansJson) : [];
      
      const newLoan = {
        ...responseData,
        id: responseData.id.toString(),
        amount: numericAmount,
        type: type.toLowerCase(),
        date: formattedDate
      };
  
      const updatedLoans = [newLoan, ...existingLoans];
      await AsyncStorage.setItem('loans', JSON.stringify(updatedLoans));
  
      // Clear draft
      await clearDraft();
  
      // Navigate back
      navigation.navigate('Loan', { 
        refresh: true,
        newLoan: newLoan,
        timestamp: new Date().getTime()
      });
  
      Alert.alert('Success', 'Loan added successfully');
  
    } catch (error) {
      console.error('Loan save error:', error);
      Alert.alert('Error', error.message || 'Failed to save loan');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{type === 'get' ? 'Get' : 'Give'}</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter the name"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Amount</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter the amount"
            value={formData.amount}
            onChangeText={handleAmountChange}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Note (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter note"
            value={formData.note}
            onChangeText={(text) => setFormData({ ...formData, note: text })}
            multiline
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Account (Optional)</Text>
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

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date</Text>
          <TouchableOpacity 
            style={styles.dateInput}
            onPress={() => setShowDatePicker(true)}
          >
            <Text>{formData.date.toLocaleDateString('id-ID', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</Text>
            <Calendar size={20} color="#666" />
          </TouchableOpacity>
        </View>

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
    textAlign: 'center',
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
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    paddingVertical: 8,
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
  placeholderText: {
    color: '#666666',
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

export default LoanFormScreen;