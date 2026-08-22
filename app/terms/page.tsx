import Link from "next/link";
import { FaArrowLeft } from "react-icons/fa6";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Gaurav Patil",
  description:
    "Terms of Service and legal policies for Gaurav Patil's portfolio and freelance web development services.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black-100 text-white relative overflow-hidden py-10 sm:py-16 px-5 sm:px-10 lg:px-16 xl:px-24 w-full">
      {/* Background Grid */}
      <div className="h-full w-full dark:bg-black-100 bg-white dark:bg-grid-white/[0.03] bg-grid-black-100/[0.2] absolute top-0 left-0 flex items-center justify-center pointer-events-none -z-10">
        <div className="absolute pointer-events-none inset-0 flex items-center justify-center dark:bg-black-100 bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
      </div>

      <div className="w-full mx-auto max-w-4xl lg:max-w-none">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-purple hover:text-white transition-colors duration-200 mb-8 sm:mb-10 group"
        >
          <FaArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
          Back to Portfolio
        </Link>

        {/* Header */}
        <header className="mb-10 sm:mb-12">
          <p className="uppercase tracking-widest text-xs text-purple font-medium mb-3">
            Legal
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4">
            Terms of Service
          </h1>
          <p className="text-white-200 text-sm">
            Last Updated: August 21, 2026
          </p>
        </header>

        {/* Content Box */}
        <div className="w-full rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-6 sm:p-10 lg:p-12 space-y-8 text-neutral-300 leading-relaxed text-sm sm:text-base">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing and using this website (
              <span className="text-purple">gauravpatil.online</span>) or
              engaging my freelance web development and engineering services, you
              agree to be bound by these Terms of Service. If you do not agree
              with any part of these terms, please do not use this website.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">
              2. Intellectual Property
            </h2>
            <p>
              All original content, designs, animations, source code, and assets
              created on this website are the property of{" "}
              <strong className="text-white">Gaurav Patil</strong>, unless
              otherwise stated. For client projects, intellectual property
              ownership is transferred according to individual freelance project
              agreements upon full payment.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">
              3. Freelance & Development Services
            </h2>
            <p>
              Any freelance engagement, consulting, or software development
              contract entered into with Gaurav Patil will be governed by a
              separate Statement of Work (SOW) or written agreement outlining the
              deliverables, timeline, milestones, revisions, and payment terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">
              4. External Links & Third-Party Services
            </h2>
            <p>
              This website may contain links to external third-party websites,
              repositories (e.g., GitHub), or live project deployments. I am not
              responsible for the content, privacy practices, or availability of
              external sites.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">
              5. Limitation of Liability
            </h2>
            <p>
              This website and its content are provided on an &quot;as is&quot;
              basis without warranties of any kind. Under no circumstances shall
              Gaurav Patil be liable for any direct, indirect, or consequential
              damages arising from the use or inability to use this site.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">
              6. Contact Information
            </h2>
            <p>
              If you have any questions or inquiries regarding these Terms of
              Service, feel free to reach out directly:
            </p>
            <p className="text-purple font-medium">
              Email:{" "}
              <a
                href="mailto:gauravpatil5737@gmail.com"
                className="hover:underline"
              >
                gauravpatil5737@gmail.com
              </a>
            </p>
          </section>
        </div>

        {/* Footer Note */}
        <div className="mt-12 text-center text-xs text-white-200">
          <p>© {new Date().getFullYear()} Gaurav Patil. All rights reserved.</p>
        </div>
      </div>
    </main>
  );
}
