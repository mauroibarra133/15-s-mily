import React from "react";
import styles from "./Card.module.css";

interface CardProps {
  variant?: "glass" | "default";
  className?: string;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = "glass",
  className = "",
  children,
}) => {
  const cardClass = [
    styles.card,
    styles[`card--${variant}`],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={cardClass}>{children}</div>;
};
