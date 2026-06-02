import Navbar from "./Navbar/Navbar.jsx";

export default function Layout({ children }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Navbar />

      <main
        style={{
          padding: "20px",
          marginLeft: "320px",
          width: "calc(100% - 320px)",
          minHeight: "100vh",
          background: "#f4f7fc",
        }}
      >
        {children}
      </main>
    </div>
  );
}