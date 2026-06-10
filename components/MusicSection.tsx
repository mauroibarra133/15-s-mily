"use client";
import React, { useState } from "react";
import styles from "./MusicSection.module.css";
import SoftAurora from "./SoftAurora";

export const MusicSection: React.FC = () => {
  const [songInput, setSongInput] = useState("");
  const [showModal, setShowModal] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!songInput.trim()) return;

    console.log("Canción sugerida:", songInput);

    // Abrimos el modal personalizado en vez del alert nativo
    setShowModal(true);
    setSongInput("");
  };

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

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputWrapper}>
            <label className={styles.label}>CANCIÓN / ARTISTA</label>
            <input
              type="text"
              className={styles.input}
              placeholder="Ej: Dancing Queen - ABBA"
              value={songInput}
              onChange={(e) => setSongInput(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={!songInput.trim()}
          >
            SUGERIR CANCIÓN
          </button>
        </form>
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