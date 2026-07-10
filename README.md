# 麻将馆智能排桌

这是一个可以直接发布成网页的手机排桌工具。

## 当前公开链接

准备使用的独立域名：

https://mj.mjglb.com

在 DNS 和 GitHub Pages 设置完成前，先继续使用 GitHub Pages 链接：

GitHub Pages 链接：

https://dongbo-peng.github.io/mahjong-arranger/?v=5

如果手机打开后还是旧页面，可以把链接最后的 `?v=5` 改成 `?v=6` 再打开。

## 绑定 mj.mjglb.com

建议使用子域名 `mj.mjglb.com`，不要改动 `mjglb.com` 主域名，避免影响主域名下已有程序。

需要做两件事：

1. 在域名 DNS 管理里新增一条记录：
   - 类型：`CNAME`
   - 主机记录：`mj`
   - 记录值：`dongbo-peng.github.io`
2. 在 GitHub 仓库 `Dongbo-Peng/mahjong-arranger` 的 `Settings` -> `Pages` 里，把 Custom domain 设置为：
   - `mj.mjglb.com`

本项目已经包含 `CNAME` 文件，内容是 `mj.mjglb.com`。

## 发布方法：GitHub Pages

1. 打开 GitHub 仓库 `Dongbo-Peng/mahjong-arranger`
2. 进入 `Settings` -> `Pages`
3. Source 选择 `Deploy from a branch`
4. Branch 选择 `main`，文件夹选择 `/(root)`
5. 保存后等 1-3 分钟
6. 打开上面的 GitHub Pages 链接测试

## 备用发布方法：Netlify

1. 打开 https://app.netlify.com/drop
2. 登录或注册账号
3. 把 `mahjong-arranger` 文件夹拖进去
4. 等待上传完成
5. Netlify 会生成一个 `https://...netlify.app` 链接
6. 把这个链接发到微信，朋友手机就能打开

## 手机使用

- 打开链接后点“今日报名”，勾选今天来的客人。
- 点“自动排桌”生成桌号。
- 点“可排桌数”可以手动换人、加桌、删桌。
- 点某个人的“修改”，可以改名字、水平、金额、喜欢同桌、不愿同桌。

## 数据保存说明

当前版本的数据保存在使用者自己的手机浏览器里。不同朋友打开同一个链接，各自的数据互不影响。

如果要多人共用同一份数据，下一步需要接云数据库。

## 朋友试用检查

建议第一次发给朋友时，请他测试这 3 件事：

1. 连续修改 10 个玩家姓名，确认保存后不会变回默认名字。
2. 勾选 12-16 个报名玩家，点击“自动排桌”，看看桌号是否合理。
3. 进入“可排桌数”，手动换人、加桌、删桌，确认操作顺手。
