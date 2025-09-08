// =====================================================
// 企业级需求管理系统 - 统一类型定义
// =====================================================

// 基础枚举类型
export type RequirementPriority = 'high' | 'medium' | 'low'
export type RequirementStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type TechProgress =
  | 'not_started' | 'in_progress' | 'completed' | 'delayed'  // 英文枚举（数据库）
  | '未开始' | '处理中' | '已完成' | '已沟通延迟'              // 兼容旧中文值
export type CreativeStatus = 'not_started' | 'in_progress' | 'completed' | 'no_action'
export type CreativeUrgency = 'high' | 'medium' | 'low'
export type CreativePlatform = 'GG' | 'FB' | 'CT' | 'website'
export type ClientType = 'traffic_operation' | 'full_service'
export type CreativeType = 'google_ad' | 'meta_ad' | 'website_banner' | 'website_product' | 'website_header' | 'affiliate_marketing' | 'edm_marketing' | 'criteo_ad'

// 技术需求类型（匹配数据库结构）
export interface TechRequirement {
  id?: string
  title: string
  description?: string
  priority: RequirementPriority
  status: RequirementStatus
  assigned_to?: string // UUID reference to tech_staff
  // 兼容旧字段
  tech_assignee?: string
  submit_time?: string
  created_by?: string // UUID reference to auth.users
  created_at?: string
  updated_at?: string
  due_date?: string
  estimated_hours?: number
  actual_hours?: number
  tags?: string[]
  metadata?: Record<string, any>

  // 技术部特有字段
  month?: string
  expected_completion_time?: string
  urgency?: RequirementPriority
  submitter_name?: string
  client_url?: string
  client_type?: ClientType
  attachments?: any[]
  assignee_estimated_time?: string
  progress?: TechProgress
  start_time?: string
  end_time?: string
}

// 创意需求类型（匹配数据库结构）
export interface CreativeRequirement {
  id?: string
  title: string
  description?: string
  priority: RequirementPriority
  status: RequirementStatus
  created_by?: string // UUID reference to auth.users
  created_at?: string
  updated_at?: string
  due_date?: string
  budget_range?: string
  deliverables?: string[]
  inspiration_links?: string[]
  metadata?: Record<string, any>

  // 创意部特有字段
  creative_type?: CreativeType
  target_audience?: string
  brand_guidelines?: string
  submit_time?: string
  expected_delivery_time?: string
  actual_delivery_time?: string
  submitter_name?: string
  platform?: CreativePlatform
  urgency?: CreativeUrgency
  designer?: string
  site_name?: string
  url_or_product_page?: string
  asset_type?: string
  asset_size?: string
  layout_style?: string
  asset_count?: number
  copy?: string
  style_requirements?: string
  original_assets?: string
  asset_package?: string
  remark?: string
  reference_examples?: string
}

// 统一需求类型
export type UnifiedRequirement = TechRequirement | CreativeRequirement

// 技术人员类型
export interface TechStaff {
  id?: string
  name: string
  department: 'tech' | 'creative'
  position?: string
  email?: string
  phone?: string
  active: boolean
  created_at?: string
  updated_at?: string
}

// 评论类型
export interface Comment {
  id?: string
  requirement_id: string
  requirement_type: 'tech' | 'creative'
  content: string
  author_id?: string
  author_name?: string
  author_avatar?: string
  created_at?: string
  updated_at?: string
}

// 评论附件类型
export interface CommentAttachment {
  id?: string
  comment_id: string
  file_name: string
  file_url: string
  file_size?: number
  file_type?: string
  created_at?: string
}

// 用户档案类型
export interface Profile {
  id?: string
  user_id: string
  full_name?: string
  avatar_url?: string
  department?: 'tech' | 'creative' | 'management'
  position?: string
  phone?: string
  bio?: string
  preferences?: Record<string, any>
  created_at?: string
  updated_at?: string
}

// 管理员类型
export interface AppAdmin {
  id?: string
  user_id: string
  email: string
  full_name?: string
  role: 'super_admin' | 'admin' | 'manager'
  permissions?: string[]
  active: boolean
  created_at?: string
  updated_at?: string
}

// 角色类型
export interface Role {
  id?: string
  name: string
  description?: string
  permissions: string[]
  created_at?: string
  updated_at?: string
}

// 活动日志类型
export interface ActivityLog {
  id?: string
  requirement_id: string
  requirement_type: 'tech' | 'creative'
  action: string
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  user_id?: string
  user_name?: string
  created_at?: string
}

// 管理员审计日志类型
export interface AdminAuditLog {
  id?: string
  admin_id: string
  admin_name: string
  action: string
  target_type?: string
  target_id?: string
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  ip_address?: string
  user_agent?: string
  created_at?: string
}

// 统计数据类型
export interface RequirementStats {
  total: number
  pending: number
  in_progress: number
  completed: number
  cancelled: number
  by_department: {
    tech: number
    creative: number
  }
  by_priority: {
    high: number
    medium: number
    low: number
  }
}

