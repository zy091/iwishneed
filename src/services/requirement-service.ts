import { v4 as uuidv4 } from 'uuid';

// 定义需求类型
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

// 模拟数据
const mockRequirements: Requirement[] = [
  { 
    id: '1', 
    title: '优化用户登录流程', 
    description: '当前登录流程过于复杂，需要简化步骤，提高用户体验。具体包括：\n1. 减少登录所需点击次数\n2. 增加社交媒体登录选项\n3. 优化移动端登录界面\n4. 添加记住密码功能',
    status: 'inProgress', 
    priority: 'high', 
    submitter: {
      id: '101',
      name: '李明',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John'
    },
    assignee: {
      id: '102',
      name: '王强',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike'
    },
    department: '产品部', 
    createdAt: '2023-06-10', 
    updatedAt: '2023-06-15',
    dueDate: '2023-07-15',
    tags: ['用户体验', '前端', '登录'],
    attachments: [
      { id: '1', name: '登录流程分析.pdf', size: '2.4 MB', type: 'pdf' },
      { id: '2', name: '界面原型设计.fig', size: '5.1 MB', type: 'fig' }
    ],
    comments: [
      {
        id: '1',
        user: {
          id: '102',
          name: '王强',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike'
        },
        content: '我已经开始研究这个问题，初步计划是先优化移动端界面',
        timestamp: '2023-06-12 14:30'
      },
      {
        id: '2',
        user: {
          id: '103',
          name: '张伟',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David'
        },
        content: '建议考虑添加指纹登录功能，这样可以进一步提升用户体验',
        timestamp: '2023-06-13 09:15'
      },
      {
        id: '3',
        user: {
          id: '101',
          name: '李明',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John'
        },
        content: '同意张伟的建议，我们可以在下一个迭代中考虑这个功能',
        timestamp: '2023-06-13 10:45'
      }
    ],
    history: [
      { id: '1', action: '创建需求', user: '李明', timestamp: '2023-06-10 11:20' },
      { id: '2', action: '分配给王强', user: '李明', timestamp: '2023-06-10 11:25' },
      { id: '3', action: '状态更新为"进行中"', user: '王强', timestamp: '2023-06-12 09:00' },
      { id: '4', action: '添加评论', user: '王强', timestamp: '2023-06-12 14:30' },
      { id: '5', action: '添加评论', user: '张伟', timestamp: '2023-06-13 09:15' },
      { id: '6', action: '添加评论', user: '李明', timestamp: '2023-06-13 10:45' },
      { id: '7', action: '更新描述', user: '王强', timestamp: '2023-06-15 16:30' }
    ]
  },
  { 
    id: '2', 
    title: '实现数据导出功能', 
    description: '需要添加数据导出功能，支持Excel和CSV格式，方便用户进行数据分析和报表生成。',
    status: 'completed', 
    priority: 'medium', 
    submitter: {
      id: '103',
      name: '张伟',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David'
    },
    assignee: {
      id: '104',
      name: '刘芳',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah'
    },
    department: '技术部', 
    createdAt: '2023-06-08', 
    updatedAt: '2023-06-28',
    dueDate: '2023-06-30',
    tags: ['数据', '导出', '报表'],
    comments: [],
    history: []
  },
  { 
    id: '3', 
    title: '修复移动端显示问题', 
    description: '在某些Android设备上，页面布局出现错位，需要修复这个兼容性问题。',
    status: 'pending', 
    priority: 'low', 
    submitter: {
      id: '105',
      name: '赵丽',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily'
    },
    assignee: null,
    department: '技术部', 
    createdAt: '2023-06-05', 
    updatedAt: '2023-06-05',
    dueDate: '2023-07-05',
    tags: ['移动端', 'Bug修复', '兼容性'],
    comments: [],
    history: []
  },
  { 
    id: '4', 
    title: '添加用户反馈收集模块', 
    description: '设计并实现一个用户反馈收集模块，包括问卷调查和意见反馈功能。',
    status: 'overdue', 
    priority: 'high', 
    submitter: {
      id: '106',
      name: '陈明',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tom'
    },
    assignee: {
      id: '103',
      name: '张伟',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David'
    },
    department: '市场部', 
    createdAt: '2023-06-01', 
    updatedAt: '2023-06-10',
    dueDate: '2023-06-20',
    tags: ['用户反馈', '问卷', '市场调研'],
    comments: [],
    history: []
  },
  { 
    id: '5', 
    title: '优化产品搜索算法', 
    description: '当前搜索结果不够精准，需要优化搜索算法，提高搜索结果的相关性。',
    status: 'inProgress', 
    priority: 'medium', 
    submitter: {
      id: '102',
      name: '王强',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike'
    },
    assignee: {
      id: '101',
      name: '李明',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John'
    },
    department: '技术部', 
    createdAt: '2023-06-12', 
    updatedAt: '2023-06-15',
    dueDate: '2023-07-20',
    tags: ['搜索', '算法', '优化'],
    comments: [],
    history: []
  },
  { 
    id: '6', 
    title: '设计新的产品页面', 
    description: '根据最新的品牌指南，重新设计产品详情页面，提升用户体验和转化率。',
    status: 'pending', 
    priority: 'high', 
    submitter: {
      id: '104',
      name: '刘芳',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah'
    },
    assignee: {
      id: '106',
      name: '陈明',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tom'
    },
    department: '设计部', 
    createdAt: '2023-06-15', 
    updatedAt: '2023-06-15',
    dueDate: '2023-07-10',
    tags: ['设计', 'UI', '产品页面'],
    comments: [],
    history: []
  },
  { 
    id: '7', 
    title: '集成第三方支付系统', 
    description: '集成支付宝和微信支付功能，优化支付流程，提高支付成功率。',
    status: 'completed', 
    priority: 'high', 
    submitter: {
      id: '103',
      name: '张伟',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David'
    },
    assignee: {
      id: '102',
      name: '王强',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike'
    },
    department: '技术部', 
    createdAt: '2023-05-20', 
    updatedAt: '2023-06-14',
    dueDate: '2023-06-15',
    tags: ['支付', '集成', '第三方'],
    comments: [],
    history: []
  },
  { 
    id: '8', 
    title: '更新隐私政策文档', 
    description: '根据最新的数据保护法规，更新隐私政策文档，确保合规。',
    status: 'completed', 
    priority: 'low', 
    submitter: {
      id: '101',
      name: '李明',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John'
    },
    assignee: {
      id: '105',
      name: '赵丽',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily'
    },
    department: '法务部', 
    createdAt: '2023-06-02', 
    updatedAt: '2023-06-09',
    dueDate: '2023-06-10',
    tags: ['隐私政策', '合规', '法律'],
    comments: [],
    history: []
  },
];

