import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Requirement, RequirementService } from '@/services/requirement-service'
import { useAuth } from '@/hooks/use-auth'

type TemplateType = 'tech' | 'creative'
type Mapping = {
  externalId?: string
  title?: string
  description?: string
  priority?: string
  status?: string
  department?: string
  assignee?: string
  submitter?: string
  createdAt?: string
  dueDate?: string
  tags?: string
  link?: string
}

function detectDelimiter(sample: string): string {
  // 在前几行统计分隔符出现次数，选择最多的
  const lines = sample.split(/\r?\n/).slice(0, 5)
  const counts = { ',': 0, ';': 0, '\t': 0 }
  for (const l of lines) {
    counts[','] += (l.match(/,/g) || []).length
    counts[';'] += (l.match(/;/g) || []).length
    counts['\t'] += (l.match(/\t/g) || []).length
  }
  let best = ','
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
      // 处理 CRLF
      if (c === '\r' && next === '\n') i++
      cur.push(field)
      rows.push(cur)
      cur = []
      field = ''
    } else {
      field += c
    }
  }
  // 末尾最后一个字段
  if (field.length > 0 || cur.length > 0) {
    cur.push(field)
    rows.push(cur)
  }

  const headers = rows[0]?.map((h) => h.trim()) || []
  const body = rows.slice(1).map((r) => {
    // 对齐到 headers 数量
    const arr = Array.from({ length: headers.length }, (_, idx) => (r[idx] ?? '').trim())
    return arr
  })
  return { headers, rows: body }
}

function guessMapping(headers: string[], template: TemplateType): Mapping {
  const H = headers.map((h) => h.toLowerCase())

  const has = (...candidates: string[]) => {
    const idx = H.findIndex((h) => candidates.some((k) => h.includes(k.toLowerCase())))
    return idx >= 0 ? headers[idx] : undefined
  }

  // 常见中文列名别名
  const m: Mapping = {
    externalId: has('编号', 'id', '行id', '需求编号', '单号'),
    title: has('标题', '需求标题', '名称', '主题', '事项', '任务'),
    description: has('描述', '需求描述', '备注', '内容', '说明'),
    priority: has('优先级', '级别', '紧急程度'),
    status: has('状态', '进度状态', '处理状态'),
    department: has('部门', '所属部门', '部门/小组'),
    assignee: has('负责人', '处理人', '指派', '执行人'),
    submitter: has('提交人', '申请人', '发起人', '提报人'),
    createdAt: has('提交时间', '创建时间', '日期', '提报时间', '录入时间'),
    dueDate: has('截止日期', '完成时间', '交付日期', '期望完成时间', '到期'),
    tags: has('标签', 'tag', '标签/关键词', '分类'),
    link: has('相关链接', '页面链接', '链接', 'url', '参考链接', '素材链接'),
  }

  if (template === 'creative') {
    // 创意常见命名偏好
    if (!m.description) m.description = has('备注', '需求内容', '设计说明')
    if (!m.link) m.link = has('参考链接', '素材链接', '网店/产品/页面')
  }
  return m
}

