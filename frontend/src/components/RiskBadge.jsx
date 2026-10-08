const RISK_STYLES = {
  Low: "bg-green-100 text-green-900 border border-green-700",
  Medium: "bg-amber-100 text-amber-900 border border-amber-600",
  High: "bg-red-100 text-red-900 border border-red-600",
};

export default function RiskBadge({ risk }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${RISK_STYLES[risk] || RISK_STYLES.Low}`}
    >
      {risk} risk
    </span>
  );
}
