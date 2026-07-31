export function LogosSection() {
  const logos = [
    "Acme",
    "Nimbus",
    "Vertex",
    "Lumen",
    "Cypher",
    "Orbit",
    "Kadence",
    "Fable",
  ];

  return (
    <section className="py-16 border-y border-border-light bg-surface-elevated/50">
      <div className="max-w-300 mx-auto px-6">
        <p className="text-center text-sm text-text-tertiary mb-8">
          Built for modern product teams
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-6 items-center">
          {logos.map((logo) => (
            <div
              key={logo}
              className="text-center text-xl font-bold tracking-tight text-text-tertiary grayscale hover:text-primary hover:grayscale-0 hover:scale-105 transition-all cursor-pointer"
            >
              {logo}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
