import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// صفحات عامة
import Home from "./pages/Home";
import FeaturesPage from "./pages/FeaturesPage";
import Contact from "./pages/Contact";
import HowItWorks from "./pages/HowItWorks";
import Login from "./pages/Login";
import ViewExam from "./pages/ViewExam";
import MessageExam from "./pages/MessageExam";
import CorrectExam from "./pages/CorrectExam";
import ResetPassword from "./pages/ResetPassword.jsx";

// Layout لصفحات النظام (dashboard)
import MainLayout from "./layout/MainLayout";

// صفحات النظام
import Dashboard from "./pages/Dashboard";
import Attendance from "./pages/Attendance";
import Substitution from "./pages/Substitution";
import Schedule from "./pages/Schedule";
import Exams from "./pages/Exams";
import Students from "./pages/Students";
import Subjects from "./pages/Subjects";
import Notifications from "./pages/Notifications";
import Users from "./pages/Users";
import NewUser from "./pages/NewUser";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import EditUser from "./pages/EditUser";
import TeacherProfile from "./pages/TeacherProfile.jsx"; // ✅ صح
import MyProfileRedirect from "./pages/MyProfileRedirect.jsx"; // ⬅️ جديد
import NewStudent from "./pages/NewStudent";


function App() {
  return (
    <Router>
      <Routes>

        {/* صفحات عامة */}
        <Route path="/" element={<Home />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/login" element={<Login />} />

        {/* صفحات النظام داخل MainLayout */}
        <Route path="/" element={<MainLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="substitution" element={<Substitution />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="exams" element={<Exams />} />
          <Route path="students" element={<Students />} />
          <Route path="/subjects" element={<Subjects />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="users" element={<Users />} />
          <Route path="teacher/:id" element={<TeacherProfile />} />
          <Route path="teacher" element={<MyProfileRedirect />} />
          <Route path="new-user" element={<NewUser />} />
          <Route path="settings" element={<Settings />} />
          <Route path="help" element={<Help />} />
          <Route path="/exam/:id/view" element={<ViewExam />} />
          <Route path="/exam/:id/message" element={<MessageExam />} />
          <Route path="/exam/:id/correction" element={<CorrectExam />} />
          <Route path="/edit-user/:id" element={<EditUser />} />
          <Route path="/reset-password/:id" element={<ResetPassword />} />
          <Route path="/new-students" element={<NewStudent />} />



        </Route>
      </Routes>
    </Router>
  );
}

export default App;
