import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Modal, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { throttle } from 'lodash';
import { LedService } from '../services/api';
import ColorPicker from '../components/ColorPicker';
import BrightnessSlider from '../components/BrightnessSlider';
import SpeedSlider from '../components/SpeedSlider';

const { width } = Dimensions.get('window');

const COLORS = [
    { id: 1, name: 'Kırmızı', hex: '#FF0000' },
    { id: 2, name: 'Yeşil', hex: '#00FF00' },
    { id: 3, name: 'Mavi', hex: '#0000FF' },
    { id: 4, name: 'Sarı', hex: '#FFFF00' },
    { id: 5, name: 'Mor', hex: '#8000FF' },
    { id: 6, name: 'Turuncu', hex: '#FF8000' },
    { id: 7, name: 'Pembe', hex: '#FF00FF' },
    { id: 8, name: 'Turkuaz', hex: '#00FFFF' },
    { id: 9, name: 'Beyaz', hex: '#FFFFFF', textDark: true },
    { id: 10, name: 'Kehribar', hex: '#FFBF00' },
    { id: 11, name: 'Limon', hex: '#80FF00' },
    { id: 12, name: 'Gök Mavisi', hex: '#0080FF' },
    { id: 13, name: 'Lavanta',   hex: '#9D4EDD' },
    { id: 14, name: 'Mercan',    hex: '#FF4040' },
    { id: 15, name: 'Zümrüt',    hex: '#00C170' },
];

const GRADIENTS = [
    { id: 'g1', name: 'Neon', colors: ['#FF00FF', '#7A00FF', '#0000FF'] },
    { id: 'g2', name: 'Miami', colors: ['#00FFF9', '#FF00FF', '#FF8000'] },
    { id: 'g3', name: 'Limon', colors: ['#ADFF2F', '#FFFF00', '#006400'] },
    { id: 'g4', name: 'Buz & Ateş', colors: ['#0000FF', '#FFFFFF', '#FF0000'] },
    { id: 'g5', name: 'Uzay', colors: ['#000080', '#4B0082', '#FF00FF'] },
    { id: 'g6', name: 'Altın', colors: ['#FFD700', '#FF8C00', '#8B4513'] },
];

// Kelvin → RGB approximation (hex ve rgb eşleşiyor)
const TEMP_PRESETS = [
    { id: 't1', label: 'Mum',       kelvin: '2200K', hex: '#FF9329', rgb: { r: 255, g: 147, b: 41  } },
    { id: 't2', label: 'Sıcak',     kelvin: '3000K', hex: '#FFB46B', rgb: { r: 255, g: 180, b: 107 } },
    { id: 't3', label: 'Doğal',     kelvin: '4500K', hex: '#FFD5AA', rgb: { r: 255, g: 213, b: 170 } },
    { id: 't4', label: 'Gün Işığı', kelvin: '5000K', hex: '#FFE4C4', rgb: { r: 255, g: 228, b: 196 } },
    { id: 't5', label: 'Soğuk',     kelvin: '6500K', hex: '#DCE9FF', rgb: { r: 220, g: 233, b: 255 } },
    { id: 't6', label: 'Buz',       kelvin: '8000K', hex: '#C0D8FF', rgb: { r: 192, g: 216, b: 255 } },
];


// --- Animated sub-components for selection spring effect ---
function ColorButton({ color, isActive, onPress }) {
    const scale = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        Animated.spring(scale, {
            toValue: isActive ? 1.13 : 1,
            useNativeDriver: true,
            speed: 20,
            bounciness: 8,
        }).start();
    }, [isActive]);
    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
            <Animated.View style={[styles.colorRingWrapper, isActive && { borderColor: color.hex }, { transform: [{ scale }] }]}>
                <View style={[styles.colorCircle, { backgroundColor: color.hex }]} />
            </Animated.View>
        </TouchableOpacity>
    );
}

