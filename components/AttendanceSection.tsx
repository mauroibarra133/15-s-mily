"use client";
import React, { useState, useEffect, useRef } from "react";
import { useReward } from "react-rewards";
import styles from "./AttendanceSection.module.css";
import { Card } from "./ui/Card";
import { Input } from "./ui/Input";
import { Select } from "./ui/Select";
import { Button } from "./ui/Button";

export const AttendanceSection: React.FC = () => {
  const { reward } = useReward('like-btn', 'emoji', {
    emoji: ['❤️'],
    elementCount: 20,
    spread: 50,
    elementSize: 25,

  });
  const sectionRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    attendance: "Sí, asistiré",
    dietary: "",
  });

  useEffect(() => {
    const observerOptions = { threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add(styles["attendance-section--visible"]);
        }
      });
    }, observerOptions);

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real application, submit this to an API or service.
    alert(`Asistencia registrada para: ${formData.fullName}\nAsistirá: ${formData.attendance}\nReq. Alimentarios: ${formData.dietary || "Ninguno"}`);
    reward();
  };

  return (
    <section
      ref={sectionRef}
      className={styles["attendance-section"]}
      id="rsvp"
    >
      <Card className={styles["attendance-section__card"]}>
        {/* Glow effect element */}
        <div className={styles["attendance-section__glow"]}></div>

        <div className={styles["attendance-section__content"]}>
          <div className={styles["attendance-section__header"]}>
            <h2 className={`${styles["attendance-section__title"]} ornate-headline silver-gradient-text`}>
              Confirmar Asistencia
            </h2>
            <p className={styles["attendance-section__subtitle"]}>
              Por favor, háganos saber si pueden asistir antes del 30 de octubre.
            </p>
          </div>

          <form onSubmit={handleSubmit} className={styles["attendance-section__form"]}>
            <Input
              name="fullName"
              label="NOMBRE COMPLETO"
              placeholder="Tu nombre"
              value={formData.fullName}
              onChange={handleChange}
              required
            />

            <div className={styles["attendance-section__form-row"]}>
              <Select
                name="attendance"
                label="ASISTENCIA"
                value={formData.attendance}
                onChange={handleChange}
              >
                <option value="Sí, asistiré">Sí, asistiré</option>
                <option value="No podré asistir">No podré asistir</option>
              </Select>

              <Input
                name="dietary"
                label="REQ. ALIMENTARIOS"
                placeholder="Ninguno, Vegano, Celiaco..."
                value={formData.dietary}
                onChange={handleChange}
              />
            </div>

              <span id="like-btn" style={{display:'none'}}></span>
              <Button
                type="submit"
                variant="silver"
                className={styles["attendance-section__submit-btn"]}
              >
                ENVIAR CONFIRMACIÓN
             </Button>
          </form>
        </div>
      </Card>
    </section>
  );
};
export default AttendanceSection;
