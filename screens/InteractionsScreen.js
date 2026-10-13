import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Modal, Animated, PanResponder } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Accelerometer } from 'expo-sensors';
import { LedService } from '../services/api';

const { width, height } = Dimensions.get('window');

const INTERACTIONS = [
    {
        id: 'tilt',
        name: 'Eğim Sensörü',
        description: 'Yerçekimi ve akış kontrolü',
        icon: 'screen-rotation',
        iconType: 'MaterialIcons',
        colors: ['#6366F1', '#4F46E5'],
        tag: 'AKILLI'
    },
    {
        id: 'canvas',
        name: 'Canlı Çizim',
        description: 'Parmakla anlık boyama',
        icon: 'brush',
        iconType: 'MaterialIcons',
        colors: ['#EC4899', '#D946EF'],
        tag: 'YENİ'
    },
    {
        id: 'soundboard',
        name: 'DJ Soundboard',
        description: 'Görsel efekt tetikleyici',
        icon: 'music-note',
        iconType: 'MaterialIcons',
        colors: ['#F59E0B', '#D97706'],
        tag: 'EĞLENCE'
    },
    {
        id: 'shake',
        name: 'Salla Değiştir',
        description: 'Rastgele mod seçimi',
        icon: 'vibration',
        iconType: 'MaterialIcons',
        colors: ['#10B981', '#059669'],
        tag: 'PRATİK'
    },
    {
        id: 'music',
        name: 'Müzik Ritmi',
        description: 'Sese duyarlı efektler',
        icon: 'equalizer',
        iconType: 'MaterialIcons',
        colors: ['#3B82F6', '#2563EB'],
        tag: 'DİNAMİK'
    },
    {
        id: 'f1',
        name: 'F1 Telemetri',
        description: 'Yarış heyecanını ışıklarda yaşayın',
        icon: 'flag-checkered',
        iconType: 'FontAwesome5',
        colors: ['#E10600', '#1F1F1F'],
        tag: 'CANLI'
    },
    {
        id: 'ambilight',
        name: 'Ambilight',
        description: 'Ekran renkleriyle senkronizasyon',
        icon: 'personal-video',
        iconType: 'MaterialIcons',
        colors: ['#00B4DB', '#0083B0'],
        tag: 'SİNEMATİK'
    },
    {
        id: 'ping_pong',
        name: 'LED Ping Pong',
        description: 'Reflekslerini test et',
        icon: 'table-tennis',
        iconType: 'FontAwesome5',
        colors: ['#FF8C00', '#FF4500'],
        tag: 'OYUN'
    }
];

const SHAKE_POOL = [
    // Animations
    { type: 'animation', id: 'rainbow', name: 'Gökkuşağı' },
    { type: 'animation', id: 'breathing', name: 'Nefes Alma' },
    { type: 'animation', id: 'blink', name: 'Yanıp Sönme' },
    { type: 'animation', id: 'meteor', name: 'Yıldız Kayması' },
    { type: 'animation', id: 'fire', name: 'Yangın' },
    { type: 'animation', id: 'wave', name: 'Sinüs Dalgası' },
    { type: 'animation', id: 'converge', name: 'Kavuşma' },
    // Colors
    { type: 'color', hex: '#FF0000', name: 'Kırmızı' },
    { type: 'color', hex: '#00FF00', name: 'Yeşil' },
    { type: 'color', hex: '#0000FF', name: 'Mavi' },
    { type: 'color', hex: '#FFFF00', name: 'Sarı' },
    { type: 'color', hex: '#FF00FF', name: 'Pembe' },
    // Gradients
    { type: 'gradient', id: 'g1', name: 'Neon', colors: ['#FF00FF', '#7A00FF', '#0000FF'] },
    { type: 'gradient', id: 'g2', name: 'Miami', colors: ['#00FFF9', '#FF00FF', '#FF8000'] },
    { type: 'gradient', id: 'g3', name: 'Limon', colors: ['#ADFF2F', '#FFFF00', '#006400'] },
    { type: 'gradient', id: 'g4', name: 'Buz ve Ateş', colors: ['#0000FF', '#FFFFFF', '#FF0000'] },
    { type: 'gradient', id: 'g5', name: 'Uzay', colors: ['#000080', '#4B0082', '#FF00FF'] },
    { type: 'gradient', id: 'g6', name: 'Altın', colors: ['#FFD700', '#FF8C00', '#8B4513'] },
];

// Memoized LED Pixel Component for high performance
const LedPixel = memo(({ index, color, onPress }) => {
    return (
        <TouchableOpacity
            activeOpacity={0.7}
            style={[
                styles.ledPixel,
                { backgroundColor: color, shadowColor: color }
            ]}
            onPress={() => onPress(index)}
        >
            <Text style={styles.pixelNumber}>{index + 1}</Text>
        </TouchableOpacity>
    );
});

