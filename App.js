import 'react-native-gesture-handler';
import React, { useEffect, useState } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, ActivityIndicator, Platform } from 'react-native';
import { Home, CreditCard, PieChart, ClipboardList, Settings } from 'lucide-react-native';

// Import all screens
import SplashScreen from "./src/pages/SplashScreen";
import Onboarding from "./src/pages/Onboarding";
import LoginScreen from "./src/pages/LoginScreen";
import RegisterScreen from './src/pages/RegisterScreen';
import TransactionScreen from "./src/pages/TransactionScreen";
import WalletScreen from "./src/pages/WalletScreen";
import SettingScreen from "./src/pages/SettingScreen";
import ReportScreen from "./src/pages/ReportScreen";
import AddTransactionScreen from "./src/pages/AddTransactionScreen";
import DetailTransactionScreen from "./src/pages/DetailTransactionScreen";
import AddWalletScreen from "./src/pages/AddWalletScreen";
import EditWalletScreen from "./src/pages/EditWalletScreen";
import LoanScreen from "./src/pages/LoanScreen";
import LoanFormScreen from "./src/pages/LoanFormScreen";
import DetailLoanScreen from './src/pages/DetailLoanScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Reset function for testing
const resetAppState = async () => {
  try {
    await AsyncStorage.clear();
    console.log('App state reset successfully');
  } catch (error) {
    console.error('Error resetting app state:', error);
  }
};

const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
    <ActivityIndicator size="large" color="#C8FB00" />
  </View>
);

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E5E5',
          height: Platform.OS === 'ios' ? 88 : 60,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#C8FB00',
        tabBarInactiveTintColor: '#888888',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen 
        name="Transaction" 
        component={TransactionScreen}
        options={{
          tabBarLabel: 'Transaction',
          tabBarIcon: ({ color, size }) => (
            <Home color={color} size={size} />
          ),
          unmountOnBlur: true,
        }}
      />
      <Tab.Screen 
        name="Wallet" 
        component={WalletScreen}
        options={{
          tabBarLabel: 'Wallet',
          tabBarIcon: ({ color, size }) => (
            <CreditCard color={color} size={size} />
          ),
          unmountOnBlur: true,
        }}
      />
      <Tab.Screen 
        name="Report" 
        component={ReportScreen}
        options={{
          tabBarLabel: 'Report',
          tabBarIcon: ({ color, size }) => (
            <PieChart color={color} size={size} />
          ),
          unmountOnBlur: true,
        }}
      />
      <Tab.Screen 
        name="Loan" 
        component={LoanScreen}
        options={{
          tabBarLabel: 'Loan',
          tabBarIcon: ({ color, size }) => (
            <ClipboardList color={color} size={size} />
          ),
          unmountOnBlur: true,
        }}
      />
      <Tab.Screen 
        name="Settings"
        component={SettingScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Settings color={color} size={size} />
          ),
          unmountOnBlur: true,
        }}
      />
    </Tab.Navigator>
  );
};

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Splash');

  useEffect(() => {
    const initialize = async () => {
      // Reset app state during testing
      await resetAppState();
      checkInitialRoute();
    };
    
    initialize();
  }, []);

  const checkInitialRoute = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
      const isOnboarded = await AsyncStorage.getItem('isOnboarded');

      console.log('Auth status:', { isLoggedIn, isOnboarded });

      if (isLoggedIn === 'true') {
        setInitialRoute('MainApp');
      } else if (isOnboarded === 'true') {
        setInitialRoute('LoginScreen');
      } else {
        setInitialRoute('Onboarding');
      }

      console.log('Set initial route to:', initialRoute);
    } catch (error) {
      console.error('Error checking initial route:', error);
      setInitialRoute('Splash');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('initialRoute changed to:', initialRoute);
  }, [initialRoute]);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer
      onStateChange={(state) => {
        console.log('Navigation state changed:', state);
      }}
    >
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#FFFFFF' },
          cardOverlayEnabled: true,
          cardStyleInterpolator: ({ current: { progress } }) => ({
            cardStyle: {
              opacity: progress.interpolate({
                inputRange: [0, 0.5, 0.9, 1],
                outputRange: [0, 0.25, 0.7, 1],
              }),
            },
            overlayStyle: {
              opacity: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.5],
                extrapolate: 'clamp',
              }),
            },
          }),
        }}
      >
        {/* Authentication Flow */}
        <Stack.Screen 
          name="Splash" 
          component={SplashScreen}
          options={{ 
            gestureEnabled: false,
            animationEnabled: false,
          }}
        />

        <Stack.Screen 
          name="Onboarding"
          options={{ 
            gestureEnabled: false,
            animationEnabled: true,
          }}
        >
          {(props) => (
            <Onboarding
              {...props}
              onComplete={async () => {
                try {
                  await AsyncStorage.setItem('isOnboarded', 'true');
                  props.navigation.replace('LoginScreen');
                } catch (error) {
                  console.error('Error completing onboarding:', error);
                }
              }}
            />
          )}
        </Stack.Screen>

        <Stack.Screen 
          name="LoginScreen" 
          component={LoginScreen}
          options={{ 
            gestureEnabled: false,
            animationEnabled: true,
          }}
        />

        <Stack.Screen 
          name="RegisterScreen" 
          component={RegisterScreen}
        />


        {/* Main App */}
        <Stack.Screen 
          name="MainApp" 
          component={MainTabs}
          options={{ 
            gestureEnabled: false,
            animationEnabled: true,
          }}
        />

        {/* Modal Screens */}
        <Stack.Group
          screenOptions={{
            presentation: 'modal',
            gestureEnabled: true,
            cardStyle: { backgroundColor: '#FFFFFF' },
            cardOverlayEnabled: true,
            gestureResponseDistance: { vertical: 300 },
            cardStyleInterpolator: ({ current: { progress } }) => ({
              cardStyle: {
                opacity: progress,
              },
            }),
          }}
        >
          {/* Transaction Related Screens */}
          <Stack.Screen 
            name="AddTransaction" 
            component={AddTransactionScreen}
          />
          <Stack.Screen 
            name="DetailTransaction" 
            component={DetailTransactionScreen}
          />

          {/* Wallet Related Screens */}
          <Stack.Screen 
            name="AddWallet" 
            component={AddWalletScreen}
          />
          <Stack.Screen 
            name="EditWallet" 
            component={EditWalletScreen}
          />

          {/* Loan Related Screens */}
          <Stack.Screen 
            name="LoanForm" 
            component={LoanFormScreen}
          />
          <Stack.Screen 
            name="DetailLoan" 
            component={DetailLoanScreen}
          />
        </Stack.Group>
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;