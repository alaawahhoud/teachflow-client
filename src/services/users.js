// src/services/users.js
import { apiFetch } from "../lib/api";

// جيب يوزر (بالـ id أو حتى username لأن السيرفر بيدعم الاثنين)
export const getUser = (idOrUsername) =>
  apiFetch(`/users/${encodeURIComponent(idOrUsername)}`);

// تعديل بيانات عامة (name/email/role/status... وأي حقول مدعومة بupdateUser)
export const updateUserProfile = (id, data) =>
  apiFetch(`/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

// تعديل بيانات الاعتماد (username/password)
export const updateUserCredentials = (id, creds) =>
  apiFetch(`/users/${encodeURIComponent(id)}/credentials`, {
    method: "PATCH",
    body: JSON.stringify(creds), // { username?, password? (>= 6) }
  });
