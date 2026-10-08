export default function ErrorMessage({ message, onRetry }) {
  return (
    <div role="alert" className="mt-4 rounded-md border border-red-300 bg-red-50 p-4">
      <p className="text-sm text-red-800">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 min-h-[40px] rounded-md bg-red-700 px-4 py-1 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2"
      >
        Retry
      </button>
    </div>
  );
}
