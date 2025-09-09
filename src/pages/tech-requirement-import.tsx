import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/hooks/useAuth'
import { techRequirementService, TechRequirement } from '@/services/tech-requirement-service'
import { logger } from '@/lib/logger'

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

export default function TechRequirementImport() {
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [log, setLog] = useState<string[]>([])
  const navigate = useNavigate()
  const { user } = useAuth()

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
    if (!headers.length || !rows.length || !user) return

    const payload: Omit<TechRequirement, 'id' | 'created_at' | 'updated_at'>[] = rows.map((row, i) => {
      // 原始列字�?
      const raw: Record<string, string> = {}
      headers.forEach((h, idx) => {
        const key = h || `�?{idx + 1}列`
        raw[key] = row[idx] || ''
      })

      // 解析日期字符�?
      const parseDate = (dateStr: string): string => {
        if (!dateStr) return new Date().toISOString()
        try {
          return new Date(dateStr).toISOString()
        } catch {
          return new Date().toISOString()
        }
      }

      // 验证枚举�?
      const validateUrgency = (urgency: string): '�? | '�? | '�? => {
        if (urgency === '�? || urgency === '�? || urgency === '�?) return urgency
        return '�?
      }

      const validateClientType = (clientType: string): '流量运营服务' | '全案深度服务' => {
        if (clientType === '流量运营服务' || clientType === '全案深度服务') return clientType
        return '流量运营服务'
      }

      const validateProgress = (progress: string): '未开�? | '处理�? | '已完�? | '已沟通延�? => {
        if (progress === '未开�? || progress === '处理�? || progress === '已完�? || progress === '已沟通延�?) return progress
        return '未开�?
      }

      return {
        title: raw['需求标�?] || raw['标题'] || `未命名需�?${i + 1}`,
        month: raw['月份'] || new Date().getFullYear() + '�? + (new Date().getMonth() + 1) + '�?,
        expected_completion_time: parseDate(raw['期望完成的时�?] || raw['期望完成时间']),
        urgency: validateUrgency(raw['紧急程�?]),
        submitter_name: raw['提交人（直接使用用户名）'] || raw['提交�?] || user.name,
        client_url: raw['需支持的客户网址'] || raw['客户网址'] || undefined,
        description: raw['具体需求描�?] || raw['需求描�?] || `来源文件�?{fileName}\n导入时间�?{new Date().toLocaleString()}`,
        tech_assignee: raw['技术负责人'] || undefined,
        client_type: validateClientType(raw['客户类型（流量运营服�?全案深度服务�?] || raw['客户类型']),
        attachments: undefined,
        assignee_estimated_time: raw['技术负责人预计可完成时�?] ? parseDate(raw['技术负责人预计可完成时�?]) : undefined,
        progress: validateProgress(raw['技术完成进度（未开�?处理�?已完�?已沟通延迟）'] || raw['技术完成进�?]),
        submitter_id: user.id,
        submitter_avatar: user.avatar,
      }
    })

    try {
      const result = await techRequirementService.importTechRequirements(payload)
      setLog([`导入完成：新�?${result.length} 条技术需求`])
    } catch (error) {
      Logger.error('Tech requirement import failed', error)
      setLog([`导入失败�?{error instanceof Error ? error.message : '未知错误'}`])
    }
  }

  const disableImport = !headers.length || !rows.length

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">导入技术需求（CSV�?/h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate('/departments/tech')}>
            返回列表
          </Button>
          <Button onClick={handleImport} disabled={disableImport}>
            开始导�?
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>上传文件</CardTitle>
          <CardDescription>
            支持 CSV（UTF-8）格式。请确保 CSV 文件包含以下列名�?
            <br />
            <strong>必需字段�?/strong>需求标题、月份、期望完成的时间、紧急程度、提交人、具体需求描述、客户类�?
            <br />
            <strong>可选字段：</strong>需支持的客户网址、技术负责人、技术负责人预计可完成时间、技术完成进�?
          </CardDescription>
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
            <CardDescription>以原�?CSV 列展示，用于核对解析是否正确�?/CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {headers.map((h, idx) => (
                      <TableHead key={idx}>{h || `�?{idx + 1}列`}</TableHead>
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
              <Button onClick={() => navigate('/departments/tech')}>查看技术需求列�?/Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
