import { createClient } from '@supabase/supabase-js'

// 读取环境变量（优先使用服务端专用变量，避免暴露到前端）
const url =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  console.error('缺少环境变量：请配置 SUPABASE_URL 与 SUPABASE_SERVICE_ROLE_KEY（不要在前端暴露该密钥）')
  process.exit(1)
}

// 使用 service_role 创建管理员客户端（仅用于服务端脚本）
const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false }
})

async function getCount(table) {
  const { count, error } = await admin
    .from(table)
    .select('*', { count: 'exact', head: true })
  if (error && error.code !== 'PGRST116') {
    // PGRST116: 表不存在
    throw error
  }
  return count || 0
}

async function getStats() {
  const tech = await getCount('tech_requirements').catch(() => 0)
  const creative = await getCount('creative_requirements').catch(() => 0)
  const activities = await getCount('user_activities').catch(() => 0)
  return {
    techRequirements: tech,
    creativeRequirements: creative,
    userActivities: activities,
    total: tech + creative
  }
}

async function clearTable(table) {
  const { error } = await admin.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (error && error.code !== 'PGRST116') {
    // 表不存在也视为成功
    throw error
  }
}

async function clearAll() {
  console.log('开始清空数据库...')
  await clearTable('tech_requirements')
  console.log('✅ 已清空 tech_requirements')

  await clearTable('creative_requirements')
  console.log('✅ 已清空 creative_requirements')

  await clearTable('user_activities')
  console.log('✅ 已清空 user_activities')

  console.log('🎉 清理完成！')
}

async function main() {
  const stats = await getStats()
  console.log('当前数据库统计：')
  console.log(`- 技术需求：${stats.techRequirements}`)
  console.log(`- 创意需求：${stats.creativeRequirements}`)
  console.log(`- 用户活动：${stats.userActivities}`)
  console.log(`- 总计需求：${stats.total}\n`)

  // 支持 --force=YES 非交互清理（例如 CI）
  const force = process.argv.find(arg => arg.startsWith('--force='))?.split('=')[1]
  if (force === 'YES') {
    await clearAll()
    process.exit(0)
  }

  // 交互确认
  const { createInterface } = await import('node:readline')
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  rl.question('危险操作！请输入 "CLEAR ALL DATA" 以确认清空以上数据：', async (answer) => {
    if (answer === 'CLEAR ALL DATA') {
      try {
        await clearAll()
      } catch (e) {
        console.error('清理失败：', e)
        process.exitCode = 1
      } finally {
        rl.close()
      }
    } else {
      console.log('已取消。')
      rl.close()
    }
  })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})