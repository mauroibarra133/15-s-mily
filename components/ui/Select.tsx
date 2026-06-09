import React from "react";
import styles from "./Input.module.css"; // Reuse input styles container and label

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({ label, children, className = "", ...props }) => {
  return (
    <div className={styles.container}>
      {label && <label className={styles.label}>{label}</label>}
      <select className={`${styles.input} ${styles.select} ${className}`} {...props}>
        {children}
      </select>
    </div>
  );
};