export default function InteractionsScreen() {
    const [selectedId, setSelectedId] = useState(null);
    const [isModalVisible, setModalVisible] = useState(false);
    const [canvasLeds, setCanvasLeds] = useState(Array(58).fill('#333333'));
    const [brushColor, setBrushColor] = useState('#FF0000');
    const [isPainting, setIsPainting] = useState(false);

    // Refs for real-time painting without state overhead during move
    const canvasRef = useRef(Array(58).fill('#333333'));

    // Sensor States
    const [data, setData] = useState({ x: 0, y: 0, z: 0 });
    const [subscription, setSubscription] = useState(null);
    const [shakeData, setShakeData] = useState({ x: 0, y: 0, z: 0 });
    const [activeEffect, setActiveEffect] = useState(null);
    const lastUpdate = useRef(0);
    const lastShakeTime = useRef(0);
    const [lastShieldPress, setLastShieldPress] = useState(0);
    const [lastSlowMoPress, setLastSlowMoPress] = useState(0);
    const [pongScore, setPongScore] = useState(0);
    const [p1Score, setP1Score] = useState(0);
    const [p2Score, setP2Score] = useState(0);
    const [pingPongSubMode, setPingPongSubMode] = useState('selection'); // 'selection', 'single', 'multi'
    const [multiRole, setMultiRole] = useState(null); // 'host', 'joiner'
    const [multiSubMode, setMultiSubMode] = useState('setup_choice'); // 'setup_choice', 'joining'
    const [roomId, setRoomId] = useState('');
    const [inputRoomId, setInputRoomId] = useState('');
    const [multiStatus, setMultiStatus] = useState('waiting');
    const [, setTick] = useState(0);
    const scoreAnim = useRef(new Animated.Value(1)).current;
    const ballPos = useRef(new Animated.Value(0)).current;
    const shakeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (pongScore > 0) {
            Animated.sequence([
                Animated.spring(scoreAnim, {
                    toValue: 1.3,
                    friction: 3,
                    tension: 40,
                    useNativeDriver: true
                }),
                Animated.spring(scoreAnim, {
                    toValue: 1,
                    friction: 3,
                    tension: 40,
                    useNativeDriver: true
                })
            ]).start();
        }
    }, [pongScore]);

    const insets = useSafeAreaInsets();
    const now = Date.now();
    const isShieldOnCooldown = lastShieldPress > 0 && now - lastShieldPress < 10000;
    const isSlowMoOnCooldown = lastSlowMoPress > 0 && now - lastSlowMoPress < 10000;

    useEffect(() => {
        let interval;
        if (isShieldOnCooldown || isSlowMoOnCooldown) {
            interval = setInterval(() => setTick(t => t + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [isShieldOnCooldown, isSlowMoOnCooldown, lastShieldPress, lastSlowMoPress]);

    useEffect(() => {
        let interval;
        if (isModalVisible && selectedId === 'ping_pong') {
            interval = setInterval(async () => {
                const status = await LedService.getStatus();
                if (status) {
                    if (status.ping_pong_score !== undefined) setPongScore(status.ping_pong_score);
                    if (status.p1_score !== undefined) setP1Score(status.p1_score);
                    if (status.p2_score !== undefined) setP2Score(status.p2_score);
                    if (status.multi_status !== undefined) setMultiStatus(status.multi_status);
                    
                    // Eğer karşı taraf katıldıysa ve host bekliyorsa durumu güncelle
                    if (multiRole === 'host' && status.multi_status === 'ready' && multiStatus === 'waiting') {
                        setMultiStatus('ready');
                    }
                }
            }, 1000);
        } else {
            setPongScore(0);
            setP1Score(0);
            setP2Score(0);
            setPingPongSubMode('selection');
            setMultiSubMode('setup_choice');
            setMultiRole(null);
            setMultiStatus('waiting');
        }
        return () => clearInterval(interval);
    }, [isModalVisible, selectedId, multiRole, multiStatus]);

    const _subscribe = () => {
        setSubscription(
            Accelerometer.addListener(accelerometerData => {
                const { x, y, z } = accelerometerData;

                if (selectedId === 'tilt') {
                    const correctedData = { x: -x, y, z };
                    setData(correctedData);
                    Animated.spring(ballPos, {
                        toValue: correctedData.x * (width / 2 - 60),
                        useNativeDriver: true,
                        friction: 7,
                        tension: 40
                    }).start();

                    const now = Date.now();
                    if (now - lastUpdate.current > 150) {
                        lastUpdate.current = now;
                        LedService.updateStatus({
                            mode: 'gyro',
                            tilt_x: parseFloat(correctedData.x.toFixed(2)),
                            tilt_y: parseFloat(correctedData.y.toFixed(2))
                        });
                    }
                } else if (selectedId === 'shake') {
                    // Shake detection logic
                    const totalForce = Math.abs(x) + Math.abs(y) + Math.abs(z);
                    if (totalForce > 2.5) { // Threshold for shake
                        const now = Date.now();
                        if (now - lastShakeTime.current > 1000) { // Throttle shakes
                            lastShakeTime.current = now;
                            handleShakeChange();
                        }
                    }
                }
            })
        );
        Accelerometer.setUpdateInterval(100);
    };

    const handleShakeChange = () => {
        // Shake visual animation
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();

        // Pick random effect
        const randomEffect = SHAKE_POOL[Math.floor(Math.random() * SHAKE_POOL.length)];
        setActiveEffect(randomEffect);

        // Apply to Firebase
        if (randomEffect.type === 'animation') {
            LedService.setAnimation(randomEffect.id);
        } else if (randomEffect.type === 'color') {
            LedService.setColor(randomEffect.hex);
        } else if (randomEffect.type === 'gradient') {
            LedService.setGradient(randomEffect.id);
        }
    };

    const _unsubscribe = () => {
        subscription && subscription.remove();
        setSubscription(null);
    };

    useEffect(() => {
        if (isModalVisible && (selectedId === 'tilt' || selectedId === 'shake')) {
            _subscribe();
        } else {
            _unsubscribe();
        }
        return () => _unsubscribe();
    }, [isModalVisible, selectedId]);

    const handlePress = (id) => {
        setSelectedId(id);
        setModalVisible(true);
        if (id === 'soundboard') {
            LedService.updateStatus({ mode: 'dj' });
        } else if (id === 'canvas') {
            LedService.setCanvasMode(canvasLeds);
        } else if (id === 'f1') {
            LedService.updateStatus({ mode: 'f1' });
        } else if (id === 'ambilight') {
            LedService.updateStatus({ mode: 'ambilight' });
        } else if (id === 'music') {
            LedService.updateStatus({ mode: 'music' });
        } else if (id === 'ping_pong') {
            LedService.updateStatus({ mode: 'ping_pong' });
        }
    };

    const handleDJAction = async (triggerId) => {
        // Firebase'e mode: dj ve tetiklenen butonun ID'sini gönderiyoruz
        // timestamp ekleyerek ESP32'nin her basışı yeni bir olay olarak algılamasını sağlıyoruz
        await LedService.updateStatus({
            mode: 'dj',
            dj_trigger: triggerId,
            dj_timestamp: Date.now()
        });
    };

    const paintPixel = useCallback((index) => {
        if (canvasRef.current[index] !== brushColor) {
            const newLeds = [...canvasRef.current];
            newLeds[index] = brushColor;
            canvasRef.current = newLeds;
            setCanvasLeds(newLeds);

            // Firebase update
            LedService.updateCanvasPixel(index, brushColor);
        }
    }, [brushColor]); // Re-create only when brush color changes

    const closeModal = () => {
        setModalVisible(false);
        setSelectedId(null);
        setPingPongSubMode('selection');
        setMultiSubMode('setup_choice');
        setMultiRole(null);
        // Modu normale döndürebiliriz (isteğe bağlı)
        // LedService.updateStatus({ mode: 'animation' });
    };

    const handleCreateRoom = () => {
        const id = Math.floor(10000 + Math.random() * 90000).toString();
        setRoomId(id);
        setMultiRole('host');
        LedService.createRoom(id);
    };

    const handleJoinRoom = () => {
        if (inputRoomId.length === 5) {
            setMultiRole('joiner');
            LedService.joinRoom(inputRoomId);
        }
    };

    const renderIcon = (item) => {
        if (item.iconType === 'MaterialIcons') {
            return <MaterialIcons name={item.icon} size={28} color="#FFF" />;
        } else if (item.iconType === 'FontAwesome5') {
            return <FontAwesome5 name={item.icon} size={24} color="#FFF" />;
        }
        return <Ionicons name={item.icon} size={28} color="#FFF" />;
    };

    const activeItem = INTERACTIONS.find(i => i.id === selectedId);

    const DJ_PADS = [
        { id: 'explosion', name: 'Patlama', icon: 'flare', color: ['#FF416C', '#FF4B2B'] },
        { id: 'strobe', name: 'Flaş', icon: 'wb-sunny', color: ['#00B4DB', '#0083B0'] },
        { id: 'wave_push', name: 'Dalga', icon: 'waves', color: ['#8E2DE2', '#4A00E2'] },
        { id: 'sparkle', name: 'Kıvılcım', icon: 'auto-fix-high', color: ['#f9d423', '#ff4e50'] },
    ];

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#000', '#050505', '#000']}
                style={StyleSheet.absoluteFill}
            />

            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>Etkileşimler</Text>
                        <Text style={styles.headerSubtitle}>LED'lerle yeni yollarla bağ kurun</Text>
                    </View>
                    <TouchableOpacity style={styles.infoButton}>
                        <Ionicons name="information-circle-outline" size={24} color="rgba(255,255,255,0.5)" />
                    </TouchableOpacity>
                </View>

                {INTERACTIONS.map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        style={styles.cardContainer}
                        activeOpacity={0.8}
                        onPress={() => handlePress(item.id)}
                    >
                        <LinearGradient
                            colors={item.colors}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.cardGradient}
                        >
                            <View style={styles.cardContent}>
                                <View style={styles.cardLeft}>
                                    <View style={styles.iconContainer}>
                                        {renderIcon(item)}
                                    </View>
                                    <View style={styles.textContainer}>
                                        <View style={styles.tagContainer}>
                                            <Text style={styles.tagText}>{item.tag}</Text>
                                        </View>
                                        <Text style={styles.cardName}>{item.name}</Text>
                                        <Text style={styles.cardDesc}>{item.description}</Text>
                                    </View>
                                </View>
                                <View style={styles.cardRight}>
                                    <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.5)" />
                                </View>
                            </View>

                            {/* Decorative background circle */}
                            <View style={styles.decorativeCircle} />
                        </LinearGradient>
                    </TouchableOpacity>
                ))}

                {/* Alt kısımdaki boşluğu tab bar yüksekliğine göre ayarladık */}
                <View style={styles.footerSpacing} />
            </ScrollView>

            {/* Top Fade Gradient */}
            <LinearGradient
                colors={['#000000', '#000000', 'rgba(0, 0, 0, 0)']}
                locations={[0, 0.4, 1]}
                style={[styles.topGradient, { height: insets.top + 25 }]}
                pointerEvents="none"
            />

            {/* Premium Interaction Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={isModalVisible}
                onRequestClose={closeModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHandle} />

                        <View style={styles.modalHeader}>
                            <View style={styles.modalHeaderLeft}>
                                <LinearGradient
                                    colors={activeItem?.colors || ['#FFF', '#000']}
                                    style={styles.modalIconBg}
                                >
                                    {activeItem && renderIcon(activeItem)}
                                </LinearGradient>
                                <View>
                                    <Text style={styles.modalTitle}>{activeItem?.name}</Text>
                                    <Text style={styles.modalSubtitle}>{activeItem?.tag} MODU AKTİF</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                                <Ionicons name="close" size={24} color="#FFF" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            {selectedId === 'tilt' ? (
                                <View style={styles.sensorContainer}>
                                    <View style={styles.visualizerContainer}>
                                        <View style={styles.visualizerBackdrop}>
                                            <Animated.View style={[
                                                styles.gravityBall,
                                                { transform: [{ translateX: ballPos }] }
                                            ]}>
                                                <LinearGradient
                                                    colors={['#FFF', 'rgba(255,255,255,0.5)']}
                                                    style={styles.ballInner}
                                                />
                                            </Animated.View>
                                            <View style={styles.centerLine} />
                                        </View>
                                        <Text style={styles.visualizerHint}>Işıkları akıtmak için telefonu sağa/sola yatırın</Text>
                                    </View>

                                    <View style={styles.dataGrid}>
                                        <View style={styles.dataBox}>
                                            <Text style={styles.dataLabel}>X Ekseni</Text>
                                            <Text style={styles.dataValue}>{data.x.toFixed(2)}</Text>
                                        </View>
                                        <View style={styles.dataBox}>
                                            <Text style={styles.dataLabel}>Y Ekseni</Text>
                                            <Text style={styles.dataValue}>{data.y.toFixed(2)}</Text>
                                        </View>
                                        <View style={styles.dataBox}>
                                            <Text style={styles.dataLabel}>Z Ekseni</Text>
                                            <Text style={styles.dataValue}>{data.z.toFixed(2)}</Text>
                                        </View>
                                    </View>
                                </View>
                            ) : selectedId === 'soundboard' ? (
                                <View style={styles.djContainer}>
                                    <Text style={styles.djHint}>Efekt fırlatmak için pedlere basın</Text>
                                    <View style={styles.djGrid}>
                                        {DJ_PADS.map((pad) => (
                                            <TouchableOpacity
                                                key={pad.id}
                                                style={styles.djPadWrapper}
                                                onPressIn={() => handleDJAction(pad.id)}
                                                activeOpacity={0.6}
                                            >
                                                <View style={styles.djPadShadow} />
                                                <LinearGradient
                                                    colors={pad.color}
                                                    style={styles.djPadContent}
                                                >
                                                    <MaterialIcons name={pad.icon} size={32} color="#FFF" />
                                                    <Text style={styles.djPadName}>{pad.name}</Text>
                                                </LinearGradient>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            ) : selectedId === 'shake' ? (
                                <View style={styles.shakeContainer}>
                                    <Animated.View style={[
                                        styles.shakeIconWrapper,
                                        { transform: [{ translateX: shakeAnim }] }
                                    ]}>
                                        <LinearGradient
                                            colors={['#10B981', '#059669']}
                                            style={styles.shakeCircle}
                                        >
                                            <MaterialIcons name="vibration" size={60} color="#FFF" />
                                        </LinearGradient>
                                    </Animated.View>

                                    <Text style={styles.shakeMainHint}>
                                        LED modunu değiştirmek için telefonu sallayın
                                    </Text>

                                    {activeEffect && (
                                        <View style={styles.revealedEffect}>
                                            <Text style={styles.effectTag}>
                                                {activeEffect.type === 'animation' ? 'ANİMASYON' :
                                                    activeEffect.type === 'color' ? 'SABİT RENK' : 'RENK GEÇİŞİ'}
                                            </Text>
                                            <Text style={styles.effectName}>{activeEffect.name}</Text>
                                            <View style={styles.effectIndicator}>
                                                {activeEffect.type === 'color' ? (
                                                    <View style={[styles.effectDot, { backgroundColor: activeEffect.hex }]} />
                                                ) : activeEffect.type === 'gradient' ? (
                                                    <LinearGradient
                                                        colors={activeEffect.colors}
                                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                                        style={styles.effectGradientLine}
                                                    />
                                                ) : (
                                                    <MaterialIcons name="auto-awesome" size={24} color="#FFF" />
                                                )}
                                            </View>
                                        </View>
                                    )}
                                </View>
                            ) : selectedId === 'f1' ? (
                                <View style={styles.f1Container}>
                                    <View style={styles.f1HeaderCard}>
                                        <View style={styles.f1Badge}>
                                            <View style={styles.f1LiveDot} />
                                            <Text style={styles.f1BadgeText}>CANLI TELEMETRİ</Text>
                                        </View>
                                        <Text style={styles.f1Title}>Formula 1 Engine</Text>
                                    </View>

                                    <View style={styles.f1StatsGrid}>
                                        <View style={styles.f1StatBox}>
                                            <Text style={styles.f1StatLabel}>RPM</Text>
                                            <Text style={styles.f1StatValue}>0</Text>
                                            <View style={styles.f1RpmBar}>
                                                <View style={[styles.f1RpmFill, { width: '0%' }]} />
                                            </View>
                                        </View>
                                        <View style={styles.f1StatBox}>
                                            <Text style={styles.f1StatLabel}>VİTES</Text>
                                            <Text style={styles.f1StatValue}>N</Text>
                                            <Text style={styles.f1SubValue}>0 KM/H</Text>
                                        </View>
                                    </View>

                                    <View style={styles.pcInstructionCard}>
                                        <View style={styles.pcIconFrame}>
                                            <MaterialIcons name="terminal" size={24} color="#E10600" />
                                        </View>
                                        <View style={styles.pcInstructionTextContent}>
                                            <Text style={styles.pcInstructionTitle}>TELEMETRİ SERVİSİ</Text>
                                            <Text style={styles.pcInstructionText}>Bilgisayarınızdan telemetri scriptini başlatın.</Text>
                                        </View>
                                    </View>

                                    <View style={styles.f1InfoCard}>
                                        <MaterialIcons name="info-outline" size={20} color="#E10600" />
                                        <Text style={styles.f1InfoText}>
                                            F1 24, Assetto Corsa veya iRacing gibi oyunlardan gelen veriler anlık olarak LED panelinize yansıtılır.
                                        </Text>
                                    </View>

                                    <TouchableOpacity
                                        style={styles.f1TestButton}
                                        onPress={() => LedService.updateStatus({ f1_test: Date.now() })}
                                    >
                                        <Text style={styles.f1TestText}>SİNYALİ TEST ET</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : selectedId === 'canvas' ? (
                                <View style={styles.canvasContainer}>
                                    <ScrollView
                                        showsVerticalScrollIndicator={false}
                                        contentContainerStyle={styles.canvasScroll}
                                    >
                                        <Text style={styles.djHint}>Renk seçin ve boyamak istediğiniz LED'lere dokunun</Text>

                                        <View style={styles.palette}>
                                            {['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#8B00FF', '#FFFFFF', '#1A1A1A'].map(color => (
                                                <TouchableOpacity
                                                    key={color}
                                                    style={[
                                                        styles.paletteColor,
                                                        { backgroundColor: color === '#1A1A1A' ? '#000' : color },
                                                        brushColor === color && styles.activeBrush
                                                    ]}
                                                    onPress={() => setBrushColor(color)}
                                                />
                                            ))}
                                        </View>

                                        <View style={styles.ledGrid}>
                                            {canvasLeds.map((color, i) => (
                                                <LedPixel
                                                    key={i}
                                                    index={i}
                                                    color={color}
                                                    onPress={paintPixel}
                                                />
                                            ))}
                                        </View>

                                        <TouchableOpacity
                                            style={styles.clearButton}
                                            onPress={() => {
                                                const cleared = Array(58).fill('#333333');
                                                setCanvasLeds(cleared);
                                                canvasRef.current = cleared;
                                                LedService.setCanvasMode(cleared);
                                            }}
                                        >
                                            <MaterialIcons name="delete-sweep" size={20} color="#FF4B2B" />
                                            <Text style={styles.clearText}>Tümünü Temizle</Text>
                                        </TouchableOpacity>
                                    </ScrollView>
                                </View>
                            ) : selectedId === 'ambilight' ? (
                                <View style={styles.ambilightContainer}>
                                    <View style={styles.ambilightCard}>
                                        <LinearGradient
                                            colors={['#00B4DB', '#0083B0']}
                                            style={styles.ambilightIconBox}
                                        >
                                            <MaterialIcons name="personal-video" size={40} color="#FFF" />
                                        </LinearGradient>
                                        <Text style={styles.ambilightTitle}>Ambilight Sistemi</Text>
                                        <Text style={styles.ambilightDesc}>
                                            Bilgisayarınızdaki veya televizyonunuzdaki renkler
                                            gerçek zamanlı olarak LED'lerinize yansıtılır.
                                        </Text>
                                    </View>

                                    <View style={styles.ambilightStatusBox}>
                                        <View style={styles.statusInner}>
                                            <View style={styles.statusDot} />
                                            <Text style={styles.statusText}>BAĞLANTI HAZIR</Text>
                                        </View>
                                        <Text style={styles.ambilightHint}>
                                            Ambilight uygulamasının açık olduğundan emin olun.
                                        </Text>
                                    </View>

                                    <View style={styles.f1InfoCard}>
                                        <MaterialIcons name="settings-input-component" size={20} color="#00B4DB" />
                                        <Text style={styles.f1InfoText}>
                                            Bu mod aktifken renk ve animasyon ayarları Ambilight yazılımı tarafından kontrol edilir.
                                        </Text>
                                    </View>
                                </View>
                            ) : selectedId === 'music' ? (
                                <View style={styles.musicContainer}>
                                    <View style={styles.musicCard}>
                                        <LinearGradient
                                            colors={['#3B82F6', '#2563EB']}
                                            style={styles.musicIconBox}
                                        >
                                            <MaterialIcons name="equalizer" size={40} color="#FFF" />
                                        </LinearGradient>
                                        <Text style={styles.musicTitle}>Müzik Ritmi</Text>
                                        <Text style={styles.musicDesc}>
                                            LED'ler ortamdaki sesin ritmine ve şiddetine göre
                                            gerçek zamanlı olarak tepki verir.
                                        </Text>
                                    </View>

                                    <View style={styles.pcInstructionCard}>
                                        <View style={styles.pcIconFrame}>
                                            <MaterialIcons name="computer" size={24} color="#3B82F6" />
                                        </View>
                                        <View style={styles.pcInstructionTextContent}>
                                            <Text style={styles.pcInstructionTitle}>BİLGİSAYAR BAĞLANTISI</Text>
                                            <Text style={styles.pcInstructionText}>Lütfen bilgisayarınızdan gerekli dosyayı çalıştırın.</Text>
                                        </View>
                                    </View>
                                </View>
                            ) : selectedId === 'ping_pong' ? (
                                <ScrollView 
                                    style={styles.pongContainer} 
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={{ paddingBottom: 40 }}
                                >
                                    {pingPongSubMode === 'selection' ? (
                                        <View style={styles.pongSelectionGrid}>
                                            <TouchableOpacity 
                                                style={styles.pongModeCard}
                                                onPress={() => {
                                                    setPingPongSubMode('single');
                                                    LedService.updateStatus({ ping_pong_mode: 'single', mode: 'ping_pong' });
                                                }}
                                            >
                                                <LinearGradient colors={['#FF8C00', '#FF4500']} style={styles.pongModeIcon}>
                                                    <MaterialIcons name="person" size={32} color="#FFF" />
                                                </LinearGradient>
                                                <Text style={styles.pongModeTitle}>Tek Oyuncu</Text>
                                                <Text style={styles.pongModeDesc}>Klasik refleks testi</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity 
                                                style={styles.pongModeCard}
                                                onPress={() => setPingPongSubMode('multi')}
                                            >
                                                <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={styles.pongModeIcon}>
                                                    <MaterialIcons name="people" size={32} color="#FFF" />
                                                </LinearGradient>
                                                <Text style={styles.pongModeTitle}>Çok Oyunculu</Text>
                                                <Text style={styles.pongModeDesc}>Arkadaşınla kapış</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ) : pingPongSubMode === 'multi' && !multiRole ? (
                                        <View style={styles.multiSetupContainer}>
                                            {multiSubMode === 'setup_choice' ? (
                                                <View style={styles.setupChoiceGrid}>
                                                    <TouchableOpacity 
                                                        style={styles.setupChoiceCard}
                                                        onPress={handleCreateRoom}
                                                    >
                                                        <LinearGradient colors={['#10B981', '#059669']} style={styles.setupChoiceIcon}>
                                                            <MaterialIcons name="add-business" size={32} color="#FFF" />
                                                        </LinearGradient>
                                                        <Text style={styles.setupChoiceTitle}>Oyun Kur</Text>
                                                        <Text style={styles.setupChoiceDesc}>Yeni bir oda oluştur ve arkadaşını davet et</Text>
                                                    </TouchableOpacity>

                                                    <TouchableOpacity 
                                                        style={styles.setupChoiceCard}
                                                        onPress={() => setMultiSubMode('joining')}
                                                    >
                                                        <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.setupChoiceIcon}>
                                                            <MaterialIcons name="login" size={32} color="#FFF" />
                                                        </LinearGradient>
                                                        <Text style={styles.setupChoiceTitle}>Oyuna Katıl</Text>
                                                        <Text style={styles.setupChoiceDesc}>Var olan bir odaya ID ile bağlan</Text>
                                                    </TouchableOpacity>

                                                    <TouchableOpacity 
                                                        style={styles.backToSelection} 
                                                        onPress={() => setPingPongSubMode('selection')}
                                                    >
                                                        <Text style={styles.backText}>Geri Dön</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            ) : (
                                                <View style={styles.joinSection}>
                                                    <Text style={styles.joinTitle}>ODA ID GİRİN</Text>
                                                    <View style={styles.roomIdInputContainer}>
                                                        <View style={styles.inputWrapper}>
                                                            <MaterialIcons name="vpn-key" size={20} color="rgba(255,255,255,0.3)" />
                                                            <Text style={{color: '#FFF', marginLeft: 10, fontSize: 18, letterSpacing: 4}}>
                                                                {inputRoomId || '_____'}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    <View style={styles.numpad}>
                                                        {[1,2,3,4,5,6,7,8,9,0].map(num => (
                                                            <TouchableOpacity 
                                                                key={num} 
                                                                style={styles.numKey}
                                                                onPress={() => {
                                                                    if (inputRoomId.length < 5) setInputRoomId(prev => prev + num);
                                                                }}
                                                            >
                                                                <Text style={styles.numKeyText}>{num}</Text>
                                                            </TouchableOpacity>
                                                        ))}
                                                        <TouchableOpacity 
                                                            style={[styles.numKey, {backgroundColor: 'rgba(255,0,0,0.1)'}]}
                                                            onPress={() => setInputRoomId('')}
                                                        >
                                                            <MaterialIcons name="backspace" size={20} color="#FF4B2B" />
                                                        </TouchableOpacity>
                                                    </View>
                                                    <TouchableOpacity 
                                                        style={[styles.joinSubmit, inputRoomId.length !== 5 && {opacity: 0.5}]}
                                                        onPress={handleJoinRoom}
                                                        disabled={inputRoomId.length !== 5}
                                                    >
                                                        <Text style={styles.joinSubmitText}>KATIL</Text>
                                                    </TouchableOpacity>

                                                    <TouchableOpacity 
                                                        style={styles.backToChoice} 
                                                        onPress={() => setMultiSubMode('setup_choice')}
                                                    >
                                                        <Text style={styles.backText}>Vazgeç</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            )}
                                        </View>
                                    ) : pingPongSubMode === 'multi' && multiRole ? (
                                        <View style={styles.multiGameContainer}>
                                            <View style={styles.roomBadge}>
                                                <Text style={styles.roomBadgeLabel}>ODA ID: </Text>
                                                <Text style={styles.roomBadgeValue}>{multiRole === 'host' ? roomId : inputRoomId}</Text>
                                            </View>

                                            <View style={styles.multiScoreGrid}>
                                                <View style={styles.multiScoreBox}>
                                                    <Text style={styles.multiScoreLabel}>OYUNCU 1 (SOL)</Text>
                                                    <Text style={styles.multiScoreValue}>{p1Score}</Text>
                                                    {multiRole === 'host' && <View style={styles.youIndicator}><Text style={styles.youText}>SEN</Text></View>}
                                                </View>
                                                <View style={styles.multiScoreDivider} />
                                                <View style={styles.multiScoreBox}>
                                                    <Text style={styles.multiScoreLabel}>OYUNCU 2 (SAĞ)</Text>
                                                    <Text style={styles.multiScoreValue}>{p2Score}</Text>
                                                    {multiRole === 'joiner' && <View style={styles.youIndicator}><Text style={styles.youText}>SEN</Text></View>}
                                                </View>
                                            </View>

                                            <View style={styles.gameInstruction}>
                                                {multiStatus === 'waiting' ? (
                                                    <Text style={styles.waitingText}>Diğer oyuncu bekleniyor...</Text>
                                                ) : multiStatus === 'ready' ? (
                                                    multiRole === 'host' ? (
                                                        <TouchableOpacity 
                                                            style={styles.startMultiButton}
                                                            onPress={() => LedService.startMultiGame()}
                                                        >
                                                            <Text style={styles.startMultiText}>OYUNU BAŞLAT</Text>
                                                        </TouchableOpacity>
                                                    ) : (
                                                        <Text style={styles.waitingText}>Hostun oyunu başlatması bekleniyor...</Text>
                                                    )
                                                ) : (
                                                    <View style={styles.activeGameInfo}>
                                                        <Text style={styles.playingText}>
                                                            {multiRole === 'host' ? 'SOL TARAFA GEÇ (LED 0)' : 'SAĞ TARAFA GEÇ (SON LED)'}
                                                        </Text>
                                                        <Text style={styles.subPlayingText}>Kendi tarafına gelince vur!</Text>
                                                    </View>
                                                )}
                                            </View>

                                            <View style={styles.pongActionsContainer}>
                                                <TouchableOpacity
                                                    disabled={isShieldOnCooldown}
                                                    style={[styles.powerupButton, { backgroundColor: isShieldOnCooldown ? '#444' : '#3B82F6' }, isShieldOnCooldown && { opacity: 0.5 }]}
                                                    onPress={() => {
                                                        setLastShieldPress(Date.now());
                                                        LedService.updateStatus({ ping_pong_powerup: 'shield', powerup_timestamp: Date.now() });
                                                    }}
                                                >
                                                    <MaterialIcons name="security" size={24} color={isShieldOnCooldown ? '#888' : '#FFF'} />
                                                    <Text style={[styles.powerupText, isShieldOnCooldown && { color: '#888' }]}>{isShieldOnCooldown ? Math.ceil((10000 - (now - lastShieldPress)) / 1000) : 'KALKAN'}</Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={styles.pongHitButton}
                                                    onPressIn={() => LedService.sendPongAction(multiRole === 'host' ? 1 : 2)}
                                                    activeOpacity={0.7}
                                                >
                                                    <LinearGradient
                                                        colors={multiRole === 'host' ? ['#FF8C00', '#FF4500'] : ['#8B5CF6', '#6D28D9']}
                                                        style={styles.pongHitInner}
                                                    >
                                                        <Text style={styles.pongHitText}>VUR!</Text>
                                                    </LinearGradient>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    disabled={isSlowMoOnCooldown}
                                                    style={[styles.powerupButton, { backgroundColor: isSlowMoOnCooldown ? '#444' : '#8B5CF6' }, isSlowMoOnCooldown && { opacity: 0.5 }]}
                                                    onPress={() => {
                                                        setLastSlowMoPress(Date.now());
                                                        LedService.updateStatus({ ping_pong_powerup: 'slow_mo', powerup_timestamp: Date.now() });
                                                    }}
                                                >
                                                    <MaterialIcons name="slow-motion-video" size={24} color={isSlowMoOnCooldown ? '#888' : '#FFF'} />
                                                    <Text style={[styles.powerupText, isSlowMoOnCooldown && { color: '#888' }]}>{isSlowMoOnCooldown ? Math.ceil((10000 - (now - lastSlowMoPress)) / 1000) : 'YAVAŞLAT'}</Text>
                                                </TouchableOpacity>
                                            </View>

                                            {multiRole === 'host' && (
                                                <TouchableOpacity 
                                                    style={styles.resetMultiButton}
                                                    onPress={() => LedService.resetMultiGame()}
                                                >
                                                    <MaterialIcons name="refresh" size={20} color="rgba(255,255,255,0.5)" />
                                                    <Text style={styles.resetMultiText}>Sıfırla</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    ) : (
                                        <View>
                                            <View style={styles.pongColorSelector}>
                                                <Text style={styles.pongColorTitle}>Top Rengi</Text>
                                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pongColorScroll}>
                                                    {[
                                                        { id: 'dynamic', name: 'Dinamik', color: ['#FF00FF', '#00FFFF'] },
                                                        { id: 'rainbow', name: 'Gökkuşağı', color: 'rainbow' },
                                                        { id: 'red', name: 'Kırmızı', color: '#FF0000' },
                                                        { id: 'blue', name: 'Mavi', color: '#0000FF' },
                                                        { id: 'green', name: 'Yeşil', color: '#00FF00' },
                                                        { id: 'white', name: 'Beyaz', color: '#FFFFFF' },
                                                        { id: 'orange', name: 'Turuncu', color: '#FFA500' },
                                                        { id: 'purple', name: 'Mor', color: '#800080' },
                                                    ].map((item) => (
                                                        <TouchableOpacity
                                                            key={item.id}
                                                            style={styles.pongColorItem}
                                                            onPress={() => LedService.updateStatus({ ping_pong_color_mode: item.id })}
                                                        >
                                                            {item.id === 'rainbow' ? (
                                                                <LinearGradient colors={['#FF0000', '#00FF00', '#0000FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.pongColorCircle} />
                                                            ) : Array.isArray(item.color) ? (
                                                                <LinearGradient colors={item.color} style={styles.pongColorCircle} />
                                                            ) : (
                                                                <View style={[styles.pongColorCircle, { backgroundColor: item.color }]} />
                                                            )}
                                                            <Text style={styles.pongColorText}>{item.name}</Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </ScrollView>
                                            </View>

                                            <View style={styles.bigScoreContainer}>
                                                <Text style={styles.bigScoreLabel}>GÜNCEL SKOR</Text>
                                                <Animated.Text style={[styles.bigScoreValue, { transform: [{ scale: scoreAnim }] }]}>
                                                    {pongScore}
                                                </Animated.Text>
                                            </View>

                                            <View style={styles.pongActionsContainer}>
                                                <TouchableOpacity
                                                    disabled={isShieldOnCooldown}
                                                    style={[styles.powerupButton, { backgroundColor: isShieldOnCooldown ? '#444' : '#3B82F6' }, isShieldOnCooldown && { opacity: 0.5 }]}
                                                    onPress={() => {
                                                        setLastShieldPress(Date.now());
                                                        LedService.updateStatus({ ping_pong_powerup: 'shield', powerup_timestamp: Date.now() });
                                                    }}
                                                >
                                                    <MaterialIcons name="security" size={24} color={isShieldOnCooldown ? '#888' : '#FFF'} />
                                                    <Text style={[styles.powerupText, isShieldOnCooldown && { color: '#888' }]}>{isShieldOnCooldown ? Math.ceil((10000 - (now - lastShieldPress)) / 1000) : 'KALKAN'}</Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={styles.pongHitButton}
                                                    onPressIn={() => LedService.updateStatus({ ping_pong_action: Date.now() })}
                                                    activeOpacity={0.7}
                                                >
                                                    <LinearGradient colors={['#FF8C00', '#FF4500']} style={styles.pongHitInner}><Text style={styles.pongHitText}>VUR!</Text></LinearGradient>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    disabled={isSlowMoOnCooldown}
                                                    style={[styles.powerupButton, { backgroundColor: isSlowMoOnCooldown ? '#444' : '#8B5CF6' }, isSlowMoOnCooldown && { opacity: 0.5 }]}
                                                    onPress={() => {
                                                        setLastSlowMoPress(Date.now());
                                                        LedService.updateStatus({ ping_pong_powerup: 'slow_mo', powerup_timestamp: Date.now() });
                                                    }}
                                                >
                                                    <MaterialIcons name="slow-motion-video" size={24} color={isSlowMoOnCooldown ? '#888' : '#FFF'} />
                                                    <Text style={[styles.powerupText, isSlowMoOnCooldown && { color: '#888' }]}>{isSlowMoOnCooldown ? Math.ceil((10000 - (now - lastSlowMoPress)) / 1000) : 'YAVAŞLAT'}</Text>
                                                </TouchableOpacity>
                                            </View>
                                            <TouchableOpacity 
                                                style={styles.backToSelectionSingle} 
                                                onPress={() => setPingPongSubMode('selection')}
                                            >
                                                <Text style={styles.backText}>Geri Dön</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </ScrollView>
                            ) : (
                                <View style={styles.placeholderContainer}>
                                    <MaterialIcons name="auto-awesome" size={64} color="rgba(255,255,255,0.1)" />
                                    <Text style={styles.placeholderText}>
                                        Bu özellik yakında eklenecek...
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    safeArea: {
        backgroundColor: 'transparent',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    headerTitle: {
        fontSize: 32,
        fontFamily: 'Outfit-Bold',
        color: '#FFF',
    },
    headerSubtitle: {
        fontSize: 14,
        fontFamily: 'Outfit-Regular',
        color: 'rgba(255,255,255,0.5)',
        marginTop: 4,
    },
    infoButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingHorizontal: 20,
    },
    cardContainer: {
        marginBottom: 20,
        borderRadius: 28,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    cardGradient: {
        padding: 24,
        position: 'relative',
        overflow: 'hidden',
    },
    cardContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 2,
    },
    cardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 20,
    },
    textContainer: {
        flex: 1,
    },
    tagContainer: {
        backgroundColor: 'rgba(0,0,0,0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginBottom: 6,
    },
    tagText: {
        fontSize: 10,
        fontFamily: 'Outfit-Bold',
        color: 'rgba(255,255,255,0.9)',
        letterSpacing: 1,
    },
    cardName: {
        fontSize: 20,
        fontFamily: 'Outfit-Bold',
        color: '#FFF',
        marginBottom: 4,
    },
    cardDesc: {
        fontSize: 14,
        fontFamily: 'Outfit-Regular',
        color: 'rgba(255,255,255,0.7)',
    },
    cardRight: {
        marginLeft: 10,
    },
    decorativeCircle: {
        position: 'absolute',
        bottom: -40,
        right: -40,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.05)',
        zIndex: 1,
    },
    footerSpacing: {
        height: 140,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#111',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        height: height * 0.9,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    modalHandle: {
        width: 40,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
    },
    modalHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    modalIconBg: {
        width: 50,
        height: 50,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    modalTitle: {
        fontSize: 24,
        fontFamily: 'Outfit-Bold',
        color: '#FFF',
    },
    modalSubtitle: {
        fontSize: 10,
        fontFamily: 'Outfit-Bold',
        color: 'rgba(255,255,255,0.4)',
        letterSpacing: 1,
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBody: {
        flex: 1,
    },
    sensorContainer: {
        flex: 1,
        alignItems: 'center',
    },
    visualizerContainer: {
        width: '100%',
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    visualizerBackdrop: {
        width: '100%',
        height: 80,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        position: 'relative',
        overflow: 'hidden',
    },
    topGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
    },
    gravityBall: {
        width: 60,
        height: 60,
        borderRadius: 30,
        zIndex: 5,
    },
    ballInner: {
        flex: 1,
        borderRadius: 30,
    },
    centerLine: {
        position: 'absolute',
        width: 2,
        height: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        zIndex: 1,
    },
    visualizerHint: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 12,
        fontFamily: 'Outfit-Regular',
        marginTop: 16,
    },
    dataGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 10,
    },
    dataBox: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: 16,
        borderRadius: 20,
        alignItems: 'center',
        marginHorizontal: 5,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    dataLabel: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 10,
        fontFamily: 'Outfit-Bold',
        marginBottom: 4,
        letterSpacing: 1,
    },
    dataValue: {
        color: '#FFF',
        fontSize: 18,
        fontFamily: 'Outfit-Bold',
    },
    djContainer: {
        flex: 1,
        alignItems: 'center',
    },
    djHint: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 14,
        fontFamily: 'Outfit-Regular',
        marginBottom: 32,
    },
    djGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        width: '100%',
    },
    djPadWrapper: {
        width: (width - 64) / 2,
        height: (width - 64) / 2,
        marginBottom: 16,
        position: 'relative',
    },
    djPadShadow: {
        position: 'absolute',
        top: 6,
        left: 0,
        right: 0,
        bottom: -6,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 24,
    },
    djPadContent: {
        flex: 1,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    djPadName: {
        color: '#FFF',
        fontFamily: 'Outfit-Bold',
        fontSize: 14,
        marginTop: 12,
    },
    f1Container: {
        flex: 1,
        paddingHorizontal: 10,
    },
    f1HeaderCard: {
        backgroundColor: 'rgba(225, 6, 0, 0.1)',
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(225, 6, 0, 0.2)',
        marginBottom: 20,
    },
    f1Badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E10600',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginBottom: 10,
    },
    f1LiveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FFF',
        marginRight: 6,
    },
    f1BadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontFamily: 'Outfit-Bold',
    },
    f1Title: {
        color: '#FFF',
        fontSize: 22,
        fontFamily: 'Outfit-Bold',
    },
    f1StatsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    f1StatBox: {
        width: (width - 80) / 2,
        backgroundColor: '#1A1A1A',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    f1StatLabel: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        fontFamily: 'Outfit-Bold',
        marginBottom: 8,
    },
    f1StatValue: {
        color: '#FFF',
        fontSize: 24,
        fontFamily: 'Outfit-Bold',
    },
    f1SubValue: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        fontFamily: 'Outfit-Regular',
        marginTop: 4,
    },
    f1RpmBar: {
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 2,
        marginTop: 10,
    },
    f1RpmFill: {
        height: '100%',
        backgroundColor: '#E10600',
        borderRadius: 2,
    },
    f1InfoCard: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: 16,
        borderRadius: 20,
        alignItems: 'center',
        marginBottom: 24,
    },
    f1InfoText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 13,
        fontFamily: 'Outfit-Regular',
        marginLeft: 12,
        flex: 1,
        lineHeight: 18,
    },
    f1TestButton: {
        backgroundColor: '#222',
        height: 56,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(225, 6, 0, 0.3)',
    },
    f1TestText: {
        color: '#E10600',
        fontFamily: 'Outfit-Bold',
        fontSize: 16,
        letterSpacing: 1,
    },
    canvasContainer: {
        flex: 1,
    },
    canvasScroll: {
        alignItems: 'center',
        paddingBottom: 40,
    },
    palette: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 24,
        paddingHorizontal: 20,
    },
    paletteColor: {
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    activeBrush: {
        borderColor: '#FFF',
        transform: [{ scale: 1.15 }],
    },
    ledGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: width - 40,
        justifyContent: 'center',
        gap: 6,
    },
    ledPixel: {
        width: (width - 80) / 7,
        height: (width - 80) / 7,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    pixelNumber: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.2)',
        fontFamily: 'Outfit-Bold',
    },
    clearButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 32,
        backgroundColor: 'rgba(255, 75, 43, 0.08)',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 75, 43, 0.15)',
    },
    clearText: {
        color: '#FF4B2B',
        fontFamily: 'Outfit-Bold',
        marginLeft: 8,
        fontSize: 14,
    },
    shakeContainer: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 40,
    },
    shakeIconWrapper: {
        marginBottom: 30,
    },
    shakeCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    shakeMainHint: {
        color: '#FFF',
        fontSize: 18,
        fontFamily: 'Outfit-Bold',
        textAlign: 'center',
        paddingHorizontal: 40,
        marginBottom: 40,
        lineHeight: 26,
    },
    revealedEffect: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 30,
        borderRadius: 30,
        width: '100%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    effectTag: {
        color: '#10B981',
        fontSize: 12,
        fontFamily: 'Outfit-Bold',
        letterSpacing: 2,
        marginBottom: 8,
    },
    effectName: {
        color: '#FFF',
        fontSize: 24,
        fontFamily: 'Outfit-Bold',
        marginBottom: 20,
    },
    effectIndicator: {
        height: 40,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    effectDot: {
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 2,
        borderColor: '#FFF',
    },
    effectGradientLine: {
        width: '80%',
        height: 10,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    ambilightContainer: {
        flex: 1,
    },
    ambilightCard: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        marginBottom: 20,
    },
    ambilightIconBox: {
        width: 80,
        height: 80,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    ambilightTitle: {
        fontSize: 22,
        fontFamily: 'Outfit-Bold',
        color: '#FFF',
        marginBottom: 8,
    },
    ambilightDesc: {
        fontSize: 14,
        fontFamily: 'Outfit-Regular',
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center',
        lineHeight: 20,
    },
    ambilightStatusBox: {
        backgroundColor: 'rgba(0,180,219,0.05)',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(0,180,219,0.15)',
        marginBottom: 20,
    },
    statusInner: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#00B4DB',
        marginRight: 8,
        shadowColor: '#00B4DB',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
    },
    statusText: {
        fontSize: 12,
        fontFamily: 'Outfit-Bold',
        color: '#00B4DB',
        letterSpacing: 1,
    },
    ambilightHint: {
        fontSize: 13,
        fontFamily: 'Outfit-Regular',
        color: 'rgba(255,255,255,0.4)',
    },
    musicContainer: {
        flex: 1,
    },
    musicCard: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        marginBottom: 20,
    },
    musicIconBox: {
        width: 80,
        height: 80,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    musicTitle: {
        fontSize: 22,
        fontFamily: 'Outfit-Bold',
        color: '#FFF',
        marginBottom: 8,
    },
    musicDesc: {
        fontSize: 14,
        fontFamily: 'Outfit-Regular',
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center',
        lineHeight: 20,
    },
    musicVisualizer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        height: 100,
        gap: 8,
        marginBottom: 30,
    },
    musicBar: {
        width: 12,
        backgroundColor: '#3B82F6',
        borderRadius: 6,
    },
    musicStatusBox: {
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.15)',
        marginBottom: 20,
    },
    musicHint: {
        fontSize: 13,
        fontFamily: 'Outfit-Regular',
        color: 'rgba(255,255,255,0.4)',
    },
    pcInstructionCard: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 24,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        marginBottom: 20,
    },
    pcIconFrame: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    pcInstructionTextContent: {
        flex: 1,
    },
    pcInstructionTitle: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 10,
        fontFamily: 'Outfit-Bold',
        letterSpacing: 1,
        marginBottom: 4,
    },
    pcInstructionText: {
        color: '#FFF',
        fontSize: 14,
        fontFamily: 'Outfit-Medium',
    },
    pulsingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#3B82F6',
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
    },
    pongContainer: {
        flex: 1,
    },
    pongCard: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 20,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        marginBottom: 12,
        flexDirection: 'row',
    },
    pongIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    pongTitle: {
        fontSize: 18,
        fontFamily: 'Outfit-Bold',
        color: '#FFF',
    },
    pongDesc: {
        fontSize: 12,
        fontFamily: 'Outfit-Regular',
        color: 'rgba(255,255,255,0.5)',
        lineHeight: 16,
    },
    pongVisualizer: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        marginBottom: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    pongTable: {
        width: '100%',
        height: 40,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    pongGoalLeft: {
        width: 4,
        height: '60%',
        backgroundColor: '#FF8C00',
        borderRadius: 2,
    },
    pongGoalRight: {
        width: 4,
        height: '60%',
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 2,
    },
    pongNet: {
        width: 2,
        height: '100%',
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    pongHint: {
        fontSize: 13,
        fontFamily: 'Outfit-Medium',
        color: 'rgba(255,255,255,0.4)',
    },
    scoreContainer: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 15,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    scoreLabel: {
        fontSize: 10,
        fontFamily: 'Outfit-Bold',
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 1,
    },
    scoreValue: {
        fontSize: 24,
        fontFamily: 'Outfit-Bold',
        color: '#FF8C00',
    },
    bigScoreContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 0,
    },
    bigScoreLabel: {
        fontSize: 14,
        fontFamily: 'Outfit-Bold',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 2,
        marginBottom: 10,
    },
    bigScoreValue: {
        fontSize: 120,
        fontFamily: 'Outfit-Bold',
        color: '#FF8C00',
        textShadowColor: 'rgba(255, 140, 0, 0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 20,
    },
    pongHitButton: {
        width: 190,
        height: 190,
        borderRadius: 95,
        overflow: 'hidden',
        alignSelf: 'center',
        marginTop: 5,
        elevation: 15,
        shadowColor: '#FF4500',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    pongHitInner: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pongHitText: {
        fontSize: 40,
        fontFamily: 'Outfit-Bold',
        color: '#FFF',
        letterSpacing: 2,
    },
    pongActionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 20,
        width: '100%',
        paddingHorizontal: 10,
    },
    powerupButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    powerupText: {
        fontSize: 8,
        fontFamily: 'Outfit-Bold',
        color: '#FFF',
        marginTop: 2,
    },
    pongColorSelector: {
        marginBottom: 20,
    },
    pongColorTitle: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        fontFamily: 'Outfit-Bold',
        letterSpacing: 1,
        marginBottom: 12,
        marginLeft: 4,
    },
    pongColorScroll: {
        paddingLeft: 4,
        paddingRight: 20,
    },
    pongColorItem: {
        alignItems: 'center',
        marginRight: 16,
    },
    pongColorCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginBottom: 6,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    pongColorText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 10,
        fontFamily: 'Outfit-Medium',
    },
    // Multiplayer Styles
    pongSelectionGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 40,
    },
    pongModeCard: {
        width: '48%',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 24,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    pongModeIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    pongModeTitle: {
        color: '#FFF',
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
        marginBottom: 4,
    },
    pongModeDesc: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 11,
        fontFamily: 'Outfit-Regular',
        textAlign: 'center',
    },
    multiSetupContainer: {
        paddingVertical: 20,
    },
    setupButton: {
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 30,
    },
    setupButtonInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
    },
    setupButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontFamily: 'Outfit-Bold',
        marginLeft: 10,
    },
    joinSection: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    roomIdInputContainer: {
        marginBottom: 20,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 15,
        paddingHorizontal: 15,
        height: 60,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    numpad: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: 20,
    },
    numKey: {
        width: '30%',
        height: 50,
        backgroundColor: 'rgba(255,255,255,0.05)',
        margin: '1.5%',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    numKeyText: {
        color: '#FFF',
        fontSize: 20,
        fontFamily: 'Outfit-Bold',
    },
    joinSubmit: {
        backgroundColor: '#8B5CF6',
        borderRadius: 15,
        paddingVertical: 15,
        alignItems: 'center',
    },
    joinSubmitText: {
        color: '#FFF',
        fontSize: 16,
        fontFamily: 'Outfit-Bold',
    },
    backToSelection: {
        alignSelf: 'center',
        marginTop: 30,
        padding: 10,
    },
    backToSelectionSingle: {
        alignSelf: 'center',
        marginTop: 20,
        padding: 10,
    },
    backText: {
        color: 'rgba(255,255,255,0.3)',
        fontFamily: 'Outfit-Bold',
        fontSize: 14,
    },
    multiGameContainer: {
        alignItems: 'center',
    },
    roomBadge: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 10,
        marginBottom: 20,
    },
    roomBadgeLabel: {
        color: 'rgba(255,255,255,0.4)',
        fontFamily: 'Outfit-Bold',
    },
    roomBadgeValue: {
        color: '#10B981',
        fontFamily: 'Outfit-Bold',
    },
    multiScoreGrid: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 20,
        padding: 20,
        marginBottom: 30,
        width: '100%',
    },
    multiScoreBox: {
        flex: 1,
        alignItems: 'center',
    },
    multiScoreLabel: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 10,
        fontFamily: 'Outfit-Bold',
        marginBottom: 5,
    },
    multiScoreValue: {
        color: '#FFF',
        fontSize: 48,
        fontFamily: 'Outfit-Bold',
    },
    multiScoreDivider: {
        width: 1,
        height: 40,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginHorizontal: 20,
    },
    youIndicator: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginTop: 5,
    },
    youText: {
        color: '#FFF',
        fontSize: 8,
        fontFamily: 'Outfit-Bold',
    },
    gameInstruction: {
        marginBottom: 30,
        alignItems: 'center',
    },
    waitingText: {
        color: '#F59E0B',
        fontFamily: 'Outfit-Medium',
        fontSize: 16,
    },
    startMultiButton: {
        backgroundColor: '#10B981',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 15,
    },
    startMultiText: {
        color: '#FFF',
        fontFamily: 'Outfit-Bold',
        fontSize: 18,
    },
    activeGameInfo: {
        alignItems: 'center',
    },
    playingText: {
        color: '#FFF',
        fontFamily: 'Outfit-Bold',
        fontSize: 20,
        marginBottom: 5,
    },
    subPlayingText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 14,
    },
    resetMultiButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 30,
        padding: 10,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 10,
    },
    resetMultiText: {
        color: 'rgba(255,255,255,0.5)',
        marginLeft: 8,
        fontFamily: 'Outfit-Bold',
    },
    // New Multiplayer Setup Styles
    setupChoiceGrid: {
        flexDirection: 'column',
        gap: 15,
        paddingVertical: 20,
    },
    setupChoiceCard: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    setupChoiceIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    setupChoiceTitle: {
        color: '#FFF',
        fontSize: 18,
        fontFamily: 'Outfit-Bold',
        marginBottom: 8,
    },
    setupChoiceDesc: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        fontFamily: 'Outfit-Regular',
        textAlign: 'center',
        lineHeight: 18,
    },
    joinTitle: {
        color: '#FFF',
        fontSize: 14,
        fontFamily: 'Outfit-Bold',
        letterSpacing: 2,
        textAlign: 'center',
        marginBottom: 20,
    },
    backToChoice: {
        alignSelf: 'center',
        marginTop: 20,
        padding: 10,
    },
});
