// fixture: entry 默认导出不是 defineFacet 创建的 facet 定义（spec/facet-model.md §2.2 第 2 条、§4）。
// 断言：validate 阶段失败，宿主给出人话报错，插件不得进入 activate（见 scenario.json）。
export default {
  activate(ctx) {
    // 一个普通对象，不是 defineFacet 的产出
  }
}
