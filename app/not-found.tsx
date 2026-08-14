import Link from "next/link";
import { FaLocationArrow } from "react-icons/fa6";
import MagicButton from "@/components/ui/MagicButton";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-black-100 flex flex-col items-center justify-center px-5 text-center relative overflow-hidden">
      <div className="max-w-md z-10 flex flex-col items-center">
        <h1 className="text-7xl md:text-9xl font-extrabold text-purple tracking-widest mb-4">
          404
        </h1>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
          Page Not Found
        </h2>
        <p className="text-white-200 text-sm md:text-base mb-8">
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/">
          <MagicButton
            title="Return Home"
            icon={<FaLocationArrow />}
            position="right"
          />
        </Link>
      </div>
    </main>
  );
}
