// =====================================================
// 企业级需求管理系统 - 类型导出
// =====================================================

// 导出所有需求相关类型
export * from './requirement'

// 重新导出常用类型以保持向后兼容
export type {
  TechRequirement,
  CreativeRequirement,
  UnifiedRequirement,
  RequirementStats,
  ActivityLog,
  Comment,
  CommentAttachment,
  TechStaff,
  Profile,
  AppAdmin,
  Role,
  AdminAuditLog,
  SearchFilters,
  DataIntegrityResult,
  ImportResult,
  ExportData,
  DashboardData,
  ApiResponse,
  PaginatedResponse,
  TechRequirementInput,
  CreativeRequirementInput,
  TechRequirementUpdate,
  CreativeRequirementUpdate,
  RealtimeNotification,
  UserPermissions,
  NotificationSettings,
  ViewConfig,
  ReportConfig
} from './requirement'

// 导出枚举类型
export type {
  RequirementPriority,
  RequirementStatus,
  TechProgress,
  CreativeStatus,
  CreativeUrgency,
  CreativePlatform,
  ClientType,
  CreativeType
} from './requirement'