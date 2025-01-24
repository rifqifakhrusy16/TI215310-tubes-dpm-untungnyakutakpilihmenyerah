import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, Alert, } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowLeft } from 'lucide-react-native';
import { Platform } from 'react-native';


const EditWalletScreen = ({ route, navigation }) => {
  const { wallet, onWalletUpdated } = route.params;
  const [name, setName] = useState(wallet.name);
  const [balance, setBalance] = useState(wallet.balance.toString());

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Account name is required. Please enter it');
      return;
    }

    if (!balance.trim() || isNaN(Number(balance))) {
      Alert.alert('Error', 'Balance must be a number');
      return;
    }

    const updatedWallet = {
      ...wallet,
      name: name.trim(),
      balance: Number(balance),
      updatedAt: new Date().toISOString(),
    };

    try {
      const walletsData = await AsyncStorage.getItem('wallets');
      let wallets = walletsData ? JSON.parse(walletsData) : [];
      
      const updatedWallets = wallets.map(w => 
        w.id === wallet.id ? updatedWallet : w
      );
      
      await AsyncStorage.setItem('wallets', JSON.stringify(updatedWallets));
      onWalletUpdated(updatedWallet);
      navigation.goBack();
    } catch (error) {
      console.error('Error updating wallet:', error);
      Alert.alert('Error', 'Error updating wallet');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.title}>Edit account</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Account Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter account name"
            placeholderTextColor="#888888"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Balance</Text>
          <TextInput
            style={styles.input}
            value={balance}
            onChangeText={setBalance}
            keyboardType="numeric"
            placeholder="Enter balance"
            placeholderTextColor="#888888"
          />
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16, 
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    color: '#000000',
    fontWeight: 'bold',
    flex: 1,
  },
  form: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000000',
  },
  saveButton: {
    backgroundColor: '#C8FB00',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: 'bold',
  },
});

export default EditWalletScreen;