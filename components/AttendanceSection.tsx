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

        // Payments and Cuota 1 are active natively starting now
        setShowPaymentOption(true);
      } catch (err) {
        console.error("Error fetching pricing configuration:", err);
      }
    }
    fetchConfig();
  }, []);

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

  const sanitizeFilename = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^a-z0-9]/g, "_") // Replace spaces/special chars with underscores
      .replace(/_+/g, "_"); // Collapse multiple underscores
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus(null);

    // Validate inputs
    if (!formData.fullName.trim()) {
      setSubmitStatus({ type: "error", text: "Por favor, ingresa tu nombre completo." });
      return;
    }

    const isAttending = formData.attendance === "Sí, asistiré";
    const isFreeTicket = isAttending && formData.ticketType === "menor_0_2";
    const wantsToPay = isAttending && !isFreeTicket;

    if (wantsToPay && !receiptFile) {
      setSubmitStatus({
        type: "error",
        text: "Por favor, selecciona una foto o PDF del comprobante de transferencia.",
      });
      return;
    }

    setSubmitting(true);

    try {
      // 1. Sanitize name for unique verification and insert guest
      const finalGuestData = {
        full_name: formData.fullName.trim(),
        attendance: formData.attendance,
        dietary: formData.dietary.trim() || "Ninguno",
        ticket_type: isAttending ? formData.ticketType : "adulto", // default required by db constraint
      };

      const { data: guestRecord, error: guestError } = await supabase
        .from("guests")
        .insert(finalGuestData)
        .select("id")
        .single();

      if (guestError) {
        // Unique key constraint violation code
        if (guestError.code === "23505") {
          setSubmitStatus({
            type: "error",
            text: "Este nombre ya está registrado. Si querés informar un pago adicional, por favor andá al Portal de Pagos.",
            isDuplicate: true,
          });
          setSubmitting(false);
          return;
        }
        throw guestError;
      }

      const guestId = guestRecord.id;

      // 2. Upload file & Insert Payment if paying
      if (wantsToPay && !isFreeTicket && receiptFile) {
        const fileExt = receiptFile.name.split(".").pop();
        const cleanName = sanitizeFilename(formData.fullName);
        const filePath = `${cleanName}_cuota_${formData.installmentNumber}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("receipts")
          .upload(filePath, receiptFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(filePath);
        const receiptUrl = urlData.publicUrl;

        // Calculate amount based on pricing configuration
        let amount = 0;
        if (pricingConfig) {
          amount =
            formData.installmentNumber === "total"
              ? pricingConfig.prices[formData.ticketType]
              : pricingConfig.installmentPrices[formData.ticketType];
        }

        const { error: paymentError } = await supabase.from("payments").insert({
          guest_id: guestId,
          installment_number: formData.installmentNumber,
          amount: amount,
          receipt_url: receiptUrl,
          status: "pending",
        });

        if (paymentError) throw paymentError;

        // Trigger push notification to admin in background
        fetch("/api/notify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guestName: formData.fullName,
            amount: amount,
            installmentNumber: formData.installmentNumber,
          }),
        }).catch((err) => console.error("Error triggering push notification:", err));
      }

      // Success!
      setSubmitStatus({
        type: "success",
        text: isAttending
          ? "¡Asistencia registrada correctamente! Gracias por confirmar."
          : "Lamentamos que no puedas asistir. Tu respuesta ha sido guardada.",
      });

      // Reset form on success
      setFormData({
        fullName: "",
        attendance: "Sí, asistiré",
        dietary: "",
        ticketType: "adulto",
        informPayment: "si",
        installmentNumber: "total",
      });
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

  // Helper values to show current pricing
  const isAttending = formData.attendance === "Sí, asistiré";
  const ticketPrice = pricingConfig?.prices[formData.ticketType] ?? 0;
  const installmentPrice = pricingConfig?.installmentPrices[formData.ticketType] ?? 0;
  const isFreeTicket = formData.ticketType === "menor_0_2";

  // Calculate what they are paying
  const currentPayAmount =
    formData.installmentNumber === "total" ? ticketPrice : installmentPrice;

  return (
    <section ref={sectionRef} className={styles["attendance-section"]} id="rsvp">
      <Card className={styles["attendance-section__card"]}>
        <div className={styles["attendance-section__glow"]}></div>

        <div className={styles["attendance-section__content"]}>
          <div className={styles["attendance-section__header"]}>
            <h2
              className={`${styles["attendance-section__title"]} ornate-headline silver-gradient-text`}
            >
              Confirmar Asistencia
            </h2>
            <p className={styles["attendance-section__subtitle"]}>
              Por favor, decime si podes asistir antes del 30 de octubre.
            </p>
          </div>

          <div className={styles["attendance-section__portal"]}>
            <p className={styles["attendance-section__portal-text"]}>
              ¿Ya confirmaste tu presencia y querés informar un pago o consultar tus cuotas?
            </p>
            <a href="/pagar" className={styles["attendance-section__portal-link"]}>
              Ir al Portal de Pagos 💳
            </a>
          </div>

          <form onSubmit={handleSubmit} className={styles["attendance-section__form"]}>
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

            {isAttending && pricingConfig && (
              <>
                <div className={styles["attendance-section__form-row"]}>
                  <Select
                    name="ticketType"
                    label="TIPO DE ENTRADA"
                    value={formData.ticketType}
                    onChange={handleChange}
                    disabled={submitting}
                  >
                    <option value="adulto">
                      Adulto (${pricingConfig.prices.adulto.toLocaleString("es-AR")})
                    </option>
                    <option value="adolescente">
                      Adolescente (12 a 17 años) (${pricingConfig.prices.adolescente.toLocaleString("es-AR")})
                    </option>
                    <option value="menor_3_11">
                      Menor 3-11 años (${pricingConfig.prices.menor_3_11.toLocaleString("es-AR")})
                    </option>
                    <option value="trasnoche">
                      Trasnoche (${pricingConfig.prices.trasnoche.toLocaleString("es-AR")})
                    </option>
                    <option value="menor_0_2">Menor 0-2 años ($0)</option>
                  </Select>

                  {showPaymentOption && !isFreeTicket && (
                    <div className={styles["attendance-section__col"]}>
                      <p className={styles["attendance-section__warning"]}>
                        ⚠️ <strong>Importante:</strong> Para confirmar tu presencia debés informar la transferencia de la primera cuota o el pago total. Después del 30 de Octubre el pago se realiza en una sola cuota (pago total) y la tarjeta tiene un recargo de $10.000 para todas las categorías.
                      </p>
                    </div>
                  )}
                </div>

                {!isFreeTicket && (
                  <div className={styles["attendance-section__payment-box"]}>
                    <div className={styles["attendance-section__bank-info"]}>
                      <div className={styles["attendance-section__bank-title"]}>
                        Datos de Transferencia Bancaria
                      </div>
                      <div className={styles["attendance-section__bank-details"]}>
                        <p>
                          <strong>Titular:</strong> KARINA ANDREA GARCIA
                        </p>
                        <p>
                          <strong>CUIL:</strong> 27-24012475-6
                        </p>
                        <p>
                          <strong>CBU:</strong> 0000003100084572082442
                        </p>
                        <p>
                          <strong>Alias:</strong> karysouvenirs
                          <button
                            type="button"
                            onClick={handleCopyAlias}
                            className={styles["attendance-section__copy-btn"]}
                          >
                            {copiedAlias ? "¡Copiado!" : "Copiar"}
                          </button>
                        </p>
                      </div>
                    </div>

                    <div className={styles["attendance-section__form-row"]}>
                      <Select
                        name="installmentNumber"
                        label="CONCEPTO A PAGAR"
                        value={formData.installmentNumber}
                        onChange={handleChange}
                        disabled={submitting}
                      >
                        <option value="total">
                          Pago Total (${ticketPrice.toLocaleString("es-AR")})
                        </option>
                        <option
                          value="1"
                          disabled={!pricingConfig.allowInstallments}
                        >
                          Cuota 1 ({!pricingConfig.allowInstallments ? "Deshabilitado" : `$${installmentPrice.toLocaleString("es-AR")}`})
                        </option>
                        <option
                          value="2"
                          disabled={!pricingConfig.allowInstallments}
                        >
                          Cuota 2 ({!pricingConfig.allowInstallments ? "Deshabilitado" : `$${installmentPrice.toLocaleString("es-AR")}`})
                        </option>
                        <option
                          value="3"
                          disabled={!pricingConfig.allowInstallments}
                        >
                          Cuota 3 ({!pricingConfig.allowInstallments ? "Deshabilitado" : `$${installmentPrice.toLocaleString("es-AR")}`})
                        </option>
                        <option
                          value="4"
                          disabled={!pricingConfig.allowInstallments}
                        >
                          Cuota 4 ({!pricingConfig.allowInstallments ? "Deshabilitado" : `$${installmentPrice.toLocaleString("es-AR")}`})
                        </option>
                      </Select>

                      <div className={styles["attendance-section__file-input"]}>
                        <span className={styles["attendance-section__file-label"]}>
                          COMPROBANTE (FOTO / PDF)
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

                    <div className={styles["attendance-section__amount-badge"]}>
                      Monto a transferir: ${currentPayAmount.toLocaleString("es-AR")}
                    </div>
                  </div>
                )}
              </>
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
        </div>
      </Card>
    </section>
  );
};

export default AttendanceSection;
