import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, Text, Dimensions, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import debounce from 'lodash.debounce';

export default function SpeedSlider({ onValueChange, initialValue = 128 }) {
    const [sliderValue, setSliderValue] = useState(initialValue);
    const [containerWidth, setContainerWidth] = useState(0);

    const panX = useRef(0);
    const fillWidthAnim = useRef(new Animated.Value(0)).current;
    const isDragging = useRef(false);

    useEffect(() => {
        if (!isDragging.current) {
            setSliderValue(initialValue);
            if (containerWidth > 0) {
                const width = (initialValue / 255) * containerWidth;
                Animated.timing(fillWidthAnim, {
                    toValue: width,
                    duration: 300,
                    useNativeDriver: false
                }).start();
            }
        }
    }, [initialValue, containerWidth]);

    const debouncedOnValueChange = useCallback(
        debounce((val) => {
            if (onValueChange) onValueChange(val);
        }, 150),
        [onValueChange]
    );

    useEffect(() => {
        return () => debouncedOnValueChange.cancel();
    }, [debouncedOnValueChange]);

    const updateValue = (x) => {
        if (containerWidth === 0) return;
        const clampedX = Math.max(0, Math.min(x, containerWidth));
        const newValue = Math.round((clampedX / containerWidth) * 255);
        
        setSliderValue(newValue);
        debouncedOnValueChange(newValue);
        fillWidthAnim.setValue(clampedX);
    };

    const handleTouch = (evt) => {
        updateValue(evt.nativeEvent.locationX);
    };

    const percentage = Math.round((sliderValue / 255) * 100);

    // Determine colors based on slider position
    const iconColor = sliderValue > 25 ? '#000' : '#FFF';
    const textColor = sliderValue > 210 ? '#000' : '#FFF';

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.label}>AKIŞ HIZI</Text>
            </View>

            <View 
                style={styles.sliderWrapper}
                onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
                onTouchStart={(e) => {
                    isDragging.current = true;
                    handleTouch(e);
                }}
                onTouchMove={handleTouch}
                onTouchEnd={() => {
                    isDragging.current = false;
                }}
                onTouchCancel={() => {
                    isDragging.current = false;
                }}
            >
                <View style={styles.trackBase} pointerEvents="none">
                    <Animated.View style={[styles.trackFill, { width: fillWidthAnim }]} />
                    <View style={styles.contentOverlay}>
                        <View style={styles.iconContainer}>
                            <Feather name="zap" size={24} color={iconColor} />
                        </View>
                        <Text style={[styles.percentageText, { color: textColor }]}>
                            %{percentage}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        paddingVertical: 10,
    },
    header: {
        marginBottom: 12,
    },
    label: {
        fontSize: 12,
        fontFamily: 'Outfit-Bold',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 1.5,
    },
    sliderWrapper: {
        height: 64,
        width: '100%',
        justifyContent: 'center',
    },
    trackBase: {
        width: '100%',
        height: 64,
        borderRadius: 32,
        backgroundColor: '#1E1E1E',
        overflow: 'hidden',
        position: 'relative',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    trackFill: {
        height: '100%',
        backgroundColor: '#2BEE79',
        position: 'absolute',
        top: 0, left: 0,
    },
    contentOverlay: {
        ...StyleSheet.absoluteFillObject,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
    },
    iconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    percentageText: {
        fontSize: 18,
        fontFamily: 'Outfit-Bold',
    }
});
