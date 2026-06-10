"use client";
import React, { useEffect, useRef } from "react";
import styles from "./DressCodeSection.module.css";
import Silk from './Silk';
import dressCodeImage from '../public/assets/dress-code-damas.jpeg';
import dressCodeImage2 from '../public/assets/dress-code-hombres.jpeg';
import dressCodeImage3 from '../public/assets/dress-code-damas-2.jpeg';
import dressCodeImage4 from '../public/assets/dress-code-hombres-2.jpeg';

const CAROUSEL_ITEMS = [
  {
    category: "DAMAS",
    title: "",
    image: dressCodeImage.src,
  },
  {
    category: "CABALLEROS",
    title: "",
    image: dressCodeImage2.src,
  },
  {
    category: "DAMAS",
    title: "",
    image: dressCodeImage3.src,
  },
  {
    category: "CABALLEROS",
    title: "",
    image: dressCodeImage4.src,
  },
];

const SUGGESTED_PALETTE = [
  { name: "Lila Pastel", color: "#e2d4f0" },
  { name: "Rosa Claro", color: "#fbcfe8" },
  { name: "Beige", color: "#f5f5dc" },
  { name: "Gris Claro", color: "#e2e8f0" },
  { name: "Celeste", color: "#e0f2fe" },
];

export const DressCodeSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observerOptions = { threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add(styles["dress-code--visible"]);
        }
      });
    }, observerOptions);

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Función para desplazar el carrusel con las flechas
  const handleScroll = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const { scrollLeft, clientWidth } = carouselRef.current;
      // Desplaza el equivalente al ancho de una tarjeta o contenedor aproximado
      const scrollAmount = direction === 'left' ? -clientWidth * 0.75 : clientWidth * 0.75;
      
      carouselRef.current.scrollTo({
        left: scrollLeft + scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section ref={sectionRef} className={styles["dress-code"]} id="dress-code">
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1 }}>
        <Silk
          speed={5}
          scale={1.1}
          color="#0044b3"
          noiseIntensity={1.3}
          rotation={0}
        />
      </div>

      <div className={styles["dress-code__container"]}>
        <div className={styles["dress-code__header"]}>
          <h2 className={`${styles["dress-code__title"]} ornate-headline silver-gradient-text`}>
            Dress Code: Elegante Sport
          </h2>
          <p className={styles["dress-code__subtitle"]}>
            Te invitamos a brillar con nosotros. Paleta sugerida: colores claros. No uses azul ni negro ni plateado.
          </p>
        </div>

        {/* CONTENEDOR RELATIVO PARA ENVOLVER EL CARRUSEL Y LAS FLECHAS */}
        <div className={styles["dress-code__carousel-wrapper"]}>
          
          {/* Botón Izquierdo */}
          <button 
            className={`${styles["carousel-nav"]} ${styles["carousel-nav--left"]}`}
            onClick={() => handleScroll('left')}
            aria-label="Anterior"
          >
            ‹
          </button>

          {/* El Carrusel Ajustado */}
          <div 
            ref={carouselRef} 
            className={`${styles["dress-code__carousel"]} ${styles["hide-scrollbar"]}`}
          >
            {CAROUSEL_ITEMS.map((item, index) => (
              <div key={index} className={styles["dress-code__card"]}>
                <img
                  alt={item.title}
                  className={styles["dress-code__card-image"]}
                  src={item.image}
                />
                <div className={styles["dress-code__card-overlay"]}></div>
                <div className={styles["dress-code__card-content"]}>
                  <span className={styles["dress-code__card-category"]}>{item.category}</span>
                  <p className={`${styles["dress-code__card-title"]} ornate-headline`}>
                    {item.title}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Botón Derecho */}
          <button 
            className={`${styles["carousel-nav"]} ${styles["carousel-nav--right"]}`}
            onClick={() => handleScroll('right')}
            aria-label="Siguiente"
          >
            ›
          </button>
        </div>

        <div className={styles["dress-code__palette"]}>
          <p className={styles["dress-code__palette-label"]}>PALETA SUGERIDA</p>
          <p className={styles["dress-code__palette-label"]}>Colores pasteles</p>
          <div className={styles["dress-code__palette-list"]}>
            {SUGGESTED_PALETTE.map((item, index) => (
              <div key={index} className={styles["dress-code__palette-item"]}>
                <div
                  className={styles["dress-code__palette-dot"]}
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className={styles["dress-code__palette-name"]}>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default DressCodeSection;