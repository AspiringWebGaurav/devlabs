import Link from "next/link";
import { FaArrowLeft } from "react-icons/fa6";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Gaurav Patil",
  description:
    "Privacy Policy for Gaurav Patil's portfolio and web development services.",
};

export default function PrivacyPage() {
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
            Privacy
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4">
            Privacy Policy
          </h1>
          <p className="text-white-200 text-sm">
            Last Updated: August 21, 2026
          </p>
        </header>

        {/* Content Box */}
        <div className="w-full rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-6 sm:p-10 lg:p-12 space-y-8 text-neutral-300 leading-relaxed text-sm sm:text-base">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">
              1. Overview & Commitment
            </h2>
            <p>
              Your privacy is of utmost importance. This Privacy Policy outlines
              how information is collected, used, and protected when you visit{" "}
              <span className="text-purple">gauravpatil.online</span> or interact
              with my web development services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">
              2. Information Collected
            </h2>
            <p>
              This website is designed with a privacy-first mindset:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>
                <strong className="text-white">Direct Communication:</strong> If
                you reach out via email or contact forms, I collect your email
                address, name, and any details provided in your message solely to
                respond to your inquiry.
              </li>
              <li>
                <strong className="text-white">Anonymous Analytics:</strong> We
                use privacy-preserving performance metrics (such as Vercel Speed
                Insights) to understand aggregate traffic trends. No personally
                identifiable information (PII) is sold or shared.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">
              3. How Your Information is Used
            </h2>
            <p>
              Any information received is strictly used for:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>Responding to project inquiries, collaborations, and questions.</li>
              <li>Delivering agreed-upon web development and software engineering services.</li>
              <li>Improving site performance and user experience.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">
              4. Data Protection & Security
            </h2>
            <p>
              Industry-standard security measures, HTTPS encryption, and strict
              HTTP security headers are implemented across this website to
              protect against unauthorized access or disclosure.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">
              5. Third-Party Services
            </h2>
            <p>
              This website is hosted on modern cloud infrastructure (Vercel) and
              may link to external services like GitHub and LinkedIn. These
              services operate under their own respective privacy policies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white">
              6. Contact Me
            </h2>
            <p>
              If you have any questions about this Privacy Policy or wish to
              request the deletion of any communication data, please contact me:
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
