import React from "react";
import styles from "./Footer.module.css";

export const Footer: React.FC = () => {
  return (
    <footer className={styles.footer}>
      <div className={`${styles.footer__title} ornate-headline`}>
        15's Milagros Ibarra
      </div>
      <p className={styles.footer__copyright}>
        © 2026 MILAGRO'S 15TH BIRTHDAY. ALL RIGHTS RESERVED.
      </p>
      <div className={styles.footer__links}>
        <a className={styles.footer__link} href="#">
          Privacy Policy
        </a>
        <a className={styles.footer__link} href="#">
          Contact Support
        </a>
      </div>
      <a className={styles["footer__admin-btn"]} href="/admin">
        Acceso Administrador 🔐
      </a>
    </footer>
  );
};
export default Footer;
