# AI Newsletter Alternative (HCP Relevance Engine Demo)
## Quick Start Instructions for Running the Local Prototype

This guide will walk you through setting up and running the local prototype on your computer (**Windows** or **macOS**). No previous technical experience is required.

---

### 📋 Prerequisites (One-time Setup)

To run the application locally, you need **Node.js** (a JavaScript runtime environment). Please verify you have it installed:

1. Visit the official website: **[nodejs.org/en/download](https://nodejs.org/en/download)**
2. Download the version labeled **LTS** (Long Term Support, usually the left button).
3. Open the downloaded installer and follow the prompt screens. You can keep all default options.
4. *Important:* If you had a Terminal or Command Prompt window open during installation, close it and open a new one afterwards to refresh your environment.

---

### 🚀 Step-by-Step Setup Guide

#### 1. Unzip the Project Folder
*   **Windows**: Right-click the file `ai-newsletter-alternative-hcps-new-version-2026-06-02.zip` and select **"Extract All..."**. Choose a destination folder (e.g., your Desktop) and click "Extract".
    *   *Warning:* Do not just double-click to look inside the ZIP. You must extract it first for the scripts to run correctly.
*   **macOS**: Double-click the ZIP file. A folder named `ai-newsletter-alternative-hcps` will automatically appear in the same directory.

#### 2. Open Terminal / Command Prompt
*   **Windows**: Press the **Windows Key** on your keyboard, type `cmd`, and press **Enter**. A black command window will open.
*   **macOS**: Hold **Command (cmd)** and press the **Spacebar**, type `Terminal`, and press **Enter**.

#### 3. Navigate into the Project Folder (cd)
The easiest way to target the correct directory is using the drag-and-drop method:
1. In your Terminal / Command Prompt, type `cd ` followed by a **space** (do not press Enter yet).
2. Drag the extracted folder `ai-newsletter-alternative-hcps` from your file explorer (Windows Explorer or Mac Finder) and drop it directly into the Terminal window. The path will fill in automatically.
3. Press **Enter**.

#### 4. Install Dependencies
Type the following command in Terminal and press **Enter**:
```bash
npm install
```
*   *Note:* The setup will download the required libraries. This takes about 10–30 seconds. Once complete, you will see the normal prompt again. You can ignore any warning messages during this process.

#### 5. Start the Demo
Type the following command and press **Enter**:
```bash
npm run dev
```
*   This spins up a local server. You should see a success message:
    `Relevance Engine demo running at http://127.0.0.1:5173`
*   **Important:** Keep this Terminal window open! Closing it will stop the demo server.

#### 6. Open the App in Your Browser
Open your web browser (Chrome, Safari, Edge, or Firefox) and navigate to:
👉 **[http://127.0.0.1:5173/](http://127.0.0.1:5173/)**

*(Or hold `Ctrl` on Windows or `Cmd` on macOS and click the URL directly in the Terminal window).*

### ⚠️ Troubleshooting & Key Notes

*   **API Keys:** The project includes a `.env.local` file containing a demo OpenAI API key so that live AI relevance reasoning works out-of-the-box.
    *   *Security Note:* This is a private testing package. Do not upload this folder or its files to public repositories.
*   **Error: "npm: command not found"**: Node.js is not installed, or you need to restart your Terminal app to apply the installation path. Close the terminal, reinstall Node.js, and open a new terminal window.
*   **Error: "Port 5173 already in use"**: Another process is occupying the local address. Close all active terminal windows and try running `npm run dev` again.
*   **Stop the Server:** To close the demo completely, go to your Terminal window, press `Ctrl + C`, and close the window.
*   **Demo Data only:** This app uses simulated patient cases and does not contain or process any real patient health records.
