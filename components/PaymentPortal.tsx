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
  created_at: string;
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
  const [selectedGuests, setSelectedGuests] = useState<Guest[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Form states for multi payment
  const [guestPaymentTypes, setGuestPaymentTypes] = useState<Record<string, string>>({});
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

  // Load payments for all selected guests automatically when list changes
  useEffect(() => {
    async function fetchPayments() {
      if (selectedGuests.length === 0) {
        setPayments([]);
        return;
      }
      setLoadingPayments(true);
      try {
        const guestIds = selectedGuests.map((g) => g.id);
        const { data, error } = await supabase
          .from("payments")
          .select("*")
          .in("guest_id", guestIds)
          .order("created_at", { ascending: true });

        if (error) throw error;
        setPayments(data || []);
      } catch (err) {
        console.error("Error fetching payments for selected guests:", err);
      } finally {
        setLoadingPayments(false);
      }
    }
    fetchPayments();
  }, [selectedGuests]);

  // Pre-select first available options for new guests in selected list
  useEffect(() => {
    if (selectedGuests.length === 0) return;
    setGuestPaymentTypes((prev) => {
      let updated = false;
      const copy = { ...prev };
      selectedGuests.forEach((g) => {
        if (!copy[g.id]) {
          const opts = getGuestAvailablePaymentOptions(g);
          if (opts.length > 0) {
            copy[g.id] = opts[0].value;
          } else {
            copy[g.id] = "total";
          }
          updated = true;
        }
      });
      return updated ? copy : prev;
    });
  }, [selectedGuests, payments]);

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

      // Filter out guests that are already selected
      const filteredResults = (data || []).filter(
        (guest) => !selectedGuests.some((sg) => sg.id === guest.id)
      );
      setSearchResults(filteredResults);
    } catch (err) {
      console.error("Error searching guests:", err);
    }
  };

  const handleSelectGuest = (guest: Guest) => {
    if (selectedGuests.some((g) => g.id === guest.id)) {
      setSearchQuery("");
      setSearchResults([]);
      return;
    }

    setSelectedGuests((prev) => [...prev, guest]);
    setSearchQuery("");
    setSearchResults([]);
    setSubmitStatus(null);
  };

  const handleRemoveGuest = (guestId: string) => {
    setSelectedGuests((prev) => prev.filter((g) => g.id !== guestId));
    setGuestPaymentTypes((prev) => {
      const copy = { ...prev };
      delete copy[guestId];
      return copy;
    });
    setSubmitStatus(null);
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

  // Reconstruct Financial State for a single guest
  const getGuestFinancialState = (guest: Guest) => {
    if (!pricingConfig) {
      return {
        totalPrice: 0,
        paidApproved: 0,
        paidPending: 0,
        installmentsApproved: 0,
        isFullyPaid: false,
        remainingBalance: 0,
        history: [] as { name: string; amount: number; status: string }[],
        hasPendingTotal: false,
      };
    }

    const ticketPrice = pricingConfig.prices[guest.ticket_type] ?? 0;
    const guestPayments = payments.filter((p) => p.guest_id === guest.id);

    let paidApproved = 0;
    let paidPending = 0;
    let installmentsApproved = 0;
    let hasApprovedTotal = false;
    let hasPendingTotal = false;

    const history = guestPayments.map((p) => {
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

  // Determine available payment options for a guest
  const getGuestAvailablePaymentOptions = (guest: Guest) => {
    const options: { value: string; label: string; amount: number }[] = [];
    if (!pricingConfig) return options;

    const finState = getGuestFinancialState(guest);
    const installmentPrice = pricingConfig.installmentPrices[guest.ticket_type] ?? 0;

    if (finState.isFullyPaid) {
      return options;
    }

    // 1. Total remaining balance option
    if (finState.remainingBalance > 0 && !finState.hasPendingTotal) {
      options.push({
        value: "total",
        label: `Pago Restante ($${finState.remainingBalance.toLocaleString("es-AR")})`,
        amount: finState.remainingBalance,
      });
    }

    // 2. Installments option
    if (pricingConfig.allowInstallments && finState.remainingBalance > 0) {
      const activeOrPendingInstallments = new Set(
        payments
          .filter((p) => p.guest_id === guest.id && (p.status === "approved" || p.status === "pending"))
          .map((p) => p.installment_number)
      );

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

  const handleGuestPaymentTypeChange = (guestId: string, value: string) => {
    setGuestPaymentTypes((prev) => ({
      ...prev,
      [guestId]: value,
    }));
  };

  // Compute accumulated group amount
  const getGroupTotalPaymentAmount = () => {
    return selectedGuests.reduce((sum, guest) => {
      const options = getGuestAvailablePaymentOptions(guest);
      const val = guestPaymentTypes[guest.id];
      const opt = options.find((o) => o.value === val);
      if (opt) return sum + opt.amount;

      const finState = getGuestFinancialState(guest);
      return sum + finState.remainingBalance;
    }, 0);
  };

  const groupTotalAmount = getGroupTotalPaymentAmount();

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus(null);

    if (selectedGuests.length === 0 || !pricingConfig) return;
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
      const cleanNames = selectedGuests.map(g => sanitizeFilename(g.full_name)).join("_").substring(0, 80);
      const filePath = `grupo_${cleanNames}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(filePath, receiptFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(filePath);
      const receiptUrl = urlData.publicUrl;

      // 2. Insert Payment entries in a loop
      const paymentInserts = selectedGuests.map((guest) => {
        const options = getGuestAvailablePaymentOptions(guest);
        const val = guestPaymentTypes[guest.id];
        const opt = options.find((o) => o.value === val);
        const amount = opt ? opt.amount : getGuestFinancialState(guest).remainingBalance;

        return {
          guest_id: guest.id,
          installment_number: val || "total",
          amount,
          receipt_url: receiptUrl,
          status: "pending",
        };
      });

      const { error: paymentError } = await supabase
        .from("payments")
        .insert(paymentInserts);

      if (paymentError) throw paymentError;

      // Trigger push notification to admin with grouped names
      const namesList = selectedGuests.map(g => g.full_name).join(", ");
      fetch("/api/notify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: namesList,
          amount: groupTotalAmount,
          installmentNumber: "grupal",
        }),
      }).catch((err) => console.error("Error triggering push notification:", err));

      setSubmitStatus({
        type: "success",
        text: "¡Comprobantes subidos con éxito! Se encuentran bajo revisión por el administrador.",
      });

      setReceiptFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Refresh local payments to update the UI history badges
      const guestIds = selectedGuests.map((g) => g.id);
      const { data: refreshedPayments } = await supabase
        .from("payments")
        .select("*")
        .in("guest_id", guestIds)
        .order("created_at", { ascending: true });

      if (refreshedPayments) {
        setPayments(refreshedPayments);
      }
    } catch (err: any) {
      console.error("Error submitting payments:", err);
      setSubmitStatus({
        type: "error",
        text: `Error al procesar el pago: ${err.message || "Inténtalo de nuevo."}`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const ticketTypeLabel = (type: string) => {
    switch (type) {
      case "adulto":
        return "Adulto";
      case "menor_3_11":
        return "Menor (3 a 11 años)";
      case "menor_0_2":
        return "Menor (0 a 2 años)";
      case "adolescente":
        return "Adolescente (12 a 17 años)";
      case "trasnoche":
        return "Trasnoche";
      default:
        return type;
    }
  };

  return (
    <section className={styles["portal-section"]}>
      <Card className={styles["portal-card"]}>
        <div className={styles["portal-glow"]}></div>

        <div className={styles["portal-content"]}>
          <div className={styles["portal-header"]}>
            <h2 className={`${styles["portal-title"]} ornate-headline silver-gradient-text`}>
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
              label="BUSCAR E INGRESAR INVITADOS (Puedes agregar más de uno)"
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

          {/* Selected Guests list header pills */}
          {selectedGuests.length > 0 && (
            <div className={styles["selected-guests-container"]}>
              <span className={styles["section-label"]}>Invitados a incluir en este pago:</span>
              <div className={styles["guest-pills-list"]}>
                {selectedGuests.map((guest) => (
                  <div key={guest.id} className={styles["guest-pill"]}>
                    <span>👤 {guest.full_name}</span>
                    <button
                      type="button"
                      className={styles["remove-guest-btn"]}
                      onClick={() => handleRemoveGuest(guest.id)}
                      disabled={submitting}
                      title="Quitar de la lista"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {loadingPayments && (
            <p style={{ textAlign: "center", color: "var(--color-primary)" }}>
              Cargando historial de pagos...
            </p>
          )}

          {/* Prompt when no guests are selected */}
          {selectedGuests.length === 0 && (
            <div className={styles["portal-welcome-box"]}>
              <span className={styles["welcome-icon"]}>💳</span>
              <p className={styles["welcome-text"]}>
                Buscá y seleccioná a los invitados que querés incluir en tu pago para comenzar. Podés agregar múltiples personas si deseas pagarlas juntas.
              </p>
            </div>
          )}

          {/* Selected Guests details list and payment form */}
          {selectedGuests.length > 0 && !loadingPayments && (
            <div className={styles["group-info-container"]}>
              <div className={styles["group-rows-list"]}>
                {selectedGuests.map((guest) => {
                  const fin = getGuestFinancialState(guest);
                  const opts = getGuestAvailablePaymentOptions(guest);
                  const selectedVal = guestPaymentTypes[guest.id] || "total";

                  return (
                    <div key={guest.id} className={styles["individual-guest-row"]}>
                      <div className={styles["individual-guest-header"]}>
                        <span className={styles["individual-guest-name"]}>👤 {guest.full_name}</span>
                        <span className={styles["individual-guest-ticket-label"]}>
                          Tarjeta: {ticketTypeLabel(guest.ticket_type)}
                        </span>
                      </div>

                      {guest.attendance === "No podré asistir" ? (
                        <div className={styles["individual-guest-no-attend"]}>
                          ❌ Registró que no asistirá (sin costo)
                        </div>
                      ) : fin.isFullyPaid ? (
                        <div className={styles["individual-guest-paid"]}>
                          🎉 ¡Tarjeta totalmente abonada y aprobada!
                        </div>
                      ) : guest.ticket_type === "menor_0_2" ? (
                        <div className={styles["individual-guest-free"]}>
                          👶 Las entradas de menores de 0 a 2 años no tienen costo.
                        </div>
                      ) : (
                        <div className={styles["individual-guest-payment-form"]}>
                          {/* Individual Concept Select */}
                          <div className={styles["concept-select-container"]}>
                            <Select
                              name={`concept_${guest.id}`}
                              label="CONCEPTO A INFORMAR"
                              value={selectedVal}
                              onChange={(e) => handleGuestPaymentTypeChange(guest.id, e.target.value)}
                              disabled={submitting}
                            >
                              {opts.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </Select>
                          </div>

                          {/* Individual Payment History */}
                          {fin.history.length > 0 && (
                            <div className={styles["individual-guest-history"]}>
                              <span className={styles["history-label"]}>Historial de pagos:</span>
                              <div className={styles["history-pills"]}>
                                {fin.history.map((h, idx) => (
                                  <span
                                    key={idx}
                                    className={`${styles["history-pill-badge"]} ${
                                      h.status === "approved"
                                        ? styles["status-badge--approved"]
                                        : h.status === "pending"
                                        ? styles["status-badge--pending"]
                                        : styles["status-badge--rejected"]
                                    }`}
                                  >
                                    {h.name} ({h.status === "approved" ? "OK" : h.status === "pending" ? "Pend" : "Rech"})
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Form group for transfer upload */}
              {groupTotalAmount > 0 ? (
                <form
                  onSubmit={handleSubmitPayment}
                  className={styles["form-group"]}
                  style={{ marginTop: "28px" }}
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

                  <p style={{ fontSize: "12.5px", color: "#ffd0d0", margin: "6px 0 12px 0", textAlign: "left", lineHeight: "1.4", borderLeft: "2px solid #ff716c", paddingLeft: "8px" }}>
                    ⚠️ <strong>Importante:</strong> Después del 30 de Octubre el pago se realiza en una sola cuota (pago total) y la tarjeta tiene un recargo de $10.000 para todas las categorías.
                  </p>

                  <div className={attendanceStyles["attendance-section__form-row"]}>
                    <div
                      className={attendanceStyles["attendance-section__file-input"]}
                      style={{ gridColumn: "span 2" }}
                    >
                      <span className={attendanceStyles["attendance-section__file-label"]}>
                        COMPROBANTE GENERAL DE TRANSFERENCIA (FOTO / PDF)
                      </span>
                      <div
                        className={attendanceStyles["attendance-section__file-input-wrapper"]}
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
                    <p style={{ fontSize: "12.5px", color: "#ff716c", margin: "0 0 12px 0", fontWeight: "600" }}>
                      * El pago en cuotas ya no está disponible después del 30 de Octubre. Actualmente solo se permite saldar el saldo restante total con el recargo correspondiente.
                    </p>
                  )}

                  <div
                    className={attendanceStyles["attendance-section__amount-badge"]}
                    style={{ fontSize: "16px", padding: "16px", borderRadius: "10px" }}
                  >
                    Monto General a Transferir: ${groupTotalAmount.toLocaleString("es-AR")}
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
                    {submitting ? "SUBIENDO..." : "INFORMAR PAGO GRUPAL"}
                  </Button>
                </form>
              ) : (
                <div
                  className={attendanceStyles["attendance-section__message"]}
                  style={{
                    background: "rgba(46, 204, 113, 0.1)",
                    color: "#2ecc71",
                    border: "1px solid rgba(46, 204, 113, 0.25)",
                    textAlign: "center",
                    marginTop: "24px",
                  }}
                >
                  🎉 Todos los invitados seleccionados tienen sus tarjetas totalmente abonadas. ¡Muchas gracias!
                </div>
              )}
            </div>
          )}

          <Button
            type="button"
            variant="text"
            href="/?skipEnvelope=true"
            style={{ alignSelf: "center" }}
          >
            Volver a la Invitación
          </Button>
        </div>
      </Card>
    </section>
  );
};

export default PaymentPortal;
