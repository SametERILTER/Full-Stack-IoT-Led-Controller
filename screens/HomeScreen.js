import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Alert, Animated, Modal, Pressable } from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome5, Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { LedService } from '../services/api';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
    const [statusData, setStatusData] = useState({
        power: false,
        brightness: 255,
        mode: 'solid',
        active_animation: 'rainbow'
    });
    const [isLoading, setIsLoading] = useState(false);
    const [ping, setPing] = useState(0);
    const [greeting, setGreeting] = useState('Merhaba');
    const [activeModal, setActiveModal] = useState(null);
    const { height } = Dimensions.get('window');

    // Animation values
    const pulseAnim = React.useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(height)).current;
    const ledAnim = useRef(new Animated.Value(0)).current;

    const openModal = (type) => {
        setActiveModal(type);
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
        }).start(() => setActiveModal(null));
    };

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Günaydın');
        else if (hour < 18) setGreeting('İyi Günler');
        else setGreeting('İyi Akşamlar');

        checkStatus();
        const interval = setInterval(checkStatus, 3000);

        // Subtle pulsing animation for the active state
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.1,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Continuous LED movement animation
        Animated.loop(
            Animated.timing(ledAnim, {
                toValue: 1,
                duration: 3000,
                useNativeDriver: false,
            })
        ).start();

        return () => clearInterval(interval);
    }, []);

    const checkStatus = async () => {
        const startTime = Date.now();
        const data = await LedService.getStatus();
        const latency = Date.now() - startTime;

        if (data) {
            setStatusData(data);
            setPing(latency);
        }
    };

    const handlePowerToggle = async () => {
        setIsLoading(true);
        const newState = !statusData.power;
        setStatusData(prev => ({ ...prev, power: newState }));

        const success = await LedService.togglePower(newState);
        if (!success) {
            setStatusData(prev => ({ ...prev, power: !newState }));
            Alert.alert('Hata', 'Bağlantı kesildi.');
        }
        setIsLoading(false);
    };

    const getModeLabel = (mode) => {
        switch (mode) {
            case 'solid': return 'Sabit Renk';
            case 'animation': return 'Animasyon';
            case 'gradient': return 'Renk Geçişi';
            case 'gyro': return 'Eğim';
            case 'dj': return 'DJ';
            case 'canvas': return 'Boyama';
            case 'music': return 'Müzik';
            case 'ambilight': return 'Ambilight';
            case 'f1': return 'F1 Telemetri';
            default: return mode;
        }
    };

    // Güç tüketimi hesaplama
    const calculatePowerStats = () => {
        if (!statusData.power) return { current: 0, power: "0.2", amps: "0.04" };

        let r = 0, g = 0, b = 0;

        if (statusData.mode === 'solid' && statusData.color) {
            r = statusData.color.r || 0;
            g = statusData.color.g || 0;
            b = statusData.color.b || 0;
        } else {
            // Animasyon veya diğer modlarda ortalama bir değer varsayalım (Beyaz %50)
            r = 127; g = 127; b = 127;
        }

        const brightnessFactor = statusData.brightness / 255;

        // Her kanal için max 20mA
        const currentR = (r / 255) * 20;
        const currentG = (g / 255) * 20;
        const currentB = (b / 255) * 20;

        const totalCurrentPerLed = currentR + currentG + currentB; // mA
        const totalCurrentLeds = totalCurrentPerLed * 58; // 58 LED

        // MCU baz tüketim (~100mA)
        const baseCurrent = 100;

        const totalCurrentmA = (totalCurrentLeds * brightnessFactor) + baseCurrent;
        const totalCurrentAmps = totalCurrentmA / 1000;
        const totalPower = totalCurrentAmps * 5; // 5V

        return {
            current: totalCurrentmA.toFixed(0),
            power: totalPower.toFixed(1),
            amps: totalCurrentAmps.toFixed(2)
        };
    };

    const stats = calculatePowerStats();

    // RGB Helper
    const getRgbString = () => {
        if (!statusData.color) return '#2BEE79';
        return `rgb(${statusData.color.r}, ${statusData.color.g}, ${statusData.color.b})`;
    };

    const LedPreview = () => {
        const dots = Array.from({ length: 12 });
        const isRainbow = statusData.power && statusData.mode === 'animation' && statusData.active_animation === 'rainbow';
        
        // Aktif animasyon renklerini al
        const activeAnimColors = statusData.power && statusData.mode === 'animation' 
            ? ANIMATION_COLORS[statusData.active_animation] 
            : null;

        // Gradyan renklerini al (Renkler sayfasındaki)
        const activeGradColors = statusData.power && statusData.mode === 'gradient'
            ? GRADIENT_COLORS[statusData.gradient_theme]
            : null;

        // Özel mod gradyan kontrolü
        const activeSpecialMode = statusData.mode === 'special' 
            ? SPECIAL_MODES.find(m => m.id === statusData.special_mode)
            : null;
        
        const isGradient = statusData.power && (
            (activeSpecialMode && activeSpecialMode.colors.length > 1) || 
            (activeAnimColors && activeAnimColors.length > 1) ||
            (activeGradColors && activeGradColors.length > 1)
        );

        const currentColors = activeSpecialMode 
            ? activeSpecialMode.colors 
            : (activeGradColors || activeAnimColors || []);
            
        const solidColor = statusData.power ? getRgbString() : '#1A1A1A';
        
        return (
            <View style={styles.ledPreviewContainer}>
                {dots.map((_, i) => {
                    let dotBackgroundColor = solidColor;

                    if (isRainbow) {
                        dotBackgroundColor = ledAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [
                                `hsl(${(i * 30) % 360}, 80%, 55%)`,
                                `hsl(${(i * 30 + 360) % 360}, 80%, 55%)`
                            ]
                        });
                    } else if (isGradient) {
                        dotBackgroundColor = ledAnim.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [
                                currentColors[i % currentColors.length],
                                currentColors[(i + 1) % currentColors.length],
                                currentColors[i % currentColors.length]
                            ]
                        });
                    }

                    const dotShadowColor = isRainbow 
                        ? `hsl(${(i * 30) % 360}, 80%, 55%)` 
                        : (isGradient ? currentColors[0] : solidColor);

                    return (
                        <Animated.View
                            key={i}
                            style={[
                                styles.ledDot,
                                {
                                    backgroundColor: dotBackgroundColor,
                                    opacity: statusData.power 
                                        ? ledAnim.interpolate({
                                            inputRange: [0, 0.5, 1],
                                            outputRange: [0.5, 1, 0.5]
                                        })
                                        : 0.15,
                                    shadowColor: dotShadowColor,
                                    shadowRadius: statusData.power ? 8 : 0,
                                    shadowOpacity: statusData.power ? 0.6 : 0,
                                }
                            ]}
                        />
                    );
                })}
            </View>
        );
    };

    const SPECIAL_MODES = [
        {
            id: 'work',
            name: 'Çalışma Modu',
            icon: 'laptop',
            colors: ['#3B82F6', '#2563EB']
        },
        {
            id: 'party',
            name: 'Parti Modu',
            icon: 'celebration',
            colors: ['#EC4899', '#D946EF']
        },
        {
            id: 'relax',
            name: 'Dinlenme Modu',
            icon: 'bed',
            colors: ['#10B981', '#059669']
        }
    ];

    const ANIMATION_COLORS = {
        'rainbow': ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#8B00FF'],
        'fire': ['#FF4500', '#FFCC00', '#FF0000'],
        'aurora': ['#00FFCC', '#A855F7', '#00FF00'],
        'plasma': ['#6366F1', '#EC4899', '#8B5CF6'],
        'ocean': ['#00F2FF', '#0066FF'],
        'forest': ['#00FF88', '#0066FF'],
        'sunset': ['#FDBB2D', '#3A1C71'],
        'lava': ['#FF4E50', '#F9D423'],
        'space': ['#240b36', '#c31432'],
        'neon': ['#00FF00', '#FF00FF', '#00FFFF'],
        'color_waves': ['#5AC8FA', '#007AFF', '#5856D6'],
        'horizon': ['#FDBB2D', '#3A1C71']
    };

    const GRADIENT_COLORS = {
        'gradient1': ['#FF00FF', '#7A00FF', '#0000FF'],
        'gradient2': ['#00FFF9', '#FF00FF', '#FF8000'],
        'gradient3': ['#ADFF2F', '#FFFF00', '#006400'],
        'gradient4': ['#0000FF', '#FFFFFF', '#FF0000'],
        'gradient5': ['#000080', '#4B0082', '#FF00FF'],
        'gradient6': ['#FFD700', '#FF8C00', '#8B4513'],
    };

    const handleModeSelect = async (modeId) => {
        setStatusData(prev => ({ ...prev, mode: 'special', special_mode: modeId }));
        await LedService.updateStatus({
            mode: 'special',
            special_mode: modeId
        });
    };

    const renderModalContent = () => {
        switch (activeModal) {
            case 'power':
                return (
                    <>
                        <View style={styles.modalHeader}>
                            <View style={[styles.gridIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.1)', marginBottom: 0 }]}>
                                <MaterialIcons name="bolt" size={24} color="#F59E0B" />
                            </View>
                            <Text style={styles.modalTitle}>Güç Detayları</Text>
                        </View>

                        <View style={styles.modalStatsContainer}>
                            <View style={styles.modalStatRow}>
                                <Text style={styles.modalStatLabel}>Toplam LED</Text>
                                <Text style={styles.modalStatValue}>58 Adet</Text>
                            </View>
                            <View style={styles.modalDivider} />
                            <View style={styles.modalStatRow}>
                                <Text style={styles.modalStatLabel}>Voltaj</Text>
                                <Text style={styles.modalStatValue}>5V DC</Text>
                            </View>
                            <View style={styles.modalDivider} />
                            <View style={styles.modalStatRow}>
                                <Text style={styles.modalStatLabel}>Tahmini Akım</Text>
                                <Text style={styles.modalStatValue}>{stats.amps} A</Text>
                            </View>
                            <View style={styles.modalDivider} />
                            <View style={styles.modalStatRow}>
                                <Text style={styles.modalStatLabel}>Tahmini Güç</Text>
                                <Text style={[styles.modalStatValue, { color: '#F59E0B' }]}>{stats.power} W</Text>
                            </View>
                        </View>
                        <Text style={styles.modalNote}>
                            * Değerler tahminidir. Kablo direnci ve ısı kaynaklı kayıplar hesaplanmamıştır.
                        </Text>
                    </>
                );
            case 'connection':
                return (
                    <>
                        <View style={styles.modalHeader}>
                            <View style={[styles.gridIconContainer, { backgroundColor: 'rgba(99, 102, 241, 0.1)', marginBottom: 0 }]}>
                                <MaterialIcons name="cloud-sync" size={24} color="#6366F1" />
                            </View>
                            <Text style={styles.modalTitle}>Bağlantı Durumu</Text>
                        </View>

                        <View style={styles.modalStatsContainer}>
                            <View style={styles.modalStatRow}>
                                <Text style={styles.modalStatLabel}>Sunucu</Text>
                                <Text style={styles.modalStatValue}>Firebase RTDB</Text>
                            </View>
                            <View style={styles.modalDivider} />
                            <View style={styles.modalStatRow}>
                                <Text style={styles.modalStatLabel}>Durum</Text>
                                <Text style={[styles.modalStatValue, { color: '#2BEE79' }]}>Aktif</Text>
                            </View>
                            <View style={styles.modalDivider} />
                            <View style={styles.modalStatRow}>
                                <Text style={styles.modalStatLabel}>Protokol</Text>
                                <Text style={styles.modalStatValue}>WebSocket</Text>
                            </View>
                        </View>
                        <Text style={styles.modalNote}>
                            Firebase sunucularına başarıyla bağlanıldı. Veriler anlık olarak senkronize ediliyor.
                        </Text>
                    </>
                );
            case 'latency':
                return (
                    <>
                        <View style={styles.modalHeader}>
                            <View style={[styles.gridIconContainer, { backgroundColor: 'rgba(236, 72, 153, 0.1)', marginBottom: 0 }]}>
                                <Feather name="activity" size={20} color="#EC4899" />
                            </View>
                            <Text style={styles.modalTitle}>Ağ Gecikmesi</Text>
                        </View>

                        <View style={styles.modalStatsContainer}>
                            <View style={styles.modalStatRow}>
                                <Text style={styles.modalStatLabel}>Ping</Text>
                                <Text style={styles.modalStatValue}>{ping > 0 ? `${ping} ms` : 'Ölçülüyor...'}</Text>
                            </View>
                            <View style={styles.modalDivider} />
                            <View style={styles.modalStatRow}>
                                <Text style={styles.modalStatLabel}>Kalite</Text>
                                <Text style={[styles.modalStatValue, { color: '#2BEE79' }]}>Mükemmel</Text>
                            </View>
                            <View style={styles.modalDivider} />
                            <View style={styles.modalStatRow}>
                                <Text style={styles.modalStatLabel}>Paket Kaybı</Text>
                                <Text style={styles.modalStatValue}>%0</Text>
                            </View>
                        </View>
                        <Text style={styles.modalNote}>
                            Ağ bağlantı kalitesi, komutların iletilme hızını etkiler. Şu anki bağlantı stabil görünüyor.
                        </Text>
                    </>
                );
            case 'leds':
                return (
                    <>
                        <View style={styles.modalHeader}>
                            <View style={[styles.gridIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.1)', marginBottom: 0 }]}>
                                <MaterialIcons name="segment" size={24} color="#10B981" />
                            </View>
                            <Text style={styles.modalTitle}>LED Yapılandırması</Text>
                        </View>

                        <View style={styles.modalStatsContainer}>
                            <View style={styles.modalStatRow}>
                                <Text style={styles.modalStatLabel}>Model</Text>
                                <Text style={styles.modalStatValue}>WS2812B</Text>
                            </View>
                            <View style={styles.modalDivider} />
                            <View style={styles.modalStatRow}>
                                <Text style={styles.modalStatLabel}>Adet</Text>
                                <Text style={styles.modalStatValue}>58</Text>
                            </View>
                            <View style={styles.modalDivider} />
                            <View style={styles.modalStatRow}>
                                <Text style={styles.modalStatLabel}>Pin</Text>
                                <Text style={styles.modalStatValue}>GPIO 26</Text>
                            </View>
                        </View>
                        <Text style={styles.modalNote}>
                            Adreslenebilir RGB LED şerit kullanılıyor. Her LED ayrı ayrı kontrol edilebilir.
                        </Text>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0A0A0B', '#121214', '#0A0A0B']}
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView edges={['top']} style={{ flex: 1 }}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header Section */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.greetingText}>{greeting}</Text>
                            <Text style={styles.headerTitle}>Led Kontrol</Text>
                        </View>
                        <TouchableOpacity style={styles.profileButton}>
                            <View style={styles.statusIndicator}>
                                <View style={styles.onlineDot} />
                            </View>
                        <Feather name="user" size={24} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    {/* Hero Power Section */}
                    <LinearGradient
                        colors={statusData.power ? ['#1A1C1E', '#111315'] : ['#131416', '#0E0F10']}
                        style={styles.heroCard}
                    >
                        <View style={styles.heroContent}>
                            <View style={[
                                styles.powerGlow,
                                { backgroundColor: statusData.power ? 'rgba(43, 238, 121, 0.15)' : 'rgba(255, 255, 255, 0.05)' }
                            ]} />

                            <TouchableOpacity
                                style={[
                                    styles.mainPowerButton,
                                    statusData.power ? styles.powerButtonOn : styles.powerButtonOff
                                ]}
                                onPress={handlePowerToggle}
                                disabled={isLoading}
                                activeOpacity={0.7}
                            >
                                <Animated.View style={{ transform: [{ scale: statusData.power ? pulseAnim : 1 }] }}>
                                    <Ionicons
                                        name="power"
                                        size={48}
                                        color={statusData.power ? "#2bee79" : "rgba(255,255,255,0.2)"}
                                    />
                                </Animated.View>
                            </TouchableOpacity>

                            <Text style={styles.statusText}>
                                {statusData.power ? 'SİSTEM AKTİF' : 'SİSTEM KAPALI'}
                            </Text>
                            <Text style={styles.deviceInfo}>ESP32-WROOM-32D</Text>
                            
                            <LedPreview />
                        </View>

                        <View style={styles.heroStats}>
                            <View style={styles.heroStatItem}>
                                <Text style={styles.heroStatValue}>{Math.round((statusData.brightness / 255) * 100)}%</Text>
                                <Text style={styles.heroStatLabel}>Parlaklık</Text>
                            </View>
                            <View style={styles.statSeparator} />
                            <View style={styles.heroStatItem}>
                                <Text style={styles.heroStatValue} numberOfLines={1}>
                                    {getModeLabel(statusData.mode)}
                                </Text>
                                <Text style={styles.heroStatLabel}>Çalışma Modu</Text>
                            </View>
                        </View>
                    </LinearGradient>

                    {/* Special Modes Grid */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Modlar</Text>
                    </View>

                    <View style={styles.modesGrid}>
                        {SPECIAL_MODES.map((mode) => {
                            const isSelected = statusData.mode === 'special' && statusData.special_mode === mode.id;
                            return (
                                <TouchableOpacity
                                    key={mode.id}
                                    style={[
                                        styles.modeCard,
                                        isSelected && styles.modeCardSelected
                                    ]}
                                    onPress={() => handleModeSelect(mode.id)}
                                    activeOpacity={0.8}
                                >
                                    <LinearGradient
                                        colors={mode.colors}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.modeGradient}
                                    >
                                        <View style={styles.modeContent}>
                                            <View style={styles.modeIconBox}>
                                                <MaterialIcons name={mode.icon} size={20} color="#FFF" />
                                            </View>
                                            <Text style={styles.modeName}>{mode.name}</Text>
                                        </View>
                                        {isSelected && (
                                            <View style={styles.activeCheck}>
                                                <MaterialIcons name="check" size={12} color="#000" />
                                            </View>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Statistics & Control Grid */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Sistem Bilgileri</Text>
                        <TouchableOpacity onPress={checkStatus}>
                            <Text style={styles.refreshText}>Yenile</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.gridContainer}>
                        <TouchableOpacity style={styles.gridCard} onPress={() => openModal('connection')}>
                            <View style={[styles.gridIconContainer, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                                <MaterialIcons name="cloud-sync" size={24} color="#6366F1" />
                            </View>
                            <Text style={styles.gridLabel}>Bağlantı</Text>
                            <Text style={styles.gridValue}>Bulut Aktif</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.gridCard} onPress={() => openModal('latency')}>
                            <View style={[styles.gridIconContainer, { backgroundColor: 'rgba(236, 72, 153, 0.1)' }]}>
                                <Feather name="activity" size={20} color="#EC4899" />
                            </View>
                            <Text style={styles.gridLabel}>Gecikme</Text>
                            <Text style={styles.gridValue}>{ping > 0 ? `${ping} ms` : 'Ölçülüyor...'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.gridCard}
                            onPress={() => openModal('power')}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.gridIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                                <MaterialIcons name="bolt" size={24} color="#F59E0B" />
                            </View>
                            <Text style={styles.gridLabel}>Tahmini güç tüketimi</Text>
                            <Text style={styles.gridValue}>{stats.power} Watt</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.gridCard} onPress={() => openModal('leds')}>
                            <View style={[styles.gridIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                                <MaterialIcons name="segment" size={24} color="#10B981" />
                            </View>
                            <Text style={styles.gridLabel}>LED Sayısı</Text>
                            <Text style={styles.gridValue}>58 Adet</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Footer Info */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Donanım: ESP32-WROOM-32D</Text>
                        <View style={styles.activePill}>
                            <View style={styles.activeDot} />
                            <Text style={styles.activePillText}>Senkronize</Text>
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>

            {/* Generic Info Modal */}
            <Modal
                transparent={true}
                visible={!!activeModal}
                onRequestClose={closeModal}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={closeModal}
                >
                    <Animated.View
                        style={[
                            styles.modalContent,
                            { transform: [{ translateY: slideAnim }] }
                        ]}
                    >
                        <Pressable onPress={e => e.stopPropagation()}>
                            {renderModalContent()}

                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={closeModal}
                            >
                                <Text style={styles.closeButtonText}>Kapat</Text>
                            </TouchableOpacity>
                        </Pressable>
                    </Animated.View>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 150,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 25,
        marginTop: 10,
    },
    greetingText: {
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
        color: '#2BEE79',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    headerTitle: {
        fontSize: 28,
        fontFamily: 'Outfit-Bold',
        color: '#FFF',
        marginTop: 2,
    },
    profileButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        position: 'relative',
    },
    statusIndicator: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#0A0A0B',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    onlineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#2BEE79',
    },
    heroCard: {
        borderRadius: 35,
        padding: 30,
        alignItems: 'center',
        marginBottom: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.4,
        shadowRadius: 30,
        elevation: 20,
    },
    heroContent: {
        alignItems: 'center',
        marginBottom: 30,
        width: '100%',
    },
    powerGlow: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        top: -15,
    },
    mainPowerButton: {
        width: 150,
        height: 150,
        borderRadius: 75,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 8,
        shadowColor: '#2BEE79',
        shadowOffset: { width: 0, height: 0 },
    },
    powerButtonOn: {
        backgroundColor: '#121416',
        borderColor: 'rgba(43, 238, 121, 0.1)',
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    powerButtonOff: {
        backgroundColor: '#0E0F11',
        borderColor: 'rgba(255, 255, 255, 0.03)',
        shadowOpacity: 0,
    },
    statusText: {
        fontSize: 14,
        fontFamily: 'Outfit-Bold',
        color: '#FFF',
        letterSpacing: 2,
        marginTop: 10,
    },
    deviceInfo: {
        fontSize: 12,
        fontFamily: 'Outfit-Regular',
        color: 'rgba(255,255,255,0.4)',
        marginTop: 4,
    },
    ledPreviewContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 20,
        height: 20,
        width: '100%',
    },
    ledDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    heroStats: {
        flexDirection: 'row',
        width: '100%',
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 20,
        paddingVertical: 15,
        justifyContent: 'space-around',
    },
    heroStatItem: {
        alignItems: 'center',
        flex: 1,
    },
    heroStatValue: {
        fontSize: 18,
        fontFamily: 'Outfit-Bold',
        color: '#FFF',
    },
    heroStatLabel: {
        fontSize: 10,
        fontFamily: 'Outfit-Bold',
        color: 'rgba(255,255,255,0.3)',
        textTransform: 'uppercase',
        marginTop: 2,
    },
    statSeparator: {
        width: 1,
        height: '60%',
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignSelf: 'center',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingHorizontal: 5,
        marginTop: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Outfit-Bold',
        color: '#FFF',
    },
    modesGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        gap: 10,
    },
    modeCard: {
        flex: 1,
        height: 100,
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    modeCardSelected: {
        borderColor: '#FFF',
        transform: [{ scale: 1.02 }],
    },
    modeGradient: {
        flex: 1,
        padding: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modeContent: {
        alignItems: 'center',
        gap: 8,
    },
    modeIconBox: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modeName: {
        fontSize: 11,
        fontFamily: 'Outfit-Bold',
        color: '#FFF',
        textAlign: 'center',
    },
    activeCheck: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    refreshText: {
        fontSize: 14,
        fontFamily: 'Outfit-SemiBold',
        color: '#2bee79',
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    gridCard: {
        width: (width - 52) / 2,
        backgroundColor: '#111315',
        borderRadius: 24,
        padding: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.03)',
    },
    gridIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    gridLabel: {
        fontSize: 12,
        fontFamily: 'Outfit-Bold',
        color: 'rgba(255,255,255,0.3)',
        marginBottom: 4,
    },
    gridValue: {
        fontSize: 15,
        fontFamily: 'Outfit-Bold',
        color: '#FFF',
    },
    footer: {
        marginTop: 25,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 11,
        fontFamily: 'Outfit-Regular',
        color: 'rgba(255,255,255,0.3)',
        marginBottom: 10,
    },
    activePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(43, 238, 121, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(43, 238, 121, 0.2)',
    },
    activeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#2BEE79',
        marginRight: 6,
    },
    activePillText: {
        fontSize: 10,
        fontFamily: 'Outfit-Bold',
        color: '#2BEE79',
        textTransform: 'uppercase',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
        alignItems: 'center',
        padding: 0,
    },
    modalContent: {
        width: '100%',
        backgroundColor: '#111315',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        paddingBottom: 85,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        borderBottomWidth: 0,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        gap: 12,
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: 'Outfit-Bold',
        color: '#FFF',
    },
    modalStatsContainer: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
    },
    modalStatRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    modalStatLabel: {
        fontSize: 14,
        fontFamily: 'Outfit-SemiBold',
        color: 'rgba(255,255,255,0.5)',
    },
    modalStatValue: {
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
        color: '#FFF',
    },
    modalDivider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    modalNote: {
        fontSize: 11,
        fontFamily: 'Outfit-Regular',
        color: 'rgba(255,255,255,0.3)',
        marginBottom: 24,
        lineHeight: 16,
    },
    closeButton: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    closeButtonText: {
        color: '#FFF',
        fontFamily: 'Outfit-Bold',
        fontSize: 14,
    },
});
