import { useOutletContext } from "react-router";
import type { MeResponse } from "../services/auth";

export const useAuthenticatedSession = () => useOutletContext<MeResponse>();
