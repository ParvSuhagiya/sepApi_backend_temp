export default function ForumCard({ item }) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noreferrer"
      className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-700"
    >
      <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
      <p className="mt-1 text-sm text-slate-600">{item.snippet}</p>
    </a>
  );
}
