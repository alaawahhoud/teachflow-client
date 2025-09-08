// client/src/components/FingerprintEnroll.jsx
import React, { useEffect, useRef, useState } from "react";

/* ======== API BASE + authFetch ======== */
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL?.replace(/\/$/, "")) ||
  "https://teachflow-server.onrender.com/api";

const authFetch = (url, opts = {}) => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  const full = url.startsWith("http") ? url : `${API_BASE}${url}`;
  return fetch(full, {
    credentials: "include",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
    ...opts,
  });
};

/* ======== Helpers: جرّب /api/... و /api/fingerprints/... ======== */
async function postEnrollRequest(user_id, device_id) {
  const body = JSON.stringify({ user_id, device_id });
  const headers = { "Content-Type": "application/json" };
  let r = await authFetch(`/enroll-request`, { method: "POST", headers, body });
  if (r.status === 404) r = await authFetch(`/fingerprints/enroll-request`, { method: "POST", headers, body });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.message || `HTTP ${r.status}`);
  return j; // { user_id, device_id, pageId }
}

async function getEnrollStatus(user_id) {
  let r = await authFetch(`/enroll-status?user_id=${encodeURIComponent(user_id)}`);
  if (r.status === 404) r = await authFetch(`/fingerprints/enroll-status?user_id=${encodeURIComponent(user_id)}`);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.message || `HTTP ${r.status}`);
  return j; // { status, pageId?, device_id?, note? }
}

/* ======== Component ======== */
export default function FingerprintEnroll({
  userId,
  initialPageId = null,
  defaultDeviceId = "scanner-001",
  onEnrolled, // callback(pageId)
}) {
  const [deviceId, setDeviceId] = useState(defaultDeviceId);
  const [pageId, setPageId] = useState(initialPageId);
  const [status, setStatus] = useState("idle"); // idle|requesting|waiting|done|failed
  const [msg, setMsg] = useState("");
  const [polling, setPolling] = useState(false);

  const pollTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, []);

  const startPolling = () => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    setPolling(true);
    pollTimer.current = setInterval(async () => {
      try {
        const st = await getEnrollStatus(userId);
        if (st.status && st.status !== "pending") {
          clearInterval(pollTimer.current);
          pollTimer.current = null;
          setPolling(false);
          if (st.status === "done") {
            setStatus("done");
            if (typeof st.pageId !== "undefined") setPageId(st.pageId);
            setMsg("Fingerprint saved ✅");
            onEnrolled && onEnrolled(st.pageId);
          } else {
            setStatus("failed");
            setMsg(st.note || "Enrollment failed");
          }
        } else {
          setStatus("waiting");
          setMsg("Waiting for device to finish…");
        }
      } catch (e) {
        console.warn("poll error:", e?.message);
      }
    }, 1200);
  };

  const handleEnroll = async () => {
    try {
      if (!userId) return setMsg("Save the user first to get an ID.");
      setStatus("requesting");
      setMsg("");
      const j = await postEnrollRequest(String(userId), deviceId);
      if (typeof j.pageId !== "undefined") setPageId(j.pageId);
      setStatus("waiting");
      setMsg("Command sent. Place same finger twice on the scanner…");
      startPolling();
    } catch (e) {
      setStatus("failed");
      setMsg(e?.message || "Failed to request enrollment");
    }
  };

  const stopPolling = () => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    pollTimer.current = null;
    setPolling(false);
  };

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-800">Fingerprint</h3>
        <span className="text-xs text-gray-500">
          {pageId ? `Current page: #${pageId}` : "No fingerprint yet"}
        </span>
      </div>

      <div className="grid md:grid-cols-3 gap-3 mb-3">
        <div className="md:col-span-2">
          <label className="text-sm text-gray-700 mb-1 block">Device ID</label>
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="scanner-001"
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
          />
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={handleEnroll}
            className={
              "px-4 py-2 rounded text-white " +
              (status === "requesting" || status === "waiting"
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700")
            }
            disabled={status === "requesting" || status === "waiting"}
            title="Send enroll command to the scanner"
          >
            {pageId ? "Re-enroll / Replace" : "Enroll fingerprint"}
          </button>
        </div>
      </div>

      {msg && (
        <div
          className={
            "text-sm rounded px-3 py-2 " +
            (status === "failed"
              ? "bg-red-50 text-red-700 border border-red-200"
              : status === "done"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-blue-50 text-blue-700 border border-blue-200")
          }
        >
          {msg}
        </div>
      )}

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={startPolling}
          className="text-xs px-3 py-1.5 rounded border hover:bg-gray-50"
          disabled={polling}
        >
          Refresh status
        </button>
        {polling && (
          <button
            type="button"
            onClick={stopPolling}
            className="text-xs px-3 py-1.5 rounded border hover:bg-gray-50"
          >
            Stop polling
          </button>
        )}
      </div>
    </div>
  );
}
