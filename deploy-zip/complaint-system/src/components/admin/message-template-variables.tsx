import { MESSAGE_TEMPLATE_VARIABLES } from '@/lib/message-template-defaults'

export function MessageTemplateVariablesTable() {
  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">치환 인자 목록</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          템플릿 본문에 <code className="bg-gray-100 px-1 rounded">{'{{인자명}}'}</code> 형식으로 넣으면 발송 시 실제 값으로 바뀝니다.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-gray-500">
              <th className="px-4 py-2 font-medium">인자</th>
              <th className="px-4 py-2 font-medium">설명</th>
              <th className="px-4 py-2 font-medium">예시</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {MESSAGE_TEMPLATE_VARIABLES.map((v) => (
              <tr key={v.key} className="hover:bg-gray-50/80">
                <td className="px-4 py-2.5 align-top whitespace-nowrap">
                  <code className="text-xs bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded">{`{{${v.key}}}`}</code>
                  <p className="text-xs text-gray-400 mt-0.5">{v.label}</p>
                </td>
                <td className="px-4 py-2.5 align-top text-gray-600 text-xs leading-relaxed">{v.description}</td>
                <td className="px-4 py-2.5 align-top text-gray-500 text-xs font-mono whitespace-pre-wrap">{v.example}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
