"use client";
import React, { useState, useEffect, useRef } from "react";
import { useReward } from "react-rewards";
import styles from "./AttendanceSection.module.css";
import { Card } from "./ui/Card";
import { Input } from "./ui/Input";
import { Select } from "./ui/Select";
import { Button } from "./ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentPricingConfig, PricingConfig } from "@/lib/pricing";
import { logEvent } from "@/lib/analytics";

interface Companion {
  id: string;
  fullName: string;
  attendance: string;
  dietary: string;
  ticketType: string;
  installmentNumber: string;
}

export const AttendanceSection: React.FC = () => {
  const { reward } = useReward("like-btn", "emoji", {
    emoji: ["❤️"],
    elementCount: 20,
    spread: 50,
    elementSize: 25,
  });

  const sectionRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null);
  const [showPaymentOption, setShowPaymentOption] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error";
    text: string;
    isDuplicate?: boolean;
  } | null>(null);

  const [copiedAlias, setCopiedAlias] = useState(false);
  const [activeTab, setActiveTab] = useState<"rsvp" | "payment">("rsvp");

  // Multi-guest state
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [applySameDietary, setApplySameDietary] = useState(false);
  const [applySamePayment, setApplySamePayment] = useState(false);

  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [showPolicyPopover, setShowPolicyPopover] = useState(false);

  const handleCopyAlias = () => {
    navigator.clipboard.writeText("karysouvenirs");
    setCopiedAlias(true);
    logEvent("copy_alias_rsvp");
    setTimeout(() => setCopiedAlias(false), 2000);
  };

  const [formData, setFormData] = useState({
    fullName: "",
    attendance: "Sí, asistiré",
    dietary: "",
    ticketType: "adulto",
    informPayment: "si",
    installmentNumber: "total",
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

  // Fetch server pricing configuration and time
  useEffect(() => {
    async function fetchConfig() {
      try {
        const config = await getCurrentPricingConfig();
        setPricingConfig(config);
        setShowPaymentOption(true);
      } catch (err) {
        console.error("Error fetching pricing configuration:", err);
      }
    }
    fetchConfig();
  }, []);

  // Sincronizar requisitos dietarios si applySameDietary está activo
  useEffect(() => {
    if (applySameDietary) {
      setCompanions((prev) =>
        prev.map((c) => ({
          ...c,
          dietary: formData.dietary,
        }))
      );
    }
  }, [formData.dietary, applySameDietary]);

  // Sincronizar conceptos de pago si applySamePayment está activo
  useEffect(() => {
    if (applySamePayment) {
      setCompanions((prev) =>
        prev.map((c) => ({
          ...c,
          installmentNumber: formData.installmentNumber,
        }))
      );
    }
  }, [formData.installmentNumber, applySamePayment]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const handleAddCompanion = () => {
    const newCompanion: Companion = {
      id: Date.now().toString(),
      fullName: "",
      attendance: "Sí, asistiré",
      dietary: applySameDietary ? formData.dietary : "",
      ticketType: "adulto",
      installmentNumber: applySamePayment ? formData.installmentNumber : "total",
    };
    setCompanions((prev) => [...prev, newCompanion]);
  };

  const handleRemoveCompanion = (id: string) => {
    setCompanions((prev) => prev.filter((c) => c.id !== id));
  };

  const handleCompanionChange = (id: string, name: keyof Companion, value: string) => {
    setCompanions((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const updated = { ...c, [name]: value };
          return updated;
        }
        return c;
      })
    );
  };

  const sanitizeFilename = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^a-z0-9]/g, "_") // Replace spaces/special chars with underscores
      .replace(/_+/g, "_"); // Collapse multiple underscores
  };

  // Calcular el monto total acumulado para el pago consolidado
  const getCalculateTotalAmount = () => {
    if (!pricingConfig || formData.informPayment !== "si") return 0;

    let total = 0;

    // Primer integrante
    const mainAttends = formData.attendance === "Sí, asistiré";
    const mainIsFree = formData.ticketType === "menor_0_2";
    if (mainAttends && !mainIsFree) {
      total +=
        formData.installmentNumber === "total"
          ? pricingConfig.prices[formData.ticketType] ?? 0
          : pricingConfig.installmentPrices[formData.ticketType] ?? 0;
    }

    // Acompañantes
    companions.forEach((c) => {
      const attends = c.attendance === "Sí, asistiré";
      const isFree = c.ticketType === "menor_0_2";
      if (attends && !isFree) {
        total +=
          c.installmentNumber === "total"
            ? pricingConfig.prices[c.ticketType] ?? 0
            : pricingConfig.installmentPrices[c.ticketType] ?? 0;
      }
    });

    return total;
  };

  const currentPayAmount = getCalculateTotalAmount();
  const wantsToApprovePayment = formData.informPayment === "si" && currentPayAmount > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus(null);

    // 1. Validaciones iniciales
    if (!formData.fullName.trim()) {
      setSubmitStatus({ type: "error", text: "Por favor, ingresa tu nombre completo." });
      return;
    }

    // Validar nombres de los acompañantes
    for (let i = 0; i < companions.length; i++) {
      if (!companions[i].fullName.trim()) {
        setSubmitStatus({
          type: "error",
          text: `Por favor, ingresa el nombre completo del acompañante #${i + 1}.`,
        });
        return;
      }
    }

    if (wantsToApprovePayment && !receiptFile) {
      setSubmitStatus({
        type: "error",
        text: "Por favor, selecciona una foto o PDF del comprobante de transferencia.",
      });
      return;
    }

    setSubmitting(true);

    try {
      // 2. Control de duplicados en la base de datos (para todos a la vez)
      const allNames = [
        formData.fullName.trim(),
        ...companions.map((c) => c.fullName.trim()),
      ];

      const { data: existingGuests, error: lookupError } = await supabase
        .from("guests")
        .select("full_name")
        .in("full_name", allNames);

      if (lookupError) throw lookupError;

      if (existingGuests && existingGuests.length > 0) {
        const dupNames = existingGuests.map((eg) => eg.full_name).join(", ");
        setSubmitStatus({
          type: "error",
          text: `El o los siguientes invitados ya están registrados: ${dupNames}. Si querés informar un pago adicional, por favor andá al Portal de Pagos.`,
          isDuplicate: true,
        });
        setSubmitting(false);
        return;
      }

      // 3. Registrar a todos en la tabla `guests`
      const guestRows = [
        {
          full_name: formData.fullName.trim(),
          attendance: formData.attendance,
          dietary: formData.dietary.trim() || "Ninguno",
          ticket_type: formData.attendance === "Sí, asistiré" ? formData.ticketType : "adulto",
        },
        ...companions.map((c) => ({
          full_name: c.fullName.trim(),
          attendance: c.attendance,
          dietary: c.dietary.trim() || "Ninguno",
          ticket_type: c.attendance === "Sí, asistiré" ? c.ticketType : "adulto",
        })),
      ];

      const { data: createdGuests, error: guestInsertError } = await supabase
        .from("guests")
        .insert(guestRows)
        .select("id, full_name");

      if (guestInsertError) throw guestInsertError;

      // 4. Subir archivo de comprobante e insertar pagos asociados (si aplica)
      if (wantsToApprovePayment && receiptFile && createdGuests) {
        const fileExt = receiptFile.name.split(".").pop();
        const cleanNames = allNames.map((n) => sanitizeFilename(n)).join("_").substring(0, 80);
        const filePath = `grupo_${cleanNames}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("receipts")
          .upload(filePath, receiptFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(filePath);
        const receiptUrl = urlData.publicUrl;

        // Armar registros de pago individuales con la misma URL del comprobante
        const paymentRows: any[] = [];

        // Pago primer integrante
        const mainAttends = formData.attendance === "Sí, asistiré";
        const mainIsFree = formData.ticketType === "menor_0_2";
        if (mainAttends && !mainIsFree) {
          const guestRecord = createdGuests.find((cg) => cg.full_name === formData.fullName.trim());
          if (guestRecord) {
            const amount = formData.installmentNumber === "total"
              ? pricingConfig?.prices[formData.ticketType] ?? 0
              : pricingConfig?.installmentPrices[formData.ticketType] ?? 0;

            paymentRows.push({
              guest_id: guestRecord.id,
              installment_number: formData.installmentNumber,
              amount: amount,
              receipt_url: receiptUrl,
              status: "pending",
            });
          }
        }

        // Pago acompañantes
        companions.forEach((c) => {
          const attends = c.attendance === "Sí, asistiré";
          const isFree = c.ticketType === "menor_0_2";
          if (attends && !isFree) {
            const guestRecord = createdGuests.find((cg) => cg.full_name === c.fullName.trim());
            if (guestRecord) {
              const amount = c.installmentNumber === "total"
                ? pricingConfig?.prices[c.ticketType] ?? 0
                : pricingConfig?.installmentPrices[c.ticketType] ?? 0;

              paymentRows.push({
                guest_id: guestRecord.id,
                installment_number: c.installmentNumber,
                amount: amount,
                receipt_url: receiptUrl,
                status: "pending",
              });
            }
          }
        });

        if (paymentRows.length > 0) {
          const { error: paymentError } = await supabase.from("payments").insert(paymentRows);
          if (paymentError) throw paymentError;

          // Enviar push de aviso grupal al admin
          const namesList = allNames.join(", ");
          fetch("/api/notify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              guestName: namesList,
              amount: currentPayAmount,
              installmentNumber: "inicial",
            }),
          }).catch((err) => console.error("Error triggering push notification:", err));
        }
      }

      // Success!
      setSubmitStatus({
        type: "success",
        text: "¡Asistencia registrada correctamente! Muchas gracias por confirmar.",
      });

      // Reset
      setFormData({
        fullName: "",
        attendance: "Sí, asistiré",
        dietary: "",
        ticketType: "adulto",
        informPayment: "si",
        installmentNumber: "total",
      });
      setCompanions([]);
      setApplySameDietary(false);
      setApplySamePayment(false);
      setReceiptFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      reward();
    } catch (error: any) {
      console.error("Submission error:", error);
      setSubmitStatus({
        type: "error",
        text: `Ocurrió un error al procesar tu confirmación: ${error.message || "Por favor, intenta nuevamente."}`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isMainAttending = formData.attendance === "Sí, asistiré";
  const isMainFreeTicket = isMainAttending && formData.ticketType === "menor_0_2";

  return (
    <section ref={sectionRef} className={styles["attendance-section"]} id="rsvp">
      <Card className={styles["attendance-section__card"]}>
        <div className={styles["attendance-section__glow"]}></div>

        <div className={styles["attendance-section__content"]}>
          <div className={styles["attendance-section__header"]}>
            <h2 className={`${styles["attendance-section__title"]} ornate-headline silver-gradient-text`}>
              Confirmar Asistencia
            </h2>
            <p className={styles["attendance-section__subtitle"]}>
              Por favor, decime si podes asistir antes del 30 de octubre.
            </p>
          </div>

          <div className={styles["attendance-section__tabs"]}>
            <button
              type="button"
              className={`${styles["attendance-section__tab"]} ${
                activeTab === "rsvp" ? styles["attendance-section__tab--active"] : ""
              }`}
              onClick={() => setActiveTab("rsvp")}
            >
              ✍️ Confirmar Asistencia (1ra Vez)
            </button>
            <button
              type="button"
              className={`${styles["attendance-section__tab"]} ${
                activeTab === "payment" ? styles["attendance-section__tab--active"] : ""
              }`}
              onClick={() => setActiveTab("payment")}
            >
              💳 Pagar Cuotas / Ver Estado
            </button>
          </div>

          {activeTab === "rsvp" ? (
            <form onSubmit={handleSubmit} className={styles["attendance-section__form"]}>
              {/* Primer Integrante (Principal) */}
              <div className={styles["guest-block"]}>
                <h4 className={styles["guest-block-title"]}>👤 Integrante Principal</h4>
                
                <Input
                  name="fullName"
                  label="NOMBRE COMPLETO (Tal como figura en la tarjeta)"
                  placeholder="Tu nombre y apellido"
                  value={formData.fullName}
                  onChange={handleChange}
                  disabled={submitting}
                  required
                />

                <div className={styles["attendance-section__form-row"]}>
                  <Select
                    name="attendance"
                    label="ASISTENCIA"
                    value={formData.attendance}
                    onChange={handleChange}
                    disabled={submitting}
                  >
                    <option value="Sí, asistiré">Sí, asistiré</option>
                    <option value="No podré asistir">No podré asistir</option>
                  </Select>

                  <Input
                    name="dietary"
                    label="REQ. ALIMENTARIOS"
                    placeholder="Ninguno, Vegano, Celíaco, etc."
                    value={formData.dietary}
                    onChange={handleChange}
                    disabled={submitting}
                  />
                </div>

                {isMainAttending && pricingConfig && (
                  <div className={styles["attendance-section__form-row"]}>
                    <Select
                      name="ticketType"
                      label="TIPO DE ENTRADA"
                      value={formData.ticketType}
                      onChange={handleChange}
                      disabled={submitting}
                    >
                      <option value="adulto">
                        Adulto (${pricingConfig.prices.adulto.toLocaleString("es-AR")}
                        {pricingConfig.allowInstallments ? ` o 4 cuotas de $${pricingConfig.installmentPrices.adulto.toLocaleString("es-AR")}` : ""}
                        )
                      </option>
                      <option value="adolescente">
                        Adolescente (12 a 17 años) (${pricingConfig.prices.adolescente.toLocaleString("es-AR")}
                        {pricingConfig.allowInstallments ? ` o 4 cuotas de $${pricingConfig.installmentPrices.adolescente.toLocaleString("es-AR")}` : ""}
                        )
                      </option>
                      <option value="menor_3_11">
                        Menor 3-11 años (${pricingConfig.prices.menor_3_11.toLocaleString("es-AR")}
                        {pricingConfig.allowInstallments ? ` o 4 cuotas de $${pricingConfig.installmentPrices.menor_3_11.toLocaleString("es-AR")}` : ""}
                        )
                      </option>
                      <option value="menor_0_2">Menor 0-2 años ($0)</option>
                    </Select>

                    {showPaymentOption && !isMainFreeTicket && (
                      <Select
                        name="installmentNumber"
                        label="CONCEPTO A PAGAR"
                        value={formData.installmentNumber}
                        onChange={handleChange}
                        disabled={submitting}
                      >
                        <option value="total">Pago Total Tarjeta</option>
                        {pricingConfig.allowInstallments && (
                          <option value="1">Primera Cuota</option>
                        )}
                      </Select>
                    )}
                  </div>
                )}
              </div>

              {/* Controles de Llenado Rápido (Quick Settings) */}
              {companions.length > 0 && (
                <div className={styles["quick-settings-row"]}>
                  <label className={styles["quick-settings-checkbox"]}>
                    <input
                      type="checkbox"
                      checked={applySameDietary}
                      onChange={(e) => setApplySameDietary(e.target.checked)}
                      disabled={submitting}
                    />
                    <span>Sincronizar requisitos alimenticios con todos</span>
                  </label>
                  <label className={styles["quick-settings-checkbox"]}>
                    <input
                      type="checkbox"
                      checked={applySamePayment}
                      onChange={(e) => setApplySamePayment(e.target.checked)}
                      disabled={submitting}
                    />
                    <span>Sincronizar concepto de pago con todos</span>
                  </label>
                </div>
              )}

              {/* Lista de Acompañantes adicionales */}
              {companions.map((companion, index) => (
                <div key={companion.id} className={styles["guest-block"]}>
                  <div className={styles["guest-block-header"]}>
                    <h4 className={styles["guest-block-title"]}>👨‍👩‍👧‍👦 Acompañante #{index + 1}</h4>
                    <button
                      type="button"
                      className={styles["remove-companion-btn"]}
                      onClick={() => handleRemoveCompanion(companion.id)}
                      disabled={submitting}
                    >
                      Quitar ✕
                    </button>
                  </div>

                  <Input
                    name={`companion_fullName_${companion.id}`}
                    label="NOMBRE COMPLETO"
                    placeholder="Nombre y apellido del acompañante"
                    value={companion.fullName}
                    onChange={(e) => handleCompanionChange(companion.id, "fullName", e.target.value)}
                    disabled={submitting}
                    required
                  />

                  <div className={styles["attendance-section__form-row"]}>
                    <Select
                      name={`companion_attendance_${companion.id}`}
                      label="ASISTENCIA"
                      value={companion.attendance}
                      onChange={(e) => handleCompanionChange(companion.id, "attendance", e.target.value)}
                      disabled={submitting}
                    >
                      <option value="Sí, asistiré">Sí, asistiré</option>
                      <option value="No podré asistir">No podré asistir</option>
                    </Select>

                    <Input
                      name={`companion_dietary_${companion.id}`}
                      label="REQ. ALIMENTARIOS"
                      placeholder="Ninguno, Vegano, Celíaco, etc."
                      value={companion.dietary}
                      onChange={(e) => handleCompanionChange(companion.id, "dietary", e.target.value)}
                      disabled={submitting || applySameDietary}
                    />
                  </div>

                  {companion.attendance === "Sí, asistiré" && pricingConfig && (
                    <div className={styles["attendance-section__form-row"]}>
                      <Select
                        name={`companion_ticketType_${companion.id}`}
                        label="TIPO DE ENTRADA"
                        value={companion.ticketType}
                        onChange={(e) => handleCompanionChange(companion.id, "ticketType", e.target.value)}
                        disabled={submitting}
                      >
                        <option value="adulto">
                          Adulto (${pricingConfig.prices.adulto.toLocaleString("es-AR")}
                          {pricingConfig.allowInstallments ? ` o 4 cuotas de $${pricingConfig.installmentPrices.adulto.toLocaleString("es-AR")}` : ""}
                          )
                        </option>
                        <option value="adolescente">
                          Adolescente (12 a 17 años) (${pricingConfig.prices.adolescente.toLocaleString("es-AR")}
                          {pricingConfig.allowInstallments ? ` o 4 cuotas de $${pricingConfig.installmentPrices.adolescente.toLocaleString("es-AR")}` : ""}
                          )
                        </option>
                        <option value="menor_3_11">
                          Menor 3-11 años (${pricingConfig.prices.menor_3_11.toLocaleString("es-AR")}
                          {pricingConfig.allowInstallments ? ` o 4 cuotas de $${pricingConfig.installmentPrices.menor_3_11.toLocaleString("es-AR")}` : ""}
                          )
                        </option>
                        <option value="menor_0_2">Menor 0-2 años ($0)</option>
                      </Select>

                      {showPaymentOption && companion.ticketType !== "menor_0_2" && (
                        <Select
                          name={`companion_installmentNumber_${companion.id}`}
                          label="CONCEPTO A PAGAR"
                          value={companion.installmentNumber}
                          onChange={(e) => handleCompanionChange(companion.id, "installmentNumber", e.target.value)}
                          disabled={submitting || applySamePayment}
                        >
                          <option value="total">Pago Total Tarjeta</option>
                          {pricingConfig.allowInstallments && (
                            <option value="1">Primera Cuota</option>
                          )}
                        </Select>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Botón para agregar más acompañantes */}
              <button
                type="button"
                className={styles["add-companion-btn"]}
                onClick={handleAddCompanion}
                disabled={submitting}
              >
                ➕ Agregar familiar / acompañante
              </button>

              {/* Cuadro de Información Bancaria y Carga de Comprobante Consolidada */}
              {wantsToApprovePayment && pricingConfig && (
                <div className={styles["attendance-section__payment-box"]}>
                  <div className={styles.policyAlertContainer}>
                    <p className={styles.policyAlertText}>
                      ⚠️ Pago único y recargo de $10.000 después del 30 de Octubre.
                    </p>
                    <div className={styles.policyInfoTriggerWrapper}>
                      <button
                        type="button"
                        className={styles.policyInfoTrigger}
                        onClick={() => setShowPolicyPopover(!showPolicyPopover)}
                        onBlur={() => setTimeout(() => setShowPolicyPopover(false), 200)}
                        title="Ver política de pago completa"
                      >
                        ℹ️
                      </button>
                      {showPolicyPopover && (
                        <div className={styles.policyPopover}>
                          <p style={{ margin: 0, fontSize: "12.5px", lineHeight: "1.4", color: "var(--color-on-surface)" }}>
                            Para confirmar tu presencia debés informar la transferencia de la primera cuota o el pago total. Después del 30 de Octubre el pago se realiza en una sola cuota (pago total) y la tarjeta tiene un recargo de $10.000 para todas las categorías.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={styles.paymentCard3DWrapper}>
                    <div
                      className={`${styles.paymentCard3D} ${
                        isCardFlipped ? styles.paymentCard3DFlipped : ""
                      }`}
                      onClick={() => setIsCardFlipped(!isCardFlipped)}
                    >
                      {/* CARD FRONT */}
                      <div className={styles.paymentCard3DFront}>
                        <div className={styles.paymentCard3DGlow}></div>
                        <div className={styles.paymentCard3DChip}></div>
                        <div className={styles.paymentCard3DBrand}>DATOS BANCARIOS</div>
                        <div className={styles.paymentCard3DPrompt}>
                          <span>💳 VER DATOS DE TRANSFERENCIA</span>
                          <span className={styles.paymentCard3DSubprompt}>(Toca para dar vuelta)</span>
                        </div>
                      </div>

                      {/* CARD BACK */}
                      <div className={styles.paymentCard3DBack} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.paymentCard3DBackStripe}></div>
                        <div className={styles.paymentCard3DDetails}>
                          <div className={styles.paymentCard3DDetailRow}>
                            <span className={styles.paymentCard3DLabel}>TITULAR:</span>
                            <strong className={styles.paymentCard3DValue}>KARINA ANDREA GARCIA</strong>
                          </div>
                          <div className={styles.paymentCard3DDetailRow}>
                            <span className={styles.paymentCard3DLabel}>CUIL:</span>
                            <strong className={styles.paymentCard3DValue}>27-24012475-6</strong>
                          </div>
                          <div className={styles.paymentCard3DDetailRow}>
                            <span className={styles.paymentCard3DLabel}>CBU:</span>
                            <strong className={styles.paymentCard3DValue} style={{ letterSpacing: "0.5px" }}>0000003100084572082442</strong>
                          </div>
                          <div className={styles.paymentCard3DDetailRow} style={{ marginTop: "4px" }}>
                            <span className={styles.paymentCard3DLabel}>ALIAS:</span>
                            <div className={styles.paymentCard3DAliasWrapper}>
                              <strong className={styles.paymentCard3DValue} style={{ color: "var(--color-primary)" }}>karysouvenirs</strong>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyAlias();
                                }}
                                className={styles.paymentCard3DCopyBtn}
                              >
                                {copiedAlias ? "¡Copiado!" : "Copiar"}
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className={styles.paymentCard3DBackFooter} onClick={() => setIsCardFlipped(false)}>
                          ↩ Volver al frente
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={styles["attendance-section__form-row"]}>
                    <div className={styles["attendance-section__file-input"]} style={{ width: "100%" }}>
                      <span className={styles["attendance-section__file-label"]}>
                        COMPROBANTE GENERAL DE TRANSFERENCIA (FOTO / PDF)
                      </span>
                      <div
                        className={`${styles["attendance-section__file-input-wrapper"]} ${
                          receiptFile ? styles["attendance-section__file-input-wrapper--filled"] : ""
                        }`}
                        onClick={() => !submitting && fileInputRef.current?.click()}
                      >
                        {receiptFile ? receiptFile.name : "Seleccionar Archivo..."}
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  {!pricingConfig.allowInstallments && (
                    <p className={styles["attendance-section__warning-strong"]}>
                      * El pago en cuotas ya no está disponible. Después del 30 de Octubre solo se permite abonar en un único pago total con recargo.
                    </p>
                  )}

                  <div className={styles["attendance-section__amount-badge"]} style={{ fontSize: "15px", padding: "14px", borderRadius: "8px" }}>
                    Monto General a Transferir: ${currentPayAmount.toLocaleString("es-AR")}
                  </div>
                </div>
              )}

              {submitStatus && (
                <div
                  className={`${styles["attendance-section__message"]} ${
                    submitStatus.type === "success"
                      ? styles["attendance-section__message--success"]
                      : styles["attendance-section__message--error"]
                  }`}
                >
                  <p style={{ margin: 0 }}>{submitStatus.text}</p>
                  {submitStatus.isDuplicate && (
                    <Button
                      type="button"
                      variant="text"
                      href="/pagar"
                      className="mt-2"
                      style={{ fontSize: "14px", textDecoration: "underline", color: "var(--color-primary)" }}
                    >
                      Ir al Portal de Pagos
                    </Button>
                  )}
                </div>
              )}

              <Button
                type="submit"
                variant="silver"
                className={styles["attendance-section__submit-btn"]}
                id="like-btn"
                disabled={submitting}
              >
                {submitting ? "PROCESANDO..." : "ENVIAR CONFIRMACIÓN"}
              </Button>
            </form>
          ) : (
            <div className={styles["attendance-section__portal-tab-content"]}>
              <p className={styles["attendance-section__portal-desc"]}>
                Si ya confirmaste tu presencia y querés gestionar tus pagos, ingresá a nuestro Portal de Pagos interactivo donde podés:
              </p>
              <ul className={styles["attendance-section__portal-list-items"]}>
                <li>
                  <span className={styles["portal-list-emoji"]}>📋</span>
                  <div>
                    <strong>Ver tu estado:</strong> Consultar si tus pagos anteriores fueron aprobados o están en revisión.
                  </div>
                </li>
                <li>
                  <span className={styles["portal-list-emoji"]}>💵</span>
                  <div>
                    <strong>Saber cuánto debés:</strong> Ver el saldo abonado hasta el momento y el total pendiente de tu tarjeta.
                  </div>
                </li>
                <li>
                  <span className={styles["portal-list-emoji"]}>📤</span>
                  <div>
                    <strong>Informar cuotas:</strong> Subir el comprobante de transferencia para tu <strong>2ª, 3ª o 4ª cuota</strong>.
                  </div>
                </li>
              </ul>
              <Button
                type="button"
                variant="silver"
                href="/pagar"
                className={styles["attendance-section__portal-btn"]}
              >
                IR AL PORTAL DE PAGOS 💳
              </Button>
            </div>
          )}
        </div>
      </Card>
    </section>
  );
};

export default AttendanceSection;
