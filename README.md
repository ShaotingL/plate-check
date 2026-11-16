# 車牌名單比對

用手機鏡頭掃車牌，自動比對你自己的名單。辨識在手機上進行，名單不會上傳。

**直接使用：<https://shaotingl.github.io/plate-check/>**

## 怎麼用

1. 用手機打開上面的網址。Android 用 Chrome，iPhone 用 Safari。
2. 在瀏覽器選單按「加到主畫面」，之後點桌面上的圖示就能開啟。
3. 按「匯入名單」，把名單貼進去，再按「匯入並取代名單」。
4. 按「開始掃描」，跳出相機權限時選「允許」。
5. 鏡頭對著車子，車牌出現在框內就會自動辨識。

app 裡的「說明」分頁有完整的使用說明。

### 名單怎麼準備

在 Excel 或 Google 試算表裡，每一列放一台車：其中一格是車牌，同一列的其他格子可以放電話、姓名或車位，比對到時會顯示出來。選取後複製，貼到 app 的「設定」裡。

```
ABC-1234    0912-345-678
XYZ-5678    王小明　B2-15 車位
```

### 需要知道的事

- 第一次開啟需要網路，會下載約 31 MB；之後沒有網路也能用。
- 名單和紀錄只存在你的手機裡，其他人看不到。
- 每天重新開始：到「紀錄」按「清除紀錄」。
- 活動結束後：到「設定」按「清除名單和紀錄」。
- 辨識會受光線、角度、距離影響，偶爾會讀錯，重要的時候請目視確認車牌。
- 「唸出車牌」使用手機內建語音，手機需安裝中文語音。
- iPhone 尚未實機測試。
- 車牌和名單內容屬於個人資料，請只匯入你有權使用的名單。

## Google 試算表同步（選用）

想把掃描結果自動記到自己的 Google 試算表時才需要設定。

1. 開一份新的 Google 試算表 → 擴充功能 → Apps Script，貼上 [`docs/apps_script.gs`](docs/apps_script.gs)。
2. **把 `TOKEN` 改成自己的密碼**（沒改會拒絕所有連線）。
3. 部署 → 新增部署作業 → 網頁應用程式；執行身分「我」、存取權「所有人」。
4. 在 app「設定 → Google 試算表同步」貼上網址和密碼。
5. 在「名單」工作表填 A 欄車牌、B 欄顯示內容，app 就能「從 Google 試算表載入」。

---

## 給開發者

以下是想自己架設或修改這個程式的人才需要看的內容，一般使用者可以略過。

### 檔案

| 路徑 | 說明 |
|---|---|
| `index.html` | 主程式（介面、比對、同步，含繁體中文註解） |
| `sw.js` | Service Worker：離線快取，並補上跨來源隔離標頭以啟用多執行緒 |
| `models/`、`lib/` | 車牌偵測／辨識模型與 ONNX Runtime Web |
| `licenses/NOTICE.txt` | 第三方元件的授權條款全文（散布時必須保留） |
| `docs/apps_script.gs` | 選用：Google 試算表同步用的 Apps Script |

### 自己架設

全部是靜態檔案，約 31 MB，放到任何 https 靜態主機即可（相機需要 https）。例如 fork 這個 repository 後，在 Settings → Pages 選擇 `main` 分支的根目錄。

本機測試：在這個資料夾執行 `python -m http.server 9123`，用瀏覽器開 `http://localhost:9123`。

### 更新版本

改完檔案後，把 `sw.js` 裡的 `CACHE = "plate-app-v20"` 改成新版本號，使用者下次開啟會自動更新。新增或刪除檔案時，同步修改 `sw.js` 的 `FILES` 清單。

### 授權

車牌偵測模型來自 [open-image-models](https://github.com/ankandrew/open-image-models)（MIT），車牌文字辨識模型來自 [fast-plate-ocr](https://github.com/ankandrew/fast-plate-ocr)（MIT），推論引擎為 [ONNX Runtime Web](https://github.com/microsoft/onnxruntime)（MIT），字型為 Barlow Condensed（SIL OFL 1.1）。條款全文見 [`licenses/NOTICE.txt`](licenses/NOTICE.txt)。
