
const BASE_URL = "http://127.0.0.1:8000";

export const getToken = () =>
  sessionStorage.getItem("roomly_token");

export const saveToken = (token) =>
  sessionStorage.setItem("roomly_token", token);

export const clearToken = () =>
  sessionStorage.removeItem("roomly_token");

export async function api(path, options = {}) {
  const token = getToken();

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body
        ? { "Content-Type": "application/json" }
        : {}),
      ...(token
        ? { Authorization: `Bearer ${token}` }
        : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = data?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((e) => e.msg).join(", ")
          : "Request failed";

    throw new Error(message);
  }

  return data;
}
