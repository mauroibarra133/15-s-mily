import PaymentPortal from "@/components/PaymentPortal";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portal de Pagos - 15 de Mily",
  description: "Registra los comprobantes de tus transferencias de cuotas para la tarjeta de la fiesta de 15 de Mily.",
};

export default function PagarPage() {
  return (
    <main>
      <PaymentPortal />
    </main>
  );
}
