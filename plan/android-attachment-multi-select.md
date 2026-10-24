# Android 文件与图片多选设计

## 现状与目标

原生 `pickFile` 只读取 ActivityResult.data.data，聊天附件 Store 也只等待一个 PickedFile。相册与文件选择需支持同次选择多项；拍照和头像继续单选，现有调用方合同不变。

## 三方审议

- Melchior：新增有类型的 `pick_files`，保留 `pick_file`。ClipData 按提供方顺序收集、URI 去重；逐文件使用现有 64 KiB 流式拷贝、独立 staging ticket、转码和缩略图，避免并行解码造成 OOM。每项单独成功/失败，JNI promise 与批次事件只能提交一次结果。
- Balthasar：相册/文件仍是系统选择器，原生长按/复选交互；已选项沿当前暂存列表展示，可逐个移除。不改变头像、拍摄或共享入口，不增加通用存储权限。
- Casper：复用单一 URI 处理函数和现有注册入口，避免复制约400行转码逻辑。独立批次只增加必要 DTO、命令声明与权限；不改发布签名或正式包数据。

## 行为合同

1. 文件/相册 Intent 设置 EXTRA_ALLOW_MULTIPLE；同时兼容仅返回 data 的提供方。
2. 结果包含有序 files 和带原选择位置的 failures。取消返回空结果且不显示错误。
3. 批次使用独立 requestId；仅匹配该批次的完成事件可作 promise 兜底。
4. 每个成功项走相同 register_local_file，拥有独立 stableId；一个失败不会阻止后续项。不把失败项当成功，不重复注册双轨结果。
5. 从相同选择中重复返回的 URI 合并；不同 URI 即使同名也保留。现有内容寻址由各项独立 staging 所有权处理。
6. 移除暂存项后，迟到注册结果不得重新插回；选择期间阻止另开原生选择器。

## 验证

Vue 测试覆盖多项注册、顺序、部分失败、取消与迟到结果。Android JVM 验证 ClipData/data 合并与 MIME/单选边界。运行 pnpm check、Android 插件编译；在独立 Debug 包上实际检查 Android13 文件/相册多选、单个移除与取消。源码/构建/真机结果分开记录。

当前已通过：附件相关 Vitest 5 项、pnpm check（Vue 类型和 host Rust）、pnpm build。Android JVM、原生编译与真机交互仍待完成，不能由上述检查替代。
