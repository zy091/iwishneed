import React, { useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/use-auth'

function detectDelimiter(sample: string): string {
  const lines = sample.split(/\r?\n/).slice(0, 5)
  const counts = { ',': 0, ';': 0, '\t': 0 }
  for (const l of lines) {
    counts[','] += (l.match(/,/g) || []).length
    counts[';'] += (l.match(/;/g) || []).length
    counts['\t'] += (l.match(/\t/g) || []).length
  }
  let best: ',' | ';' | '\t' = ','
  if (counts[';'] > counts[best]) best = ';'
  if (counts['\t'] > counts[best]) best = '\t'
  return best
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  if (!text) return { headers: [], rows: [] }
  const delimiter = detectDelimiter(text)
  const rows: string[][] = []
  let cur: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    const next = text[i + 1]
    if (c === '"') {
      if (inQuotes && next === '"') {
        field += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (!inQuotes && c === delimiter) {
      cur.push(field)
      field = ''
    } else if (!inQuotes && (c === '\n' || c === '\r')) {
      if (c === '\r' && next === '\n') i++
      cur.push(field)
      rows.push(cur)
      cur = []
      field = ''
    } else {
      field += c
    }
  }
  if (field.length > 0 || cur.length > 0) {
    cur.push(field)
    rows.push(cur)
  }

  const headers = rows[0]?.map((h) => h.trim()) || []
  const body = rows.slice(1).map((r) => {
    const arr = Array.from({ length: headers.length }, (_, idx) => (r[idx] ?? '').trim())
    return arr
  })
  return { headers, rows: body }
}

export default function RequirementImport() {
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [log, setLog] = useState<string[]>([])
  const navigate = useNavigate()
  const { user } = useAuth()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  // 从 URL 参数或路径获取部门信息
  const departmentParam = searchParams.get('department')
  const isDepartmentView = location.pathname.startsWith('/departments/')
  
  const department = departmentParam === 'tech' ? '技术部'
    : departmentParam === 'creative' ? '创意部'
    : isDepartmentView && location.pathname.includes('/tech') ? '技术部'
    : isDepartmentView && location.pathname.includes('/creative') ? '创意部'
    : '未分配'
    
  const type: 'tech' | 'creative' | undefined = department === '技术部' ? 'tech' 
    : department === '创意部' ? 'creative' 
    : undefined
    
  const departmentLabel = department === '技术部' ? '技术部' 
    : department === '创意部' ? '创意部' 
    : '通用'

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result || '')
      const { headers: H, rows: R } = parseCSV(text)
      setHeaders(H)
      setRows(R)
      setFileName(file.name)
      setLog([])
    }
    reader.readAsText(file, 'utf-8')
  }

  const handleImport = async () => {
    if (!headers.length || !rows.length) return

    const payload = rows.map((row, i) => {
      const title = (row[0] || '').trim() || `未命名-${i + 1}`

      // 原始列字典
      const raw: Record<string, string> = {}
      headers.forEach((h, idx) => {
        const key = h || `第${idx + 1}列`
        raw[key] = row[idx] || ''
      })

      // 基础数据
      const baseData = {
        title,
        description: raw['具体需求描述'] || raw['需求描述'] || `来源文件：${fileName}\n部门：${department}\n导入时间：${new Date().toLocaleString()}`,
        status: 'pending' as const,
        priority: 'medium' as const,
        submitter: {
          id: user?.id || 'unknown',
          name: user?.name || '未知提交人',
          avatar: user?.avatar,
        },
        department,
        type,
        extra: {
          raw,
          source: {
            fileName,
            importedAt: new Date().toISOString(),
          },
        },
      }

      // 技术部特殊字段处理
      if (type === 'tech') {
        return {
          ...baseData,
          tech_month: raw['月份'] || new Date().getFullYear() + '年' + (new Date().getMonth() + 1) + '月',
          tech_expected_completion_time: raw['期望完成的时间'] ? new Date(raw['期望完成的时间']).toISOString() : null,
          tech_urgency: (raw['紧急程度'] === '高' || raw['紧急程度'] === '中' || raw['紧急程度'] === '低') ? raw['紧急程度'] as '高' | '中' | '低' : '中',
          tech_client_url: raw['需支持的客户网址'] || null,
          tech_client_type: (raw['客户类型（流量运营服务/全案深度服务）'] === '流量运营服务' || raw['客户类型（流量运营服务/全案深度服务）'] === '全案深度服务') 
            ? raw['客户类型（流量运营服务/全案深度服务）'] as '流量运营服务' | '全案深度服务' 
            : '流量运营服务',
          tech_assignee: raw['技术负责人'] || null,
          tech_estimated_completion_time: raw['技术负责人预计可完成时间'] ? new Date(raw['技术负责人预计可完成时间']).toISOString() : null,
          tech_progress: (raw['技术完成进度（未开始/处理中/已完成/已沟通延迟）'] === '未开始' || 
                        raw['技术完成进度（未开始/处理中/已完成/已沟通延迟）'] === '处理中' || 
                        raw['技术完成进度（未开始/处理中/已完成/已沟通延迟）'] === '已完成' || 
                        raw['技术完成进度（未开始/处理中/已完成/已沟通延迟）'] === '已沟通延迟') 
            ? raw['技术完成进度（未开始/处理中/已完成/已沟通延迟）'] as '未开始' | '处理中' | '已完成' | '已沟通延迟'
            : '未开始',
        }
      }

      // 创意部或其他部门
      return baseData
    })

    const { error } = await supabase.from('requirements').insert(payload)
    if (error) {
      setLog([`导入失败：${error.message}`])
      return
    }
    setLog([`导入完成：新增 ${payload.length} 条（部门：${departmentLabel}）`])
  }

  const disableImport = !headers.length || !rows.length

  const getReturnPath = () => {
    if (department === '技术部') {
      return '/departments/tech'
    } else if (department === '创意部') {
      return '/departments/creative'
    }
    return '/requirements'
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">导入需求（CSV） - {departmentLabel}</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate(getReturnPath())}>
            返回列表
          </Button>
          <Button onClick={handleImport} disabled={disableImport}>
            开始导入
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>上传文件</CardTitle>
          <CardDescription>支持 CSV（UTF-8）。系统将按原始列展示与导入到 {departmentLabel}。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />
            {fileName && <span className="text-sm text-gray-500">{fileName}</span>}
          </div>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>数据预览（前 10 行）</CardTitle>
            <CardDescription>以原始 CSV 列展示，用于核对解析是否正确。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {headers.map((h, idx) => (
                      <TableHead key={idx}>{h || `第${idx + 1}列`}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 10).map((r, idx) => (
                    <TableRow key={idx}>
                      {headers.map((_, i) => (
                        <TableCell key={i}>{r[i]}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {log.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>导入结果</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
              {log.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
            <div className="mt-4">
              <Button onClick={() => navigate(getReturnPath())}>查看需求列表</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}