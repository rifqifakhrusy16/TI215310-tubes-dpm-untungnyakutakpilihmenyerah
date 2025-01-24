import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Modal, Share, Alert, Platform, Dimensions, } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { ChevronRight } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import XLSX from 'xlsx';

const { width } = Dimensions.get('window');

const SettingScreen = () => {
  const navigation = useNavigation();
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const transactionsData = await AsyncStorage.getItem('transactions');
      if (transactionsData) {
        setTransactions(JSON.parse(transactionsData));
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const handleExportExcel = async (fileType) => {
    try {
      const formattedData = transactions.map(t => ({
        Date: new Date(t.date).toLocaleDateString(),
        Type: t.type,
        Amount: t.amount,
        Category: t.category,
        Account: t.account,
      }));

      const ws = XLSX.utils.json_to_sheet(formattedData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Transactions");

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `TransactionData_${timestamp}.${fileType.toLowerCase()}`;

      const wbout = XLSX.write(wb, { type: 'base64', bookType: fileType });
      const filePath = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(filePath, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      setShowExcelModal(false);
      
      if (Platform.OS === 'ios') {
        await Sharing.shareAsync(filePath);
      } else {
        await Sharing.shareAsync(filePath);
      }
    } catch (error) {
      console.error('Error exporting file:', error);
      Alert.alert('Error', 'Failed to export file');
    }
  };

  const handleShareTransactions = async () => {
    try {
      const formattedData = transactions.map(t => ({
        Date: new Date(t.date).toLocaleDateString(),
        Type: t.type,
        Amount: t.amount,
        Category: t.category,
        Account: t.account,
      }));

      const ws = XLSX.utils.json_to_sheet(formattedData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Transactions");

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `TransactionData_${timestamp}.xlsx`;

      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const filePath = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(filePath, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await Sharing.shareAsync(filePath);
    } catch (error) {
      console.error('Error sharing transactions:', error);
      Alert.alert('Error', 'Failed to share transactions');
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.clear();
      navigation.reset({
        index: 0,
        routes: [{ name: 'LoginScreen' }],
      });
    } catch (error) {
      console.error('Error during logout:', error);
      Alert.alert('Error', 'Failed to logout');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.menuListContainer}>
        <View style={styles.menuList}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => setShowExcelModal(true)}
          >
            <Text style={styles.menuText}>Saved Transactions</Text>
            <ChevronRight size={20} color="#666666" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomWidth: 0 }]}
            onPress={handleShareTransactions}
          >
            <Text style={styles.menuText}>Send Transactions</Text>
            <ChevronRight size={20} color="#666666" />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      {/* Excel Export Modal */}
      <Modal
        visible={showExcelModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowExcelModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowExcelModal(false)}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            style={styles.modalContent}
            onPress={e => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>Excel Extension</Text>
            <Text style={styles.modalSubtitle}>
              Which excel extension do you wanted to save?
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.extensionButton}
                onPress={() => handleExportExcel('XLS')}
              >
                <Text style={styles.extensionText}>.XLS</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.extensionButton}
                onPress={() => handleExportExcel('XLSX')}
              >
                <Text style={styles.extensionText}>.XLSX</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    marginTop: 16,
    marginBottom: 20,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    color: '#000000',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  menuListContainer: {
  },
  menuList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginTop: 16
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 19,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuText: {
    fontSize: 16,
    color: '#99999B',
    marginTop: 11,
    marginHorizontal: 16,
  },
  logoutButton: {
    backgroundColor: '#DC2626',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginHorizontal: 16, 
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    width: width * 0.8,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#000000',
  },
  modalSubtitle: {
    fontSize: 15,
    color: '#000000',
    marginBottom: 15,
    textAlign: 'flex-end',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
  },
  extensionButton: {
    padding: 11,
  },
  extensionText: {
    fontSize: 15,
    color: '#D7F02B',
  }
});

export default SettingScreen;