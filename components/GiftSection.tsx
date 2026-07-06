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

  // CONTROL DE SCROLL ULTRA ESTRICTO PARA WEB Y MÓVIL
  useEffect(() => {
    if (isModalVisible) {
      // Bloqueamos en body e html para garantizar PC
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [isModalVisible]);

  const handleOpen = () => {
    if (isBoxOpen) return; 
    setIsBoxOpen(true);
    
    setTimeout(() => {
      setIsModalVisible(true);
    }, 500); 
  };

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
            Tu presencia es mi mayor regalo. Sin embargo, si deseas honrarme con un obsequio, cualquier contribución será muy apreciada.
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
    {/* Cambiado de <Card> a <div> para aceptar el onClick y el stopPropagation de forma nativa */}
    <div 
      className={`${styles["gift-box__content"]} card`} /* Mantiene tus estilos y si Card usa una clase global 'card' la agregas acá */
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
          <p className={styles["gift-box__content-owner"]}>Milagros Ailén Ibarra</p>
        </div>
      </div>

      <button className={styles["copy-button"]} onClick={handleCopyAlias}>
        Copiar Alias
      </button>
    </div>
  </div>
)}
    </section>
  );
};

export default GiftSection;