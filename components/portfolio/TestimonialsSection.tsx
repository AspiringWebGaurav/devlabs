"use client";

import React from "react";
import { InfiniteMovingCards } from "@/components/ui/InfiniteMovingCards";
import type { TestimonialDocument, ClientDocument } from "@/types/portfolio";
import { SEED_TESTIMONIALS, SEED_CLIENTS } from "@/lib/dal/repositories/seed-data";

interface TestimonialsSectionProps {
  testimonials?: TestimonialDocument[];
  clients?: ClientDocument[];
}

export const TestimonialsSection = ({
  testimonials = SEED_TESTIMONIALS,
  clients = SEED_CLIENTS,
}: TestimonialsSectionProps) => {
  const activeTestimonials =
    testimonials && testimonials.length > 0
      ? testimonials
      : SEED_TESTIMONIALS;

  const formattedTestimonials = activeTestimonials.map((t) => ({
    quote: t.quote,
    name: t.name,
    title: t.role || t.company,
  }));

  const activeClients =
    clients && clients.length > 0
      ? clients
      : SEED_CLIENTS;

  const sortedClients = [...activeClients].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <section className="py-20">
      <h1 className="heading">
        Kind words from
        <span className="text-purple"> satisfied clients</span>
      </h1>

      <div className="flex flex-col items-center max-lg:mt-10">
        <div className="h-[50vh] md:h-[30rem] w-full rounded-md flex flex-col antialiased items-center justify-center relative overflow-hidden">
          <InfiniteMovingCards
            items={formattedTestimonials}
            direction="right"
            speed="slow"
          />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-16 max-lg:mt-10">
          {sortedClients.map((client) => (
            <div key={client.id} className="flex md:max-w-60 max-w-32 gap-2 items-center">
              {client.iconUrl && (
                <img
                  src={client.iconUrl}
                  alt={client.name}
                  loading="lazy"
                  decoding="async"
                  className="md:w-10 w-5 object-contain"
                />
              )}
              {client.nameImgUrl && (
                <img
                  src={client.nameImgUrl}
                  alt={client.name}
                  loading="lazy"
                  decoding="async"
                  width={client.logoWidth || 120}
                  className="md:w-24 w-20 object-contain"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
