import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronLeft, Trash2 } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const DetailTransactionScreen = ({ route, navigation }) => {
  const { transaction, onDelete } = route.params;
  const [formData, setFormData] = useState({
    title: transaction.title || transaction.name,
    amount: String(transaction.amount),
    category: transaction.type || 'expense', // Use transaction type to set initial category
    account: transaction.account || 'DANA',
    date: new Date(transaction.date || new Date()),
  });
  
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Update category whenever transaction type changes
  useEffect(() => {
    if (transaction.type) {
      setFormData(prev => ({
        ...prev,
        category: transaction.type.toLowerCase()
      }));
    }
  }, [transaction.type]);

  const handleDelete = async () => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const transactionsJson = await AsyncStorage.getItem('transactions');
              let transactions = JSON.parse(transactionsJson);
              transactions = transactions.filter(t => t.id !== transaction.id);
              await AsyncStorage.setItem('transactions', JSON.stringify(transactions));
              if (onDelete) onDelete(transaction.id);
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting transaction:', error);
              Alert.alert('Error', 'Failed to delete transaction');
            }
          }
        }
      ]
    );
  };

  const handleSave = async () => {
    try {
      if (!formData.title || !formData.amount) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      const transactionsJson = await AsyncStorage.getItem('transactions');
      let transactions = transactionsJson ? JSON.parse(transactionsJson) : [];

      // Update transaction
      transactions = transactions.map(t => 
        t.id === transaction.id 
          ? {
              ...t,
              title: formData.title,
              name: formData.title,
              amount: parseFloat(formData.amount),
              category: formData.category,
              type: formData.category, // Ensure type matches category
              account: formData.account,
              date: formData.date.toISOString(),
            }
          : t
      );

      await AsyncStorage.setItem('transactions', JSON.stringify(transactions));
      if (route.params?.onUpdate) {
        route.params.onUpdate();
      }
      navigation.goBack();
    } catch (error) {
      console.error('Error updating transaction:', error);
      Alert.alert('Error', 'Failed to update transaction');
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData({ ...formData, date: selectedDate });
    }
  };

  // Modified to not allow category changes since it should match the transaction type
  const getCategoryColor = () => {
    return formData.category.toLowerCase() === 'income' ? '#00A86B' : '#FF0000';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <ChevronLeft size={24} color="#000000" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Detail Transaction</Text>
        
        <TouchableOpacity 
          onPress={handleDelete}
          style={styles.trashButton}
        >
          <Trash2 size={24} color="#000000" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Title Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Type here for new title</Text>
          <TextInput
            style={styles.input}
            value={formData.title}
            onChangeText={(text) => setFormData({ ...formData, title: text })}
            placeholder="Enter title"
          />
        </View>

        {/* Amount Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Enter the amount</Text>
          <TextInput
            style={styles.input}
            value={formData.amount}
            onChangeText={(text) => setFormData({ ...formData, amount: text })}
            keyboardType="numeric"
            placeholder="Enter amount"
          />
        </View>

        {/* Category (now read-only) */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Category</Text>
          <Text style={[styles.staticText, { color: getCategoryColor() }]}>
            {formData.category.charAt(0).toUpperCase() + formData.category.slice(1)}
          </Text>
        </View>

        {/* Account */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Account</Text>
          <Text style={styles.staticText}>{formData.account}</Text>
        </View>

        {/* Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Date</Text>
          <TouchableOpacity 
            onPress={() => setShowDatePicker(true)}
            style={styles.dateInput}
          >
            <Text style={styles.staticText}>{formatDate(formData.date)}</Text>
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={formData.date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
        />
      )}
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
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  trashButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  input: {
    fontSize: 16,
    color: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    paddingVertical: 8,
  },
  staticText: {
    fontSize: 16,
    color: '#000000',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  dateInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  saveButton: {
    backgroundColor: '#C8FB00',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 32,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
});

export default DetailTransactionScreen;