# 🚀 AI-Powered Digital Lesson Plan System

<div align="center">
  <img src="frontend/public/images/logo.jpeg" alt="Logo" width="200"/>
  <h3>Empowering Rwandan Educators with AI-Driven Pedagogical Planning</h3>
  <p><strong>A comprehensive ecosystem for modern education, aligned with the Rwanda Education Board (REB) curriculum.</strong></p>

  [**View Feature List**](#-key-features) | [**Live App**](https://digital-lesson-plan.onrender.com)
</div>

---

## 🌟 Vision

The **Digital Lesson Plan** system is designed to revolutionize how teachers in Rwanda prepare for their classes. By combining the **REB Competence-Based Curriculum (CBC)** with the power of **LLMs (Google Gemini & Groq)**, we provide a tool that generates high-quality, professional, and inclusive lesson plans in seconds.

---

## 🛠️ The Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React, Vite, CSS (Glassmorphism), React Router, Axios |
| **Backend** | Node.js, Express.js, JWT Authentication, Multer |
| **Database** | MySQL (Aiven Managed / XAMPP Local) |
| **AI Brain** | Google Gemini (1.5 Flash/Pro), Groq (Llama 3.3/3.1) |

---

## 🚀 Key Features

### 🤖 Smart Generation
*   **REB-Compliant Models**: Automatically follows the **5Es** (Science/Math) or **3Ps** (Languages) pedagogical models.
*   **Total Customization**: Adjusts depth based on lesson duration (40m vs 80m).
*   **Professional Formatting**: Proper Unicode for Mathematics, Science, and Coding.
*   **No Placeholders**: Generates actual questions, answers, and exercises—never generic instructions.

### 📚 Curriculum & Materials
*   **Syllabus AI Extraction**: Automatically extract Units/Lessons from uploaded REB syllabuses.
*   **Guide Management**: Centralized access to official REB Teacher Guides and references.

### 🌍 Inclusivity & Localization
*   **Special Needs Ready**: Dedicated scripts for learners with visual, auditory, or cognitive needs.
*   **Kinyarwanda Mastery**: Specialized logic for perfect academic Kinyarwanda.

---

## 🚀 Quick Start (Local Setup)

### 1. Prerequisites
- Node.js (v16+)
- MySQL (XAMPP or Managed Instance)
- API Keys for Gemini/Groq

### 2. Database Setup
- Import `../../database/schema/001_lesson_planner.sql` into your MySQL instance.

### 3. Backend & Frontend
```bash
# Setup Backend
cd backend && npm install && npm run dev

# Setup Frontend
cd frontend && npm install && npm run dev
```

The system will be live at `http://localhost:5173`.

---

## 📁 Project Structure

```text
lessonplan/
├── backend/          # Node.js API & AI Engine
├── frontend/         # React SPA (Web Dashboard)
└── database/         # SQL Schemas & Migrations
```

---

## 👥 User Roles

*   **Teachers**: Manage classes, generate plans, track units.
*   **Administrators**: Manage curriculum, upload global materials.

---

**Built with ❤️ for the future of Rwandan Education.**
