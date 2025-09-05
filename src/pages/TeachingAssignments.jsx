import React from "react";

export default /* ========= Teaching Assignments (per-class subjects) ========= */
function TeachingAssignments({
  classes = [],
  subjectsByClass = {}, // { [classId]: [{id,name}] }
  classSubjects,        // { [classId]: Set(subjectId) }
  setClassSubjects,
  subjectsLoading,
  subjectsError,
}) {
  const isIncluded = (cid) => !!classSubjects[cid] && classSubjects[cid].size > 0;

  const toggleClass = (cid) => {
    setClassSubjects((prev) => {
      const next = { ...prev };
      if (isIncluded(cid)) {
        delete next[cid];
      } else {
        next[cid] = new Set();
      }
      return next;
    });
  };

  const toggleSubjectForClass = (cid, subjId) => {
    if (!isIncluded(cid)) return; // ممنوع تختاري مادة إذا الصف مش مفعّل
    const allowedIds = new Set((subjectsByClass[cid] || []).map((s) => String(s.id)));
    if (!allowedIds.has(String(subjId))) return; // أمان إضافي

    setClassSubjects((prev) => {
      const next = { ...prev };
      const set = new Set(next[cid] || []);
      set.has(subjId) ? set.delete(subjId) : set.add(subjId);
      next[cid] = set;
      return next;
    });
  };

  const selectAll = (cid) => {
    const allowed = subjectsByClass[cid] || [];
    setClassSubjects((prev) => ({ ...prev, [cid]: new Set(allowed.map((s) => String(s.id))) }));
  };
  const clearAll = (cid) => setClassSubjects((prev) => ({ ...prev, [cid]: new Set() }));

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Teaching Assignments</h3>
        {subjectsLoading && <span className="text-sm text-gray-500">Loading subjects…</span>}
      </div>

      {subjectsError && (
        <div className="mb-3 rounded-md bg-yellow-50 border border-yellow-200 px-4 py-2 text-sm text-yellow-800">
          {subjectsError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {classes.map((c) => {
          const included = isIncluded(c.id);
          const set = classSubjects[c.id] || new Set();
          const options = subjectsByClass[c.id] || []; // ← بس مواد هيدا الصف

          return (
            <div key={c.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 font-medium">
                  <input type="checkbox" checked={included} onChange={() => toggleClass(c.id)} />
                  <span>{c.name}</span>
                </label>
                {included && options.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => selectAll(c.id)}
                      className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={() => clearAll(c.id)}
                      className="text-xs bg-gray-50 text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {options.map((s) => {
                  const checked = set.has(String(s.id));
                  return (
                    <label
                      key={s.id}
                      className={`inline-flex items-center gap-1 text-xs ${
                        included ? "" : "opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!included}
                        onChange={() => toggleSubjectForClass(c.id, String(s.id))}
                      />
                      <span
                        className={
                          "rounded-full border px-2 py-1 " +
                          (checked ? "border-blue-600 text-blue-700 bg-blue-50" : "text-gray-700")
                        }
                      >
                        {s.name}
                      </span>
                    </label>
                  );
                })}
                {!subjectsLoading && options.length === 0 && (
                  <div className="text-xs text-gray-500">No subjects configured for this class.</div>
                )}
              </div>
            </div>
          );
        })}
        {classes.length === 0 && <div className="text-sm text-gray-500">No classes found.</div>}
      </div>
    </section>
  );
}


