"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { FaLocationArrow } from "react-icons/fa6";

import { socialMedia } from "@/data";
import MagicButton from "@/components/ui/MagicButton";
import { ContactModal } from "@/components/contact/ContactModal";

export const FooterSection = () => {
  const [isContactOpen, setIsContactOpen] = useState(false);

  return (
    <footer className="w-full pt-20 pb-10">
      <div className="flex flex-col items-center">
        <h1 className="heading lg:max-w-[45vw]">
          Ready to take <span className="text-purple">your</span> digital
          presence to the next level?
        </h1>
        <p className="text-white-200 md:mt-10 my-5 text-center">
          Reach out to me today and let&apos;s discuss how I can help you
          achieve your goals.
        </p>
        <MagicButton
          title="Let's get in touch"
          icon={<FaLocationArrow />}
          position="right"
          handleClick={() => setIsContactOpen(true)}
        />
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center w-full mt-20 pt-8 border-t border-white/[0.08] gap-4">
        {/* Left: Copyright & Legal Links */}
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 text-xs sm:text-sm text-neutral-400 font-normal">
          <span>© {new Date().getFullYear()} Gaurav Patil</span>
          <span className="text-neutral-600">·</span>
          <Link
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-purple transition-colors duration-200"
          >
            Terms
          </Link>
          <span className="text-neutral-600">·</span>
          <Link
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-purple transition-colors duration-200"
          >
            Privacy
          </Link>
        </div>

        {/* Right: Social Media Links */}
        <div className="flex items-center justify-center md:justify-end gap-3">
          {socialMedia.map((info) => (
            <a
              key={info.id}
              href={info.link}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 cursor-pointer flex justify-center items-center backdrop-filter backdrop-blur-lg saturate-180 bg-opacity-75 bg-black-200 rounded-lg border border-black-300 hover:border-purple/50 transition-colors duration-200"
              aria-label={`Link to ${info.link}`}
            >
              <Image src={info.img} alt="icons" width={20} height={20} />
            </a>
          ))}
        </div>
      </div>

      {/* Dynamic Interactive Contact Modal */}
      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />
    </footer>
  );
};