// 人员统计类型
export interface AssigneeStats {
  total: number
  pending: number
  in_progress: number
  completed: number
  delayed?: number
  avg_duration: number
}

// 搜索过滤器类型
export interface SearchFilters {
  search?: string
  department?: 'tech' | 'creative'
  status?: RequirementStatus
  priority?: RequirementPriority
  assigned_to?: string
  created_by?: string
  urgency?: RequirementPriority
  progress?: TechProgress
  platform?: CreativePlatform
  designer?: string
  limit?: number
  offset?: number
}

// 数据完整性检查结果类型
export interface DataIntegrityResult {
  orphaned_comments: number
  missing_assignees: number
  invalid_statuses: number
  duplicate_requirements: number
  inconsistent_timestamps: number
  recommendations: string[]
  checked_at: string
}

// 导入结果类型
export interface ImportResult<T> {
  success: T[]
  errors: Array<{
    row: number
    data: any
    error: string
  }>
  summary: {
    total: number
    successful: number
    failed: number
  }
}

// 导出数据类型
export interface ExportData {
  tech_requirements: TechRequirement[]
  creative_requirements: CreativeRequirement[]
  comments: Comment[]
  tech_staff: TechStaff[]
  exported_at: string
  version: string
}

// 仪表板数据类型
export interface DashboardData {
  stats: RequirementStats
  recent_requirements: UnifiedRequirement[]
  assignee_stats: Record<string, AssigneeStats>
  activity_logs: ActivityLog[]
  alerts: Array<{
    type: 'warning' | 'error' | 'info'
    message: string
    requirement_id?: string
    created_at: string
  }>
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// 分页响应类型
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
    has_next: boolean
    has_prev: boolean
  }
}

// 排序选项类型
export interface SortOption {
  field: string
  direction: 'asc' | 'desc'
}

// 过滤选项类型
export interface FilterOption {
  field: string
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'not_in'
  value: any
}

// 查询选项类型
export interface QueryOptions {
  filters?: FilterOption[]
  sort?: SortOption[]
  pagination?: {
    page: number
    limit: number
  }
  include?: string[]
}

// 批量操作类型
export interface BulkOperation {
  action: 'update' | 'delete' | 'assign'
  ids: string[]
  data?: Record<string, any>
}

// 批量操作结果类型
export interface BulkOperationResult {
  successful: string[]
  failed: Array<{
    id: string
    error: string
  }>
  summary: {
    total: number
    successful: number
    failed: number
  }
}

// 表单输入类型
export type TechRequirementInput = Omit<TechRequirement, 'id' | 'created_at' | 'updated_at'>
export type CreativeRequirementInput = Omit<CreativeRequirement, 'id' | 'created_at' | 'updated_at'>

// 更新类型
export type TechRequirementUpdate = Partial<Omit<TechRequirement, 'id' | 'created_at' | 'updated_at'>>
export type CreativeRequirementUpdate = Partial<Omit<CreativeRequirement, 'id' | 'created_at' | 'updated_at'>>

// 实时通知类型
export interface RealtimeNotification {
  type: 'requirement_change' | 'comment_change' | 'assignment_change'
  requirement_type: 'tech' | 'creative'
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  requirement_id: string
  requirement_title?: string
  status?: RequirementStatus
  assigned_to?: string
  author_id?: string
  timestamp: string
}

// 文件上传类型
export interface FileUpload {
  file: File
  requirement_id: string
  comment_id?: string
  upload_path?: string
}

// 文件信息类型
export interface FileInfo {
  name: string
  size: number
  type: string
  url: string
  signed_url?: string
  uploaded_at: string
}

// 系统配置类型
export interface SystemConfig {
  max_file_size: number
  allowed_file_types: string[]
  retention_days: number
  auto_assign_enabled: boolean
  notification_enabled: boolean
  realtime_enabled: boolean
}

// 用户权限类型
export interface UserPermissions {
  can_create_tech: boolean
  can_create_creative: boolean
  can_edit_tech: boolean
  can_edit_creative: boolean
  can_delete_tech: boolean
  can_delete_creative: boolean
  can_assign_tech: boolean
  can_assign_creative: boolean
  can_view_all: boolean
  can_export: boolean
  can_import: boolean
  is_admin: boolean
}

// 通知设置类型
export interface NotificationSettings {
  email_enabled: boolean
  push_enabled: boolean
  assignment_notifications: boolean
  status_change_notifications: boolean
  comment_notifications: boolean
  due_date_reminders: boolean
}

// 视图配置类型
export interface ViewConfig {
  columns: string[]
  filters: FilterOption[]
  sort: SortOption[]
  pagination: {
    page: number
    limit: number
  }
  saved_name?: string
}

// 报表配置类型
export interface ReportConfig {
  type: 'summary' | 'detailed' | 'assignee' | 'timeline'
  date_range: {
    start: string
    end: string
  }
  departments: ('tech' | 'creative')[]
  statuses: RequirementStatus[]
  priorities: RequirementPriority[]
  format: 'json' | 'csv' | 'excel' | 'pdf'
}