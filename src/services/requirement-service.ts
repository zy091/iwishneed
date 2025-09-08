// 企业级需求管理系统 - 需求服务
// 注意：此文件已重构，移除了 mock 数据和本地存储逻辑
// 实际的需求管理功能请使用 tech-requirement-service.ts 和 creative-requirement-service.ts

import { Logger } from '@/lib/logger'

// 基础需求接口（保留用于向后兼容）
export interface Requirement {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'inProgress' | 'completed' | 'overdue';
  priority: 'high' | 'medium' | 'low';
  submitter: {
    id: string;
    name: string;
    avatar?: string;
  };
  assignee: {
    id: string;
    name: string;
    avatar?: string;
  } | null;
  department: string;
  createdAt: string;
  updatedAt: string;
  dueDate: string;
  tags: string[];
  type?: 'tech' | 'creative';
  extra?: {
    raw?: Record<string, string>;
    source?: { fileName: string; importedAt: string };
  };
  attachments?: {
    id: string;
    name: string;
    size: string;
    type: string;
  }[];
  comments?: {
    id: string;
    user: {
      id: string;
      name: string;
      avatar?: string;
    };
    content: string;
    timestamp: string;
  }[];
  history?: {
    id: string;
    action: string;
    user: string;
    timestamp: string;
  }[];
}

// 用户接口（保留用于向后兼容）
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'developer' | 'submitter';
  avatar?: string;
}

// 需求服务类（已废弃，请使用专门的服务）
export class RequirementService {
  /**
   * @deprecated 已废弃，请使用 techRequirementService 或 creativeRequirementService
   */
  static getAllRequirements(): Promise<Requirement[]> {
    Logger.warn('RequirementService.getAllRequirements() 已废弃', { 
      suggestion: '请使用 techRequirementService 或 creativeRequirementService' 
    });
    return Promise.resolve([]);
  }

  /**
   * @deprecated 已废弃，请使用专门的服务
   */
  static getRequirementById(id: string): Promise<Requirement | undefined> {
    Logger.warn('RequirementService.getRequirementById() 已废弃', { 
      id, 
      suggestion: '请使用专门的服务' 
    });
    return Promise.resolve(undefined);
  }

  /**
   * @deprecated 已废弃，请使用专门的服务
   */
  static createRequirement(requirementData: Partial<Requirement>, currentUser: any): Promise<Requirement> {
    Logger.warn('RequirementService.createRequirement() 已废弃', { 
      suggestion: '请使用专门的服务' 
    });
    return Promise.reject(new Error('此方法已废弃'));
  }

  /**
   * @deprecated 已废弃，请使用专门的服务
   */
  static updateRequirement(id: string, requirementData: Partial<Requirement>, currentUser: any): Promise<Requirement | undefined> {
    Logger.warn('RequirementService.updateRequirement() 已废弃', { 
      id, 
      suggestion: '请使用专门的服务' 
    });
    return Promise.reject(new Error('此方法已废弃'));
  }

  /**
   * @deprecated 已废弃，请使用专门的服务
   */
  static deleteRequirement(id: string): Promise<boolean> {
    Logger.warn('RequirementService.deleteRequirement() 已废弃', { 
      id, 
      suggestion: '请使用专门的服务' 
    });
    return Promise.reject(new Error('此方法已废弃'));
  }

  /**
   * @deprecated 已废弃，请使用 comments-service
   */
  static addComment(requirementId: string, comment: string, currentUser: any): Promise<Requirement | undefined> {
    Logger.warn('RequirementService.addComment() 已废弃', { 
      requirementId, 
      suggestion: '请使用 comments-service' 
    });
    return Promise.reject(new Error('此方法已废弃'));
  }

  /**
   * @deprecated 已废弃，请使用专门的服务
   */
  static getRequirementStats(): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    overdue: number;
  }> {
    Logger.warn('RequirementService.getRequirementStats() 已废弃', { 
      suggestion: '请使用专门的服务' 
    });
    return Promise.resolve({
      total: 0,
      completed: 0,
      inProgress: 0,
      pending: 0,
      overdue: 0
    });
  }

  static getStatusText(status: string): string {
    switch (status) {
      case 'completed': return '已完成';
      case 'inProgress': return '进行中';
      case 'pending': return '待处理';
      case 'overdue': return '已逾期';
      default: return '未知';
    }
  }

  static getPriorityText(priority: string): string {
    switch (priority) {
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return '未知';
    }
  }
}

/**
 * @deprecated 用户服务类已废弃，请使用 auth-service
 */
export class UserService {
  /**
   * @deprecated 已废弃，请使用 auth-service
   */
  static getAllUsers(): Promise<User[]> {
    Logger.warn('UserService.getAllUsers() 已废弃', { 
      suggestion: '请使用 auth-service' 
    });
    return Promise.resolve([]);
  }

  /**
   * @deprecated 已废弃，请使用 auth-service
   */
  static getUserById(id: string): Promise<User | undefined> {
    Logger.warn('UserService.getUserById() 已废弃', { 
      id, 
      suggestion: '请使用 auth-service' 
    });
    return Promise.resolve(undefined);
  }
}