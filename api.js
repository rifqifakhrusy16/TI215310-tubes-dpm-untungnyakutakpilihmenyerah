import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Sesuaikan IP berdasarkan environment
const getBaseUrl = () => {
  if (Platform.OS === 'android') {
    // Untuk Android Emulator
    return 'http://192.168.10.21:5000/api';
  } else if (Platform.OS === 'ios') {
    // Untuk iOS Simulator
    return 'http://localhost:5000/api';
  } else {
    // Untuk physical device (sesuaikan dengan IP komputer Anda)
    return 'http://192.168.10.21:5000/api';
  }
};

export const BASE_URL = getBaseUrl();

const getHeaders = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  } catch (error) {
    console.error('Error getting headers:', error);
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  }
};

const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`API Error: ${response.status} - ${JSON.stringify(errorData)}`);
  }
  return response.json();
};

const handleApiResponse = async (response, endpoint) => {
  try {
    const responseText = await response.text();
    console.log(`${endpoint} Raw response:`, responseText);

    // Check if response is HTML
    if (responseText.trim().startsWith('<')) {
      console.error(`${endpoint} received HTML instead of JSON`);
      return [];
    }

    // Try to parse JSON
    try {
      const data = JSON.parse(responseText);
      console.log(`${endpoint} Parsed data:`, data);
      return data;
    } catch (parseError) {
      console.error(`${endpoint} JSON Parse Error:`, parseError);
      return [];
    }
  } catch (error) {
    console.error(`${endpoint} Error:`, error);
    return [];
  }
};

const fetchWithTimeout = async (url, options = {}, timeout = 5000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

export const api = {
  async addTransaction(transactionData) {
    try {
      console.log('Mengirim data transaksi:', transactionData);
      
      const formattedData = {
        title: transactionData.title,
        amount: parseFloat(transactionData.amount.toString().replace(/\./g, '')),
        category: transactionData.category || 'Uncategorized',
        wallet_id: transactionData.wallet_id,
        date: transactionData.date,
        type: transactionData.type
      };

      console.log('Formatted transaction data:', formattedData);

      const response = await fetch(`${BASE_URL}/transactions`, {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify(formattedData),
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add transaction');
      }

      const responseData = await response.json();
      console.log('Transaction response:', responseData);

      // Update local storage
      const existingTransactions = await AsyncStorage.getItem('transactions');
      const transactions = existingTransactions ? JSON.parse(existingTransactions) : [];
      transactions.unshift(responseData);
      await AsyncStorage.setItem('transactions', JSON.stringify(transactions));

      return responseData;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  async addLoan(loanData) {
    try {
      // Format data sesuai model Loan di backend
      const formattedData = {
        name: loanData.name,
        amount: parseFloat(loanData.amount.replace(/\./g, '')), // Convert string "1.000.000" to number 1000000
        note: loanData.note,
        date: new Date(loanData.date).toISOString(),
        type: loanData.type.toLowerCase(),
        account: loanData.account,
        accountId: loanData.accountId
      };

      const response = await fetch(`${BASE_URL}/loans`, {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify(formattedData),
      });
      
      return await handleResponse(response);
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  async addWallet(walletData) {
    try {
      console.log('Mengirim data wallet:', walletData); // Debug log
      
      const formattedData = {
        name: walletData.name,
        balance: parseFloat(walletData.balance.replace(/\./g, '')), // Ubah "1.000.000" jadi 1000000
        initialBalance: parseFloat(walletData.balance.replace(/\./g, '')),
        createdAt: new Date().toISOString()
      };

      const response = await fetch(`${BASE_URL}/wallets`, {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify(formattedData),
      });

      console.log('Response status:', response.status); // Debug log

      return await handleResponse(response);
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  async getWallets() {
    try {
      const response = await fetch('http://192.168.10.21:5000/api/wallets', {
        method: 'GET',
        headers: await getHeaders()
      });
      return await response.json();
    } catch (error) {
      console.error('Error fetching wallets:', error);
      throw error;
    }
  },

  async getTransactions() {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('No authentication token');

      console.log('Fetching transactions...');
      const response = await fetch(`${BASE_URL}/transactions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Received transactions:', data);

      // Format and sort transactions
      const formattedTransactions = Array.isArray(data) ? data
        .map(transaction => ({
          ...transaction,
          id: transaction.id,
          title: transaction.title,
          amount: parseFloat(transaction.amount),
          type: transaction.type,
          category: transaction.category || 'Uncategorized',
          date: new Date(transaction.date).toISOString(),
          wallet_id: transaction.wallet_id
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date)) : [];

      // Update local storage
      await AsyncStorage.setItem('transactions', JSON.stringify(formattedTransactions));
      
      return formattedTransactions;
    } catch (error) {
      console.error('Transaction API Error:', error);
      // Try to get from local storage if API fails
      const cachedTransactions = await AsyncStorage.getItem('transactions');
      return cachedTransactions ? JSON.parse(cachedTransactions) : [];
    }
  },

  async getLoans() {
    try {
      console.log('Fetching loans...');
      // First check connection
      const isConnected = await this.testConnection();
      if (!isConnected) {
        console.log('Server not reachable, returning cached data if available');
        const cachedLoans = await AsyncStorage.getItem('loans');
        return cachedLoans ? JSON.parse(cachedLoans) : [];
      }

      const response = await fetchWithTimeout(`${BASE_URL}/loans`, {
        method: 'GET',
        headers: await getHeaders(),
      }, 10000); // Increased timeout to 10 seconds

      console.log('Loan response status:', response.status);

      if (!response.ok) {
        console.error('Loan API Error:', response.status);
        const cachedLoans = await AsyncStorage.getItem('loans');
        return cachedLoans ? JSON.parse(cachedLoans) : [];
      }

      const data = await handleApiResponse(response, 'Loans');
      // Cache the successful response
      if (data && data.length > 0) {
        await AsyncStorage.setItem('loans', JSON.stringify(data));
      }
      return data;
    } catch (error) {
      console.error('Loan API Error:', error);
      // Try to get cached data on error
      const cachedLoans = await AsyncStorage.getItem('loans');
      return cachedLoans ? JSON.parse(cachedLoans) : [];
    }
  },

  async testConnection() {
    try {
      const response = await fetch('http://192.168.10.21:5000/api/health', {
        method: 'GET',
        headers: await getHeaders(),
        timeout: 5000
      });
      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
};

// Test function to verify API connection
export const testAPI = async () => {
  try {
    console.log('Testing API connection to:', BASE_URL);
    const response = await fetch(`${BASE_URL}/test`, {
      method: 'GET',
      headers: await getHeaders(),
    });
    
    console.log('API Test Response Status:', response.status);
    return response.ok;
  } catch (error) {
    console.error('API Test Failed:', error);
    return false;
  }
};
