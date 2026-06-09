"use client";
import React, { useEffect, useRef } from "react";
import styles from "./LocationSection.module.css";
import { Card } from "./ui/Card";
import wandSparkles from "../public/assets/wand-sparkles-solid-full.svg";
import Galaxy from "./Galaxy";
import Countdown from "./Countdown";

export const LocationSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observerOptions = { threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add(styles["location--visible"]);
        }
      });
    }, observerOptions);

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className={styles.location} id="location">
      {/* Fondo galáctico animado */}
      <div className={styles.location__galaxy}>
        <Galaxy 
          saturation={1}
          hueShift={155}
          transparent
        />
      </div>
      
      {/* Contenedor principal centrado de la sección */}
      <div className={styles.location__mainWrapper}>
        
        {/* Contenedor Grid mapeado con el CSS: Paralelo en Web, Columna en Móvil */}
        <div className={styles.location__container}>
          
          {/* Tarjeta 1: Detalles de la celebración */}
          <Card className={styles.location__details}>
            <img 
              src={wandSparkles.src || wandSparkles} /* Tolera importaciones de NextJS normales o SVGs crudos */
              alt="Wand Sparkles" 
              className={styles.location__wand} 
              width={50} 
              height={50} 
              style={{ filter: 'brightness(0) invert(1)' }} 
            />
            <h2 className={`${styles.location__title} ornate-headline silver-gradient-text`}>
              La Celebración
            </h2>
            <div className={styles.location__info}>
              <div className={styles.location__item}>
                <p className={styles.location__label}>FECHA Y HORA</p>
                <p className={`${styles.location__value} ornate-headline`}>5 De Diciembre</p>
                <p className={styles.location__subvalue}>21hs</p>
              </div>
              
              <div className={styles.location__divider}></div>
              
              <div className={styles.location__item}>
                <p className={styles.location__label}>UBICACIÓN</p>
                <p className={`${styles.location__value} ornate-headline`}>La Ribera</p>
                <p className={styles.location__subvalue}>
                  Abel Figueroa 76, X5220 Jesus María, Córdoba
                </p>
              </div>
            </div>
          </Card>

          {/* Tarjeta 2: El Mapa de Google Maps */}
          <div className={styles.location__mapWrapper}>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1209.4896827546938!2d-64.094084758931!3d-30.971781875810326!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9432634e3855e2c9%3A0x5a0bced190c44d7c!2sLa%20Ribera!5e0!3m2!1ses!2sar!4v1781029455732!5m2!1ses!2sar"
              width="100%"
              height="100%"
              className={styles.location__map} /* Inyecta la inversión dark mode que tenías en tus estilos */
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>

        </div>

        {/* Bloque inferior: El reloj de la cuenta regresiva centrado abajo */}
        <div className={styles.location__countdownWrapper}>
          <Countdown />
        </div>

      </div>
    </section>
  );
};

export default LocationSection;