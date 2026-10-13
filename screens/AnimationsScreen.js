import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Modal, ScrollView, Pressable } from 'react-native';
import ColorPicker from '../components/ColorPicker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LedService } from '../services/api';
import SpeedSlider from '../components/SpeedSlider';
import BrightnessSlider from '../components/BrightnessSlider';

const { width } = Dimensions.get('window');

// Animasyon Veritabanı
const ANIMATIONS = [
    { id: 'solid', name: 'Sabit Renk', description: 'Tek bir renk sürekli yanar', icon: 'lightbulb', colors: ['#FF3B30', '#007AFF'], hasColorPicker: true },
    { id: 'rainbow', name: 'Gökkuşağı', description: 'Renkler arası yumuşak geçiş', icon: 'palette', colors: ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#8B00FF'] },
    { id: 'breathing', name: 'Nefes Alma', description: 'Yavaşça parlar ve söner', icon: 'air', colors: ['#00FF88', 'transparent'], hasColorPicker: true },
    { id: 'blink', name: 'Yanıp Sönme', description: 'Ritmik flaş efekti', icon: 'flash-on', colors: ['#FFCC00', '#333333'], hasColorPicker: true },
    { id: 'meteor', name: 'Yıldız Kayması', description: 'Kayan ışık izleri', icon: 'auto-awesome', colors: ['#00F2FF', '#0066FF'], hasColorPicker: true },
    { id: 'fire', name: 'Yangın', description: 'Sıcak alev simülasyonu', icon: 'local-fire-department', colors: ['#FF4500', '#FFCC00', '#FF0000'] },
    { id: 'duel', name: 'İkili Yanma', description: 'İki yönden gelen ışık çarpışması', icon: 'swap-horiz', colors: ['#FF0000', '#0000FF'], hasColorPicker: false },
    { id: 'aurora', name: 'Kuzey Işıkları', description: 'Yumuşak dalgalanan gece ışıkları', icon: 'filter-vintage', colors: ['#00FFCC', '#A855F7', '#00FF00'], hasColorPicker: false },
    { id: 'plasma', name: 'Plazma', description: 'Enerjik enerji dalgaları', icon: 'auto-graph', colors: ['#6366F1', '#EC4899', '#8B5CF6'], hasColorPicker: false },
    { id: 'comet', name: 'Kuyruklu Yıldız', description: 'Çift yönlü gelen ışık izi', icon: 'blur-linear', colors: ['#FFFFFF', '#0099FF', 'transparent'], hasColorPicker: true },
    { id: 'wave', name: 'Sinüs Dalgası', description: 'Yumuşak parlaklık dalgalanması', icon: 'waves', colors: ['#6366F1', '#A855F7', '#EC4899'], hasColorPicker: true },
    { id: 'theater', name: 'Tiyatro Modu', description: 'Birbirini takip eden ışıklar', icon: 'theaters', colors: ['#FFD700', '#333333'], hasColorPicker: true },
    { id: 'larson', name: 'Kara Şimşek', description: 'Klasik K.I.T.T. tarama efekti', icon: 'view-week', colors: ['#FF0000', '#330000'], hasColorPicker: true },
    { id: 'fireworks', name: 'Havai Fişek', description: 'Patlayan ve dağılan ışık izleri', icon: 'auto-fix-high', colors: ['#FFCC00', '#FF4500', 'transparent'], hasColorPicker: true },
    { id: 'converge', name: 'Kavuşma', description: 'İki uçtan merkeze süzülen ışıklar', icon: 'compare-arrows', colors: ['#00FF88', '#0066FF'], hasColorPicker: false },
    { id: 'tetris', name: 'Tetris', description: 'Blokların düşüşü ve yerleşimi', icon: 'grid-view', colors: ['#FFD700', '#FF0000', '#00FF00', '#0000FF'], hasColorPicker: true },
    { id: 'lightspeed', name: 'Işık Hızı', description: 'Süper hızlı ışık geçişleri', icon: 'speed', colors: ['#FFFFFF', '#00FFFF', '#007AFF'], hasColorPicker: true },
    { id: 'party', name: 'Parti', description: 'Ritmik ve enerjik renkli ışıklar', icon: 'celebration', colors: ['#FF00FF', '#00FFFF', '#FFFF00', '#FF0000'], hasColorPicker: false },
    { id: 'dualscan', name: 'İkili Tarama', description: 'Çift yönden tarama efekti', icon: 'settings-ethernet', colors: ['#00FF88', '#0066FF'], hasColorPicker: true },
    { id: 'palette', name: 'Renk Paleti', description: 'Dinamik renk paleti geçişleri', icon: 'color-lens', colors: ['#FF3B30', '#FF9500', '#FFCC00'], hasColorPicker: true },
    { id: 'color_waves', name: 'Renk Dalgaları', description: 'Yumuşak ve akan renk dalgaları', icon: 'waves', colors: ['#5AC8FA', '#007AFF', '#5856D6'], hasColorPicker: true },
    { id: 'horizon', name: 'Ufuk Çizgisi', description: 'Ufukta süzülen renk geçişleri', icon: 'wb-twilight', colors: ['#FDBB2D', '#3A1C71'], hasColorPicker: true }
];

// Kategorilendirilmiş Yapı
const CATEGORIES = [
    {
        id: 'basic',
        title: 'Temel Modlar',
        description: 'Klasik ve günlük kullanıma uygun',
        items: ['solid', 'blink', 'theater'],
        gradient: ['#D97706', '#F59E0B']
    },
    {
        id: 'nature',
        title: 'Doğa ve Atmosfer',
        description: 'Sakinleştirici ve doğal efektler',
        items: ['fire', 'aurora', 'breathing', 'wave', 'meteor', 'comet', 'color_waves', 'horizon'],
        gradient: ['#059669', '#10B981']
    },
    {
        id: 'energy',
        title: 'Enerji ve Parti',
        description: 'Yüksek tempolu ve renkli modlar',
        items: ['rainbow', 'party', 'fireworks', 'lightspeed', 'plasma', 'palette'],
        gradient: ['#7C3AED', '#8B5CF6']
    },
    {
        id: 'tech',
        title: 'Dijital ve Teknoloji',
        description: 'Fütüristik ve geometrik efektler',
        items: ['larson', 'tetris', 'dualscan', 'converge', 'duel'],
        gradient: ['#2563EB', '#3B82F6']
    }
];

const PRESET_COLORS = [
    { id: 1, name: 'Kırmızı', hex: '#FF0000' },
    { id: 2, name: 'Yeşil', hex: '#00FF00' },
    { id: 3, name: 'Mavi', hex: '#0000FF' },
    { id: 4, name: 'Sarı', hex: '#FFFF00' },
    { id: 5, name: 'Mor', hex: '#8000FF' },
    { id: 6, name: 'Turuncu', hex: '#FF8000' },
    { id: 7, name: 'Pembe', hex: '#FF00FF' },
    { id: 8, name: 'Turkuaz', hex: '#00FFFF' },
    { id: 9, name: 'Beyaz', hex: '#FFFFFF', textDark: true },
];

export default function AnimationsScreen() {
    const [statusData, setStatusData] = useState({
        brightness: 255,
        speed: 128,
        active_animation: 'rainbow',
        color: { r: 0, g: 255, b: 0 }
    });
    const [activeAnimation, setActiveAnimation] = useState('rainbow');
    const [isLoading, setIsLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [currentHex, setCurrentHex] = useState('#00FF00');

    // Hooks
    const insets = useSafeAreaInsets();

    // Animation Refs
    const pulseAnim = useState(new Animated.Value(1))[0];
    const slideAnim = useState(new Animated.Value(Dimensions.get('window').height))[0];

    useEffect(() => {
        const fetchStatus = async () => {
            const data = await LedService.getStatus();
            if (data) {
                setStatusData(data);
                if (data.active_animation) {
                    setActiveAnimation(data.active_animation);
                }
                if (data.color) {
                    // RGB -> Hex
                    const toHex = (c) => {
                        const hex = c.toString(16);
                        return hex.length === 1 ? '0' + hex : hex;
                    };
                    const hex = `#${toHex(data.color.r)}${toHex(data.color.g)}${toHex(data.color.b)}`;
                    setCurrentHex(hex.toUpperCase());
                }
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (activeAnimation === 'breathing') {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.2, duration: 1500, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [activeAnimation]);

    const activeItem = useMemo(() => ANIMATIONS.find(a => a.id === activeAnimation), [activeAnimation]);

    const handleApply = useCallback(async (animationId) => {
        setIsLoading(true);
        setActiveAnimation(animationId);
        if (animationId === 'solid') {
            await LedService.updateStatus({
                mode: 'solid',
                active_animation: 'solid'
            });
        } else {
            await LedService.setAnimation(animationId);
        }
        setIsLoading(false);
    }, []);

    const handleSpeedChange = useCallback(async (value) => {
        await LedService.setSpeed(value);
    }, []);

    const handleBrightnessChange = useCallback(async (value) => {
        await LedService.setBrightness(value);
    }, []);

    const openColorPicker = (item) => {
        setEditingItem(item);
        setModalVisible(true);
        Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 8
        }).start();
    };

    const closeColorPicker = () => {
        Animated.timing(slideAnim, {
            toValue: Dimensions.get('window').height,
            duration: 300,
            useNativeDriver: true
        }).start(() => {
            setModalVisible(false);
            setEditingItem(null);
        });
    };

    const handleColorSelect = async (hexColor) => {
        setCurrentHex(hexColor);
        await LedService.updateColor(hexColor);
    };

    const handlePresetSelect = async (hexColor) => {
        await handleColorSelect(hexColor);
        closeColorPicker();
    };

    // --- RENDER COMPONENTS ---

    const ShowCase = useMemo(() => (
        <View style={styles.activeShowcase}>
            <Animated.View style={[
                styles.glowContainer,
                { transform: [{ scale: activeAnimation === 'breathing' ? pulseAnim : 1 }] }
            ]}>
                <LinearGradient
                    colors={activeItem?.colors || ['#2bee79', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.activeGlow}
                />
            </Animated.View>

            <View style={styles.showcaseContent}>
                <Text style={styles.showcaseSubtitle}>SEÇİLİ ANİMASYON</Text>
                <Text style={styles.showcaseTitle}>{activeItem?.name}</Text>
                <MaterialIcons
                    name={activeItem?.icon || 'settings'}
                    size={48}
                    color="#FFF"
                    style={styles.showcaseIcon}
                />
            </View>
        </View>
    ), [activeItem, activeAnimation, pulseAnim]);

    const Controls = useMemo(() => (
        <View style={styles.controlsCard}>
            <View style={styles.controlItem}>
                <SpeedSlider
                    onValueChange={handleSpeedChange}
                    initialValue={statusData.speed}
                />
            </View>
            <View style={styles.divider} />
            <View style={styles.controlItem}>
                <BrightnessSlider
                    onValueChange={handleBrightnessChange}
                    initialValue={statusData.brightness}
                />
            </View>
        </View>
    ), [statusData.speed, statusData.brightness, handleSpeedChange, handleBrightnessChange]);

    const renderAnimCard = (id) => {
        const item = ANIMATIONS.find(a => a.id === id);
        if (!item) return null;

        const isActive = activeAnimation === item.id;
        const mainColor = item.colors[0] === 'transparent' ? '#ffffff' : item.colors[0];

        return (
            <TouchableOpacity
                key={item.id}
                style={styles.animCardContainer}
                onPress={() => handleApply(item.id)}
                activeOpacity={0.85}
            >
                <View style={[
                    styles.animCard,
                    isActive && {
                        borderColor: mainColor,
                        backgroundColor: `${mainColor}15`,
                    }
                ]}>
                    <View style={styles.cardHeader}>
                        <View style={[
                            styles.cardIconBox,
                            { backgroundColor: `${mainColor}15` }
                        ]}>
                            <MaterialIcons
                                name={item.icon}
                                size={22}
                                color={mainColor}
                            />
                        </View>

                        {item.hasColorPicker && (
                            <TouchableOpacity
                                style={[
                                    styles.cardPaletteBtn,
                                    isActive && { backgroundColor: `${mainColor}20`, borderColor: `${mainColor}40` }
                                ]}
                                onPress={() => openColorPicker(item)}
                            >
                                <MaterialIcons
                                    name="tune"
                                    size={14}
                                    color={isActive ? mainColor : "rgba(255,255,255,0.4)"}
                                />
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.cardInfo}>
                        <Text style={styles.cardName} numberOfLines={1}>
                            {item.name}
                        </Text>
                        <Text style={styles.cardDescription} numberOfLines={2}>
                            {item.description}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#000', '#0a0a0a', '#050505']}
                style={StyleSheet.absoluteFill}
            />

            <View style={{ flex: 1 }}>
                <ScrollView
                    contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.navbar}>
                        <Text style={styles.navTitle}>Animasyonlar</Text>
                        <View style={styles.statusBadge}>
                            <View style={styles.statusDot} />
                            <Text style={styles.statusText}>BAĞLI</Text>
                        </View>
                    </View>

                    {ShowCase}
                    {Controls}

                    <View style={styles.categoriesContainer}>
                        {CATEGORIES.map((cat, index) => (
                            <View key={cat.id} style={styles.categorySection}>
                                <View style={styles.categoryHeader}>
                                    <View style={styles.categoryTitleRow}>
                                        <View style={[styles.categoryDecor, { backgroundColor: cat.gradient[0] }]} />
                                        <Text style={styles.categoryTitle}>{cat.title}</Text>
                                    </View>
                                    <Text style={styles.categoryDesc}>{cat.description}</Text>
                                </View>

                                <View style={styles.gridRow}>
                                    {cat.items.map(itemId => renderAnimCard(itemId))}
                                </View>
                            </View>
                        ))}
                    </View>
                </ScrollView>
            </View>

            {/* Top Fade Gradient */}
            <LinearGradient
                colors={['#000000', '#000000', 'rgba(0, 0, 0, 0)']}
                locations={[0, 0.4, 1]}
                style={[styles.topGradient, { height: insets.top + 25 }]}
                pointerEvents="none"
            />

            {/* Modal for Color Picker */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="none"
                onRequestClose={closeColorPicker}
            >
                <Pressable style={styles.modalOverlay} onPress={closeColorPicker}>
                    <Animated.View
                        style={[
                            styles.modalContent,
                            { transform: [{ translateY: slideAnim }] }
                        ]}
                        onStartShouldSetResponder={() => true}
                    >
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHandle} />
                            <View style={styles.modalTitleRow}>
                                <Text style={styles.modalTitle}>{editingItem?.name}</Text>
                                <Text style={styles.modalSubtitle}>RENK AYARI</Text>
                            </View>
                            <TouchableOpacity onPress={closeColorPicker} style={styles.closeBtn}>
                                <MaterialIcons name="close" size={24} color="rgba(255,255,255,0.5)" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.modalScrollContent}
                        >
                            <View style={styles.modalPadding}>
                                <View style={styles.pickerSection}>
                                    <View style={styles.pickerContainer}>
                                        <ColorPicker
                                            onColorChange={handleColorSelect}
                                            onSelect={closeColorPicker}
                                            initialColor={currentHex}
                                        />
                                    </View>
                                </View>

                                <View style={styles.sectionDivider}>
                                    <Text style={styles.modalSectionTitle}>POPÜLER RENKLER</Text>
                                    <View style={styles.sectionLine} />
                                </View>

                                <View style={styles.presetGrid}>
                                    {PRESET_COLORS.map((color) => (
                                        <TouchableOpacity
                                            key={color.id}
                                            style={[
                                                styles.presetCard,
                                                { backgroundColor: color.hex }
                                            ]}
                                            onPress={() => handlePresetSelect(color.hex)}
                                        >
                                            <View style={styles.presetInnerBorder} />
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <View style={styles.modalBottomSpacer} />
                            </View>
                        </ScrollView>
                    </Animated.View>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    scrollContent: {
        paddingBottom: 180,
    },
    navbar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        marginBottom: 8,
    },
    navTitle: {
        fontSize: 28,
        fontFamily: 'Outfit-Bold',
        color: '#FFF',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(43, 238, 121, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(43, 238, 121, 0.2)',
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#2bee79',
        marginRight: 6,
    },
    statusText: {
        fontSize: 10,
        fontFamily: 'Outfit-Bold',
        color: '#2bee79',
        letterSpacing: 1,
    },
    activeShowcase: {
        height: 140,
        backgroundColor: '#0A0A0A',
        borderRadius: 32,
        marginBottom: 20,
        marginHorizontal: 20,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    glowContainer: {
        position: 'absolute',
        width: '120%',
        height: '140%',
        opacity: 0.3,
    },
    activeGlow: {
        flex: 1,
    },
    showcaseContent: {
        alignItems: 'center',
        zIndex: 10,
    },
    showcaseSubtitle: {
        color: 'rgba(255,255,255,0.4)',
        fontFamily: 'Outfit-Bold',
        fontSize: 10,
        letterSpacing: 2,
        marginBottom: 4,
    },
    showcaseTitle: {
        color: '#FFF',
        fontFamily: 'Outfit-Bold',
        fontSize: 24,
        marginBottom: 10,
    },
    showcaseIcon: {
        opacity: 0.9,
    },
    controlsCard: {
        backgroundColor: '#0A0A0A',
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        marginBottom: 30,
        marginHorizontal: 20,
    },
    controlItem: {
        width: '100%',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginVertical: 12,
    },
    categoriesContainer: {
        paddingHorizontal: 20,
        gap: 32,
    },
    categorySection: {
        gap: 16,
    },
    categoryHeader: {
        marginBottom: 4,
    },
    categoryTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        gap: 10,
    },
    categoryDecor: {
        width: 4,
        height: 18,
        borderRadius: 2,
    },
    categoryTitle: {
        color: '#FFF',
        fontFamily: 'Outfit-Bold',
        fontSize: 18,
    },
    categoryDesc: {
        color: 'rgba(255,255,255,0.3)',
        fontFamily: 'Outfit-Regular',
        fontSize: 12,
        marginLeft: 14,
    },
    gridRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 12,
    },
    animCardContainer: {
        width: (width - 40 - 12) / 2,
    },
    animCard: {
        height: 120,
        backgroundColor: '#111',
        borderRadius: 20,
        padding: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'space-between',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    cardPaletteBtn: {
        width: 26,
        height: 26,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.02)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    cardIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardInfo: {
        marginTop: 8,
    },
    cardName: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontFamily: 'Outfit-Bold',
        fontSize: 14,
        marginBottom: 2,
    },
    cardDescription: {
        color: 'rgba(255,255,255,0.3)',
        fontFamily: 'Outfit-Regular',
        fontSize: 10,
        lineHeight: 13,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#111',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        maxHeight: '85%',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    modalHeader: {
        alignItems: 'center',
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        position: 'relative',
    },
    modalHandle: {
        width: 36,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 2,
        marginBottom: 16,
    },
    modalTitleRow: {
        alignItems: 'center',
    },
    modalTitle: {
        color: '#FFF',
        fontFamily: 'Outfit-Bold',
        fontSize: 20,
    },
    modalSubtitle: {
        color: 'rgba(43, 238, 121, 0.6)',
        fontFamily: 'Outfit-Bold',
        fontSize: 10,
        letterSpacing: 2,
        marginTop: 2,
    },
    closeBtn: {
        position: 'absolute',
        right: 24,
        top: 28,
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 8,
        borderRadius: 12,
    },
    modalScrollContent: {
        paddingBottom: 40,
    },
    modalPadding: {
        paddingHorizontal: 24,
        paddingTop: 10,
    },
    pickerSection: {
        alignItems: 'center',
        marginBottom: 20,
    },
    pickerContainer: {
        width: '100%',
        alignItems: 'center',
    },
    sectionDivider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        marginTop: 10,
    },
    modalSectionTitle: {
        color: 'rgba(255,255,255,0.3)',
        fontFamily: 'Outfit-Bold',
        fontSize: 11,
        letterSpacing: 1.5,
        marginRight: 12,
    },
    sectionLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    presetGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
    },
    presetCard: {
        width: (width - 48 - 36) / 4,
        height: (width - 48 - 36) / 4,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    presetInnerBorder: {
        flex: 1,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 16,
        opacity: 0.5,
    },
    modalBottomSpacer: {
        height: 40,
    },
    topGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
    }
});