function GradChip({ grad, isActive, onPress }) {
    const scale = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        Animated.spring(scale, {
            toValue: isActive ? 1.07 : 1,
            useNativeDriver: true,
            speed: 20,
            bounciness: 8,
        }).start();
    }, [isActive]);
    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
            <Animated.View style={[styles.gradChip, isActive && styles.gradChipActive, { transform: [{ scale }] }]}>
                <View style={styles.gradChipInner}>
                    <LinearGradient colors={grad.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradChipBg}>
                        <View style={styles.gradChipOverlay}>
                            <Text style={styles.gradChipName}>{grad.name}</Text>
                        </View>
                        {isActive && <View style={styles.gradChipActiveBar} />}
                    </LinearGradient>
                </View>
            </Animated.View>
        </TouchableOpacity>
    );
}
// -----------------------------------------------------------

export default function ColorsScreen() {
    const insets = useSafeAreaInsets();

    // Mode: 'color' | 'white'
    const [tab, setTab] = useState('color');

    const [brightness, setBrightness] = useState(255);
    const [activeColor, setActiveColor] = useState(COLORS[0]);
    const [activeGradient, setActiveGradient] = useState(null);
    const [isCustomColor, setIsCustomColor] = useState(false);
    const [gradientAnimation, setGradientAnimation] = useState(false);
    const [activeTemp, setActiveTemp] = useState(null);
    const [speed, setSpeed] = useState(128);

    // Custom gradient
    const [gradientModalVisible, setGradientModalVisible] = useState(false);
    const [customColors, setCustomColors] = useState(['#FF0000', '#00FF00', '#0000FF']);
    const [activeColorIndex, setActiveColorIndex] = useState(0);
    const [activeCustomGradient, setActiveCustomGradient] = useState(false);

    const fadeAnim = useRef(new Animated.Value(1)).current;

    const switchTab = (newTab) => {
        if (newTab === tab) return;
        Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
        setTab(newTab);
    };

    React.useEffect(() => {
        LedService.getStatus().then(data => {
            if (data) {
                setBrightness(data.brightness ?? 255);
                setSpeed(data.speed ?? 128);
                setGradientAnimation(data.gradient_animation ?? false);
            }
        });
    }, []);

    const throttledColor = useCallback(
        throttle((hex) => LedService.setColor(hex), 150),
        []
    );

    const throttledCustomGrad = useCallback(
        throttle((cols) => LedService.setCustomGradient(cols), 150),
        []
    );

    const handleColorSelect = (color) => {
        setIsCustomColor(false); setActiveGradient(null); setActiveTemp(null); setActiveCustomGradient(false);
        setActiveColor(color);
        LedService.setColor(color.hex);
    };

    const handleGradientSelect = (grad) => {
        setIsCustomColor(false); setActiveTemp(null); setActiveCustomGradient(false);
        setActiveColor({ id: grad.id, name: grad.name, hex: grad.colors[0] });
        setActiveGradient(grad.id);
        LedService.setGradient(grad.id);
    };

    const handleCustomColorChange = (hex) => {
        setIsCustomColor(true); setActiveGradient(null); setActiveTemp(null); setActiveCustomGradient(false);
        setActiveColor({ id: 'custom', name: 'Özel', hex });
        throttledColor(hex);
    };

    const handleTempSelect = (t) => {
        setActiveTemp(t.id); setActiveGradient(null); setIsCustomColor(false); setActiveCustomGradient(false);
        setActiveColor({ id: t.id, name: t.label, hex: t.hex });
        LedService.updateStatus({ mode: 'solid', color: t.rgb });
    };

    const applyCustomGradient = async () => {
        setActiveCustomGradient(true); setActiveGradient(null); setIsCustomColor(false);
        await LedService.setCustomGradient(customColors);
        setGradientModalVisible(false);
    };

    const updateCustomColor = (color) => {
        const next = [...customColors];
        next[activeColorIndex] = color;
        setCustomColors(next);
        throttledCustomGrad(next);
    };

    const toggleGradientAnim = () => {
        const v = !gradientAnimation;
        setGradientAnimation(v);
        LedService.setGradientAnimation(v);
    };

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Renkler</Text>
                    <View style={styles.statusBadge}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>BAĞLI</Text>
                    </View>
                </View>

                {/* Tab Switcher — en üstte */}
                <View style={styles.tabRow}>
                    <TouchableOpacity style={[styles.tab, tab === 'color' && styles.tabActive]} onPress={() => switchTab('color')}>
                        <MaterialIcons name="palette" size={16} color={tab === 'color' ? '#fff' : '#64748b'} />
                        <Text style={[styles.tabText, tab === 'color' && styles.tabTextActive]}>Renkli</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tab, tab === 'white' && styles.tabActive]} onPress={() => switchTab('white')}>
                        <MaterialIcons name="wb-incandescent" size={16} color={tab === 'white' ? '#fff' : '#64748b'} />
                        <Text style={[styles.tabText, tab === 'white' && styles.tabTextActive]}>Beyaz Işık</Text>
                    </TouchableOpacity>
                </View>

                {/* Brightness */}
                <View style={styles.section}>
                    <BrightnessSlider initialValue={brightness} onValueChange={(v) => { setBrightness(v); LedService.setBrightness(v); }} />
                </View>

                <Animated.View style={{ opacity: fadeAnim }}>
                    {tab === 'color' ? (
                        <>
                            {/* Color Picker */}
                            <View style={styles.section}>
                                <Text style={styles.label}>RENK TONU</Text>
                                <ColorPicker onColorChange={handleCustomColorChange} initialColor={activeColor.hex} />
                            </View>

                            {/* Quick Colors */}
                            <View style={styles.section}>
                                <Text style={styles.label}>HIZLI RENKLER</Text>
                                <View style={styles.colorGrid}>
                                    {COLORS.map(c => {
                                        const isActive = !isCustomColor && !activeGradient && activeColor.id === c.id;
                                        return (
                                            <ColorButton key={c.id} color={c} isActive={isActive} onPress={() => handleColorSelect(c)} />
                                        );
                                    })}
                                </View>
                            </View>

                            {/* Gradients */}
                            <View style={styles.section}>
                                <View style={styles.labelRow}>
                                    <Text style={styles.label}>RENK GEÇİŞLERİ</Text>
                                    <TouchableOpacity style={[styles.animToggle, gradientAnimation && styles.animToggleOn]} onPress={toggleGradientAnim}>
                                        <MaterialIcons name={gradientAnimation ? 'auto-awesome' : 'play-arrow'} size={14} color="#fff" />
                                        <Text style={styles.animToggleText}>{gradientAnimation ? 'Animasyon Açık' : 'Animasyon'}</Text>
                                    </TouchableOpacity>
                                </View>
                                {gradientAnimation && (
                                    <View style={{ marginBottom: 12 }}>
                                        <SpeedSlider initialValue={speed} onValueChange={(v) => { setSpeed(v); LedService.setSpeed(v); }} />
                                    </View>
                                )}
                                <View style={styles.gradScrollWrapper}>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={[styles.hRow, { paddingVertical: 8 }]}
                                        style={{ overflow: 'visible' }}
                                    >
                                        {GRADIENTS.map(g => {
                                            const isActive = activeGradient === g.id;
                                            return (
                                                <GradChip key={g.id} grad={g} isActive={isActive} onPress={() => handleGradientSelect(g)} />
                                            );
                                        })}
                                    </ScrollView>
                                    {/* Sağa doğru kayma ipucu */}
                                    <LinearGradient
                                        colors={['rgba(5,5,5,0)', '#050505']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.gradFadeRight}
                                        pointerEvents="none"
                                    />
                                </View>
                            </View>

                            {/* Custom Gradient Card */}
                            <TouchableOpacity style={styles.customCard} onPress={() => setGradientModalVisible(true)} activeOpacity={0.8}>
                                <LinearGradient colors={['#1a1b2e', '#0f0f0f']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.customCardBg}>
                                    <View style={styles.customCardContent}>
                                        <View style={styles.customCardLeft}>
                                            <View style={styles.customCardIcon}>
                                                <MaterialIcons name="auto-fix-high" size={20} color="#6366f1" />
                                            </View>
                                            <View>
                                                <Text style={styles.customCardTitle}>Kendi Renk Geçişini Oluştur</Text>
                                                <Text style={styles.customCardSub}>Özel 3 noktalı tasarım</Text>
                                            </View>
                                        </View>
                                        <MaterialIcons name="chevron-right" size={24} color="rgba(255,255,255,0.3)" />
                                    </View>
                                </LinearGradient>
                            </TouchableOpacity>
                        </>
                    ) : (
                        /* White Light / Temperature Mode */
                        <View style={styles.section}>
                            <Text style={styles.label}>RENK SICAKLIĞI</Text>
                            <View style={styles.tempGrid}>
                                {TEMP_PRESETS.map(t => (
                                    <TouchableOpacity key={t.id} style={[styles.tempCard, activeTemp === t.id && styles.tempCardActive]} onPress={() => handleTempSelect(t)}>
                                        <LinearGradient colors={[t.hex, '#111']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.tempCardBg}>
                                            <Text style={styles.tempLabel}>{t.label}</Text>
                                            <Text style={styles.tempKelvin}>{t.kelvin}</Text>
                                            {activeTemp === t.id && <View style={styles.tempActiveDot} />}
                                        </LinearGradient>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <Text style={styles.tempHint}>
                                Seçtiğin sıcaklık tonu, Sabit Renk modunda LED şeridine uygulanır.
                            </Text>
                        </View>
                    )}
                </Animated.View>

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Top fade */}
            <LinearGradient
                colors={['#050505', '#050505', 'rgba(5,5,5,0)']}
                locations={[0, 0.4, 1]}
                style={[styles.topFade, { height: insets.top + 20 }]}
                pointerEvents="none"
            />

            {/* Custom Gradient Modal */}
            <Modal visible={gradientModalVisible} transparent animationType="slide" onRequestClose={() => setGradientModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHandle} />
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Gradient Tasarımcısı</Text>
                                <Text style={styles.modalSub}>3 NOKTALI RENK SEÇİMİ</Text>
                            </View>
                            <TouchableOpacity style={styles.modalClose} onPress={() => setGradientModalVisible(false)}>
                                <MaterialIcons name="close" size={22} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>
                            <Text style={styles.label}>ÖNİZLEME</Text>
                            <LinearGradient colors={customColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.previewBar} />

                            <Text style={[styles.label, { marginTop: 24 }]}>RENK NOKTALARI</Text>
                            <View style={styles.pointRow}>
                                {customColors.map((c, i) => (
                                    <TouchableOpacity key={i} style={[styles.pointCard, activeColorIndex === i && styles.pointCardActive]} onPress={() => setActiveColorIndex(i)}>
                                        <View style={[styles.pointCircle, { backgroundColor: c }]} />
                                        <Text style={styles.pointLabel}>Nokta {i + 1}</Text>
                                        {activeColorIndex === i && <View style={styles.pointActiveBar} />}
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={[styles.label, { marginTop: 4 }]}>RENK SEÇİCİ</Text>
                            <ColorPicker initialColor={customColors[activeColorIndex]} onColorChange={updateCustomColor} />

                            <Text style={[styles.label, { marginTop: 24 }]}>HAZIR RENKLER</Text>
                            <View style={styles.presetGrid}>
                                {COLORS.map(c => (
                                    <TouchableOpacity key={c.id} style={[styles.presetCircle, { backgroundColor: c.hex }]} onPress={() => updateCustomColor(c.hex)} />
                                ))}
                            </View>

                            <TouchableOpacity style={styles.applyBtn} onPress={applyCustomGradient}>
                                <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.applyBtnBg}>
                                    <MaterialIcons name="done-all" size={20} color="#fff" />
                                    <Text style={styles.applyBtnText}>UYGULA VE KAYDET</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050505' },
    scroll: { paddingHorizontal: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    headerTitle: { fontSize: 26, fontFamily: 'Outfit-Bold', color: '#fff' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(43,238,121,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(43,238,121,0.2)' },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2bee79', marginRight: 6 },
    statusText: { fontSize: 10, fontFamily: 'Outfit-Bold', color: '#2bee79', letterSpacing: 1 },

    section: { marginBottom: 24 },
    label: { fontSize: 10, fontFamily: 'Outfit-Bold', color: '#64748b', letterSpacing: 1.5, marginBottom: 12 },
    labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },

    // Tabs
    tabRow: { flexDirection: 'row', backgroundColor: '#111', borderRadius: 16, padding: 4, marginBottom: 24, gap: 4 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 13, gap: 6 },
    tabActive: { backgroundColor: '#1e1e2e', borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)' },
    tabText: { fontSize: 13, fontFamily: 'Outfit-Bold', color: '#64748b' },
    tabTextActive: { color: '#fff' },

    // Horizontal rows
    hRow: { paddingRight: 8, gap: 10, alignItems: 'center' },
    gradScrollWrapper: { position: 'relative', overflow: 'visible' },
    gradFadeRight: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        right: -20,   // paddingHorizontal: 20 yi aşarak ekranın tam sağına taşır
        width: 72,
        zIndex: 10,
    },

    // Color grid - iOS-style ring selector
    colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    colorRingWrapper: {
        width: (width - 40 - 10 * 5) / 6 + 8,
        height: (width - 40 - 10 * 5) / 6 + 8,
        borderRadius: 100,
        borderWidth: 2.5,
        borderColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 3,
    },
    colorCircle: {
        width: '100%',
        height: '100%',
        borderRadius: 100,
    },
    colorCircleActive: {},

    // Gradient chips
    gradChip: { height: 72, width: 110, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    gradChipActive: { borderColor: 'rgba(255,255,255,0.45)' },
    gradChipInner: { flex: 1, borderRadius: 17, overflow: 'hidden' },
    gradChipBg: { flex: 1 },
    gradChipOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-end', padding: 10 },
    gradChipName: { color: '#fff', fontSize: 13, fontFamily: 'Outfit-Bold' },
    gradChipActiveBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 2,
    },

    // Anim toggle
    animToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    animToggleOn: { backgroundColor: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.3)' },
    animToggleText: { color: '#fff', fontSize: 11, fontFamily: 'Outfit-Bold' },

    // Custom gradient card
    customCard: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 8 },
    customCardBg: { flex: 1 },
    customCardContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 22, paddingHorizontal: 16 },
    customCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    customCardIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(99,102,241,0.1)', justifyContent: 'center', alignItems: 'center' },
    customCardTitle: { color: '#fff', fontSize: 15, fontFamily: 'Outfit-Bold' },
    customCardSub: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'Outfit-Regular', marginTop: 2 },

    // Temperature
    tempGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    tempCard: { width: (width - 40 - 20) / 3, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', height: 130 },
    tempCardActive: { borderColor: '#fff', borderWidth: 2 },
    tempCardBg: { flex: 1, padding: 12, justifyContent: 'flex-end' },
    tempLabel: { color: '#fff', fontSize: 13, fontFamily: 'Outfit-Bold' },
    tempKelvin: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontFamily: 'Outfit-Regular', marginTop: 2 },
    tempActiveDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
    tempHint: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontFamily: 'Outfit-Regular', marginTop: 16, lineHeight: 16 },

    // Top fade
    topFade: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: '#0f0f0f', borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '92%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    modalHandle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, alignSelf: 'center', marginTop: 12 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 20 },
    modalTitle: { color: '#fff', fontSize: 22, fontFamily: 'Outfit-Bold' },
    modalSub: { color: '#6366f1', fontSize: 10, fontFamily: 'Outfit-Bold', letterSpacing: 2, marginTop: 2 },
    modalClose: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    modalBody: { paddingHorizontal: 24, paddingBottom: 40 },

    previewBar: { width: '100%', height: 44, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },

    pointRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    pointCard: { flex: 1, backgroundColor: '#1a1a1a', borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
    pointCardActive: { borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.08)' },
    pointCircle: { width: 30, height: 30, borderRadius: 15, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    pointLabel: { color: '#fff', fontSize: 11, fontFamily: 'Outfit-Bold' },
    pointActiveBar: { position: 'absolute', bottom: 0, width: 20, height: 3, backgroundColor: '#6366f1', borderTopLeftRadius: 3, borderTopRightRadius: 3 },

    presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
    presetCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },

    applyBtn: { height: 54, borderRadius: 16, overflow: 'hidden' },
    applyBtnBg: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    applyBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Outfit-Bold', letterSpacing: 1 },
});
