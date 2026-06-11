"use client";
import { useState, useEffect } from "react";
import Envelope from "@/components/Envelope";
import Header from "@/components/Header";
import EventSection from "@/components/EventSection";
import LocationSection from "@/components/LocationSection";
import DressCodeSection from "@/components/DressCodeSection";
import GiftSection from "@/components/GiftSection";
import PhotosSections from "@/components/PhotosSections";
import AttendanceSection from "@/components/AttendanceSection";
import Footer from "@/components/Footer";
import MusicSection from "@/components/MusicSection";

export default function Home() {
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [envelopeDestroyed, setEnvelopeDestroyed] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    const track = new Audio("/assets/song.mp3");
    track.loop = true;
    track.volume = 0.5;
    setAudio(track);
  }, []);

  const handleEnvelopeClick = () => {
    if (audio && !isAudioPlaying) {
      audio.play()
        .then(() => setIsAudioPlaying(true))
        .catch((error) => console.log("Reproducción bloqueada:", error));
    }

    setTimeout(() => {
      setEnvelopeDestroyed(true);
    }, 1500); 
  };

  return (
    <>
      {!envelopeDestroyed && <Envelope 
          onOpen={handleEnvelopeClick} 
        />}

      {/* La invitación se vuelve visible progresivamente cuando la música empieza */}
      <div 
        className={`transition-all duration-1000 ease-out ${
          isAudioPlaying 
            ? "opacity-100 blur-0 scale-100" 
            : "opacity-0 blur-xl scale-95 h-screen overflow-hidden"
        }`}
      >
        <Header />
        <main>
          <EventSection />
          <LocationSection />
          <DressCodeSection />
          <GiftSection />
          <PhotosSections />
          <MusicSection />
          <AttendanceSection />
        </main>
        <Footer />
      </div>
    </>
  );
}