export const metadata = { title: "Claim stalled — ohm7" };

export default function StalledPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12 space-y-4">
      <h1 className="text-2xl font-semibold">Claim marked as stalled</h1>
      <p className="text-sm text-ink-600">
        We recorded that you tried to register this property and couldn't complete owner
        verification. An admin will reach out by phone using the number you provided.
      </p>
    </div>
  );
}
