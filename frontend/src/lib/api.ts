import axios from "axios";

const api = axios.create({ baseURL: "/api" });

export interface Sender {
  email: string;
  name: string;
  domain: string;
  count: number;
  promo_ratio: number;
  score: number;
  percentage: number;
}

export interface Stats {
  total_emails: number;
  unique_senders: number;
  health_score: number;
  senders: Sender[];
}

export const getAuthStatus = () => api.get<{ authenticated: boolean }>("/auth/status");
export const getLoginUrl = () => api.get<{ url: string }>("/auth/login");
export const logout = () => api.post("/auth/logout");

export const getStats = (limit = 500) =>
  api.get<Stats>(`/emails/stats?limit=${limit}`);

export const blockSender = (email: string) =>
  api.post("/actions/block", { email });

export const deleteSender = (email: string) =>
  api.post("/actions/delete", { email });

export const blockAndDelete = (email: string) =>
  api.post("/actions/block-and-delete", { email });

export const autoClean = (emails: string[]) =>
  api.post("/actions/auto-clean", { emails });