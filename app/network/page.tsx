import type { Metadata } from "next";
import Link from "next/link";
import { projectNetwork } from "@/lib/project-network";

export const metadata: Metadata = {
  title: "Project Network | ohm7",
  description:
    "Explore the Lumens Technologies project network across electrical services, repair operations, private AI, data resilience, testing, field tools, and media.",
};

export default function ProjectNetworkPage() {
  return (
    <>
      <section className="bg-gradient-to-b from-bolt-50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="max-w-3xl">
            <span className="badge-info badge mb-4">Lumens project network</span>
            <h1 className="text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
              Focused tools and services for physical operations.
            </h1>
            <p className="mt-5 text-lg text-ink-600">
              OHM7 is the property-bound electrical record. These related projects cover repair,
              field identification, electrical service, private AI, backup, testing, security,
              healthcare workflows, commerce, and technology intelligence.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {projectNetwork.map((project) => {
            const content = (
              <>
                <div className="flex items-start justify-between gap-4">
                  <span className="badge-info badge">{project.category}</span>
                  <span className="text-bolt-700" aria-hidden>
                    {project.current ? "Current" : "↗"}
                  </span>
                </div>
                <h2 className="mt-5 text-xl font-semibold text-ink-900">{project.name}</h2>
                <p className="mt-2 text-sm leading-6 text-ink-600">{project.description}</p>
                <div className="mt-5 text-sm font-semibold text-bolt-700">{project.domain}</div>
              </>
            );

            return project.current ? (
              <Link
                key={project.domain}
                href={project.href}
                className="card-pad block transition hover:-translate-y-0.5 hover:border-bolt-300"
              >
                {content}
              </Link>
            ) : (
              <a
                key={project.domain}
                href={project.href}
                target="_blank"
                rel="noreferrer"
                className="card-pad block transition hover:-translate-y-0.5 hover:border-bolt-300"
              >
                {content}
              </a>
            );
          })}
        </div>

        <div className="mt-10 rounded-2xl border border-ink-200 bg-ink-50 p-6 text-sm leading-6 text-ink-600">
          Each project has its own scope, customer journey, operating terms, and support channel.
          Listing a project here does not combine its records, customer accounts, or service
          commitments with OHM7.
        </div>
      </section>
    </>
  );
}
