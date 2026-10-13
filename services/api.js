const FIREBASE_DB_URL = 'https://ledcontrolesp32-745bd-default-rtdb.firebaseio.com';

// Renk dönüşüm yardımcısı (Hex -> RGB)
const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
};

export const LedService = {
    // Tüm durumu getir
    getStatus: async () => {
        try {
            const response = await fetch(`${FIREBASE_DB_URL}/led_status.json`);
            return await response.json();
        } catch (error) {
            console.error('Durum çekilemedi:', error);
            return null;
        }
    },

    // Genel güncelleme fonksiyonu (PATCH kullanır, sadece değişeni günceller)
    updateStatus: async (updates) => {
        try {
            await fetch(`${FIREBASE_DB_URL}/led_status.json`, {
                method: 'PATCH',
                body: JSON.stringify(updates),
            });
            return true;
        } catch (error) {
            console.error('Güncelleme hatası:', error);
            return false;
        }
    },

    // Güç kontrolü
    togglePower: async (isOn) => {
        return await LedService.updateStatus({ power: isOn });
    },

    // Renk değiştirme (Modu solid yapar)
    setColor: async (hexColor) => {
        const rgb = hexToRgb(hexColor);
        return await LedService.updateStatus({
            mode: 'solid',
            color: rgb
        });
    },

    // Renk güncelleme (Sadece rengi değiştirir, modu bozmaz)
    updateColor: async (hexColor) => {
        const rgb = hexToRgb(hexColor);
        return await LedService.updateStatus({
            color: rgb
        });
    },

    // Gradient değiştirme
    setGradient: async (gradientId) => {
        // gradientId 'g1', 'g2' gibi geliyor, biz bunu 'gradient1', 'gradient2' formatına çeviriyoruz
        const themeValue = gradientId.replace('g', 'gradient');
        return await LedService.updateStatus({
            mode: 'gradient',
            gradient_theme: themeValue
        });
    },

    setCanvasMode: async (initialColors) => {
        return await LedService.updateStatus({
            mode: 'canvas',
            canvas_data: initialColors // Array of 58 hex strings or RGBs
        });
    },

    updateCanvasPixel: async (index, hexColor) => {
        const rgb = hexToRgb(hexColor);
        return await LedService.updateStatus({
            canvas_trigger: {
                i: index,
                c: [rgb.r, rgb.g, rgb.b],
                t: Date.now() // Timestamp to ensure update is caught
            }
        });
    },

    // Animasyon değiştirme
    setAnimation: async (animationId) => {
        return await LedService.updateStatus({
            mode: 'animation',
            active_animation: animationId
        });
    },

    // Parlaklık değiştirme (0-255)
    setBrightness: async (value) => {
        return await LedService.updateStatus({ brightness: value });
    },

    // Animasyon hızı değiştirme (0-255)
    setSpeed: async (value) => {
        return await LedService.updateStatus({ speed: value });
    },

    // Gradient animasyonunu aç/kapat
    setGradientAnimation: async (enabled) => {
        return await LedService.updateStatus({ gradient_animation: enabled });
    },

    // --- PING PONG MULTIPLAYER ---
    createRoom: async (roomId) => {
        return await LedService.updateStatus({
            ping_pong_mode: 'multi',
            multi_status: 'waiting',
            room_id: roomId,
            p1_score: 0,
            p2_score: 0,
            p1_action: 0,
            p2_action: 0,
            start_trigger: 0
        });
    },

    joinRoom: async () => {
        return await LedService.updateStatus({
            multi_status: 'ready'
        });
    },

    startMultiGame: async () => {
        return await LedService.updateStatus({
            multi_status: 'playing',
            start_trigger: Date.now()
        });
    },

    sendPongAction: async (player) => {
        const key = player === 1 ? 'p1_action' : 'p2_action';
        return await LedService.updateStatus({
            [key]: Date.now()
        });
    },

    resetMultiGame: async () => {
        return await LedService.updateStatus({
            multi_status: 'ready',
            p1_score: 0,
            p2_score: 0,
            start_trigger: 0
        });
    },

    // Özel Gradient Ayarla
    setCustomGradient: async (colors) => {
        return await LedService.updateStatus({
            mode: 'custom_gradient',
            custom_gradient: {
                c1: colors[0],
                c2: colors[1],
                c3: colors[2]
            }
        });
    }
};
