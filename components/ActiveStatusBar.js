import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Modal, Pressable, Alert, ScrollView } from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome5, Octicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useLed } from '../context/LedContext';
import { ANIMATIONS, GRADIENTS, COLORS } from '../constants/ledConfig';
import { LinearGradient } from 'expo-linear-gradient';
import BrightnessSlider from './BrightnessSlider';
import { LedService } from '../services/api';

const { width, height } = Dimensions.get('window');

const SPECIAL_MODES = [
    { id: 'work', name: 'Çalışma Modu', icon: 'laptop', colors: ['#3B82F6', '#2563EB'] },
    { id: 'party', name: 'Parti Modu', icon: 'celebration', colors: ['#EC4899', '#D946EF'] },
    { id: 'relax', name: 'Dinlenme Modu', icon: 'spa', colors: ['#10B981', '#059669'] }
];

export default function ActiveStatusBar() {
    const { status, updateLocalStatus } = useLed();
    const [modalVisible, setModalVisible] = useState(false);
    const slideAnim = useRef(new Animated.Value(-height)).current; // Start off-screen at top
    const navigation = useNavigation();

    const getModeInfo = () => {
        if (status.mode === 'animation') {
            const anim = ANIMATIONS.find(a => a.id === status.active_animation);
            return {
                name: anim?.name || 'Animasyon',
                icon: anim?.icon || 'magic',
                type: 'Animasyon',
                colors: anim?.colors || ['#2bee79', '#3b82f6']
            };
        } else if (status.mode === 'gradient') {
            const grad = GRADIENTS.find(g => g.theme === status.gradient_theme);
            return {
                name: grad?.name || 'Geçiş',
                icon: 'gradient',
                type: 'Renk Geçişi',
                colors: grad?.colors || ['#2bee79', '#3b82f6']
            };
        } else if (status.mode === 'special') {
            const mode = SPECIAL_MODES.find(m => m.id === status.special_mode);
            return {
                name: mode?.name || 'Özel Mod',
                icon: mode?.icon || 'star',
                type: 'Özel Mod',
                colors: mode?.colors || ['#F59E0B', '#F59E0B']
            };
        } else {
            return {
                name: 'Sabit Renk',
                icon: 'palette',
                type: 'Renk Modu',
                colors: [`rgb(${status.color.r}, ${status.color.g}, ${status.color.b})`, '#000']
            };
        }
    };

    const info = getModeInfo();

    const openModal = () => {
        setModalVisible(true);
        Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 8
        }).start();
    };

    const closeModal = () => {
        Animated.timing(slideAnim, {
            toValue: height,
            duration: 300,
            useNativeDriver: true
        }).start(() => setModalVisible(false));
    };

    const handleNavigate = (screen) => {
        closeModal();
        navigation.navigate(screen);
    };

    // Pulse animation for power button
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.1, duration: 2000, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    const handleBrightnessChange = async (value) => {
        await LedService.setBrightness(value);
    };

    const handlePowerToggle = async () => {
        const newState = !status.power;
        updateLocalStatus({ power: newState });

        const success = await LedService.togglePower(newState);
        if (!success) {
            updateLocalStatus({ power: !newState });
            Alert.alert('Hata', 'Bağlantı hatası.');
        }
    };

    const brightnessPercent = Math.round((status.brightness / 255) * 100);

    return (
        <>
            <View style={styles.barWrapper}>
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={openModal}
                    style={styles.container}
                >
                    <View style={styles.blur}>
                        <View style={styles.content}>
                            <View style={styles.left}>
                                <View style={[styles.iconCircle, { backgroundColor: info.colors[0] + '20' }]}>
                                    <MaterialIcons name={info.icon} size={20} color={info.colors[0]} />
                                </View>
                                <View style={styles.infoText}>
                                    <Text style={[styles.modeType, !status.power && styles.powerOffText]}>
                                        {info.type}{!status.power && ' - GÜÇ KAPALI'}
                                    </Text>
                                    <Text style={styles.modeName} numberOfLines={1}>{info.name}</Text>
                                </View>
                            </View>

                            <View style={styles.right}>
                                <View style={styles.brightnessBox}>
                                    <MaterialIcons name="brightness-6" size={14} color="rgba(255,255,255,0.5)" />
                                    <Text style={styles.brightnessText}>%{brightnessPercent}</Text>
                                </View>
                                <Ionicons name="chevron-up" size={18} color="rgba(255,255,255,0.3)" />
                            </View>
                        </View>

                    </View>
                </TouchableOpacity>
            </View>

            <Modal
                visible={modalVisible}
                transparent={true}
                onRequestClose={closeModal}
            >
                <Animated.View
                    style={[
                        styles.modalOverlay,
                        { transform: [{ translateY: slideAnim }] }
                    ]}
                >
                    <SafeAreaProviderContainer>
                        <LinearGradient
                            colors={[info.colors[0], '#111111']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 0.6 }}
                            style={[styles.modalContent, { backgroundColor: null }]}
                        >
                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.scrollContentContainer}
                                style={{ width: '100%' }}
                            >
                                <TouchableOpacity style={styles.closeBtn} onPress={closeModal}>
                                    <MaterialIcons name="keyboard-arrow-down" size={32} color="#FFF" />
                                </TouchableOpacity>

                                <View style={styles.modalHeader}>
                                    <LinearGradient
                                        colors={[...info.colors, info.colors[0]]}
                                        style={styles.largeIconBox}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        <MaterialIcons name={info.icon} size={64} color="#FFF" />
                                    </LinearGradient>

                                    <Text style={[styles.modalTypeLabel, !status.power && styles.powerOffText]}>
                                        {info.type}{!status.power && ' - GÜÇ KAPALI'}
                                    </Text>
                                    <Text style={styles.modalNameLabel}>{info.name}</Text>
                                </View>

                                <View style={styles.modalStats}>
                                    <View style={styles.statItem}>
                                        <Text style={styles.statVal}>%{brightnessPercent}</Text>
                                        <Text style={styles.statLabel}>PARLAKLIK</Text>
                                    </View>
                                    <View style={styles.statDivider} />
                                    <View style={styles.statItem}>
                                        <TouchableOpacity
                                            onPress={handlePowerToggle}
                                            style={[styles.powerBtn, status.power ? styles.powerBtnOn : styles.powerBtnOff]}
                                            activeOpacity={0.7}
                                        >
                                            <Animated.View style={{ transform: [{ scale: status.power ? pulseAnim : 1 }] }}>
                                                <Ionicons
                                                    name="power"
                                                    size={28}
                                                    color={status.power ? "#2bee79" : "rgba(255,255,255,0.2)"}
                                                />
                                            </Animated.View>
                                        </TouchableOpacity>
                                        <Text style={styles.statLabel}>GÜÇ</Text>
                                    </View>
                                    <View style={styles.statDivider} />
                                    <View style={styles.statItem}>
                                        <Text style={styles.statVal}>{status.speed}</Text>
                                        <Text style={styles.statLabel}>HIZ</Text>
                                    </View>
                                </View>

                                <View style={styles.sliderContainer}>
                                    <BrightnessSlider
                                        initialValue={status.brightness}
                                        onValueChange={handleBrightnessChange}
                                    />
                                </View>

                                {/* Discover Section */}
                                <View style={styles.discoverSection}>
                                    <Text style={styles.discoverTitle}>DAHA FAZLA MOD KEŞFEDİN</Text>
                                    <View style={styles.discoverGrid}>
                                        <TouchableOpacity style={styles.discoverCard} onPress={() => handleNavigate('Renkler')}>
                                            <LinearGradient colors={['#FF0000', '#0000FF']} style={styles.discoverIconBg}>
                                                <FontAwesome5 name="palette" size={20} color="#FFF" />
                                            </LinearGradient>
                                            <Text style={styles.discoverLabel}>Renkler</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity style={styles.discoverCard} onPress={() => handleNavigate('Animasyonlar')}>
                                            <LinearGradient colors={['#2bee79', '#3b82f6']} style={styles.discoverIconBg}>
                                                <FontAwesome5 name="magic" size={20} color="#FFF" />
                                            </LinearGradient>
                                            <Text style={styles.discoverLabel}>Animasyonlar</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity style={styles.discoverCard} onPress={() => handleNavigate('Etkileşim')}>
                                            <LinearGradient colors={['#EC4899', '#8B5CF6']} style={styles.discoverIconBg}>
                                                <Octicons name="zap" size={22} color="#FFF" />
                                            </LinearGradient>
                                            <Text style={styles.discoverLabel}>Etkileşimler</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </ScrollView>
                        </LinearGradient>
                    </SafeAreaProviderContainer>
                </Animated.View>
            </Modal>
        </>
    );
}

