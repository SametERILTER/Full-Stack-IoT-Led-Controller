import React, { useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

/**
 * FadeScreen — Sayfa odaklandığında (tab'a basıldığında) içeriği
 * opacity ile belirterek fade-in animasyonu yapar.
 * useNativeDriver: true → tamamen native thread, JS yok, performans maksimum.
 */
export default function FadeScreen({ children, style }) {
    const opacity = useRef(new Animated.Value(0)).current;

    useFocusEffect(
        React.useCallback(() => {
            opacity.setValue(0);
            Animated.timing(opacity, {
                toValue: 1,
                duration: 220,
                useNativeDriver: true,
            }).start();
        }, [])
    );

    return (
        <Animated.View style={[styles.container, style, { opacity }]}>
            {children}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050505',  // Beyaz flash'ı önler
    },
});
