// src/pages/Users.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaFilePdf, FaFileExcel } from "react-icons/fa";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import BackButton from "../components/BackButton";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) ||
  process.env.REACT_APP_API_URL ||
  "http://localhost:4000/api";

/* =========== authFetch =========== */
const authFetch = (url, opts = {}) => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  return fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
    ...opts,
  });
};

/* =========== fetchJSON helper =========== */
const fetchJSON = async (url, opts = {}) => {
  const res = await authFetch(url, opts);
  const txt = await res.text().catch(() => "");
  let data = {};
  try { data = txt ? JSON.parse(txt) : {}; } catch { data = {}; }
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status} @ ${url}`);
  return data;
};

/* =========== Normalize classes/grades =========== */
const normalizeClasses = (raw) => {
  const arr =
    Array.isArray(raw) ? raw :
    Array.isArray(raw?.items) ? raw.items :
    Array.isArray(raw?.data) ? raw.data :
    Array.isArray(raw?.classes) ? raw.classes :
    Array.isArray(raw?.grades) ? raw.grades :
    [];
  return arr
    .map((c) => {
      const id = c?.id ?? c?.class_id ?? c?.grade_id ?? c?.ID ?? c?._id ?? c?.uuid;
      const name = c?.name ?? c?.class_name ?? c?.grade_name ?? c?.title ?? c?.label ?? c?.Name;
      return id && name ? { id: String(id), name: String(name) } : null;
    })
    .filter(Boolean);
};

const fetchGradesFlexible = async () => {
  const endpoints = [`${API_BASE}/classes`, `${API_BASE}/grades`, `${API_BASE}/class`];
  let lastErr = null;
  for (const ep of endpoints) {
    try {
      const data = await fetchJSON(ep);
      const mapped = normalizeClasses(data);
      if (mapped.length) return mapped;
    } catch (e) { lastErr = e; }
  }
  if (lastErr) console.warn(lastErr);
  return [];
};

/* =========== ثابتة لباقي الفلاتر =========== */
const roles = ["All", "Teacher", "Coordinator", "Admin", "IT", "Principal", "CycleHead"];
const statuses = ["All", "Active", "Inactive"];

export default function Users() {
  const navigate = useNavigate();

  // بيانات المستخدمين
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // خيارات الصفوف من الداتابيس
  const [gradeOptions, setGradeOptions] = useState([]);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [gradesError, setGradesError] = useState("");

  // الفلاتر (خلّيت gradeId بدل grade نصّي)
  const [filters, setFilters] = useState({ role: "All", gradeId: "", status: "All" });

  // اختيار صفوف الجدول
  const [selected, setSelected] = useState([]);

  /* =========== Load users =========== */
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchJSON(`${API_BASE}/users`);
        if (!ignore) setUsers(Array.isArray(data.users) ? data.users : []);
      } catch (e) {
        if (!ignore) setError(e.message || "Failed to load users");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, []);

  /* =========== Load grades/classes from DB =========== */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setGradesLoading(true);
        setGradesError("");
        const opts = await fetchGradesFlexible();
        if (!mounted) return;
        setGradeOptions(opts); // [{id,name}]
      } catch (e) {
        if (!mounted) return;
        setGradeOptions([]);
        setGradesError(e.message || "Failed to load classes");
      } finally {
        if (mounted) setGradesLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  /* =========== Filters change =========== */
  const handleFilterChange = (type, value) => {
    setFilters((f) => ({ ...f, [type]: value }));
    setSelected([]);
  };

  /* =========== Helper: does user match selected grade? =========== */
  const userMatchesGrade = (u, gradeId, gradeName) => {
    if (!gradeId) return true; // All

    // IDs (string/array/csv)
    const idSet = new Set();
    const pushIds = (val) => {
      if (Array.isArray(val)) val.forEach((x) => idSet.add(String(x)));
      else if (val !== undefined && val !== null) {
        String(val)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((s) => idSet.add(s));
      }
    };
    pushIds(u.class_ids);
    pushIds(u.classes_ids);
    pushIds(u.grade_ids);
    pushIds(u.grades_ids);
    pushIds(u.classId);
    pushIds(u.class_id);
    pushIds(u.grade_id);
    if (idSet.has(String(gradeId))) return true;

    // Names (string/array/csv)
    const nameSet = new Set();
    const pushNames = (val) => {
      if (Array.isArray(val)) val.forEach((x) => nameSet.add(String(x).toLowerCase()));
      else if (val !== undefined && val !== null) {
        String(val)
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
          .forEach((s) => nameSet.add(s));
      }
    };
    pushNames(u.grades);
    pushNames(u.class_names);
    pushNames(u.grade);
    pushNames(u.class_name);
    if (gradeName && nameSet.has(String(gradeName).toLowerCase())) return true;

    return false;
  };

  /* =========== Derived: selected grade object =========== */
  const selectedGrade = useMemo(
    () => gradeOptions.find((g) => g.id === filters.gradeId) || null,
    [gradeOptions, filters.gradeId]
  );

  /* =========== Apply filters =========== */
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const roleMatch = filters.role === "All" || u.role === filters.role;
      const statusMatch = filters.status === "All" || (u.status || "Active") === filters.status;
      const gradeMatch = userMatchesGrade(u, filters.gradeId, selectedGrade?.name);
      return roleMatch && statusMatch && gradeMatch;
    });
  }, [users, filters, selectedGrade]);

  /* =========== Selection helpers =========== */
  const toggleSelectAll = () => {
    if (selected.length === filteredUsers.length) setSelected([]);
    else setSelected(filteredUsers.map((_, i) => i));
  };
  const toggleSingle = (i) => {
    setSelected((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
  };

  /* =========== Export =========== */
  const exportToPDF = () => {
    const dataToExport = selected.length > 0 ? selected.map((i) => filteredUsers[i]) : filteredUsers;
    const doc = new jsPDF();
    doc.text("User List", 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [["#", "Full Name", "Role", "Email", "Phone", "Status"]],
      body: dataToExport.map((u, i) => [i + 1, u.name, u.role, u.email, u.phone, u.status || "Active"]),
    });
    doc.save("users.pdf");
  };

  const exportToExcel = () => {
    const dataToExport = selected.length > 0 ? selected.map((i) => filteredUsers[i]) : filteredUsers;
    const worksheet = XLSX.utils.json_to_sheet(
      dataToExport.map((u, i) => ({
        "#": i + 1,
        "Full Name": u.name,
        Role: u.role,
        Email: u.email,
        Phone: u.phone,
        Status: u.status || "Active",
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
    XLSX.writeFile(workbook, "users.xlsx");
  };

  /* =========== Status change (آمن، ما بيمحي بيانات) =========== */
  const handleStatusChange = async (rowIndex, newStatus) => {
    const current = filteredUsers[rowIndex];
    if (!current) return;

    const prevStatus = current.status || "Active";
    if (newStatus === prevStatus) return; // لا تبعت شي إذا ما تغيّر فعليًا

    // تفاؤلي محليًا
    setUsers((prev) =>
      prev.map((u) => (u.id === current.id ? { ...u, status: newStatus, _pendingStatus: true } : u))
    );

    try {
      // 1) جيب نسخة كاملة من المستخدم حتى ما نبعث حقول فاضية
      const full = await fetchJSON(`${API_BASE}/users/${current.id}`);

      // 2) حضّر FormData بكل الحقول الموجودة الآن
      const fd = new FormData();
      const setIf = (k, v) => {
        if (v !== undefined && v !== null && String(v).trim() !== "") fd.set(k, String(v));
      };

      setIf("full_name", full.full_name || full.name || "");
      setIf("role", full.role);
      setIf("email", full.email);
      setIf("phone", full.phone);
      setIf("address", full.address);

      setIf("dob", (full.dob || "").slice(0, 10));
      setIf("place_of_birth", full.place_of_birth);
      setIf("gender", full.gender);

      if (full.children_info !== undefined) {
        try {
          fd.set(
            "children_info",
            JSON.stringify(Array.isArray(full.children_info) ? full.children_info : JSON.parse(full.children_info || "[]"))
          );
        } catch {
          fd.set("children_info", "[]");
        }
      }

      setIf("degree_title", full.degree_title);
      setIf("degree_major", full.degree_major || full.specialization);
      setIf("degree_year", full.degree_year);
      setIf("degree_university", full.degree_university);
      setIf("experience_years", full.experience_years);
      if (full.salary) setIf("salary", full.salary);

      if (full.class_ids) setIf("class_ids", String(full.class_ids));
      if (full.class_names) setIf("class_names", String(full.class_names));
      if (full.grades) setIf("grades", String(full.grades));
      if (full.class_subjects_map) {
        try {
          fd.set(
            "class_subjects_map",
            JSON.stringify(typeof full.class_subjects_map === "string" ? JSON.parse(full.class_subjects_map) : full.class_subjects_map)
          );
        } catch {}
      }
      if (full.subjects) setIf("subjects", String(full.subjects));

      if (full.availability_json) {
        fd.set(
          "availability_json",
          typeof full.availability_json === "string" ? full.availability_json : JSON.stringify(full.availability_json)
        );
      }
      if (full.weekly_minutes) setIf("weekly_minutes", full.weekly_minutes);
      if (full.total_periods) setIf("total_periods", full.total_periods);
      if (full.period_minutes) setIf("period_minutes", full.period_minutes);
      if (full.total_hours) setIf("total_hours", full.total_hours);

      // 3) وأخيرًا! عدّل الـstatus فقط
      fd.set("status", newStatus);

      // 4) PATCH آمن (بدون Content-Type)
      const res = await fetch(`${API_BASE}/users/${current.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          ...(localStorage.getItem("token") || sessionStorage.getItem("token")
            ? { Authorization: `Bearer ${localStorage.getItem("token") || sessionStorage.getItem("token")}` }
            : {}),
        },
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);

      setUsers((prev) =>
        prev.map((u) => (u.id === current.id ? { ...u, status: newStatus, _pendingStatus: false } : u))
      );
    } catch (e) {
      setUsers((prev) =>
        prev.map((u) => (u.id === current.id ? { ...u, status: prevStatus, _pendingStatus: false } : u))
      );
      alert(e.message || "Failed to update status");
    }
  };

  return (
    <div className="p-6 bg-[#F9FAFB] min-h-screen text-gray-800">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">User Management</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportToPDF}
            className="flex items-center gap-1 border px-3 py-2 rounded text-sm font-medium shadow bg-white hover:bg-gray-100"
          >
            <FaFilePdf /> Export PDF
          </button>
          <button
            type="button"
            onClick={exportToExcel}
            className="flex items-center gap-1 border px-3 py-2 rounded text-sm font-medium shadow bg-white hover:bg-gray-100"
          >
            <FaFileExcel /> Export Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-1 mb-6">
        {/* Role */}
        <div>
          <label className="block text-sm font-medium mb-1">Role</label>
          <select
            className="bg-gray-200 rounded px-4 py-2 w-full"
            value={filters.role}
            onChange={(e) => handleFilterChange("role", e.target.value)}
          >
            {roles.map((role, i) => (
              <option key={i}>{role}</option>
            ))}
          </select>
        </div>

        {/* Grade (from DB) */}
        <div>
          <label className="block text-sm font-medium mb-1">Grade</label>
          <select
            className="bg-gray-200 rounded px-4 py-2 w-full"
            value={filters.gradeId}
            onChange={(e) => handleFilterChange("gradeId", e.target.value)}
            disabled={gradesLoading}
          >
            <option value="">{gradesLoading ? "Loading…" : "All"}</option>
            {gradeOptions.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          {gradesError && <p className="text-xs text-red-600 mt-1">{gradesError}</p>}
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            className="bg-gray-200 rounded px-4 py-2 w-full"
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
          >
            {statuses.map((s, i) => (
              <option key={i}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-auto bg-white shadow rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left border-b">
              <th className="py-3 px-4">
                <input
                  type="checkbox"
                  checked={selected.length === filteredUsers.length && filteredUsers.length > 0}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="py-3 px-4">#</th>
              <th className="py-3 px-4">Full Name</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Phone</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-red-600">
                  {error}
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  No users
                </td>
              </tr>
            ) : (
              filteredUsers.map((u, idx) => (
                <tr key={u.id} className="border-b">
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.includes(idx)} onChange={() => toggleSingle(idx)} />
                  </td>
                  <td className="px-4 py-3">{idx + 1}</td>
                  <td className="px-4 py-3">{u.name}</td>
                  <td className="px-4 py-3">{u.role}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">{u.phone}</td>
                  <td className="px-4 py-3">
                    <select
                      className={`rounded px-2 py-1 text-xs ${
                        (u.status || "Active") === "Active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                      }`}
                      value={u.status || "Active"}
                      onChange={(e) => handleStatusChange(idx, e.target.value)}
                      disabled={u._pendingStatus}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 space-x-2 whitespace-nowrap">
                    {/* Edit: تنقّل فقط */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/edit-user/${u.id}`, { state: { user: u } });
                      }}
                      className="border border-blue-500 text-blue-500 px-3 py-1 rounded text-xs hover:bg-blue-50"
                    >
                      Edit
                    </button>

                    {/* Deactivate / Activate */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(idx, (u.status || "Active") === "Active" ? "Inactive" : "Active");
                      }}
                      disabled={u._pendingStatus}
                      className={`border px-3 py-1 rounded text-xs ${
                        (u.status || "Active") === "Active"
                          ? "border-red-500 text-red-500 hover:bg-red-50"
                          : "border-green-500 text-green-500 hover:bg-green-50"
                      }`}
                    >
                      {(u.status || "Active") === "Active" ? "Deactivate" : "Activate"}
                    </button>

                    {/* Reset Password: تنقّل فقط */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/reset-password/${u.id}`, { state: { user: u } });
                      }}
                      className="border border-gray-400 text-gray-700 px-3 py-1 rounded text-xs hover:bg-gray-100"
                    >
                      Reset Password
                    </button>

                    {/* Profile: تنقّل فقط */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/teacher/${u.id}`, { state: { user: u } });
                      }}
                      className="border border-purple-500 text-purple-500 px-2 py-1 rounded text-xs hover:bg-purple-50"
                    >
                      Profile
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <BackButton />
      </div>
    </div>
  );
}
