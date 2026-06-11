import React from "react";
import styles from "./EventSection.module.css";
import Countdown from "./Countdown";
import DarkVeil from './DarkVeil';
import miluImage from '../public/assets/mily-portrait.png';
export const EventSection: React.FC = () => {
  return (
    <section className={styles.event} id="hero" style={{ position: 'relative', width: '100%', minHeight: '100vh', overflow: 'hidden' }}>

      {/* CAPA 1: Capa del fondo interactivo (Galaxy) */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}>

           <DarkVeil
            hueShift={40}
            noiseIntensity={0}
            scanlineIntensity={0}
            speed={2}
            scanlineFrequency={-50}
            warpAmount={1}
          /> 
       
      </div>

      {/* CAPA 2: Tu fondo de imagen anterior y el overlay (si todavía los quieres de fondo junto al galaxy) */}
      <div className={styles.event__background} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>

        <div className={styles.event__overlay}></div>
      </div>

        {/* CAPA 3: Contenido principal (Textos, foto de Milu y Cuenta regresiva) */}
        <div className={styles.event__content} style={{ position: 'relative', zIndex: 2, width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <span className={styles.event__tag}>Estás invitado a</span>
          <h1 className={`${styles.event__title} ornate-headline silver-gradient-text ms-madi-regular`}>
            Los&nbsp;&nbsp;&nbsp;XV&nbsp;&nbsp;&nbsp; de Milu
          </h1>
          <p className={`${styles.event__subtitle} ornate-headline`}>
            Una noche inolvidable
          </p>

          <div className={styles.event__imageWrapper}>
            <div className={styles.event__imageFrame}>
              <img
                alt="Milagros"
                className={styles.event__portrait}
                src={miluImage.src}
              />
            </div>
          </div>
          <Countdown /> 
        </div>
    </section >
  );
};

export default EventSection;
