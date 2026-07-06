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
// import { Play, Pause } from "lucide-react";
import styles from "./page.module.css";

import { logEvent } from "@/lib/analytics";

export default function Home() {
  // const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [envelopeDestroyed, setEnvelopeDestroyed] = useState(false);
  const [showInvitation, setShowInvitation] = useState(false);
  // const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  // useEffect(() => {
  //   const track = new Audio("/assets/song.mp3");
  //   track.loop = true;
  //   track.volume = 0.5;
  //   setAudio(track);
  // }, []);

  // Log page view event on mount
  useEffect(() => {
    logEvent("page_view_home");
  }, []);

  // const toggleAudio = () => {
  //   if (!audio) return;
  //   if (isAudioPlaying) {
  //     audio.pause();
  //     setIsAudioPlaying(false);
  //   } else {
  //     audio.play()
  //       .then(() => setIsAudioPlaying(true))
  //       .catch((error) => console.log("Reproducción bloqueada:", error));
  //   }
  // };

  // Check URL parameters to skip the envelope (e.g. when returning from pagar)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("skipEnvelope") === "true") {
      setEnvelopeDestroyed(true);
      setShowInvitation(true);
    }
  }, []);

  const handleEnvelopeClick = () => {
    // if (audio && !isAudioPlaying) {
    //   audio.play()
    //     .then(() => setIsAudioPlaying(true))
    //     .catch((error) => console.log("Reproducción bloqueada:", error));
    // }
    //
    // logEvent("play_music");
    setShowInvitation(true);

    setTimeout(() => {
      setEnvelopeDestroyed(true);
    }, 1500); 
  };

  return (
    <>
      {!envelopeDestroyed && <Envelope 
          onOpen={handleEnvelopeClick} 
        />}

      {/* La invitación se vuelve visible progresivamente */}
      <div 
        className={`transition-all duration-1000 ease-out ${
          showInvitation 
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

      {/* {showInvitation && (
        <button
          className={`${styles["music-toggle"]} ${!isAudioPlaying ? styles["paused"] : ""}`}
          onClick={toggleAudio}
          aria-label={isAudioPlaying ? "Pausar música" : "Reproducir música"}
          title={isAudioPlaying ? "Pausar música" : "Reproducir música"}
        >
          {isAudioPlaying ? (
            <Pause size={18} fill="currentColor" />
          ) : (
            <Play size={18} style={{ marginLeft: "2px" }} fill="currentColor" />
          )}
        </button>
      )} */}
    </>
  );
}