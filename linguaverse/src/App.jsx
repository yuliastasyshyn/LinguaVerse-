import { Routes, Route } from "react-router-dom";

import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import LandingPage from "./pages/LandingPage.jsx";

import HomePage from "./pages/HomePage/HomePage.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import RoomsPage from "./pages/RoomsPage.jsx";
import ChallengesPage from "./pages/ChallengesPage.jsx";
import CreateRoomPage from "./pages/CreateRoomPage.jsx";
import LessonsPage from "./pages/LessonsPage.jsx";
import LessonDetail from "./pages/LessonDetail.jsx";
import ProgressPage from "./pages/ProgressPage.jsx";
import DictionaryPage from "./pages/DictionaryPage.jsx";
import PronunciationPage from "./pages/PronunciationPage.jsx";
import WritingPage from "./pages/WritingPage.jsx";

import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute.jsx";
import Layout from "./components/Layout.jsx";
import ActivityTimer from "./components/ActivityTimer.jsx";
import VideoRoomPage from "./pages/VideoRoomPage";
import TranslatorPage from "./pages/TranslatorPage";
import AdminDashboard from "./pages/Admin/AdminDashboard.jsx";
import AdminUsers from "./pages/Admin/AdminUsers.jsx";
import AdminLessons from "./pages/Admin/AdminLessons.jsx";
import AdminChallenges from "./pages/Admin/AdminChallenges.jsx";
import AdminRooms from "./pages/Admin/AdminRooms.jsx";
import AdminReviews from "./pages/Admin/AdminReviews.jsx";
import AdminReports from "./pages/Admin/AdminReports.jsx";
import AdminSettings from "./pages/Admin/AdminSettings.jsx";



import { ProgressProvider } from "./context/ProgressContext.jsx";

export default function App() {
  return (
    <ProgressProvider>
      <ActivityTimer />

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Layout>
                <HomePage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/lessons"
          element={
            <ProtectedRoute>
              <Layout>
                <LessonsPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/lessons/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <LessonDetail />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/progress"
          element={
            <ProtectedRoute>
              <Layout>
                <ProgressPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/chat/:roomId"
          element={
            <ProtectedRoute>
              <Layout>
                <ChatPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Layout>
                <ChatPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Layout>
                <ProfilePage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/rooms"
          element={
            <ProtectedRoute>
              <Layout>
                <RoomsPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/rooms/create"
          element={
            <ProtectedRoute>
              <Layout>
                <CreateRoomPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dictionary"
          element={
            <ProtectedRoute>
              <Layout>
                <DictionaryPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/pronunciation"
          element={
            <ProtectedRoute>
              <Layout>
                <PronunciationPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/writing"
          element={
            <ProtectedRoute>
              <Layout>
                <WritingPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/challenges"
          element={
            <ProtectedRoute>
              <Layout>
                <ChallengesPage />
              </Layout>
            </ProtectedRoute>
          }
/>

    
<Route
  path="/translator"
  element={
    <ProtectedRoute>
      <Layout>
        <TranslatorPage />
      </Layout>
    </ProtectedRoute>
  }
/>




        <Route
          path="/admin"
          element={
            <ProtectedAdminRoute>
              <Layout>
                <AdminDashboard />
              </Layout>
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <ProtectedAdminRoute>
              <Layout>
                <AdminUsers />
              </Layout>
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/admin/lessons"
          element={
            <ProtectedAdminRoute>
              <Layout>
                <AdminLessons />
              </Layout>
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/admin/challenges"
          element={
            <ProtectedAdminRoute>
              <Layout>
                <AdminChallenges />
              </Layout>
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/admin/rooms"
          element={
            <ProtectedAdminRoute>
              <Layout>
                <AdminRooms />
              </Layout>
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/admin/reviews"
          element={
            <ProtectedAdminRoute>
              <Layout>
                <AdminReviews />
              </Layout>
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/admin/reports"
          element={
            <ProtectedAdminRoute>
              <Layout>
                <AdminReports />
              </Layout>
            </ProtectedAdminRoute>
          }
        />

        <Route
          path="/admin/settings"
          element={
            <ProtectedAdminRoute>
              <Layout>
                <AdminSettings />
              </Layout>
            </ProtectedAdminRoute>
          }
        />


        <Route
  path="/video-room/:roomId"
  element={
    <ProtectedRoute>
      <VideoRoomPage />
    </ProtectedRoute>
  }
/>
      </Routes>
    </ProgressProvider>
  );
}