// Helper to handle safe area in modal
const SafeAreaProviderContainer = ({ children }) => (
    <View style={{ flex: 1, paddingTop: 30 }}>
        {children}
    </View>
);

const styles = StyleSheet.create({
    barWrapper: {
        position: 'absolute',
        bottom: 130, // Adjusted for the new floating tab bar height
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        zIndex: 1000,
    },
    container: {
        height: 64,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: '#111111f4',
    },
    blur: {
        flex: 1,
        justifyContent: 'center',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconCircle: {
        width: 38,
        height: 38,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    infoText: {
        flex: 1,
    },
    modeType: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 10,
        fontFamily: 'Outfit-Bold',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    modeName: {
        color: '#FFF',
        fontSize: 15,
        fontFamily: 'Outfit-Bold',
    },
    right: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    brightnessBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    brightnessText: {
        color: '#FFF',
        fontSize: 12,
        fontFamily: 'Outfit-Bold',
    },
    progressBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        height: 2,
        opacity: 0.8,
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
    },
    modalContent: {
        flex: 1,
        backgroundColor: '#111',
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        paddingHorizontal: 20,
        paddingTop: 20,
        alignItems: 'center',
    },
    scrollContentContainer: {
        alignItems: 'center',
        paddingBottom: 90,
        width: '100%',
    },
    closeBtn: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 20,
        paddingVertical: 10,
    },
    modalHeader: {
        alignItems: 'center',
        marginBottom: 40,
    },
    largeIconBox: {
        width: 120,
        height: 120,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.5,
        shadowRadius: 30,
        elevation: 20,
    },
    modalTypeLabel: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 14,
        fontFamily: 'Outfit-Bold',
        letterSpacing: 3,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    modalNameLabel: {
        color: '#FFF',
        fontSize: 36,
        fontFamily: 'Outfit-Bold',
        textAlign: 'center',
    },
    modalStats: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 30,
        paddingVertical: 24,
        paddingHorizontal: 10,
        width: '100%',
        justifyContent: 'space-around',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        marginBottom: 40,
    },
    statItem: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    statVal: {
        color: '#FFF',
        fontSize: 20,
        fontFamily: 'Outfit-Bold',
        marginBottom: 4,
    },
    statLabel: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 10,
        fontFamily: 'Outfit-Bold',
        letterSpacing: 1,
    },
    statDivider: {
        width: 1,
        height: '60%',
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignSelf: 'center',
    },
    sliderContainer: {
        width: '100%',
        paddingHorizontal: 10,
        marginBottom: 40,
    },
    powerOffText: {
        color: '#ff4444',
    },
    powerBtn: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        borderWidth: 3,
    },
    powerBtnOn: {
        backgroundColor: '#121416',
        borderColor: 'rgba(43, 238, 121, 0.2)',
        shadowColor: '#2bee79',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
        elevation: 10,
    },
    powerBtnOff: {
        backgroundColor: '#0E0F11',
        borderColor: 'rgba(255, 255, 255, 0.05)',
        shadowOpacity: 0,
    },
    discoverSection: {
        width: '100%',
        paddingHorizontal: 10,
    },
    discoverTitle: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        fontFamily: 'Outfit-Bold',
        letterSpacing: 2,
        marginBottom: 20,
        textAlign: 'center',
        textTransform: 'uppercase',
    },
    discoverGrid: {
        width: '100%',
        gap: 12,
    },
    discoverCard: {
        width: '100%',
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 24,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    discoverIconBg: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    discoverLabel: {
        color: '#FFF',
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
        letterSpacing: 0.5,
    }
});
