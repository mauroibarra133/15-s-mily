"use client";
import React, { useEffect, useRef } from "react";
import styles from "./PhotosSections.module.css";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import cameraIcon from "../public/assets/camera.png";
import uploadIcon from "../public/assets/upload.png";

export const PhotosSections: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observerOptions = { threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add(styles["photos-section--visible"]);
        }
      });
    }, observerOptions);

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className={styles["photos-section"]} id="photos">
      <div className={styles["photos-section__container"]}>
        <Card className={styles["photos-section__card"]}>
          <span className={`${styles["photos-section__icon"]} material-symbols-outlined`}>
            <img src={cameraIcon.src} alt="Cámara" />
          </span><h2 className={`${styles["photos-section__title"]} ornate-headline silver-gradient-text`}>
            ¡QUIERO VER TUS FOTOS!
          </h2>

          <div className={styles["photos-section__instagram-info"]}>
            <p className={`${styles["photos-section__instagram-tagline"]} ornate-headline`}>
              NO TE OLVIDES DE ETIQUETARME EN TODO LO QUE SUBAS
            </p>
          </div>

          <p className={styles["photos-section__footer-text"]}>
            ¡Compartamos juntos los mejores momentos de la noche!
          </p>

          <div className={styles["photos-section__action"]}>
            <div className={styles["photos-section__buttons-group"]}>
              <Button
                href="https://drive.google.com/drive/folders/1HPWDbvWINVv23RaOnvRB86nkABW-nqML?usp=drive_link"
                rel="noopener noreferrer"
                variant="silver"
                className={styles["photos-section__button"]}
              >
                <span className="material-symbols-outlined">
                  <img src={uploadIcon.src} alt="Subir" width={20} height={20} />
                </span>
                {/* Texto condicional según resolución */}
                <span className={styles["button-text--desktop"]}>SUBIR MIS FOTOS</span>
                <span className={styles["button-text--mobile"]}>SUBÍ</span>
              </Button>

              <Button
                href="https://www.instagram.com/mmiluu.ibarraa_?igsh=MWd3NTJ1cnF5MGVwOA=="
                rel="noopener noreferrer"
                className={`${styles["photos-section__button"]} ${styles["photos-section__button--instagram"]}`}
              >
                <span className="material-symbols-outlined">
                  <img src={cameraIcon.src} alt="Cámara" width={20} height={20} />
                </span>
                {/* Este texto desaparece por completo en mobile */}
                <span className={styles["button-text--desktop"]}>VER INSTAGRAM</span>
                <span className={styles["button-text--mobile"]}>VER</span>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default PhotosSections;