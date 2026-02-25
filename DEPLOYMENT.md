# GitHub Actions 部署指南

## 部署步驟

### 1. 準備 GitHub Repository
- 將專案推送到 GitHub
- 確保有 `main` 或 `master` 分支

### 2. 手動啟用 GitHub Pages
**重要**：需要先手動啟用 GitHub Pages，然後 GitHub Actions 才能部署

1. 前往您的 GitHub Repository
2. 點擊 `Settings` 標籤
3. 在左側選單中找到 `Pages`
4. 在 `Build and deployment` > `Source` 部分選擇 `GitHub Actions`
5. 這樣 GitHub Actions 就會直接管理部署流程

### 3. 設定 Actions 權限
1. 前往 `Settings` > `Actions` > `General`
2. 在 `Workflow permissions` 部分選擇 `Read and write permissions`
3. 勾選 `Allow GitHub Actions to create and approve pull requests`
4. 點擊 `Save`

### 4. 推送程式碼
當您推送程式碼到 main/master 分支時，GitHub Actions 會自動：
- 安裝依賴
- 建置專案
- 部署到 GitHub Pages

## 權限設定說明

使用 `peaceiris/actions-gh-pages` 的優勢：
- ✅ 簡單可靠
- ✅ 廣泛使用
- ✅ 自動創建 gh-pages 分支
- ✅ 不需要複雜的權限設定

## 其他部署選項

### Vercel 部署（推薦）
1. 前往 [vercel.com](https://vercel.com)
2. 連接您的 GitHub Repository
3. 自動部署，無需任何設定

### Netlify 部署
1. 前往 [netlify.com](https://netlify.com)
2. 連接您的 GitHub Repository
3. Build command: `npm run build`
4. Publish directory: `dist`
5. 自動部署

## 故障排除

### 如果部署後出現黑畫面：
1. **檢查瀏覽器開發者工具**：
   - 按 F12 開啟開發者工具
   - 查看 Console 標籤是否有錯誤訊息
   - 查看 Network 標籤是否有載入失敗的資源

2. **確認路徑設定**：
   - 確保 `vite.config.ts` 中設定了正確的 `base` 路徑
   - GitHub Pages URL 格式：`https://[username].github.io/[repository-name]/`

3. **清除瀏覽器快取**：
   - 按 Ctrl+Shift+R (Windows) 或 Cmd+Shift+R (Mac) 強制重新載入
   - 或在開發者工具中右鍵重新整理按鈕選擇「清空快取並強制重新載入」

### 如果遇到 "Resource not accessible by integration" 錯誤：
1. **檢查 Pages 設定**：確保 Repository Settings > Pages 中 Source 設定為 "GitHub Actions"
2. **檢查 Actions 權限**：確保 Repository Settings > Actions > General > Workflow permissions 具備寫入權限（雖然新流程使用更細粒度的權限，但這也是一個檢查點）

### 如果部署仍然失敗：
1. **檢查 Repository 設定**：
   - 確保 Repository 是 Public 或您有 Pro 帳號
   - 確保 Repository 沒有被限制

2. **重新觸發工作流程**：
   - 前往 Actions 頁面
   - 點擊失敗的工作流程
   - 點擊 "Re-run all jobs"

3. **檢查建置日誌**：
   - 查看每個步驟的詳細日誌
   - 確認 `npm run build` 成功執行

## 注意事項
- 這是一個純前端專案，不需要任何 API 金鑰
- GitHub Pages 的 URL 格式：`https://[username].github.io/[repository-name]`
- 首次部署可能需要幾分鐘時間
- 如果使用 Private Repository，需要 GitHub Pro 帳號
