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
      <div className="my-3 sm:my-4">
        <h1 className="dark:text-white text-black leading-snug sm:leading-tight tracking-normal sm:tracking-wide">
          {wordsArray.map((word, idx) => (
            <span
              key={`${word}-${idx}`}
              className={cn(
                "inline-block mr-1.5 sm:mr-2.5 md:mr-3.5",
                idx > 3 ? "text-purple" : "dark:text-white text-black"
              )}
              style={{
                animation:
                  "textGlideIn 0.85s cubic-bezier(0.22, 1, 0.36, 1) both",
                animationDelay: `${idx * 0.11 + 0.1}s`,
                willChange: "transform, opacity",
              }}
            >
              {word}
            </span>
          ))}
        </h1>
      </div>
    </div>
  );
};

export default TextGenerateEffect;