// 从本地存储获取数据或使用模拟数据
const getStoredRequirements = (): Requirement[] => {
  const storedData = localStorage.getItem('requirements');
  if (storedData) {
    return JSON.parse(storedData);
  }
  // 首次使用时，将模拟数据存入本地存储
  localStorage.setItem('requirements', JSON.stringify(mockRequirements));
  return mockRequirements;
};

// 保存数据到本地存储
const saveRequirements = (requirements: Requirement[]): void => {
  localStorage.setItem('requirements', JSON.stringify(requirements));
};

// 需求服务类
export class RequirementService {
  // 获取所有需求
  static getAllRequirements(): Promise<Requirement[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(getStoredRequirements());
      }, 300); // 模拟网络延迟
    });
  }

  // 获取单个需求
  static getRequirementById(id: string): Promise<Requirement | undefined> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const requirements = getStoredRequirements();
        const requirement = requirements.find(req => req.id === id);
        resolve(requirement);
      }, 300);
    });
  }

  // 创建新需求
  static createRequirement(requirementData: Omit<Requirement, 'id' | 'createdAt' | 'updatedAt' | 'comments' | 'history'>, currentUser: any): Promise<Requirement> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const requirements = getStoredRequirements();
        
        const newRequirement: Requirement = {
          ...requirementData,
          id: uuidv4(),
          createdAt: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString().split('T')[0],
          submitter: {
            id: currentUser.id,
            name: currentUser.name,
            avatar: currentUser.avatar
          },
          comments: [],
          history: [
            {
              id: uuidv4(),
              action: '创建需求',
              user: currentUser.name,
              timestamp: new Date().toLocaleString()
            }
          ]
        };
        
        if (requirementData.assignee) {
          newRequirement.history.push({
            id: uuidv4(),
            action: `分配给${requirementData.assignee.name}`,
            user: currentUser.name,
            timestamp: new Date().toLocaleString()
          });
        }
        
        requirements.push(newRequirement);
        saveRequirements(requirements);
        resolve(newRequirement);
      }, 500);
    });
  }

  // 更新需求
  static updateRequirement(id: string, requirementData: Partial<Requirement>, currentUser: any): Promise<Requirement | undefined> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const requirements = getStoredRequirements();
        const index = requirements.findIndex(req => req.id === id);
        
        if (index !== -1) {
          const oldRequirement = requirements[index];
          const updatedRequirement = {
            ...oldRequirement,
            ...requirementData,
            updatedAt: new Date().toISOString().split('T')[0]
          };
          
          // 记录历史变更
          const history = updatedRequirement.history || [];
          
          // 检查状态变更
          if (requirementData.status && requirementData.status !== oldRequirement.status) {
            history.push({
              id: uuidv4(),
              action: `状态更新为"${this.getStatusText(requirementData.status)}"`,
              user: currentUser.name,
              timestamp: new Date().toLocaleString()
            });
          }
          
          // 检查负责人变更
          if (requirementData.assignee && 
              (!oldRequirement.assignee || 
               requirementData.assignee.id !== oldRequirement.assignee.id)) {
            history.push({
              id: uuidv4(),
              action: `分配给${requirementData.assignee.name}`,
              user: currentUser.name,
              timestamp: new Date().toLocaleString()
            });
          }
          
          // 检查描述变更
          if (requirementData.description && requirementData.description !== oldRequirement.description) {
            history.push({
              id: uuidv4(),
              action: '更新描述',
              user: currentUser.name,
              timestamp: new Date().toLocaleString()
            });
          }
          
          updatedRequirement.history = history;
          requirements[index] = updatedRequirement;
          saveRequirements(requirements);
          resolve(updatedRequirement);
        } else {
          resolve(undefined);
        }
      }, 500);
    });
  }

  // 删除需求
  static deleteRequirement(id: string): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const requirements = getStoredRequirements();
        const filteredRequirements = requirements.filter(req => req.id !== id);
        
        if (filteredRequirements.length < requirements.length) {
          saveRequirements(filteredRequirements);
          resolve(true);
        } else {
          resolve(false);
        }
      }, 500);
    });
  }

  // 添加评论
  static addComment(requirementId: string, comment: string, currentUser: any): Promise<Requirement | undefined> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const requirements = getStoredRequirements();
        const index = requirements.findIndex(req => req.id === requirementId);
        
        if (index !== -1) {
          const requirement = requirements[index];
          const comments = requirement.comments || [];
          const newComment = {
            id: uuidv4(),
            user: {
              id: currentUser.id,
              name: currentUser.name,
              avatar: currentUser.avatar
            },
            content: comment,
            timestamp: new Date().toLocaleString()
          };
          
          comments.push(newComment);
          
          // 更新历史记录
          const history = requirement.history || [];
          history.push({
            id: uuidv4(),
            action: '添加评论',
            user: currentUser.name,
            timestamp: new Date().toLocaleString()
          });
          
          const updatedRequirement = {
            ...requirement,
            comments,
            history,
            updatedAt: new Date().toISOString().split('T')[0]
          };
          
          requirements[index] = updatedRequirement;
          saveRequirements(requirements);
          resolve(updatedRequirement);
        } else {
          resolve(undefined);
        }
      }, 300);
    });
  }

  // 获取需求统计数据
  static getRequirementStats(): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    overdue: number;
  }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const requirements = getStoredRequirements();
        const stats = {
          total: requirements.length,
          completed: requirements.filter(req => req.status === 'completed').length,
          inProgress: requirements.filter(req => req.status === 'inProgress').length,
          pending: requirements.filter(req => req.status === 'pending').length,
          overdue: requirements.filter(req => req.status === 'overdue').length
        };
        resolve(stats);
      }, 300);
    });
  }

  // 获取状态文本
  static getStatusText(status: string): string {
    switch (status) {
      case 'completed': return '已完成';
      case 'inProgress': return '进行中';
      case 'pending': return '待处理';
      case 'overdue': return '已逾期';
      default: return '未知';
    }
  }

  // 获取优先级文本
  static getPriorityText(priority: string): string {
    switch (priority) {
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return '未知';
    }
  }
}

// 用户服务
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'developer' | 'submitter';
  avatar?: string;
}

export const mockUsers: User[] = [
  { id: '101', name: '李明', email: 'liming@example.com', role: 'manager', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John' },
  { id: '102', name: '王强', email: 'wangqiang@example.com', role: 'developer', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike' },
  { id: '103', name: '张伟', email: 'zhangwei@example.com', role: 'developer', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David' },
  { id: '104', name: '刘芳', email: 'liufang@example.com', role: 'submitter', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' },
  { id: '105', name: '赵丽', email: 'zhaoli@example.com', role: 'submitter', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily' },
  { id: '106', name: '陈明', email: 'chenming@example.com', role: 'manager', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tom' },
  { id: '107', name: '管理员', email: 'admin@example.com', role: 'admin', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin' }
];

export class UserService {
  static getAllUsers(): Promise<User[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockUsers);
      }, 300);
    });
  }

  static getUserById(id: string): Promise<User | undefined> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const user = mockUsers.find(u => u.id === id);
        resolve(user);
      }, 300);
    });
  }
}