"use client";
import React, { useEffect, useRef } from "react";
import styles from "./DressCodeSection.module.css";
import Silk from './Silk';

const CAROUSEL_ITEMS = [
  {
    category: "DAMAS",
    title: "Seda Celestial",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDZo9glTQOpD__Z3Ul2tAhTr6U7sZyCd20ldQbqWjtPq0AF5MmUMeVggfX06TpPMO6DmtgYnocmNTZYiJr9eYBGYJQvDsFM3Z6mpNn-lmeZNLqp-NxZ_qecZYIfJLywBeD8v9nBL5BZtPj8TuTU6svI_0FQTsL38l-_RSPrhO_KogeimmX03kyd0sJYq60MEw5gOOqot3EcnFI-AHQPjFJF8vMYGOKkjzCR6Jp8JplR69tshVWSEOTulYwCHQnVg7gb6mJkm0AswUg",
  },
  {
    category: "CABALLEROS",
    title: "Trajes de Gala",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAcs9DgZPMuyK-wBUqS5oj7Bxa9R7Bp169RXwTdU1p1Q2j74z0wMITyHkJqg56ZL-IdHQUQBOhGQbVgsPq7NHU0ewvJ6UDIpvaRURJqaz-ycTz8IFHMaTxSmBswAQ-gjgTCOKfx4cgaCK4mBYa0duCyh_ZIHy0wIpLkmvO4Afnib3fu193SqptOs1KJRbpoSkMvPTIo1KDm5enxgZNfislcdyIw4HKqvuIoHL99h_6rA8VoPdF6kVWiOnG8rZDaGqkWkubnFZ40NAs",
  },
  {
    category: "ACCESORIOS",
    title: "Detalles Plata",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBXBZST50bcRrVz2Lgi37k050z8FYZmE-dvSuGOnc1gemtgjf3fiMDE9sPNiOGLvP9_HUJdjEn9gYRIjQyuN1rMaQtyizQepi6G-qp-hdjs9-VhIB0LS2Swul1jJaC29D8yOTH5WAc5z0zV_RHg8rC3bNiQJwGymxWYGMtJoF1a6ofTZA5MncIzzY4oXKYe2DrFt081RYNUe3rSVX5IEnhujmViVUMS29l-LI-JsKjIpFQgcvGJsEUoA0ZEfN_PWobzCl9LH08fJBo",
  },
  {
    category: "GRUPO",
    title: "Estilo Noche",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBksQExyo9lsaNjHqu7_BCbyP1_zVgY6Mj0raWnvq8umO5ADvn0tMHmN1804GEeo6fjPxRUniQTrfTxMcjt9prVKRqSUSBf059UUYpxpSiScBJ_m0JZevy_Myecd5L2Vemnf5pJuJCv_86r-8JHt0bm9nF5U5dwBj__vvgvs8RTdXT40ZCLSch_QBlc8obfr1drJXmnm9t7OkzbAPA8mnSwEW4OHwKel3B8RWbGs4bqzhrW9qnQPZBhC3pwqb8Q0SH387piVsF3v4",
  },
];

const SUGGESTED_PALETTE = [
  { name: "Lila Pastel", color: "#e2d4f0" },
  { name: "Rosa Claro", color: "#fbcfe8" },
  { name: "Beige", color: "#f5f5dc" },
  { name: "Gris Claro", color: "#e2e8f0" },
  { name: "Azul Muy Claro", color: "#e0f2fe" },
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
            Te invitamos a brillar con nosotros. Paleta sugerida: Azul Noche, Plateado y Negro Clásico.
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