function normalizeDate(input: string): string {
  const s = (input || '').trim()
  if (!s) return ''
  // 2025-08-01 / 2025/8/1 / 2025年8月1日
  const re = /(\d{4})[^\d]?(\d{1,2})[^\d]?(\d{1,2})/
  const m = s.match(re)
  if (m) {
    const y = Number(m[1])
    const mm = String(Number(m[2])).padStart(2, '0')
    const dd = String(Number(m[3])).padStart(2, '0')
    return `${y}-${mm}-${dd}`
  }
  // 兜底用 Date 解析
  const d = new Date(s)
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${y}-${mm}-${dd}`
  }
  return ''
}

function mapPriority(v: string): 'high' | 'medium' | 'low' {
  const s = (v || '').toLowerCase()
  if (['高', '紧急', 'p0', 'p1'].some((k) => s.includes(k))) return 'high'
  if (['低', '较低', 'p3'].some((k) => s.includes(k))) return 'low'
  return 'medium'
}

function mapStatus(v: string): 'pending' | 'inProgress' | 'completed' | 'overdue' {
  const s = (v || '').toLowerCase()
  if (['完成', '已完成', '结案', 'done', '已结束'].some((k) => s.includes(k))) return 'completed'
  if (['逾期', '延期'].some((k) => s.includes(k))) return 'overdue'
  if (['进行', '处理中', '处理中', 'in progress'].some((k) => s.includes(k))) return 'inProgress'
  return 'pending'
}

function splitTags(v: string): string[] {
  return (v || '')
    .split(/[,，;；\s]+/)
    .map((x) => x.trim())
    .filter(Boolean)
}

function buildKey(title: string, createdAt: string) {
  return `${(title || '').toLowerCase()}__${(createdAt || '').toLowerCase()}`
}

export default function RequirementImport() {
  const [template, setTemplate] = useState<TemplateType>('tech')
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Mapping>({})
  const [log, setLog] = useState<string[]>([])
  const navigate = useNavigate()
  const { user } = useAuth()

  const suggested = useMemo(() => guessMapping(headers, template), [headers, template])

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result || '')
      const { headers: H, rows: R } = parseCSV(text)
      setHeaders(H)
      setRows(R)
      setMapping(guessMapping(H, template))
      setFileName(file.name)
      setLog([])
    }
    reader.readAsText(file, 'utf-8')
  }

  const handleImport = async () => {
    if (!headers.length || !rows.length) return
    const m = { ...suggested, ...mapping }

    const get = (row: string[], col?: string) => {
      if (!col) return ''
      const idx = headers.indexOf(col)
      return idx >= 0 ? row[idx] : ''
    }

    const existing = await RequirementService.getAllRequirements()
    const map = new Map<string, Requirement>()
    for (const r of existing) {
      const k = buildKey(r.title, r.createdAt)
      map.set(k, r)
    }

    let created = 0
    let updated = 0
    const errors: string[] = []

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i]
        const title = get(row, m.title) || `未命名-${i + 1}`
        const description = get(row, m.description) || ''
        const priority = mapPriority(get(row, m.priority))
        const status = mapStatus(get(row, m.status))
        const department = get(row, m.department) || (template === 'creative' ? '创意部' : '技术部')
        const assigneeName = get(row, m.assignee) || ''
        const submitterName = get(row, m.submitter) || (user?.name || '未知提交人')
        const createdAt = normalizeDate(get(row, m.createdAt)) || normalizeDate(new Date().toISOString())
        const dueDate = normalizeDate(get(row, m.dueDate))
        const tags = splitTags(get(row, m.tags))
        const link = get(row, m.link)
        const extId = get(row, m.externalId)

        const key = buildKey(title, createdAt)

        const base: Requirement = {
          id: uuidv4(),
          title,
          description: link ? `${description}\n\n相关链接：${link}` : description,
          status,
          priority,
          submitter: {
            id: `submitter:${submitterName}`,
            name: submitterName,
            avatar: undefined,
          },
          assignee: assigneeName
            ? { id: `assignee:${assigneeName}`, name: assigneeName, avatar: undefined }
            : null,
          department,
          createdAt,
          updatedAt: createdAt,
          dueDate: dueDate || '',
          tags,
          attachments: [],
          comments: [],
          history: [],
        }

        if (map.has(key)) {
          const old = map.get(key)!
          const merged: Requirement = {
            ...old,
            ...base,
            id: old.id, // 保持原ID
            // 合并标签
            tags: Array.from(new Set([...(old.tags || []), ...(base.tags || [])])),
            updatedAt: normalizeDate(new Date().toISOString()),
          }
          map.set(key, merged)
          updated++
        } else {
          map.set(key, base)
          created++
        }
      } catch (e: any) {
        errors.push(`第 ${i + 2} 行导入失败：${e?.message || e}`)
      }
    }

    const merged = Array.from(map.values())
    localStorage.setItem('requirements', JSON.stringify(merged))
    setLog([
      `导入完成：新增 ${created} 条，更新 ${updated} 条，总计 ${merged.length} 条`,
      ...(errors.length ? [`失败 ${errors.length} 条：`, ...errors.slice(0, 10)] : []),
    ])
  }

  const disableImport = !headers.length || !rows.length

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">导入需求（CSV）</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate('/requirements')}>返回列表</Button>
          <Button onClick={handleImport} disabled={disableImport}>开始导入</Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>选择模板与上传文件</CardTitle>
          <CardDescription>支持 CSV（UTF-8）。先选择模板再上传可更好地自动匹配列。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">模板</label>
              <select
                className="border rounded px-3 py-2"
                value={template}
                onChange={(e) => {
                  const t = e.target.value as TemplateType
                  setTemplate(t)
                  if (headers.length) {
                    setMapping(guessMapping(headers, t))
                  }
                }}
              >
                <option value="tech">技术部</option>
                <option value="creative">创意部</option>
              </select>
            </div>

            <div className="flex-1" />

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
          </div>
        </CardContent>
      </Card>

      {headers.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>列映射</CardTitle>
            <CardDescription>已自动匹配常见列名，可按需调整。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {([
                { k: 'externalId', label: '外部编号（可选）' },
                { k: 'title', label: '标题（必选）' },
                { k: 'description', label: '描述' },
                { k: 'priority', label: '优先级' },
                { k: 'status', label: '状态' },
                { k: 'department', label: '部门' },
                { k: 'assignee', label: '负责人' },
                { k: 'submitter', label: '提交人' },
                { k: 'createdAt', label: '提交时间/创建时间' },
                { k: 'dueDate', label: '截止日期' },
                { k: 'tags', label: '标签' },
                { k: 'link', label: '相关链接' },
              ] as { k: keyof Mapping; label: string }[]).map((f) => (
                <div key={f.k} className="flex items-center gap-3">
                  <label className="w-40 text-sm text-gray-600">{f.label}</label>
                  <select
                    className="flex-1 border rounded px-3 py-2"
                    value={(mapping[f.k] ?? suggested[f.k] ?? '') as string}
                    onChange={(e) => setMapping((prev) => ({ ...prev, [f.k]: e.target.value }))}
                  >
                    <option value="">（不导入）</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {rows.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>数据预览（前 10 行）</CardTitle>
            <CardDescription>请确认数据是否正确解析。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {headers.map((h) => (
                      <TableHead key={h}>{h}</TableHead>
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
              <Button onClick={() => navigate('/requirements')}>查看需求列表</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}