// DetailLoanScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, Alert, Platform } from 'react-native';
import { ChevronLeft, Trash2, Calendar } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';

const DetailLoanScreen = ({ navigation, route }) => {
  const { loan, onUpdate } = route.params;
  const [status, setStatus] = useState(loan.status || 'unpaid');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleStatusChange = async (newStatus) => {
    try {
      const loansJson = await AsyncStorage.getItem('loans');
      let loans = loansJson ? JSON.parse(loansJson) : [];
      
      const updatedLoans = loans.map(item => 
        item.id === loan.id ? { ...item, status: newStatus } : item
      );

      await AsyncStorage.setItem('loans', JSON.stringify(updatedLoans));
      setStatus(newStatus);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating loan status:', error);
      Alert.alert('Error', 'Failed to update loan status');
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Loan',
      'Are you sure you want to delete this loan?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const loansJson = await AsyncStorage.getItem('loans');
              let loans = loansJson ? JSON.parse(loansJson) : [];
              
              const updatedLoans = loans.filter(item => item.id !== loan.id);
              await AsyncStorage.setItem('loans', JSON.stringify(updatedLoans));
              
              if (onUpdate) onUpdate();
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting loan:', error);
              Alert.alert('Error', 'Failed to delete loan');
            }
          }
        }
      ]
    );
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
        <Text style={styles.headerTitle}>
          {loan.type === 'get' ? 'Get' : 'Give'}
        </Text>
        <TouchableOpacity 
          onPress={handleDelete}
          style={styles.deleteButton}
        >
          <Trash2 size={20} color="#000" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={loan.name}
            editable={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Amount</Text>
          <TextInput
            style={styles.input}
            value={`Rp${loan.amount.toLocaleString('id-ID')}`}
            editable={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Note</Text>
          <TextInput
            style={styles.input}
            value={loan.note || '(optional)'}
            editable={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Account</Text>
          <TextInput
            style={styles.input}
            value={loan.account || 'Select Wallet'}
            editable={false}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date</Text>
          <TouchableOpacity style={styles.dateInput}>
            <Text>
              {new Date(loan.date).toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Text>
            <Calendar size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[
            styles.statusButton,
            status === 'paid' ? styles.paidButton : styles.unpaidButton
          ]}
          onPress={() => handleStatusChange(status === 'paid' ? 'unpaid' : 'paid')}
        >
          <Text style={[
            styles.statusButtonText,
            status === 'paid' ? styles.paidButtonText : styles.unpaidButtonText
          ]}>
            {status === 'paid' ? 'Paid' : 'Unpaid'}
          </Text>
        </TouchableOpacity>
      </View>
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
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  deleteButton: {
    padding: 4,
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
    borderBottomColor: '#E5E7EB',
    paddingVertical: 8,
    color: '#000000',
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 8,
  },
  statusButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 16,
  },
  paidButton: {
    backgroundColor: '#22C55E',
  },
  unpaidButton: {
    backgroundColor: '#F59E0B',
  },
  statusButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  paidButtonText: {
    color: '#FFFFFF',
  },
  unpaidButtonText: {
    color: '#FFFFFF',
  },
});

export default DetailLoanScreen;