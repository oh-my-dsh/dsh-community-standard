// fixture: host facet entry import 宿主私有 API / Adapter 内部模块（spec/facet-model.md §2.2 第 3 条）。
// 断言：package inspection 检出非标准依赖，validate 阶段失败（见 scenario.json）。
import { internalReload } from 'dsh/internal'
import { patchService } from '@cordis/adapter-private'

export default defineFacet(activation => {
  internalReload()
  activation.scope.add(() => patchService.restore())
})
