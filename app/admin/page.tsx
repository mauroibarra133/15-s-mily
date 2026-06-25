"use client";
import React, { useState, useEffect } from "react";
import styles from "./admin.module.css";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { verifyPasscode } from "./actions";

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

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [authError, setAuthError] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Data states
  const [guests, setGuests] = useState<Guest[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [analyticsEvents, setAnalyticsEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal Review state
  const [selectedPayment, setSelectedPayment] = useState<(Payment & { guest_name: string }) | null>(null);
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);

  // Check auth on mount
  useEffect(() => {
    const isAuth = localStorage.getItem("admin_authenticated");
    if (isAuth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  // Check if already subscribed on load / auth success
  useEffect(() => {
    if (isAuthenticated) {
      checkNotificationSubscription();
    }
  }, [isAuthenticated]);

  const checkNotificationSubscription = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      return;
    }
    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      setNotificationsEnabled(!!existingSubscription);
    } catch (err) {
      console.error("Error checking push subscription:", err);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handleSubscribeNotifications = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      alert("Tu navegador no soporta notificaciones push.");
      return;
    }

    try {
      setSubscribing(true);
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("Permiso de notificaciones denegado. Habilita las notificaciones en la configuración de tu navegador.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicVapidKey) {
        alert("Error: Faltan las claves de notificaciones en el servidor.");
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
      });

      // Save subscription in Supabase push_subscriptions table
      const { error } = await supabase
        .from("push_subscriptions")
        .insert({ subscription });

      if (error) {
        // If it already exists (Unique constraint), that's fine
        if (!error.message.toLowerCase().includes("unique")) {
          throw error;
        }
      }

      setNotificationsEnabled(true);
      alert("¡Notificaciones activadas con éxito! Recibirás avisos cuando los invitados paguen.");
    } catch (err: any) {
      console.error("Error subscribing to push notifications:", err);
      alert(`Error al activar notificaciones: ${err.message || err}`);
    } finally {
      setSubscribing(false);
    }
  };

  // Fetch data
  const fetchData = async () => {
    setRefreshing(true);
    try {
      // Fetch guests
      const { data: guestsData, error: guestsError } = await supabase
        .from("guests")
        .select("*")
        .order("full_name", { ascending: true });

      if (guestsError) throw guestsError;
      setGuests(guestsData || []);

      // Fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false });

      if (paymentsError) throw paymentsError;
      setPayments(paymentsData || []);

      // Fetch analytics events
      const { data: analyticsData, error: analyticsError } = await supabase
        .from("analytics_events")
        .select("*")
        .order("created_at", { ascending: false });

      if (analyticsError) throw analyticsError;
      setAnalyticsEvents(analyticsData || []);
    } catch (err) {
      console.error("Error fetching admin dashboard data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Trigger data fetch once authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setVerifying(true);

    try {
      const isValid = await verifyPasscode(passcode);
      if (isValid) {
        setIsAuthenticated(true);
        localStorage.setItem("admin_authenticated", "true");
      } else {
        setAuthError("Código de acceso incorrecto. Inténtalo de nuevo.");
      }
    } catch (err) {
      setAuthError("Error al verificar el código.");
    } finally {
      setVerifying(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("admin_authenticated");
    setPasscode("");
  };

  // Helper to calculate price
  const getTicketPrice = (type: string, createdAt: string) => {
    const deadlineUTC = new Date("2026-10-31T02:59:59Z"); // Argentina 2026-10-30T23:59:59-03:00
    const isEarly = new Date(createdAt).getTime() <= deadlineUTC.getTime();

    const prices: Record<string, Record<string, number>> = {
      early: {
        adulto: 80000,
        menor_3_11: 40000,
        menor_0_2: 0,
        adolescente: 55000,
        trasnoche: 35000,
      },
      late: {
        adulto: 90000,
        menor_3_11: 50000,
        menor_0_2: 0,
        adolescente: 65000,
        trasnoche: 45000,
      },
    };

    return prices[isEarly ? "early" : "late"][type] ?? 0;
  };

  const ticketTypeLabel = (type: string) => {
    switch (type) {
      case "adulto":
        return "Adulto";
      case "menor_3_11":
        return "Menor (3-11)";
      case "menor_0_2":
        return "Menor (0-2)";
      case "adolescente":
        return "Adolescente (12 a 17 años)";
      case "trasnoche":
        return "Trasnoche";
      default:
        return type;
    }
  };

  // Calculate Dashboard Metrics
  const confirmedGuests = guests.filter((g) => g.attendance === "Sí, asistiré");
  const totalConfirmedHeads = confirmedGuests.length;

  const totalProjectedRevenue = confirmedGuests.reduce((sum, g) => {
    return sum + getTicketPrice(g.ticket_type, g.created_at);
  }, 0);

  const collectedApprovedFunds = payments
    .filter((p) => p.status === "approved")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const pendingReviewsCount = payments.filter((p) => p.status === "pending").length;

  // Retrieve payment status for a guest's specific installment
  const getInstallmentPayment = (guestId: string, instNum: string) => {
    const guestPayments = payments.filter(
      (p) => p.guest_id === guestId && p.installment_number === instNum
    );
    if (guestPayments.length === 0) return null;

    // Prioritize approved, then pending, then latest
    const approved = guestPayments.find((p) => p.status === "approved");
    if (approved) return approved;

    const pending = guestPayments.find((p) => p.status === "pending");
    if (pending) return pending;

    return guestPayments[0]; // Return latest
  };

  // Render badge based on payment record status
  const renderCellBadge = (guest: Guest, instNum: string) => {
    const p = getInstallmentPayment(guest.id, instNum);
    if (!p) {
      return <span className={`${styles["cell-badge"]} ${styles["cell-badge--empty"]}`}>—</span>;
    }

    if (p.status === "approved") {
      return (
        <span
          className={`${styles["cell-badge"]} ${styles["cell-badge--approved"]}`}
          title="Aprobado"
        >
          ✅
        </span>
      );
    }

    if (p.status === "pending") {
      return (
        <span
          className={`${styles["cell-badge"]} ${styles["cell-badge--pending"]}`}
          title="Revisar Comprobante"
          onClick={() => setSelectedPayment({ ...p, guest_name: guest.full_name })}
        >
          👁️
        </span>
      );
    }

    return (
      <span
        className={`${styles["cell-badge"]} ${styles["cell-badge--rejected"]}`}
        title="Rechazado"
      >
        ❌
      </span>
    );
  };

  // Get total paid for a guest
  const getGuestTotalPaid = (guestId: string) => {
    return payments
      .filter((p) => p.guest_id === guestId && p.status === "approved")
      .reduce((sum, p) => sum + Number(p.amount), 0);
  };

  // Update payment status (Approve / Reject)
  const handleUpdatePaymentStatus = async (status: "approved" | "rejected") => {
    if (!selectedPayment) return;
    setUpdatingPaymentId(selectedPayment.id);

    try {
      const { error } = await supabase
        .from("payments")
        .update({ status })
        .eq("id", selectedPayment.id);

      if (error) throw error;

      // Close modal and refresh data
      setSelectedPayment(null);
      await fetchData();
    } catch (err) {
      console.error(`Error updating payment to ${status}:`, err);
      alert(`Error al actualizar el pago: ${status}`);
    } finally {
      setUpdatingPaymentId(null);
    }
  };

  // Passcode authentication screen
  if (!isAuthenticated) {
    return (
      <main className={styles["login-screen"]}>
        <Card className={styles["login-card"]}>
          <h2 className={`${styles["login-title"]} ornate-headline silver-gradient-text`}>
            Administración
          </h2>
          <form onSubmit={handleLoginSubmit} className={styles["login-form"]}>
            <Input
              type="password"
              label="CÓDIGO DE ACCESO"
              placeholder="Ingresa la contraseña"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              disabled={verifying}
              required
            />
            {authError && (
              <p style={{ fontSize: "14px", color: "#e74c3c", margin: 0 }}>{authError}</p>
            )}
            <Button type="submit" variant="silver" disabled={verifying}>
              {verifying ? "VERIFICANDO..." : "INGRESAR"}
            </Button>
          </form>
        </Card>
      </main>
    );
  }

  // Analytics calculations
  const totalPageViews = analyticsEvents.filter(
    (e) => e.event_name === "page_view_home" || e.event_name === "page_view_portal"
  ).length;

  const uniqueSessionIds = new Set(
    analyticsEvents
      .filter((e) => e.event_name === "page_view_home" || e.event_name === "page_view_portal")
      .map((e) => e.session_id)
  );
  const uniqueVisitors = uniqueSessionIds.size;

  const playMusicCount = analyticsEvents.filter((e) => e.event_name === "play_music").length;

  const copyAliasCount = analyticsEvents.filter(
    (e) => e.event_name === "copy_alias_rsvp" || e.event_name === "copy_alias_portal"
  ).length;

  // Device calculations
  const sessionDevices: Record<string, string> = {};
  analyticsEvents.forEach((e) => {
    if (e.device_type && !sessionDevices[e.session_id]) {
      sessionDevices[e.session_id] = e.device_type;
    }
  });

  let mobileCount = 0;
  let desktopCount = 0;
  let tabletCount = 0;

  Object.values(sessionDevices).forEach((device) => {
    if (device === "mobile") mobileCount++;
    else if (device === "desktop") desktopCount++;
    else if (device === "tablet") tabletCount++;
  });

  const totalSessionsWithDevice = mobileCount + desktopCount + tabletCount;
  const mobilePercent = totalSessionsWithDevice > 0 ? Math.round((mobileCount / totalSessionsWithDevice) * 100) : 0;
  const desktopPercent = totalSessionsWithDevice > 0 ? Math.round((desktopCount / totalSessionsWithDevice) * 100) : 0;
  const tabletPercent = totalSessionsWithDevice > 0 ? Math.round((tabletCount / totalSessionsWithDevice) * 100) : 0;

  return (
    <main className={styles["admin-container"]}>
      {/* Dashboard Top Header */}
      <div className={styles["dashboard-header"]}>
        <div>
          <h1 className={`${styles["dashboard-title"]} ornate-headline silver-gradient-text`}>
            Panel de Control
          </h1>
          <p className={styles["dashboard-subtitle"]}>
            Resumen de confirmaciones de asistencia y pagos
          </p>
        </div>
        <div className={styles["header-actions"]}>
          {notificationsEnabled ? (
            <Button type="button" variant="silver" className={`${styles["header-button"]} ${styles["notification-button"]}`} disabled style={{ opacity: 0.7 }}>
              Notificaciones Activas ✅
            </Button>
          ) : (
            <Button type="button" variant="silver" className={`${styles["header-button"]} ${styles["notification-button"]}`} onClick={handleSubscribeNotifications} disabled={subscribing}>
              {subscribing ? "Activando..." : "Activar Notificaciones 🔔"}
            </Button>
          )}
          <Button type="button" variant="silver" className={styles["header-button"]} onClick={fetchData} disabled={refreshing}>
            {refreshing ? "Actualizando..." : "Actualizar"}
          </Button>
          <Button type="button" variant="silver" className={styles["header-button"]} onClick={handleLogout}>
            Salir
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      {loading ? (
        <p style={{ textAlign: "center", color: "var(--color-primary)", padding: "40px" }}>
          Cargando métricas...
        </p>
      ) : (
        <>
          <div className={styles["kpi-grid"]}>
            <Card className={styles["kpi-card"]}>
              <span className={styles["kpi-label"]}>Invitados Confirmados</span>
              <span className={styles["kpi-value"]}>{totalConfirmedHeads}</span>
              <span className={styles["kpi-subtext"]}>
                Total registrados: {guests.length} (
                {guests.filter((g) => g.attendance === "No podré asistir").length} no asistirán)
              </span>
            </Card>

            <Card className={styles["kpi-card"]}>
              <span className={styles["kpi-label"]}>Recaudación Financiera</span>
              <span className={styles["kpi-value"]}>
                ${collectedApprovedFunds.toLocaleString("es-AR")}
              </span>
              <span className={styles["kpi-subtext"]}>
                Proyectado Total: ${totalProjectedRevenue.toLocaleString("es-AR")} (
                {totalProjectedRevenue > 0
                  ? Math.round((collectedApprovedFunds / totalProjectedRevenue) * 100)
                  : 0}
                % recaudado)
              </span>
            </Card>

            <Card className={styles["kpi-card"]}>
              <span className={styles["kpi-label"]}>Comprobantes Pendientes</span>
              <span
                className={styles["kpi-value"]}
                style={{ color: pendingReviewsCount > 0 ? "#f1c40f" : "var(--color-tertiary)" }}
              >
                {pendingReviewsCount}
              </span>
              <span className={styles["kpi-subtext"]}>Requieren verificación de transferencia</span>
            </Card>
          </div>

          {/* Analytics Statistics Panel */}
          {!loading && (
            <div style={{ marginBottom: "32px" }}>
              <Card className={styles["table-card"]}>
                <div style={{ padding: "24px" }}>
                  <h2 className={styles["table-title"]} style={{ marginBottom: "20px" }}>
                    Estadísticas de Navegación 📈
                  </h2>
                  <div className={styles["kpi-grid"]} style={{ marginBottom: "0", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span className={styles["kpi-label"]}>Visitas Totales</span>
                  <span style={{ fontSize: "24px", fontWeight: "700", color: "var(--color-tertiary)" }}>
                    {totalPageViews}
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--color-outline)" }}>
                    Accesos a la invitación o portal
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span className={styles["kpi-label"]}>Visitantes Únicos</span>
                  <span style={{ fontSize: "24px", fontWeight: "700", color: "var(--color-tertiary)" }}>
                    {uniqueVisitors}
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--color-outline)" }}>
                    Dispositivos individuales
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span className={styles["kpi-label"]}>Tasa de Conversión</span>
                  <span style={{ fontSize: "24px", fontWeight: "700", color: "var(--color-tertiary)" }}>
                    {uniqueVisitors > 0 ? Math.round((totalConfirmedHeads / uniqueVisitors) * 100) : 0}%
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--color-outline)" }}>
                    Asistencias / visitantes únicos
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span className={styles["kpi-label"]}>Interacciones Clave</span>
                  <div style={{ fontSize: "13px", color: "var(--color-on-surface)", display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
                    <div>🎵 Música reproducida: <strong>{playMusicCount}</strong> veces</div>
                    <div>📋 CBU/Alias copiado: <strong>{copyAliasCount}</strong> veces</div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span className={styles["kpi-label"]}>Dispositivos de Entrada</span>
                  <div style={{ marginTop: "4px" }}>
                    <div style={{ display: "flex", height: "10px", borderRadius: "9999px", overflow: "hidden", background: "rgba(255, 255, 255, 0.1)", marginBottom: "6px" }}>
                      <div style={{ width: `${mobilePercent}%`, background: "var(--color-primary)" }} title={`Celular: ${mobilePercent}%`} />
                      <div style={{ width: `${desktopPercent}%`, background: "var(--color-tertiary)" }} title={`Computadora: ${desktopPercent}%`} />
                      <div style={{ width: `${tabletPercent}%`, background: "#95a5a6" }} title={`Tablet: ${tabletPercent}%`} />
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--color-on-surface-variant)", display: "flex", justifyContent: "space-between" }}>
                      <span>📱 Cel: {mobilePercent}%</span>
                      <span>💻 PC: {desktopPercent}%</span>
                      {tabletPercent > 0 && <span>Tablet: {tabletPercent}%</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

          {/* Master Table Grid */}
          <Card className={styles["table-card"]}>
            <div className={styles["table-title-row"]}>
              <h2 className={styles["table-title"]}>Lista de Invitados & Cuotas</h2>
              <span className={styles["table-description"]}>
                Haz clic en el icono 👁️ para verificar los comprobantes pendientes.
              </span>
            </div>

            <div className={styles["table-wrapper"]}>
              <table className={styles["admin-table"]}>
                <thead>
                  <tr>
                    <th>Nombre de Invitado</th>
                    <th>Tipo Tarjeta</th>
                    <th>Total Tarjeta</th>
                    <th style={{ textAlign: "center" }}>Cuota 1</th>
                    <th style={{ textAlign: "center" }}>Cuota 2</th>
                    <th style={{ textAlign: "center" }}>Cuota 3</th>
                    <th style={{ textAlign: "center" }}>Cuota 4</th>
                    <th style={{ textAlign: "center" }}>Pago Total</th>
                    <th>Monto Aprobado</th>
                  </tr>
                </thead>
                <tbody>
                  {confirmedGuests.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: "center", padding: "30px" }}>
                        No hay invitados confirmados que asistan todavía.
                      </td>
                    </tr>
                  ) : (
                    confirmedGuests.map((guest) => {
                      const totalDue = getTicketPrice(guest.ticket_type, guest.created_at);
                      const totalPaid = getGuestTotalPaid(guest.id);

                      return (
                        <tr key={guest.id}>
                          <td>
                            <strong>{guest.full_name}</strong>
                            {guest.dietary && (
                              <div
                                style={{
                                  fontSize: "11px",
                                  color: "var(--color-outline)",
                                  marginTop: "2px",
                                }}
                              >
                                🥗 Requir: {guest.dietary}
                              </div>
                            )}
                          </td>
                          <td>{ticketTypeLabel(guest.ticket_type)}</td>
                          <td>${totalDue.toLocaleString("es-AR")}</td>
                          <td style={{ textAlign: "center" }}>
                            {guest.ticket_type === "menor_0_2" ? "—" : renderCellBadge(guest, "1")}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {guest.ticket_type === "menor_0_2" ? "—" : renderCellBadge(guest, "2")}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {guest.ticket_type === "menor_0_2" ? "—" : renderCellBadge(guest, "3")}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {guest.ticket_type === "menor_0_2" ? "—" : renderCellBadge(guest, "4")}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {guest.ticket_type === "menor_0_2" ? "—" : renderCellBadge(guest, "total")}
                          </td>
                          <td>
                            <span
                              style={{
                                color: totalPaid >= totalDue && totalDue > 0 ? "#2ecc71" : "inherit",
                                fontWeight: totalPaid >= totalDue && totalDue > 0 ? "600" : "normal",
                              }}
                            >
                              ${totalPaid.toLocaleString("es-AR")}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Detail Overlay Review Modal */}
      {selectedPayment && (
        <div className={styles["modal-overlay"]}>
          <div className={styles["modal-card"]}>
            <div className={styles["modal-header"]}>
              <h3 className={styles["modal-title"]}>Revisar Comprobante</h3>
              <button
                className={styles["modal-close"]}
                onClick={() => setSelectedPayment(null)}
                disabled={updatingPaymentId !== null}
              >
                ✕
              </button>
            </div>

            <div className={styles["modal-details"]}>
              <p>
                <strong>Invitado:</strong> {selectedPayment.guest_name}
              </p>
              <p>
                <strong>Concepto:</strong>{" "}
                {selectedPayment.installment_number === "total"
                  ? "Pago Completo"
                  : `Cuota ${selectedPayment.installment_number}`}
              </p>
              <p>
                <strong>Monto informado:</strong> ${selectedPayment.amount.toLocaleString("es-AR")}
              </p>
              <p>
                <strong>Fecha subida:</strong>{" "}
                {new Date(selectedPayment.created_at).toLocaleString("es-AR")}
              </p>

              {/* Receipt File Viewer */}
              <div className={styles["receipt-viewer"]}>
                {selectedPayment.receipt_url.toLowerCase().endsWith(".pdf") ? (
                  <a
                    href={selectedPayment.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles["pdf-link"]}
                  >
                    📄 Abrir Comprobante PDF en pestaña nueva
                  </a>
                ) : (
                  <img
                    src={selectedPayment.receipt_url}
                    alt="Comprobante de Pago"
                    className={styles["receipt-img"]}
                  />
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className={styles["modal-actions"]}>
              <Button
                type="button"
                variant="silver"
                className={styles["btn-reject"]}
                onClick={() => handleUpdatePaymentStatus("rejected")}
                disabled={updatingPaymentId !== null}
              >
                {updatingPaymentId === selectedPayment.id ? "PROCESANDO..." : "RECHAZAR PAGO"}
              </Button>
              <Button
                type="button"
                variant="silver"
                className={styles["btn-approve"]}
                onClick={() => handleUpdatePaymentStatus("approved")}
                disabled={updatingPaymentId !== null}
              >
                {updatingPaymentId === selectedPayment.id ? "PROCESANDO..." : "APROBAR PAGO"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
