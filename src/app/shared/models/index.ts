// ─── ENUMS ────────────────────────────────────────────────────────────────────

export type Role = 'admin' | 'treasurer' | 'manager' | 'member';
export type MemberStatus = 'pending' | 'active' | 'inactive' | 'suspended';
export type ProjectStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled';
export type TransactionType = 'deposit' | 'expense' | 'adjustment';
export type TransactionStatus = 'confirmed' | 'pending_approval' | 'rejected';
export type ContributionStatus = 'pending' | 'declared' | 'confirmed' | 'late';
export type ContributionMode = 'free' | 'fixed';
export type NotificationChannel = 'sms' | 'in_app';
export type ToastType = 'success' | 'error' | 'warning' | 'info';

// ─── API WRAPPER ──────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface RegisterRequest {
  token: string;
  password: string;
  full_name?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

// ─── MEMBRE ───────────────────────────────────────────────────────────────────

export interface Member {
  id: string;
  full_name: string;
  phone_number: string;
  email: string | null;
  role: Role;
  status: MemberStatus;
  profile_picture_url: string | null;
  joined_at: string;
}

export type MeResponse = Member;

export interface InviteMemberRequest {
  full_name: string;
  phone_number: string;
  email?: string;
  role: Role;
}

export interface InviteMemberResponse {
  member: Member;
  invitation_link: string;
  message: string;
}

export interface UpdateMemberRoleRequest {
  role: Role;
}

export interface UpdateMemberStatusRequest {
  status: MemberStatus;
}

export interface UpdateProfileRequest {
  full_name?: string;
  email?: string;
  phone_number?: string;
}

export interface OrgChartMember {
  id: string;
  full_name: string;
  phone_number: string;
  role: Role;
}

export interface OrgChart {
  admin: OrgChartMember[];
  treasurer: OrgChartMember[];
  manager: OrgChartMember[];
  member: OrgChartMember[];
}

// ─── PROJET ───────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  budget_allocated: number | null;
  budget_spent: number;
  budget_remaining: number | null;
  creator_name: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectRequest {
  title: string;
  description?: string;
  budget?: number;
}

export interface UpdateProjectRequest {
  title?: string;
  description?: string;
  status?: ProjectStatus;
  budget?: number;
}

// ─── TRÉSORERIE ───────────────────────────────────────────────────────────────

export interface TreasuryBalance {
  balance: number;
  initial_balance: number;
  initialized_at: string | null;
  initialized_by_name: string | null;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  balance_after: number;
  description: string | null;
  status: TransactionStatus;
  member_name: string | null;
  project_title: string | null;
  performed_by_name: string;
  performed_at: string;
}

export interface InitBalanceRequest {
  initial_balance: number;
}

export interface ConfirmDepositRequest {
  member_id: string;
  amount: number;
  description?: string;
  contribution_month?: number;
  contribution_year?: number;
}

export interface ExpenseRequest {
  amount: number;
  description: string;
  project_id?: string;
}

// ─── COTISATIONS ─────────────────────────────────────────────────────────────

export interface Contribution {
  id: string;
  member_id: string;
  member_name: string;
  amount: number | null;
  status: ContributionStatus;
  contribution_month: number;
  contribution_year: number;
  declared_at: string | null;
  confirmed_at: string | null;
}

export interface DeclareContributionResponse {
  contribution_id: string;
  status: string;
  wave_number: string;
  amount_to_send: number | null;
  contribution_mode: string;
  message: string;
}

export interface DeclareContributionRequest {
  amount: number;
  month?: number;
  year?: number;
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  member_id: string;
  channel: NotificationChannel;
  type: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

// ─── UI STATE (Frontend only) ─────────────────────────────────────────────────

export interface AuthState {
  user: MeResponse | null;
  access_token: string | null;
  refresh_token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

export interface GroupInviteRequest {
  label?: string;
  default_role: Role;
  expires_in_hours: number;
  max_uses?: number;
}

export interface GroupInviteResponse {
  id: string;
  token: string;
  label: string | null;
  default_role: Role;
  expires_at: string;
  max_uses: number | null;
  use_count: number;
  is_active: boolean;
  invitation_link: string;
  created_at: string;
}

export interface GroupInviteValidationResponse {
  is_valid: boolean;
  default_role: Role;
  label: string | null;
  expires_at: string;
  message: string;
}

export interface RegisterFromGroupRequest {
  group_token: string;
  full_name: string;
  phone_number: string;
  email?: string;
  password: string;
}
