import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { LanguageProvider } from "./context/LanguageContext";
import { BusinessProvider } from "./context/BusinessContext";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <BusinessProvider>
          <AuthProvider>
            <CartProvider>
            <App />
            <Toaster
              position="top-right"
              toastOptions={{
                className: "text-[13px] font-medium",
                duration: 4000,
              }}
            />
            </CartProvider>
          </AuthProvider>
        </BusinessProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
);
