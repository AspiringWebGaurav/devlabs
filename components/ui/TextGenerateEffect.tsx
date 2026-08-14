import { cn } from "@/lib/utils";

export const TextGenerateEffect = ({
  words,
  className,
}: {
  words: string;
  className?: string;
  filter?: boolean;
  duration?: number;
}) => {
  const wordsArray = words.split(" ");

  return (
    <div className={cn("font-bold", className)}>
      <div className="my-4">
        <div className="dark:text-white text-black leading-snug tracking-wide">
          {wordsArray.map((word, idx) => (
            <span
              key={`${word}-${idx}`}
              className={cn(
                "inline-block mr-1.5 sm:mr-2 md:mr-3",
                idx > 3 ? "text-purple" : "dark:text-white text-black"
              )}
              style={{
                animation: "textGlideIn 0.8s ease-out both",
                animationDelay: `${idx * 0.12}s`,
                willChange: "opacity, transform, filter",
              }}
            >
              {word}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TextGenerateEffect;
