export const metadata = { title: "Invite — ServiceFixes DHT" };

export default function InvalidInvitePage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12 space-y-4">
      <h1 className="text-2xl font-semibold">Invalid invite</h1>
      <p className="text-sm text-ink-600">
        That invite link isn't recognised. Ask the property owner to send a fresh invite.
      </p>
    </div>
  );
}
