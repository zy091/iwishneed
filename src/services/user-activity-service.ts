import { delay } from '@/lib/utils';

// 用户活跃度统计数据接口
export interface UserActivityStats {
  dailyActiveUsers: {
    date: string;
    count: number;
  }[];
  userActions: {
    action: string;
    count: number;
  }[];
  departmentActivity: {
    department: string;
    actions: number;
  }[];
}

// 获取用户活跃度统计数据
export const getUserActivityStats = async (): Promise<UserActivityStats> => {
  // 模拟网络请求延迟
  await delay(500);
  
  // 模拟数据
  return {
    dailyActiveUsers: [
      { date: '8月5日', count: 15 },
      { date: '8月6日', count: 18 },
      { date: '8月7日', count: 12 },
      { date: '8月8日', count: 20 },
      { date: '8月9日', count: 22 },
      { date: '8月10日', count: 17 },
      { date: '8月11日', count: 19 },
    ],
    userActions: [
      { action: '查看需求', count: 145 },
      { action: '创建需求', count: 35 },
      { action: '编辑需求', count: 28 },
      { action: '添加评论', count: 67 },
      { action: '更新状态', count: 42 },
    ],
    departmentActivity: [
      { department: '产品部', actions: 87 },
      { department: '技术部', actions: 120 },
      { department: '设计部', actions: 45 },
      { department: '测试部', actions: 63 },
      { department: '运维部', actions: 38 },
      { department: '市场部', actions: 29 },
      { department: '法务部', actions: 15 },
    ]
  };
};

// 获取部门活跃度排名
export const getDepartmentActivityRanking = async (): Promise<{
  department: string;
  actions: number;
}[]> => {
  const stats = await getUserActivityStats();
  return stats.departmentActivity.sort((a, b) => b.actions - a.actions);
};

// 获取用户行为分布
export const getUserActionDistribution = async (): Promise<{
  action: string;
  count: number;
}[]> => {
  const stats = await getUserActivityStats();
  return stats.userActions;
};

// 获取最近7天的活跃用户趋势
export const getDailyActiveUsersTrend = async (): Promise<{
  date: string;
  count: number;
}[]> => {
  const stats = await getUserActivityStats();
  return stats.dailyActiveUsers;
};