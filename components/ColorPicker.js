import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, Dimensions, Animated, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { debounce, throttle } from 'lodash';
import { MaterialIcons } from '@expo/vector-icons';

export default function ColorPicker({ onColorChange, onSelect, initialColor = '#ff0000' }) {
    const [sliderPosition, setSliderPosition] = useState(0);
    const [currentColor, setCurrentColor] = useState(initialColor);
    const [containerWidth, setContainerWidth] = useState(0);
    
    // For smooth visual updates
    const thumbAnim = useRef(new Animated.Value(0)).current;

    const throttledOnColorChange = useCallback(
        throttle((color) => {
            if (onColorChange) onColorChange(color);
        }, 50, { leading: true, trailing: true }),
        [onColorChange]
    );

    useEffect(() => {
        return () => throttledOnColorChange.cancel();
    }, [throttledOnColorChange]);

    const hslToHex = (h, s, l) => {
        l /= 100;
        const a = s * Math.min(l, 1 - l) / 100;
        const f = n => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
    };

    const updateColorFromPosition = (x) => {
        if (containerWidth === 0) return;
        
        // Clamp the touch position so the thumb center stays within bounds
        const clampedX = Math.max(0, Math.min(x, containerWidth));
        
        const ratio = clampedX / containerWidth;
        const hue = ratio * 360;
        const color = hslToHex(hue, 100, 50);
        
        setSliderPosition(clampedX);
        setCurrentColor(color);
        throttledOnColorChange(color);
        
        // Immediate UI update without animation for dragging
        thumbAnim.setValue(clampedX);
    };

    const handleTouch = (evt) => {
        updateColorFromPosition(evt.nativeEvent.locationX);
    };

    const handleTouchEnd = () => {
        if (onSelect) onSelect(currentColor);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.label}>RENK TONU</Text>
            </View>

            <View
                style={styles.pickerContainer}
                onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
                onTouchStart={handleTouch}
                onTouchMove={handleTouch}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
            >
                <View style={StyleSheet.absoluteFill} pointerEvents="none">
                    <LinearGradient
                        colors={[
                            '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ff0000'
                        ]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={styles.gradient}
                    />
                    
                    {containerWidth > 0 && (
                        <Animated.View style={[styles.thumb, { transform: [{ translateX: thumbAnim }] }]}>
                            <View style={[styles.thumbInner, { backgroundColor: currentColor }]} />
                        </Animated.View>
                    )}
                    
                    <View style={styles.overlay}>
                        <MaterialIcons name="palette" size={24} color="#FFF" style={styles.iconShadow} />
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
    pickerContainer: {
        width: '100%',
        height: 64,
        position: 'relative',
        justifyContent: 'center',
    },
    gradient: {
        width: '100%',
        height: '100%',
        borderRadius: 32,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    thumb: {
        position: 'absolute',
        top: 4,
        left: -28, // Offset by half width to center it on the touch point
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    thumbInner: {
        width: 46,
        height: 46,
        borderRadius: 23,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    iconShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 3,
        elevation: 5,
    }
});
