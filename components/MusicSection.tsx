"use client";
import React, { useState } from "react";
import styles from "./MusicSection.module.css";
import SoftAurora from "./SoftAurora";

export const MusicSection: React.FC = () => {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className={styles.musicContainer}>
      {/* Contenedor de la Aurora de fondo */}
      <div className={styles.auroraWrapper}>
        <SoftAurora
          speed={1}
          scale={1.3}
          brightness={1}
          color1="#8ee7f9"
          color2="#428df0"
          noiseFrequency={2.5}
          noiseAmplitude={2}
          bandHeight={0.5}
          bandSpread={0.8}
          octaveDecay={0.08}
          layerOffset={0}
          colorSpeed={0.8}
          enableMouseInteraction
          mouseInfluence={0.25}
        />
      </div>

      {/* Tarjeta de contenido */}
      <div className={styles.musicCard}>
        <span className={styles.musicIcon}>🎵</span>

        <h2 className={`${styles.title} ornate-headline`}>
          ¡QUE NO FALTE TU MÚSICA!
        </h2>
        <p className={styles.subtitle}>
          ¿Cuál es esa canción que te hace bailar sin parar?
        </p>
        <p className={styles.subvalue}>
          Ayúdanos a armar la playlist de la noche.
        </p>

        {/* Reproductor de Spotify incrustado */}
        <div className={styles.spotifyWrapper}>
          <iframe
            data-testid="embed-iframe"
            style={{ borderRadius: "12px" }}
            src="https://open.spotify.com/embed/playlist/2t9pyEpO0EvJB5bkjtCHQ7?utm_source=generator"
            width="100%"
            height="352"
            frameBorder="0"
            allowFullScreen={true}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          ></iframe>
        </div>

        {/* Botón Colaborativo para agregar canciones */}
        <a
          href="https://open.spotify.com/playlist/2t9pyEpO0EvJB5bkjtCHQ7?si=AcH1litLROGmRiULRNNrnw&pi=awcVY9CzSKGhY&pt_success=1&nd=1&dlsi=b8cfbc1d662e4cb3"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.spotifyButton}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.565.387-.86.207-2.377-1.454-5.37-1.783-8.894-1.007-.336.08-.668-.135-.745-.47-.078-.337.136-.669.471-.746 3.847-.85 7.15-.477 9.822 1.156.295.18.387.563.207.86zm1.224-2.723c-.226.367-.707.487-1.074.26-2.717-1.67-6.864-2.15-10.07-1.177-.412.125-.845-.105-.97-.517-.124-.412.106-.846.518-.971 3.66-1.11 8.225-.572 11.33 1.34.367.227.488.708.266 1.065zm.106-2.828C14.562 8.87 9.07 8.687 5.89 9.65c-.53.16-1.09-.14-1.25-.67-.16-.53.14-1.09.67-1.25 3.66-1.11 9.72-.9 13.59 1.4.48.28.64.9.36 1.38-.28.48-.9.64-1.38.36z"/>
          </svg>
          Agregar música a la Playlist
        </a>
      </div>

      {/* MODAL DE AGRADECIMIENTO */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <span className={styles.modalIcon}>✨</span>
            <h3 className={`${styles.modalTitle} ornate-headline`}>¡Muchas Gracias!</h3>
            <p className={styles.modalText}>
              Tu sugerencia fue recibida. ¡La música va a estar increíble!
            </p>
            <button
              className={styles.modalButton}
              onClick={() => setShowModal(false)}
            >
              GENIAL
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MusicSection;