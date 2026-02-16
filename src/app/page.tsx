export const dynamic = "force-dynamic";

export default function Dashboard() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      <div className="text-center">
        <h1 className="text-5xl font-extrabold tracking-tight mb-4">
          <span className="text-red-700">NXT</span>{" "}
          <span className="text-gray-400">Social</span>{" "}
          <span className="text-red-600 italic">Extreme</span>
        </h1>
        <p className="text-neutral-400 text-lg">Platform is loading. Deployment verified.</p>
      </div>
    </div>
  );
}
