import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { alarmEngine } from "../services/alarmSound";

export interface ActiveAlarm {
  id: string;
  trainId: string;
  trainName: string;
  stationCode: string;
  stationName: string;
  platform: string;
  scheduledArrival: string;
  predictedArrival: string;
  leadMinutes: number;
  triggerTimeIso: string;
  createdAt: string;
  isArmed: boolean;
}

interface AlarmContextType {
  activeAlarm: ActiveAlarm | null;
  isRinging: boolean;
  ringingAlarm: ActiveAlarm | null;
  remainingSeconds: number | null;
  setAlarm: (alarmData: {
    trainId: string;
    trainName: string;
    stationCode: string;
    stationName: string;
    platform: string;
    scheduledArrival: string;
    predictedArrival: string;
    leadMinutes: number;
  }) => void;
  cancelAlarm: () => void;
  dismissRinging: () => void;
  snooze: (minutes?: number) => void;
  testSound: () => Promise<void>;
}

const STORAGE_KEY = "railway_active_arrival_alarm";

const AlarmContext = createContext<AlarmContextType | undefined>(undefined);

export const AlarmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeAlarm, setActiveAlarm] = useState<ActiveAlarm | null>(null);
  const [isRinging, setIsRinging] = useState(false);
  const [ringingAlarm, setRingingAlarm] = useState<ActiveAlarm | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  // Load persisted alarm from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: ActiveAlarm = JSON.parse(saved);
        // Only keep if trigger time is not more than 2 hours in the past
        const triggerDate = new Date(parsed.triggerTimeIso).getTime();
        const now = Date.now();
        if (triggerDate > now - 2 * 3600 * 1000) {
          setActiveAlarm(parsed);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Save to localStorage
  const saveAlarm = (alarm: ActiveAlarm | null) => {
    setActiveAlarm(alarm);
    if (alarm) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(alarm));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Helper to calculate target trigger time ISO based on predicted arrival
  const calculateTriggerTime = (predictedArrivalStr: string, leadMinutes: number): string => {
    const now = new Date();
    let [hours, mins] = [now.getHours(), now.getMinutes() + 15];
    if (predictedArrivalStr && predictedArrivalStr.includes(":")) {
      const parts = predictedArrivalStr.split(":");
      hours = parseInt(parts[0], 10);
      mins = parseInt(parts[1], 10);
    }

    const targetDate = new Date();
    targetDate.setHours(hours, mins, 0, 0);

    // If arrival time appears earlier today and is past, it's tomorrow
    if (targetDate.getTime() < now.getTime() - 45 * 60 * 1000) {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    // Subtract lead minutes
    const triggerMs = targetDate.getTime() - leadMinutes * 60 * 1000;
    return new Date(triggerMs).toISOString();
  };

  const setAlarm = useCallback((alarmData: {
    trainId: string;
    trainName: string;
    stationCode: string;
    stationName: string;
    platform: string;
    scheduledArrival: string;
    predictedArrival: string;
    leadMinutes: number;
  }) => {
    const triggerTimeIso = calculateTriggerTime(alarmData.predictedArrival, alarmData.leadMinutes);

    const newAlarm: ActiveAlarm = {
      id: `alarm_${Date.now()}`,
      trainId: alarmData.trainId,
      trainName: alarmData.trainName,
      stationCode: alarmData.stationCode,
      stationName: alarmData.stationName,
      platform: alarmData.platform,
      scheduledArrival: alarmData.scheduledArrival,
      predictedArrival: alarmData.predictedArrival,
      leadMinutes: alarmData.leadMinutes,
      triggerTimeIso,
      createdAt: new Date().toISOString(),
      isArmed: true,
    };

    saveAlarm(newAlarm);
    alarmEngine.requestNotificationPermission().catch(() => {});
  }, []);

  const cancelAlarm = useCallback(() => {
    saveAlarm(null);
    setRemainingSeconds(null);
    if (isRinging) {
      alarmEngine.stopAlarmLoop();
      setIsRinging(false);
      setRingingAlarm(null);
    }
  }, [isRinging]);

  const dismissRinging = useCallback(() => {
    alarmEngine.stopAlarmLoop();
    setIsRinging(false);
    setRingingAlarm(null);
    saveAlarm(null);
    setRemainingSeconds(null);
  }, []);

  const snooze = useCallback((minutes = 5) => {
    alarmEngine.stopAlarmLoop();
    setIsRinging(false);
    setRingingAlarm(null);

    if (activeAlarm) {
      const newTriggerMs = Date.now() + minutes * 60 * 1000;
      const updated: ActiveAlarm = {
        ...activeAlarm,
        triggerTimeIso: new Date(newTriggerMs).toISOString(),
        leadMinutes: Math.max(0, activeAlarm.leadMinutes - minutes),
      };
      saveAlarm(updated);
    }
  }, [activeAlarm]);

  const testSound = useCallback(async () => {
    await alarmEngine.playStationChime();
  }, []);

  // Recurring 1-second ticker comparing current time with trigger time
  useEffect(() => {
    if (!activeAlarm || !activeAlarm.isArmed || isRinging) return;

    const interval = setInterval(() => {
      const nowMs = Date.now();
      const triggerMs = new Date(activeAlarm.triggerTimeIso).getTime();
      const diffSec = Math.round((triggerMs - nowMs) / 1000);

      setRemainingSeconds(Math.max(0, diffSec));

      // Trigger condition: within 2 seconds of trigger time or passed
      if (diffSec <= 1) {
        // Fire alarm!
        setIsRinging(true);
        setRingingAlarm(activeAlarm);
        alarmEngine.startAlarmLoop();
        alarmEngine.sendNotification(
          `🔔 Wake Up! Train Approaching ${activeAlarm.stationName}`,
          `Train ${activeAlarm.trainId} ${activeAlarm.trainName} is arriving in ${activeAlarm.leadMinutes} mins on Platform ${activeAlarm.platform}!`
        );
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeAlarm, isRinging]);

  return (
    <AlarmContext.Provider
      value={{
        activeAlarm,
        isRinging,
        ringingAlarm,
        remainingSeconds,
        setAlarm,
        cancelAlarm,
        dismissRinging,
        snooze,
        testSound,
      }}
    >
      {children}
    </AlarmContext.Provider>
  );
};

export const useAlarm = (): AlarmContextType => {
  const context = useContext(AlarmContext);
  if (!context) {
    throw new Error("useAlarm must be used within an AlarmProvider");
  }
  return context;
};
