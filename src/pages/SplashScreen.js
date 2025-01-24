import React, { useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      const isOnboarded = await AsyncStorage.getItem('isOnboarded');
      
      if (isOnboarded === 'true') {
        navigation.navigate('Onboarding');
      } else {
        navigation.replace('LoginScreen');
      }
    } catch (error) {
      console.error('Error:', error);
      navigation.replace('Onboarding');
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require('../assets/images/Splash.png')} style={styles.background} />
      <Image source={require('../assets/images/Logo.png')} style={styles.logo} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  background: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  logo: {
    width: 147,
    height: 180,
  },
});

export default SplashScreen;