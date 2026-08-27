import React from "react";

interface MagicButtonProps {
  title: string;
  icon: React.ReactNode;
  position: "left" | "right" | string;
  handleClick?: () => void;
  otherClasses?: string;
}

const MagicButton: React.FC<MagicButtonProps> = ({
  title,
  icon,
  position,
  handleClick,
  otherClasses = "",
}) => {
  return (
    <button
      className="relative inline-flex h-12 w-full md:w-60 md:mt-10 overflow-hidden rounded-xl p-[1.5px] border border-white/[0.18] hover:border-purple/60 transition-all duration-300 focus:outline-hidden group select-none shadow-[0_0_20px_rgba(203,172,249,0.15)]"
      onClick={handleClick}
      type="button"
    >
      {/* 360-Degree Continuous Luminous Conic Beam */}
      <span className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#7C3AED_25%,#393BB2_50%,#7C3AED_75%,#E2CBFF_100%)] opacity-90 group-hover:opacity-100 transition-opacity" />

      {/* Solid Inner Body with Math-Correct Radius (10px inside 12px) */}
      <span
        className={`inline-flex h-full w-full cursor-pointer items-center justify-center rounded-[10px] bg-[#04071D] group-hover:bg-[#070B28] px-7 text-sm font-medium text-white backdrop-blur-3xl gap-2 transition-colors duration-200 ${otherClasses}`}
      >
        {position === "left" && icon}
        <span>{title}</span>
        {position === "right" && icon}
      </span>
    </button>
  );
};

export default MagicButton;
