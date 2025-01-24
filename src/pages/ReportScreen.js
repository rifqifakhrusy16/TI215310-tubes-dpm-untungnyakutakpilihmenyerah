import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Platform } from 'react-native';

const ReportScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('monthly');
  const [monthlyData, setMonthlyData] = useState({
    income: 0,
    expense: 0,
    dailyAverage: { income: 0, expense: 0 }
  });
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    loadTransactions();
  }, [selectedDate]);

  const loadTransactions = async () => {
    try {
      const transactionsJson = await AsyncStorage.getItem('transactions');
      if (transactionsJson) {
        const transactions = JSON.parse(transactionsJson);
        const selectedMonth = selectedDate.getMonth();
        const selectedYear = selectedDate.getFullYear();
        
        const monthlyTransactions = transactions.filter(transaction => {
          const transactionDate = new Date(transaction.date);
          return transactionDate.getMonth() === selectedMonth && 
                 transactionDate.getFullYear() === selectedYear;
        });

        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        const totals = calculateTotals(monthlyTransactions, daysInMonth);
        setMonthlyData(totals);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const calculateTotals = (transactions, daysInMonth) => {
    const totals = transactions.reduce((acc, transaction) => {
      const amount = parseFloat(transaction.amount);
      if (transaction.type === 'income') {
        acc.income += amount;
      } else {
        acc.expense += amount;
      }
      return acc;
    }, { income: 0, expense: 0 });

    return {
      ...totals,
      dailyAverage: {
        income: totals.income / daysInMonth,
        expense: totals.expense / daysInMonth
      }
    };
  };

  const calculateDailyAverage = async (type) => {
    try {
      const transactions = JSON.parse(await AsyncStorage.getItem('transactions')) || [];
      const selectedMonth = selectedDate.getMonth();
      const selectedYear = selectedDate.getFullYear();
      
      const dailyTransactions = {};
      
      transactions
        .filter(t => {
          const date = new Date(t.date);
          return date.getMonth() === selectedMonth && 
                 date.getFullYear() === selectedYear &&
                 t.type === type;
        })
        .forEach(t => {
          const day = new Date(t.date).getDate();
          dailyTransactions[day] = (dailyTransactions[day] || 0) + parseFloat(t.amount);
        });

      const daysWithTransactions = Object.keys(dailyTransactions).length;
      if (daysWithTransactions === 0) return '0';
      
      const total = Object.values(dailyTransactions).reduce((sum, amount) => sum + amount, 0);
      const average = total / daysWithTransactions;
      
      return Math.round(average).toLocaleString('id-ID');
    } catch (error) {
      console.error('Error calculating daily average:', error);
      return '0';
    }
  };

  const formatMonthYear = (date) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const moveMonth = (direction) => {
    const newDate = new Date(selectedDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setSelectedDate(newDate);
  };

  const renderGraph = () => {
    const total = monthlyData.income + monthlyData.expense;
    if (total === 0) return null;

    const incomePercentage = (monthlyData.income / total) * 100;
    const expensePercentage = (monthlyData.expense / total) * 100;
    const incomeAngle = (incomePercentage / 100) * 360;
    const radius = 100;
    const centerX = 125;
    const centerY = 125;

    const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
      const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
      return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
      };
    };

    const createArc = (startAngle, endAngle) => {
      const start = polarToCartesian(centerX, centerY, radius, endAngle);
      const end = polarToCartesian(centerX, centerY, radius, startAngle);
      const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
      
      return [
        "M", centerX, centerY,
        "L", start.x, start.y,
        "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
        "Z"
      ].join(" ");
    };

    return (
      <View style={styles.graphContainer}>
        <Svg height="250" width="250" style={styles.graph}>
          <Path
            d={createArc(0, incomeAngle)}
            fill="#22C55E"
          />
          <Path
            d={createArc(incomeAngle, 360)}
            fill="#D1D5DB"
          />
        </Svg>
        <View style={styles.percentageContainer}>
          <Text style={styles.percentageText}>
            {Math.round(incomePercentage)}%
          </Text>
        </View>
      </View>
    );
  };

  const renderMonthlyDetails = () => (
    <ScrollView style={styles.monthlyContainer}>
      <View style={styles.categoryHeader}>
        <Text style={styles.categoryHeaderText}>Category</Text>
      </View>

      <View style={styles.monthlySection}>
        <View style={styles.monthlyRow}>
          <Text style={styles.label}>Income</Text>
          <Text style={styles.incomeValue}>
            +{monthlyData.income.toLocaleString('id-ID')}
          </Text>
        </View>
        <Text style={styles.subLabel}>
          daily average: +{calculateDailyAverage('income')}
        </Text>

        <View style={styles.monthlyRow}>
          <Text style={styles.label}>Expanse</Text>
          <Text style={styles.expenseValue}>
            {monthlyData.expense.toLocaleString('id-ID')}
          </Text>
        </View>
        <Text style={styles.subLabel}>
        daily average: {calculateDailyAverage('expense')}
        </Text>

        <View style={styles.monthlyRow}>
          <Text style={styles.label}>Balance</Text>
          <Text style={[styles.balanceValue, monthlyData.income - monthlyData.expense >= 0 ? styles.positiveBalance : styles.negativeBalance]}>
            {(monthlyData.income - monthlyData.expense).toLocaleString('id-ID')}
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Report</Text>
        
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'realtime' && styles.activeTab]}
            onPress={() => setActiveTab('realtime')}
          >
            <Text style={[styles.tabText, activeTab === 'realtime' && styles.activeTabText]}>
              Realtime
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'monthly' && styles.activeTab]}
            onPress={() => setActiveTab('monthly')}
          >
            <Text style={[styles.tabText, activeTab === 'monthly' && styles.activeTabText]}>
              Monthly
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dateSelector}>
          <TouchableOpacity onPress={() => moveMonth('prev')} style={styles.dateArrow}>
            <ChevronLeft size={24} color="#666666" />
          </TouchableOpacity>
          <Text style={styles.dateRange}>
            {formatMonthYear(selectedDate)}
          </Text>
          <TouchableOpacity onPress={() => moveMonth('next')} style={styles.dateArrow}>
            <ChevronRight size={24} color="#666666" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {activeTab === 'realtime' ? (
          <View style={styles.chartContainer}>
            {renderGraph()}
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={styles.legendRow}>
                  <View style={[styles.legendDot, styles.greenDot]} />
                  <Text style={styles.legendText}>Income</Text>
                </View>
                <View style={styles.legendValueContainer}>
                  <Text style={styles.legendValue}>
                    {monthlyData.income.toLocaleString('id-ID')}
                  </Text>
                  <Text style={[styles.legendPercentage, styles.incomePercentage]}>
                    {Math.round((monthlyData.income / (monthlyData.income + monthlyData.expense)) * 100)}%
                  </Text>
                </View>
              </View>
              <View style={styles.legendItem}>
                <View style={styles.legendRow}>
                  <View style={[styles.legendDot, styles.grayDot]} />
                  <Text style={styles.legendText}>Expanse</Text>
                </View>
                <View style={styles.legendValueContainer}>
                  <Text style={styles.legendValue}>
                    {monthlyData.expense.toLocaleString('id-ID')}
                  </Text>
                  <Text style={styles.legendPercentage}>
                    {Math.round((monthlyData.expense / (monthlyData.income + monthlyData.expense)) * 100)}%
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          renderMonthlyDetails()
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    marginTop: 16,
    marginBottom: 35,
    color: '#000000',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 25,
    padding: 4,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: '#000000',
  },
  tabText: {
    textAlign: 'center',
    color: '#666666',
    fontSize: 14,
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateArrow: {
    padding: 8,
  },
  dateRange: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  chartContainer: {
    alignItems: 'center',
  },
  graphContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  graph: {
    transform: [{ rotate: '-90deg' }],
  },
  percentageContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  legend: {
    width: '100%',
    marginTop: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    elevation: 2,
  },
  legendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 9,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 3,
    marginRight: 8,
  },
  greenDot: {
    backgroundColor: '#22C55E',
  },
  grayDot: {
    backgroundColor: '#D1D5DB',
  },
  legendText: {
    fontSize: 14,
    color: '#1F2937',
  },
  legendValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  legendValueContainer: {
    alignItems: 'flex-end',
  },
  legendPercentage: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  incomePercentage: {
    color: '#22C55E',
  },
  monthlyContainer: {
    flex: 1,
  },
  categoryHeader: {
    backgroundColor: '#000000',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  categoryHeaderText: {
    color: '#C8FB00',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  monthlySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    elevation: 2,
  },
  monthlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    fontSize: 16,
    color: '#1F2937',
  },
  subLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 12,
  },
  incomeValue: {
    color: '#22C55E',
    fontSize: 16,
    fontWeight: '500',
  },
  expenseValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  positiveBalance: {
    color: '#22C55E',
  },
  negativeBalance: {
    color: '#EF4444',
  },
});

export default ReportScreen;