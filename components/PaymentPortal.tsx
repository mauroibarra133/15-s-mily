"use client";
import React, { useState, useEffect, useRef } from "react";
import styles from "./PaymentPortal.module.css";
import attendanceStyles from "./AttendanceSection.module.css"; // Reuse card and form row styles
import { Card } from "./ui/Card";
import { Input } from "./ui/Input";
import { Select } from "./ui/Select";
import { Button } from "./ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentPricingConfig, PricingConfig } from "@/lib/pricing";
import { logEvent } from "@/lib/analytics";

interface Guest {
  id: string;
  full_name: string;
  attendance: string;
  dietary: string;
  ticket_type: string;
}

interface Payment {
  id: string;
  guest_id: string;
  installment_number: string;
  amount: number;
  receipt_url: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export const PaymentPortal: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Guest[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Form states for next payment
  const [paymentType, setPaymentType] = useState("total");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [copiedAlias, setCopiedAlias] = useState(false);

  const handleCopyAlias = () => {
    navigator.clipboard.writeText("karysouvenirs");
    setCopiedAlias(true);
    logEvent("copy_alias_portal");
    setTimeout(() => setCopiedAlias(false), 2000);
  };

  // Log page view event on mount
  useEffect(() => {
    logEvent("page_view_portal");
  }, []);

  // Load pricing configuration from server
  useEffect(() => {
    async function loadConfig() {
      try {
        const config = await getCurrentPricingConfig();
        setPricingConfig(config);
      } catch (err) {
        console.error("Error loading pricing config:", err);
      } finally {
        setLoadingConfig(false);
      }
    }
    loadConfig();
  }, []);

  // Handle guest search
  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (val.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("guests")
        .select("*")
        .ilike("full_name", `%${val.trim()}%`)
        .limit(6);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (err) {
      console.error("Error searching guests:", err);
    }
  };

  // Select guest and load payments
  const handleSelectGuest = async (guest: Guest) => {
    setSelectedGuest(guest);
    setSearchQuery("");
    setSearchResults([]);
    setSubmitStatus(null);
    setReceiptFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    await loadGuestPayments(guest.id);
  };

  const loadGuestPayments = async (guestId: string) => {
    setLoadingPayments(true);
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("guest_id", guestId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setPayments(data || []);
    } catch (err) {
      console.error("Error loading guest payments:", err);
    } finally {
      setLoadingPayments(false);
    }
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
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_");
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus(null);

    if (!selectedGuest || !pricingConfig) return;
    if (!receiptFile) {
      setSubmitStatus({
        type: "error",
        text: "Por favor, selecciona una foto o PDF del comprobante de transferencia.",
      });
      return;
    }

    setSubmitting(true);

    try {
      // 1. Upload receipt to Storage
      const fileExt = receiptFile.name.split(".").pop();
      const cleanName = sanitizeFilename(selectedGuest.full_name);
      const filePath = `${cleanName}_cuota_${paymentType}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(filePath, receiptFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(filePath);
      const receiptUrl = urlData.publicUrl;

      // 2. Insert Payment
      const { error: paymentError } = await supabase.from("payments").insert({
        guest_id: selectedGuest.id,
        installment_number: paymentType,
        amount: computedPayAmount,
        receipt_url: receiptUrl,
        status: "pending",
      });

      if (paymentError) throw paymentError;

      // Trigger push notification to admin in background
      fetch("/api/notify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: selectedGuest.full_name,
          amount: computedPayAmount,
          installmentNumber: paymentType,
        }),
      }).catch((err) => console.error("Error triggering push notification:", err));

      setSubmitStatus({
        type: "success",
        text: "¡Comprobante subido con éxito! Se encuentra bajo revisión por el administrador.",
      });

      setReceiptFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Refresh payments list
      await loadGuestPayments(selectedGuest.id);
    } catch (err: any) {
      console.error("Error submitting payment:", err);
      setSubmitStatus({
        type: "error",
        text: `Error al procesar el pago: ${err.message || "Inténtalo de nuevo."}`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Reconstruct Financial State
  const ticketTypeLabel = (type: string) => {
    switch (type) {
      case "adulto":
        return "Adulto";
      case "menor_3_11":
        return "Menor (3 a 11 años)";
      case "menor_0_2":
        return "Menor (0 a 2 años)";
      case "adolescente":
        return "Adolescente";
      case "trasnoche":
        return "Trasnoche";
      default:
        return type;
    }
  };

  const getFinancialState = () => {
    if (!selectedGuest || !pricingConfig) {
      return {
        totalPrice: 0,
        paidApproved: 0,
        paidPending: 0,
        installmentsApproved: 0,
        isFullyPaid: false,
        remainingBalance: 0,
        history: [] as { name: string; amount: number; status: string }[],
      };
    }

    const ticketPrice = pricingConfig.prices[selectedGuest.ticket_type] ?? 0;

    let paidApproved = 0;
    let paidPending = 0;
    let installmentsApproved = 0;
    let hasApprovedTotal = false;
    let hasPendingTotal = false;

    const history = payments.map((p) => {
      let label = "";
      if (p.installment_number === "total") {
        label = "Pago Completo";
      } else {
        label = `Cuota ${p.installment_number}`;
      }

      if (p.status === "approved") {
        paidApproved += Number(p.amount);
        if (p.installment_number === "total") {
          hasApprovedTotal = true;
        } else {
          installmentsApproved += 1;
        }
      } else if (p.status === "pending") {
        paidPending += Number(p.amount);
        if (p.installment_number === "total") {
          hasPendingTotal = true;
        }
      }

      return {
        name: label,
        amount: Number(p.amount),
        status: p.status,
      };
    });

    const isFullyPaid = hasApprovedTotal || paidApproved >= ticketPrice;
    const remainingBalance = Math.max(0, ticketPrice - paidApproved);

    return {
      totalPrice: ticketPrice,
      paidApproved,
      paidPending,
      installmentsApproved,
      isFullyPaid,
      remainingBalance,
      history,
      hasPendingTotal,
    };
  };

  const finState = getFinancialState();

  // Determine which payment options to display
  const getAvailablePaymentOptions = () => {
    const options: { value: string; label: string; amount: number }[] = [];
    if (!selectedGuest || !pricingConfig) return options;

    const ticketPrice = pricingConfig.prices[selectedGuest.ticket_type] ?? 0;
    const installmentPrice = pricingConfig.installmentPrices[selectedGuest.ticket_type] ?? 0;

    // 1. Total remaining balance option
    if (finState.remainingBalance > 0 && !finState.hasPendingTotal) {
      options.push({
        value: "total",
        label: `Pago Restante ($${finState.remainingBalance.toLocaleString("es-AR")})`,
        amount: finState.remainingBalance,
      });
    }

    // 2. Installments option (only if window is active)
    if (pricingConfig.allowInstallments && finState.remainingBalance > 0) {
      // Find which installments are already approved or pending
      const activeOrPendingInstallments = new Set(
        payments
          .filter((p) => p.status === "approved" || p.status === "pending")
          .map((p) => p.installment_number)
      );

      // Check cuotas 1 to 4
      for (let i = 1; i <= 4; i++) {
        const instStr = i.toString();
        if (!activeOrPendingInstallments.has(instStr)) {
          options.push({
            value: instStr,
            label: `Cuota ${i} ($${installmentPrice.toLocaleString("es-AR")})`,
            amount: installmentPrice,
          });
        }
      }
    }

    return options;
  };

  const paymentOptions = getAvailablePaymentOptions();

  // Pre-select the first option if available, otherwise "total"
  useEffect(() => {
    if (paymentOptions.length > 0) {
      setPaymentType(paymentOptions[0].value);
    } else {
      setPaymentType("total");
    }
  }, [selectedGuest, payments]);

  // Compute selected amount
  const selectedOption = paymentOptions.find((o) => o.value === paymentType);
  const computedPayAmount = selectedOption ? selectedOption.amount : finState.remainingBalance;

  return (
    <section className={styles["portal-section"]}>
      <Card className={styles["portal-card"]}>
        <div className={styles["portal-glow"]}></div>

        <div className={styles["portal-content"]}>
          <div className={styles["portal-header"]}>
            <h2
              className={`${styles["portal-title"]} ornate-headline silver-gradient-text`}
            >
              Portal de Pagos
            </h2>
            <p className={styles["portal-subtitle"]}>
              Informa tus transferencias bancarias y sigue el estado de tus cuotas.
            </p>
          </div>

          {/* Guest Search Bar */}
          <div className={styles["search-container"]}>
            <Input
              type="text"
              label="BUSCAR INVITADO (Escribe tu nombre)"
              placeholder="Ej: Karina Garcia"
              value={searchQuery}
              onChange={handleSearchChange}
              disabled={loadingConfig || submitting}
            />

            {searchResults.length > 0 && (
              <div className={styles["search-results"]}>
                {searchResults.map((guest) => (
                  <div
                    key={guest.id}
                    className={styles["search-item"]}
                    onClick={() => handleSelectGuest(guest)}
                  >
                    {guest.full_name} ({guest.attendance === "Sí, asistiré" ? "Asistirá" : "No asistirá"})
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Loading Indicator */}
          {loadingPayments && (
            <p style={{ textAlign: "center", color: "var(--color-primary)" }}>
              Cargando historial de pagos...
            </p>
          )}

          {/* Selected Guest details and payment upload form */}
          {selectedGuest && !loadingPayments && (
            <div className={styles["guest-info-box"]}>
              <h3 className={styles["guest-title"]}>{selectedGuest.full_name}</h3>

              {selectedGuest.attendance === "No podré asistir" ? (
                <div className={styles["guest-status"]}>
                  <p>Registraste que <strong>no podrás asistir</strong> a la fiesta.</p>
                  <p style={{ fontSize: "13px", color: "var(--color-on-surface-variant)" }}>
                    Si esta información es incorrecta o cambiaste de opinión, por favor vuelve a registrarte en el formulario de confirmación de asistencia.
                  </p>
                </div>
              ) : (
                <div className={styles["guest-status"]}>
                  <p>
                    Tarjeta registrada: <strong>{ticketTypeLabel(selectedGuest.ticket_type)}</strong>
                  </p>
                  <p>
                    Precio total: <strong>${finState.totalPrice.toLocaleString("es-AR")}</strong>
                  </p>

                  {/* Installments count display */}
                  {selectedGuest.ticket_type !== "menor_0_2" && (
                    <p>
                      Cuotas abonadas hasta el momento:{" "}
                      <strong>
                        {finState.installmentsApproved}/4 aprobadas
                      </strong>
                    </p>
                  )}

                  {/* Payment History List */}
                  {finState.history.length > 0 && (
                    <div className={styles["payment-history"]}>
                      <span className={styles["payment-history-title"]}>
                        Historial de pagos informados:
                      </span>
                      {finState.history.map((h, index) => (
                        <div key={index} className={styles["history-item"]}>
                          <span>
                            {h.name} (${h.amount.toLocaleString("es-AR")})
                          </span>
                          <span
                            className={`${styles["status-badge"]} ${
                              h.status === "approved"
                                ? styles["status-badge--approved"]
                                : h.status === "pending"
                                ? styles["status-badge--pending"]
                                : styles["status-badge--rejected"]
                            }`}
                          >
                            {h.status === "approved"
                              ? "Aprobado ✅"
                              : h.status === "pending"
                              ? "Pendiente 👁️"
                              : "Rechazado ❌"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Check if fully paid */}
                  {finState.isFullyPaid ? (
                    <div
                      className={styles["upload-success-container"]}
                      style={{ marginTop: "16px" }}
                    >
                      <span>🎉 ¡Tarjeta totalmente abonada y aprobada! ¡Muchas gracias!</span>
                    </div>
                  ) : selectedGuest.ticket_type === "menor_0_2" ? (
                    <div
                      className={styles["upload-success-container"]}
                      style={{ marginTop: "16px", background: "rgba(132, 173, 255, 0.08)", color: "var(--color-primary)", border: "1px solid rgba(132, 173, 255, 0.25)" }}
                    >
                      <span>👶 Las entradas de menores de 0 a 2 años no tienen costo.</span>
                    </div>
                  ) : (
                    /* Form to upload next payment receipt */
                    <form
                      onSubmit={handleSubmitPayment}
                      className={styles["form-group"]}
                      style={{ marginTop: "20px" }}
                    >
                      {/* Bank Details */}
                      <div className={attendanceStyles["attendance-section__bank-info"]}>
                        <div className={attendanceStyles["attendance-section__bank-title"]}>
                          Datos de Transferencia Bancaria
                        </div>
                        <div className={attendanceStyles["attendance-section__bank-details"]}>
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
                               style={{
                                 background: "rgba(132, 173, 255, 0.15)",
                                 border: "1px solid rgba(132, 173, 255, 0.3)",
                                 color: "var(--color-primary)",
                                 borderRadius: "4px",
                                 padding: "2px 8px",
                                 fontSize: "11px",
                                 cursor: "pointer",
                                 marginLeft: "8px",
                                 transition: "background 0.2s",
                               }}
                             >
                               {copiedAlias ? "¡Copiado!" : "Copiar"}
                             </button>
                           </p>
                        </div>
                      </div>

                      {paymentOptions.length > 0 ? (
                        <>
                          <div className={attendanceStyles["attendance-section__form-row"]}>
                            <Select
                              name="paymentType"
                              label="CONCEPTO A INFORMAR"
                              value={paymentType}
                              onChange={(e) => setPaymentType(e.target.value)}
                              disabled={submitting}
                            >
                              {paymentOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </Select>

                            <div className={attendanceStyles["attendance-section__file-input"]}>
                              <span
                                className={attendanceStyles["attendance-section__file-label"]}
                              >
                                COMPROBANTE (FOTO / PDF)
                              </span>
                              <div
                                className={
                                  attendanceStyles["attendance-section__file-input-wrapper"]
                                }
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

                          {pricingConfig && !pricingConfig.allowInstallments && (
                            <p style={{ fontSize: "12px", color: "var(--color-outline)", margin: 0 }}>
                              * Las cuotas solo se habilitan del 1 al 10 de Agosto, Septiembre, Octubre y Noviembre de 2026. Actualmente solo se permite saldar el saldo restante total.
                            </p>
                          )}

                          <div className={attendanceStyles["attendance-section__amount-badge"]}>
                            Monto a transferir: ${computedPayAmount.toLocaleString("es-AR")}
                          </div>

                          {submitStatus && (
                            <div
                              className={`${attendanceStyles["attendance-section__message"]} ${
                                submitStatus.type === "success"
                                  ? attendanceStyles["attendance-section__message--success"]
                                  : attendanceStyles["attendance-section__message--error"]
                              }`}
                            >
                              {submitStatus.text}
                            </div>
                          )}

                          <Button type="submit" variant="silver" disabled={submitting}>
                            {submitting ? "SUBIENDO..." : "INFORMAR PAGO"}
                          </Button>
                        </>
                      ) : (
                        <div
                          className={attendanceStyles["attendance-section__message"]}
                          style={{
                            background: "rgba(241, 196, 15, 0.1)",
                            color: "#f1c40f",
                            border: "1px solid rgba(241, 196, 15, 0.25)",
                            textAlign: "center",
                          }}
                        >
                          Ya has subido los comprobantes para todas tus cuotas/pago total. Se encuentran pendientes de revisión por el administrador.
                        </div>
                      )}
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          <Button type="button" variant="text" href="/?skipEnvelope=true" style={{ alignSelf: "center" }}>
            Volver a la Invitación
          </Button>
        </div>
      </Card>
    </section>
  );
};

export default PaymentPortal;
