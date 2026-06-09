"use client";
import React from "react";
import styles from "./Header.module.css";
import { Button } from "./ui/Button";

export const Header: React.FC = () => {
  const [phoneSize, setPhoneSize] = React.useState(false);
  
  React.useEffect(() => {
    const checkPhoneSize = () => {
      setPhoneSize(window.innerWidth < 408);
    };
    
    checkPhoneSize();
    window.addEventListener('resize', checkPhoneSize);
    
    return () => window.removeEventListener('resize', checkPhoneSize);
  }, []); 
  
  return (
    <header className={styles.header}>
      <div className={styles.header__logo}>15's Milu</div>
      <nav className={styles.header__nav}>
        <a className={`${styles.header__link} ${styles["header__link--active"]}`} href="#hero">
          Evento
        </a>
        <a className={styles.header__link} href="#dress-code">
          Dress Code
        </a>
        <a className={styles.header__link} href="#gift">
          Regalos
        </a>
        <a className={styles.header__link} href="#photos">
          Fotos
        </a>
        <a className={styles.header__link} href="#rsvp">
          Asistencia
        </a>
      </nav>
      <Button href="#rsvp" variant="silver" className={styles.header__cta}>
        {phoneSize ? 'Confirmá' : 'Confirma tu Presencia'}
      </Button>
    </header>
  );
};
export default Header;
