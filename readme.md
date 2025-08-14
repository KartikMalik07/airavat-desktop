# Airavat – Individual Elephant Identification System

**Airavat** is an offline desktop application for identifying individual elephants from photographs.
It uses deep learning models trained on distinct physical features and runs entirely on your local machine – no internet needed after download.

---

## 📥 Download & Run

1. **Go to the [Releases](../../releases) page** of this repository.
2. Download **`Airavat-win64.zip`** (do not download just the `.exe`).
3. Extract the ZIP anywhere on your computer.
4. Open the extracted folder.
5. Double-click `Airavat.exe` to start the app.

> **Note:**
> - The `.exe` must be run from inside its extracted folder – it needs the included `resources/` directory.
> - If you only run the `.exe` from GitHub without the rest of the files, you’ll see an ICU-related error.

---

## 💡 Features

- **Offline Identification** – works without internet after installation.
- **Two AI Models** –
  - Siamese neural network for head-based matching.
  - YOLOv8 for right ear pattern recognition.
- **Choose Your Mode** – run either model independently via the UI.
- **High-Volume Support** – process datasets up to **200 GB** (requires ~250 GB free disk space for extraction + results).
- **Single Photo Search** – check if a specific elephant exists in your dataset.
- **Separate Model Testing** – run models independently for research and performance comparison.

---

## 🛠 System Requirements

- **OS:** Windows 10/11 64-bit
- **RAM:** 8 GB minimum (16 GB+ recommended for large datasets)
- **Disk Space:** At least 250 GB free if processing a full 200 GB dataset
- **GPU:** Optional – the app uses CPU if CUDA is not available.

---

## 🔍 Background

Airavat supports elephant conservation efforts by enabling researchers to track and monitor individuals more efficiently.
Its dual-model approach increases reliability by combining facial and ear pattern recognition, all without requiring constant internet connectivity.

---

## 📜 License

MIT License – see [LICENSE](LICENSE) for details.
