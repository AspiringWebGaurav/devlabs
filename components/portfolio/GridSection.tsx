import { BentoGrid, BentoGridItem } from "@/components/ui/BentoGrid";
import type { BentoCardDocument } from "@/types/portfolio";
import { SEED_CARDS } from "@/lib/dal/repositories/seed-data";

interface GridSectionProps {
  cards?: BentoCardDocument[];
}

const SLOT_STYLES: Record<
  number,
  { className: string; imgClassName: string; titleClassName: string }
> = {
  1: {
    className: "lg:col-span-3 md:col-span-6 md:row-span-4 lg:min-h-[60vh]",
    imgClassName: "w-full h-full",
    titleClassName: "justify-end",
  },
  2: {
    className: "lg:col-span-2 md:col-span-3 md:row-span-2",
    imgClassName: "",
    titleClassName: "justify-start",
  },
  3: {
    className: "lg:col-span-2 md:col-span-3 md:row-span-2",
    imgClassName: "",
    titleClassName: "justify-center",
  },
  4: {
    className: "lg:col-span-2 md:col-span-3 md:row-span-1",
    imgClassName: "",
    titleClassName: "justify-start",
  },
  5: {
    className: "md:col-span-3 md:row-span-2",
    imgClassName: "absolute right-0 bottom-0 md:w-96 w-60",
    titleClassName: "justify-center md:justify-start lg:justify-center",
  },
  6: {
    className: "lg:col-span-2 md:col-span-3 md:row-span-1",
    imgClassName: "",
    titleClassName: "justify-center md:max-w-full max-w-60 text-center",
  },
};

export const GridSection = ({ cards = SEED_CARDS }: GridSectionProps) => {
  const sortedCards = [...cards].sort((a, b) => (a.slotIndex || 0) - (b.slotIndex || 0));

  return (
    <section>
      <BentoGrid className="w-full py-20">
        {sortedCards.map((card) => {
          const slot = card.slotIndex || 1;
          const styles = SLOT_STYLES[slot] || SLOT_STYLES[1];

          return (
            <BentoGridItem
              id={card.id}
              key={card.id}
              slotIndex={card.slotIndex}
              cardType={card.cardType}
              gridSpanVariant={card.gridSpanVariant}
              visualLayout={card.visualLayout}
              title={card.title}
              description={card.description}
              className={styles.className}
              img={card.img}
              imgClassName={styles.imgClassName}
              titleClassName={styles.titleClassName}
              spareImg={card.spareImg}
              techStackLeft={card.techStackLeft}
              techStackRight={card.techStackRight}
              ctaEmail={card.ctaEmail}
            />
          );
        })}
      </BentoGrid>
    </section>
  );
};
