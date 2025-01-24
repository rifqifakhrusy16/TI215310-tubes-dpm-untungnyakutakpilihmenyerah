import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert, KeyboardAvoidingView, Platform, } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronLeft } from 'lucide-react-native';
import { api } from '../../api'; // Pastikan path import benar

const AddWalletScreen = ({ navigation, route }) => {
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');

  const formatNumber = (text) => {
    const number = text.replace(/[^0-9]/g, '');
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const handleBalanceChange = (text) => {
    const formattedNumber = formatNumber(text);
    setBalance(formattedNumber);
  };

  const handleSave = async () => {
    try {
      if (!name.trim() || !balance.trim()) {
        Alert.alert('Error', 'Mohon isi semua field');
        return;
      }

      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Sesi telah berakhir, silakan login kembali');
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainApp' }],
        });
        return;
      }

      // Format data wallet
      const walletData = {
        name: name.trim(),
        balance: parseFloat(balance.replace(/\./g, '')),
        initialBalance: parseFloat(balance.replace(/\./g, '')),
        createdAt: new Date().toISOString()
      };

      console.log('Saving wallet data:', walletData);

      try {
        const response = await fetch('http://192.168.10.21:5000/api/wallets', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(walletData)
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseText = await response.text();
        console.log('Raw response:', responseText);

        let savedWallet;
        try {
          savedWallet = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Failed to parse response:', parseError);
          savedWallet = walletData;
        }

        // Update local storage
        const walletsData = await AsyncStorage.getItem('wallets');
        let wallets = walletsData ? JSON.parse(walletsData) : [];
        wallets.push(savedWallet);
        await AsyncStorage.setItem('wallets', JSON.stringify(wallets));

        // Callback untuk update parent screen
        if (route.params?.onWalletAdded) {
          route.params.onWalletAdded(savedWallet);
        }

        // Langsung kembali ke screen sebelumnya setelah save
        navigation.goBack();

      } catch (error) {
        console.error('Network error:', error);
        
        // Fallback ke penyimpanan lokal jika ada error
        const newWallet = {
          ...walletData,
          id: Date.now().toString()
        };

        const walletsData = await AsyncStorage.getItem('wallets');
        let wallets = walletsData ? JSON.parse(walletsData) : [];
        wallets.push(newWallet);
        await AsyncStorage.setItem('wallets', JSON.stringify(wallets));

        if (route.params?.onWalletAdded) {
          route.params.onWalletAdded(newWallet);
        }

        navigation.goBack();
      }

    } catch (error) {
      console.error('Error in handleSave:', error);
      Alert.alert('Error', 'Gagal menyimpan wallet');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Account</Text>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.formContainer}
      >
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Account Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter account name"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Balance</Text>
            <View style={styles.balanceInputContainer}>
              <Text style={styles.currencyPrefix}>Rp</Text>
              <TextInput
                style={styles.balanceInput}
                value={balance}
                onChangeText={handleBalanceChange}
                placeholder="0"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.saveButton,
              (!name.trim() || !balance.trim()) && styles.saveButtonDisabled
            ]}
            onPress={handleSave}
            disabled={!name.trim() || !balance.trim()}
          >
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  formContainer: {
    flex: 1,
  },
  form: {
    padding: 20,
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: '#666666',
  },
  input: {
    height: 50,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#000000',
  },
  balanceInputContainer: {
    height: 50,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  currencyPrefix: {
    fontSize: 16,
    color: '#000000',
    marginRight: 8,
  },
  balanceInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    padding: 0,
  },
  saveButton: {
    height: 50,
    backgroundColor: '#C8FB00',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#F5F5F5',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
});

export default AddWalletScreen;