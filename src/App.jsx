import { BrowserRouter, Routes, Route } from "react-router-dom";
import OrderPage from "./pages/OrderPage.jsx";
import Dashboard from "./pages/Dashboard.jsx";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<OrderPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  </BrowserRouter>
);

export default App;
