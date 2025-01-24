import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const onboardingData = [
  {
    id: '1',
    title: 'Manage your finances now Here',
    image: require('../assets/images/Onboarding01.png'),
  },
  {
    id: '2',
    title: 'Easy To Apply on Mobile App',
    image: require('../assets/images/Onboarding02.png'),
  },
];

const Onboarding = ({ navigation, onComplete }) => {
  console.log('Onboarding props:', { navigation, onComplete });

  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  useEffect(() => {
    console.log('Onboarding component mounted');
    checkOnboardingStatus();
    return () => {
      console.log('Onboarding component will unmount');
    };
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const isOnboarded = await AsyncStorage.getItem('isOnboarded');
      console.log('Current onboarding status:', isOnboarded);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };

  const handleScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    console.log('Scroll position:', scrollPosition, 'New index:', index);
    setCurrentIndex(index);
  };

  const finishOnboarding = async () => {
    try {
      console.log('Starting finishOnboarding process');
      if (onComplete) {
        console.log('Using onComplete callback');
        await onComplete();
      } else if (navigation) {
        console.log('Using navigation.replace to LoginScreen');
        await AsyncStorage.setItem('isOnboarded', 'true');
        const isOnboarded = await AsyncStorage.getItem('isOnboarded');
        console.log('Onboarding status set to:', isOnboarded);
        navigation.replace('LoginScreen');
      } else {
        console.error('Neither navigation nor onComplete provided to Onboarding');
      }
    } catch (error) {
      console.error('Error in finishOnboarding:', error);
    }
  };

  const handleNext = async () => {
    try {
      if (currentIndex < onboardingData.length - 1) {
        const nextIndex = currentIndex + 1;
        console.log('Moving to slide:', nextIndex);
        flatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true
        });
      } else {
        console.log('On last slide, finishing onboarding');
        await finishOnboarding();
      }
    } catch (error) {
      console.error('Error in handleNext:', error);
    }
  };

  const handleScrollBeginDrag = () => {
    console.log('User started scrolling');
  };

  const handleScrollEndDrag = () => {
    console.log('User ended scrolling');
  };

  const renderItem = ({ item, index }) => (
    <View style={styles.slide}>
      <View style={styles.contentContainer}>
        <Image 
          source={item.image} 
          style={styles.image} 
          resizeMode="contain"
          onError={(error) => console.error('Image loading error:', error)}
        />
        <View style={styles.textContainer}>
          <Text style={styles.title}>{item.title}</Text>
        </View>
      </View>

      {index === currentIndex && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.skipButton} 
            onPress={() => {
              console.log('Skip button pressed');
              finishOnboarding();
            }}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.nextButton,
              currentIndex === onboardingData.length - 1 && styles.getStartedButton
            ]} 
            onPress={() => {
              console.log('Next/Get Started button pressed');
              handleNext();
            }}
          >
            <Text style={[
              styles.nextButtonText,
              currentIndex === onboardingData.length - 1 && styles.getStartedButtonText
            ]}>
              {currentIndex < onboardingData.length - 1 ? "→" : "Get Started"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={onboardingData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
      />

      <View style={styles.indicatorContainer}>
        {onboardingData.map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              currentIndex === index && styles.activeIndicator,
            ]}
          />
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  slide: {
    width: width,
    height: height,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: width * 0.05,
    paddingVertical: height * 0.05,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  image: {
    width: width * 0.8,
    height: height * 0.35,
    marginBottom: height * 0.05,
  },
  textContainer: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: width * 0.05,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000000',
    marginBottom: height * 0.02,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: width * 0.05,
    paddingBottom: height * 0.05,
  },
  skipButton: {
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.04,
  },
  skipButtonText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
  nextButton: {
    backgroundColor: '#000000',
    width: width * 0.15,
    height: width * 0.15,
    borderRadius: width * 0.075,
    alignItems: 'center',
    justifyContent: 'center',
  },
  getStartedButton: {
    width: width * 0.35,
    borderRadius: width * 0.075,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
  },
  getStartedButtonText: {
    fontSize: 16,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: height * 0.15,
    width: '100%',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E5E5',
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: '#000000',
    width: 20,
  },
});

export default Onboarding;