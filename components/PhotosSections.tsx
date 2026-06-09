"use client";
import React, { useEffect, useRef } from "react";
import styles from "./PhotosSections.module.css";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";

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
            photo_camera
          </span>
          <h2 className={`${styles["photos-section__title"]} ornate-headline silver-gradient-text`}>
            ¡QUIERO VER TUS FOTOS!
          </h2>
          <div className={styles["photos-section__instagram-info"]}>
            <p className={`${styles["photos-section__instagram-tagline"]} ornate-headline`}>
              PUEDEN USAR MI # EN TODAS SUS PUBLICACIONES DE INSTAGRAM
            </p>
            <div className={styles["photos-section__hashtag-wrapper"]}>
              <p className={`${styles["photos-section__hashtag"]} ornate-headline`}>
                #15mily
              </p>
            </div>
          </div>
          <p className={styles["photos-section__footer-text"]}>
            ¡Compartamos juntos los mejores momentos de la noche!
          </p>
          <div className={styles["photos-section__action"]}>
            <Button
              href="#"
              variant="silver"
              className={styles["photos-section__button"]}
            >
              <span className="material-symbols-outlined">cloud_upload</span>
              SUBIR MIS FOTOS
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
};
export default PhotosSections;
