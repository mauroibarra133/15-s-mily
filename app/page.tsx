import Header from "@/components/Header";
import EventSection from "@/components/EventSection";
import LocationSection from "@/components/LocationSection";
import DressCodeSection from "@/components/DressCodeSection";
import GiftSection from "@/components/GiftSection";
import PhotosSections from "@/components/PhotosSections";
import AttendanceSection from "@/components/AttendanceSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <EventSection />
        <LocationSection />
        <DressCodeSection />
        <GiftSection />
        {/* <PhotosSections /> */}
        {/* <AttendanceSection />  */}
      </main>
      <Footer />
    </>
  );
}
