import React, { createContext, useState, useEffect, useContext } from 'react';
import { LedService } from '../services/api';

const LedContext = createContext();

export const LedProvider = ({ children }) => {
    const [status, setStatus] = useState({
        power: true,
        brightness: 255,
        speed: 128,
        mode: 'solid',
        active_animation: 'rainbow',
        gradient_theme: 'gradient1',
        color: { r: 0, g: 255, b: 0 }
    });

    const fetchStatus = async () => {
        const data = await LedService.getStatus();
        if (data) {
            setStatus(data);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const updateLocalStatus = (updates) => {
        setStatus(prev => ({ ...prev, ...updates }));
    };

    return (
        <LedContext.Provider value={{ status, fetchStatus, updateLocalStatus }}>
            {children}
        </LedContext.Provider>
    );
};

export const useLed = () => useContext(LedContext);
