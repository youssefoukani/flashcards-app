// ============================================================
// PrivateRoute.jsx — Protegge le rotte che richiedono JWT
// ============================================================
import { Navigate } from "react-router-dom";

export default function PrivateRoute({ children }) {
  const token = localStorage.getItem("token");
  // Se non c'è token, redireziona al login
  return token ? children : <Navigate to="/" replace />;
}