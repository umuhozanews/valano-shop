import toast from "react-hot-toast";

export function useNotification() {
  const success = (message) => toast.success(message);
  const error = (message) => toast.error(message);
  const info = (message) => toast(message, { icon: "ℹ️" });
  const loading = (message) => toast.loading(message);
  const dismiss = (id) => toast.dismiss(id);

  return { success, error, info, loading, dismiss };
}
