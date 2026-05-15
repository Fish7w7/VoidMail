import axios from "axios";

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_BASE ?? "/api" });

export interface Sender {
  email:         string;
  name:          string;
  domain:        string;
  count:         number;
  promo_ratio:   number;
  score:         number;
  percentage:    number;
  never_replied?: boolean;
}

export interface Stats {
  total_emails:    number;
  unique_senders:  number;
  health_score:    number;
  senders:         Sender[];
  after_date?:     string | null;
  next_page_token?: string | null;
  has_more?:       boolean;
  cached?:         boolean;
}

export interface MoreStats {
  total_emails:    number;
  unique_senders:  number;
  health_score:    number | null;
  senders:         Sender[];
  next_page_token?: string | null;
  has_more?:       boolean;
}

export const getAuthStatus  = () => api.get<{ authenticated: boolean }>("/auth/status");
export const getLoginUrl    = () => api.get<{ url: string }>("/auth/login");
export const logout         = () => api.post("/auth/logout");

export const getStats = (limit = 300, period?: string, after?: string) => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (period) params.set("period", period);
  if (after)  params.set("after", after);
  return api.get<Stats>(`/emails/stats?${params.toString()}`);
};

// Feature 2: busca a próxima página de emails
export const getMoreStats = (
  pageToken: string,
  limit = 300,
  period?: string,
  after?: string,
) => {
  const params = new URLSearchParams({ page_token: pageToken, limit: String(limit) });
  if (period) params.set("period", period);
  if (after)  params.set("after", after);
  return api.get<MoreStats>(`/emails/stats/more?${params.toString()}`);
};

export interface TimelinePoint {
  date:  string; // "YYYY-MM-DD" (semana) ou "YYYY-MM" (mês)
  count: number;
}

export interface Timeline {
  weekly:  TimelinePoint[];
  monthly: TimelinePoint[];
  cached?: boolean;
}

export const getTimeline = (limit = 500, period?: string, after?: string) => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (period) params.set("period", period);
  if (after)  params.set("after", after);
  return api.get<Timeline>(`/emails/timeline?${params.toString()}`);
};

export interface SenderMessage {
  message_id: string;
  subject:    string;
  date:       string | null;
  snippet:    string;
}

export const getSenderMessages = (email: string, limit = 10) =>
  api.get<{ email: string; messages: SenderMessage[] }>(
    `/emails/sender-messages?email=${encodeURIComponent(email)}&limit=${limit}`
  );

export type ActionKind = "block" | "delete" | "both";

export interface ActionPreview {
  email: string;
  action: ActionKind;
  matching_emails: number;
  will_create_filter: boolean;
  will_delete: boolean;
  dry_run: boolean;
}

export interface ActionResult {
  success: boolean;
  email: string;
  dry_run: boolean;
  filter_id?: string | null;
  deleted: number;
  message?: string | null;
}

export const previewAction = (email: string, action: ActionKind, dryRun?: boolean) => {
  const params = new URLSearchParams({ email, action });
  if (dryRun !== undefined) params.set("dry_run", String(dryRun));
  return api.get<ActionPreview>(`/actions/preview?${params.toString()}`);
};

export const blockSender    = (email: string, dryRun?: boolean) => api.post<ActionResult>("/actions/block",            { email, dry_run: dryRun });
export const deleteSender   = (email: string, dryRun?: boolean) => api.post<ActionResult>("/actions/delete",           { email, dry_run: dryRun });
export const blockAndDelete = (email: string, dryRun?: boolean) => api.post<ActionResult>("/actions/block-and-delete", { email, dry_run: dryRun });
export const autoClean      = (emails: string[], dryRun?: boolean) => api.post<{ results: ActionResult[] }>("/actions/auto-clean", { emails, dry_run: dryRun });
export const unblockSender  = (filterId: string) => api.post("/actions/unblock", { filter_id: filterId });
