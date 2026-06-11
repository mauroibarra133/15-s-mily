"use client"
import { useState } from "react";

export default function Envelope({ onOpen }: { onOpen: () => void }) {
  // Estados para controlar las fases de la animación
  const [isClicked, setIsClicked] = useState(false);
  const [showOpenEnvelope, setShowOpenEnvelope] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const handleOpenPhase = () => {
    if (isClicked) return; // Evita múltiples clics
    
    setIsClicked(true);
    setShowOpenEnvelope(true);

    // Paso 2: Después de 1000ms totales, empezamos el desvanecimiento final hacia la web
    setTimeout(() => {
      setIsFadingOut(true);
    }, 1000);

    // Paso 3: Desmontamos el componente por completo
    setTimeout(() => {
      onOpen();
    }, 1200); // 1200ms de espera + 1000ms de duración del fadeout de Tailwind
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#060b19] transition-opacity duration-1000 ease-in-out ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="relative w-full max-w-[600px] aspect-[4/3] px-4 md:px-0">
        
        {/* === CAPA 1: SOBRE CERRADO === */}
        <div
          onClick={handleOpenPhase}
          className={`absolute inset-x-4 md:inset-x-0 inset-y-0 cursor-pointer transform transition-all duration-700 ease-in-out origin-center ${
            isClicked 
              ? "scale-110 blur-sm opacity-0 pointer-events-none" 
              : "scale-100 opacity-100 hover:scale-105"
          }`}
          style={{
            backgroundImage: "url('/assets/sobre-cerrado.png')",
            backgroundSize: "contain",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            filter: "drop-shadow(0px 20px 30px rgba(0, 0, 0, 0.7))",
          }}
        >
          {/* Texto indicador flotante */}
          {!isClicked && (
            <div className="absolute inset-0 flex items-end justify-center pb-8 bg-gradient-to-t from-black/40 to-transparent rounded-lg">
              <p className="text-white/90 text-xs md:text-sm tracking-[0.2em] animate-bounce uppercase font-light bg-black/20 backdrop-blur-sm px-4 py-2 rounded-full">
                Tocá para abrir la invitación
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}