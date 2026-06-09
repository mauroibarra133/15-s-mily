"use client";
import React, { useState, useEffect, useRef } from "react";
import styles from "./GiftSection.module.css";
import { Card } from "./ui/Card";

export const GiftSection: React.FC = () => {
  const [isBoxOpen, setIsBoxOpen] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observerOptions = { threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add(styles["gift-section--visible"]);
        }
      });
    }, observerOptions);

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // CONTROL DE SCROLL: Bloquea el scroll del body cuando el modal está activo
  useEffect(() => {
    if (isModalVisible) {
      document.body.style.overflow = "hidden";
      // Opcional: Evita saltos de layout si la barra de scroll desaparece
      document.body.style.paddingRight = "var(--scrollbar-compensation, 0px)"; 
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }

    // Limpieza al desmontar el componente por seguridad
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [isModalVisible]);

  // SECUENCIA AL ABRIR: Primero se abre la caja, luego aparece el modal
  const handleOpen = () => {
    if (isBoxOpen) return; 
    setIsBoxOpen(true);
    
    setTimeout(() => {
      setIsModalVisible(true);
    }, 500); 
  };

  // SECUENCIA AL CERRAR: Primero se va el modal, luego se cierra la caja
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    setIsModalVisible(false);

    setTimeout(() => {
      setIsBoxOpen(false);
    }, 400); 
  };

  const handleCopyAlias = () => {
    navigator.clipboard.writeText("miluuu.ibarraa");
  };

  return (
    <section ref={sectionRef} className={styles["gift-section"]} id="gift">
      <div className={styles["gift-section__container"]}>
        <div className={styles["gift-section__header"]}>
          <h2 className={`${styles["gift-section__title"]} ornate-headline silver-gradient-text`}>
            Regalos y Deseos
          </h2>
          <p className={styles["gift-section__subtitle"]}>
            Su presencia es mi mayor regalo. Sin embargo, si desea honrarme con un obsequio, cualquier contribución será muy apreciada.
          </p>
        </div>

        {/* REGALO INTERACTIVO */}
        <div
          onClick={handleOpen}
          className={`${styles["gift-box"]} ${isBoxOpen ? styles["gift-box--open"] : ""}`}
        >
          <div className={styles["gift-box__wrapper"]}>
            <div className={styles["gift-box__body"]}>
              <div className={styles["gift-box__lid"]}>
                <div className={styles["gift-box__ribbon-knot"]}></div>
              </div>
              <div className={styles["gift-box__ribbon-vertical"]}></div>
              <div className={styles["gift-box__ribbon-horizontal"]}></div>
            </div>
          </div>

          <span className={styles["gift-box__instruction"]}>
            {isBoxOpen ? "¡GRACIAS POR TU GESTO!" : "CLIC PARA ABRIR"}
          </span>
        </div>
      </div>

      {/* MODAL FLOTANTE */}
      {isModalVisible && (
        <div className={styles["modal-overlay"]} onClick={handleClose}>
          <Card 
            className={styles["gift-box__content"]} 
            onClick={(e) => e.stopPropagation()} 
          >
            <button className={styles["modal-close"]} onClick={handleClose}>×</button>
            
            <span className={styles["modal-icon"]}>🎁</span>
            <p className={styles["gift-box__content-label"]}>DATOS BANCARIOS</p>
            <h3 className={`${styles["gift-box__content-title"]} ornate-headline`}>
              Mercado Pago
            </h3>
            
            <div className={styles["gift-box__content-details"]}>
              <div className={styles["detail-row"]}>
                <p className={styles["gift-box__content-detail-label"]}>Alias:</p>
                <p className={`${styles["gift-box__content-detail-value"]} ornate-headline`}>
                  miluuu.ibarraa
                </p>
              </div>
              <div className={styles["detail-row"]}>
                <p className={styles["gift-box__content-detail-label"]}>Titular:</p>
                <p className={styles["gift-box__content-owner"]}>Milagros Ibarra</p>
              </div>
            </div>

            <button className={styles["copy-button"]} onClick={handleCopyAlias}>
              Copiar Alias
            </button>
          </Card>
        </div>
      )}
    </section>
  );
};

export default GiftSection;