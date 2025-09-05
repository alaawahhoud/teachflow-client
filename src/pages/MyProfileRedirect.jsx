// src/pages/MyProfileRedirect.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function MyProfileRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    let me = null;
    try { me = JSON.parse(localStorage.getItem("tf_user") || "null"); } catch {}
    if (me) navigate(`/teacher/${me.username || me.id}`, { replace: true });
    else navigate("/login", { replace: true });
  }, [navigate]);
  return null;
}
