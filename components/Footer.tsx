import Link from "next/link";
import { FaLocationArrow } from "react-icons/fa6";

import { socialMedia } from "@/data";
import MagicButton from "./ui/MagicButton";

const Footer = () => {
  return (
    <footer className="w-full pt-20 pb-10" id="contact">
      {/* background grid */}

      <div className="flex flex-col items-center">
        <h1 className="heading lg:max-w-[45vw]">
          Ready to take <span className="text-purple">your</span> digital
          presence to the next level?
        </h1>
        <p className="text-white-200 md:mt-10 my-5 text-center">
          Reach out to me today and let&apos;s discuss how I can help you
          achieve your goals.
        </p>
        <a href="mailto:gauravpatil5737@gmail.com">
          <MagicButton
            title="Let's get in touch"
            icon={<FaLocationArrow />}
            position="right"
          />
        </a>
      </div>
      <div className="flex mt-20 pt-8 border-t border-white/[0.08] md:flex-row flex-col justify-between items-center gap-4">
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 text-xs sm:text-sm text-neutral-400 font-normal">
          <span>© {new Date().getFullYear()} Gaurav Patil</span>
          <span className="text-neutral-600">·</span>
          <Link
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-purple transition-colors duration-200"
          >
            Privacy Policy
          </Link>
          <span className="text-neutral-600">·</span>
          <Link
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-purple transition-colors duration-200"
          >
            Terms of Service
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {socialMedia.map((info) => (
            <a
              key={info.id}
              href={info.link}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 cursor-pointer flex justify-center items-center rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-md hover:border-purple/50 hover:bg-purple/[0.08] transition-all duration-300 hover:scale-105 shadow-sm"
              aria-label="Social Link"
            >
              <img src={info.img} alt="icons" width={18} height={18} className="opacity-80 hover:opacity-100 transition-opacity" />
            </a>
          ))}
        </div>
      </div>
    </footer>

  );
};

export default Footer;
