// src/pages/ViewExam.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  process.env.REACT_APP_API_URL ||
  "http://localhost:4000/api";

const examTypeOptions = ["Midterm", "Final", "Quiz", "Essay"];
const statusOptions = [
  "Draft",
  "Done Not Corrected",
  "Not Done Yet",
  "Correction in Progress",
];
const durationOptions = [
  "1 hour",
  "1.5 hours",
  "2 hours",
  "2.5 hours",
  "3 hours",
  "3.5 hours",
  "4 hours",
];

const ensureLen10 = (arr) => {
  const a = Array.isArray(arr) ? [...arr] : [];
  while (a.length < 10) a.push("");
  return a.slice(0, 10);
};

export default function ViewExam() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation(); // ← هون بيوصل exam من صفحة اللستة
  const examFromList = state?.exam;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // خيارات DB
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]); // مواد الصف الحالي
  const [subjectsByClass, setSubjectsByClass] = useState({}); // كاش

  // بيانات الامتحان
  const [exam, setExam] = useState({
    id,
    title: "",
    class_id: "",
    subject_id: "",
    type: "Midterm",
    date: "",
    time: "08:00",
    duration: "1 hour",
    status: "Draft",
    teacher: "",
    coordinator: "",
    file_url: "",
    file: null,
    objectives: ensureLen10([]),
  });

  /* تحميل الصفوف */
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/classes`);
        const j = await r.json();
        const rows = (j.classes || j.data || []).map((c) => ({
          id: String(c.id),
          name:
            c.name ||
            `${c.grade ?? ""}${c.section ? ` ${c.section}` : ""}`.trim() ||
            `Class ${c.id}`,
        }));
        setClasses(rows);
      } catch {
        setClasses([]);
      }
    })();
  }, []);

  /* حوّل exam القادم من اللستة (لو موجود) لنفس شكل الحقول هون */
  const mapIncoming = (e) => ({
    id: e.id,
    title: e.title || "",
    class_id: String(e.class_id ?? e.classId ?? ""),
    subject_id: String(e.subject_id ?? e.subjectId ?? ""),
    type: e.type || "Midterm",
    date: e.date ? String(e.date).slice(0, 10) : "",
    time: e.time || "08:00",
    duration: e.duration || "1 hour",
    status: e.status || "Draft",
    teacher: e.teacher || "",        // ممكن يكون فاضي (ما بينزل من اللستة)
    coordinator: e.coordinator || "",// ممكن يكون فاضي
    file_url: e.file_url || e.fileURL || "",
    file: null,
    objectives: ensureLen10(e.objectives || []),
  });

  /* تحميل البيانات:
     - إذا اجانا exam من اللستة (state) منعبيه فوراً (مهم للـ tmp_)
     - إذا الـ id مو tmp_، منجيب من API لتحديث/تثبيت البيانات
  */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // 1) استعمل بيانات الـ state (بتظهر فوراً بنفس اللي انحط وقت Add)
        if (examFromList) {
          const mapped = mapIncoming(examFromList);
          if (!cancelled) setExam((prev) => ({ ...prev, ...mapped }));
        }

        // 2) إذا id رقمي (مش tmp_)، هات الحقيقة من الـ API
        if (!String(id).startsWith("tmp_")) {
          const r = await fetch(`${API_BASE}/exams/${id}`);
          if (r.ok) {
            const j = await r.json();
            const e = j.data || j.exam || j;
            const mapped = mapIncoming(e);
            if (!cancelled) setExam((prev) => ({ ...prev, ...mapped }));
          }
        }
      } catch (err) {
        console.error("fetch exam error", err);
        if (!examFromList) {
          setMsg("Failed to load exam");
          setTimeout(() => setMsg(""), 2000);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, examFromList]);

  /* حمّل مواد الصف الحالي (مع كاش) */
  useEffect(() => {
    (async () => {
      const classId = String(exam.class_id || "");
      if (!classId) {
        setSubjects([]);
        return;
      }
      if (subjectsByClass[classId]) {
        setSubjects(subjectsByClass[classId]);
        return;
      }
      try {
        const r = await fetch(`${API_BASE}/classes/${classId}/subjects`);
        const j = await r.json();
        const rows = (j.subjects || j.data || []).map((s) => ({
          id: String(s.id),
          name: s.name,
        }));
        setSubjects(rows);
        setSubjectsByClass((m) => ({ ...m, [classId]: rows }));
      } catch {
        setSubjects([]);
      }
    })();
  }, [exam.class_id, subjectsByClass]);

  // ضمن نفس الصف، تأكد subject_id صالح
  useEffect(() => {
    if (!exam.class_id || !subjects.length) return;
    const ok = subjects.some((s) => String(s.id) === String(exam.subject_id));
    if (!ok) {
      setExam((prev) => ({
        ...prev,
        subject_id: subjects[0]?.id ? String(subjects[0].id) : "",
      }));
    }
  }, [subjects, exam.class_id]); // eslint-disable-line

  const onChange = (key, value) => setExam((e) => ({ ...e, [key]: value }));
  const onChangeObjective = (i, val) =>
    setExam((e) => {
      const arr = [...e.objectives];
      arr[i] = val;
      return { ...e, objectives: arr };
    });

  const canSave = useMemo(() => {
    return (
      String(exam.title).trim() !== "" &&
      String(exam.class_id || "") !== "" &&
      String(exam.subject_id || "") !== "" &&
      String(exam.type || "") !== "" &&
      String(exam.date || "") !== ""
    );
  }, [exam]);

  const save = async () => {
    if (!canSave || saving) return;
    try {
      setSaving(true);
      setMsg("");

      const isTmp = String(exam.id).startsWith("tmp_");

      // 1) إنشاء أو تعديل الـ exam الأساسي
      let examId = exam.id;
      if (isTmp) {
        const res = await fetch(`${API_BASE}/exams`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: exam.title,
            class_id: Number(exam.class_id),
            subject_id: Number(exam.subject_id),
            type: exam.type,
            date: exam.date,
            time: exam.time || "08:00",
            duration: exam.duration || "1 hour",
            status: exam.status,
          }),
        });
        if (!res.ok) throw new Error("Create failed");
        const d = await res.json().catch(() => ({}));
        examId = d?.id || d?.data?.id;
        if (!examId) throw new Error("No ID returned");

        setExam((prev) => ({ ...prev, id: examId }));
        // اختياريًا: ثبّت المسار على الـ id الجديد
        navigate(`/exam/${examId}/view`, { replace: true });
      } else {
        const coreRes = await fetch(`${API_BASE}/exams/${examId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: exam.title,
            class_id: Number(exam.class_id),
            subject_id: Number(exam.subject_id),
            type: exam.type,
            date: exam.date,
            time: exam.time || "08:00",
            duration: exam.duration || "1 hour",
            status: exam.status,
          }),
        });
        if (!coreRes.ok) throw new Error("Update failed");
      }

      // 2) (اختياري) حفظ meta
      await fetch(`${API_BASE}/exams/${examId}/meta`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacher: exam.teacher || "",
          coordinator: exam.coordinator || "",
          file_url: exam.file_url || "",
        }),
      }).catch(() => {});

      // 3) (اختياري) حفظ الأهداف
      await fetch(`${API_BASE}/exams/${examId}/objectives`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectives: ensureLen10(exam.objectives) }),
      }).catch(() => {});

      // 4) رفع ملف إذا موجود
      if (exam.file instanceof File) {
        const fd = new FormData();
        fd.append("file", exam.file);
        const up = await fetch(`${API_BASE}/exams/${examId}/file`, {
          method: "POST",
          body: fd,
        });
        if (up.ok) {
          const j = await up.json().catch(() => ({}));
          const url = j.file_url || j.url || j.data?.file_url || "";
          if (url) onChange("file_url", url);
        }
      }

      setMsg("Saved ✅");
      setTimeout(() => setMsg(""), 2000);
    } catch (e) {
      console.error(e);
      setMsg("Save failed");
      setTimeout(() => setMsg(""), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-10 bg-[#F9FAFB] min-h-screen text-gray-800">
      <button
        onClick={() => navigate("/exams")}
        className="mb-4 text-sm text-blue-600 hover:underline"
      >
        ← Back to Exams
      </button>

      <h2 className="text-2xl font-bold mb-6">Exam Details</h2>

      {loading ? (
        <div className="text-gray-500">Loading…</div>
      ) : (
        <div className="bg-white shadow rounded-xl p-6 space-y-6 max-w-3xl">
          {/* ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Exam ID</label>
            <input
              type="text"
              value={exam.id}
              readOnly
              className="w-full border px-3 py-2 rounded text-sm bg-gray-100"
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={exam.title}
              onChange={(e) => onChange("title", e.target.value)}
              className="w-full border px-3 py-2 rounded text-sm"
            />
          </div>

          {/* Class + Subject */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grade (Class)</label>
              <select
                value={exam.class_id}
                onChange={(e) => onChange("class_id", e.target.value)}
                className="w-full border px-3 py-2 rounded text-sm bg-white"
              >
                <option value="">Select class…</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <select
                value={exam.subject_id}
                onChange={(e) => onChange("subject_id", e.target.value)}
                className="w-full border px-3 py-2 rounded text-sm bg-white"
                disabled={!exam.class_id}
              >
                <option value="">Select subject…</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Type + Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={exam.type}
                onChange={(e) => onChange("type", e.target.value)}
                className="w-full border px-3 py-2 rounded text-sm"
              >
                {examTypeOptions.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={exam.status}
                onChange={(e) => onChange("status", e.target.value)}
                className="w-full border px-3 py-2 rounded text-sm"
              >
                {statusOptions.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={exam.date || ""}
                onChange={(e) => onChange("date", e.target.value)}
                className="w-full border px-3 py-2 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <input
                type="time"
                value={exam.time || "08:00"}
                onChange={(e) => onChange("time", e.target.value)}
                className="w-full border px-3 py-2 rounded text-sm"
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
            <select
              value={exam.duration}
              onChange={(e) => onChange("duration", e.target.value)}
              className="w-full border px-3 py-2 rounded text-sm"
            >
              {durationOptions.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Teacher + Coordinator */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
              <input
                type="text"
                value={exam.teacher}
                onChange={(e) => onChange("teacher", e.target.value)}
                className="w-full border px-3 py-2 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Coordinator</label>
              <input
                type="text"
                value={exam.coordinator}
                onChange={(e) => onChange("coordinator", e.target.value)}
                className="w-full border px-3 py-2 rounded text-sm"
              />
            </div>
          </div>

          {/* File */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Attach File</label>
            <input
              type="file"
              onChange={(e) => onChange("file", e.target.files?.[0] || null)}
              className="w-full border px-3 py-2 rounded text-sm"
            />
            {exam.file_url ? (
              <div className="mt-2 text-sm">
                Current file:{" "}
                <a
                  href={exam.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline"
                >
                  Open
                </a>
              </div>
            ) : null}
          </div>

          {/* Objectives */}
          <div>
            <label className="block text-sm font-bold mb-2">Objectives</label>
            <div className="space-y-2">
              {exam.objectives.map((obj, i) => (
                <input
                  key={i}
                  type="text"
                  placeholder={`Objective ${i + 1}`}
                  value={obj}
                  onChange={(e) => onChangeObjective(i, e.target.value)}
                  className="w-full border px-3 py-2 rounded text-sm"
                />
              ))}
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">{msg}</span>
            <button
              onClick={save}
              disabled={!canSave || saving}
              className={`px-6 py-2 rounded text-white transition ${
                !canSave || saving
                  ? "bg-green-300 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {saving ? "Saving..." : "Save Exam"}
            </button>
          </div>
        </div>
      )}

      {msg && !loading && (
        <div className="fixed bottom-4 right-4 bg-white border shadow px-4 py-2 rounded text-sm">
          {msg}
        </div>
      )}
    </div>
  );
}
