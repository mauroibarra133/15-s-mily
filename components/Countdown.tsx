"use client";

import React, { useState, useEffect } from "react";
import FlipClockCountdown from '@leenguyen/react-flip-clock-countdown';
import '@leenguyen/react-flip-clock-countdown/dist/index.css';
import styles from "./Countdown.module.css";

export const Countdown: React.FC = () => {
  const [isFinished, setIsFinished] = useState(false);
  const targetDate = new Date("Dec 5, 2026 21:00:00").getTime();

  useEffect(() => {
    if (new Date().getTime() > targetDate) {
      setIsFinished(true);
    }
  }, [targetDate]);

if (isFinished) {
  return (
    <div className={styles.countdownContainer} style={{ position: 'relative', width: '100%' }}>
      <div className={styles.finishedWrapper}>
        <p className={`${styles.countdown__finished} ms-madi-regular`}>
          ¡La fiesta ha comenzado!
        </p>
        <span className={styles.finishedSubtitle}>Te estamos esperando</span>
      </div>
    </div>
  );
}

  return (
    <div className={styles.countdownContainer}> 
      <FlipClockCountdown
        to={targetDate}
        className={styles.silverBlueClock}
        labels={['DÍAS', 'HORAS', 'MINUTOS', 'SEGUNDOS']}
        onComplete={() => setIsFinished(true)}
      />
    </div>
  );
};

export default Countdown;