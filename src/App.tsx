import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import { CourierApp } from "./components/CourierApp";
import { CustomerApp } from "./components/CustomerApp";
import { Dispatch } from "./components/Dispatch";
import { PhoneFrame } from "./components/PhoneFrame";
import { useSimulation } from "./hooks/useSimulation";

function Header() {
  return (
    <header className="top">
      <span className="brand">
        <span className="logo">R</span> Routo <small>delivery platform demo</small>
      </span>
      <nav>
        <NavLink to="/" end>Live demo</NavLink>
        <NavLink to="/dispatch">Dispatcher</NavLink>
        <NavLink to="/customer">Customer app</NavLink>
        <NavLink to="/courier">Courier app</NavLink>
      </nav>
    </header>
  );
}

function Demo() {
  return (
    <main className="demo">
      <div className="intro">
        <h1>Order on the left. Deliver on the right. Watch it all in the middle.</h1>
        <p>
          A customer app, a courier app and a dispatcher control room sharing one live simulation of Yerevan — real
          streets, 8 couriers, 6 restaurants. Your order goes to Arman, the courier you control.
        </p>
      </div>
      <div className="demo-grid">
        <PhoneFrame label="Customer app">
          <CustomerApp />
        </PhoneFrame>
        <Dispatch compact />
        <PhoneFrame label="Courier app · you are Arman">
          <CourierApp />
        </PhoneFrame>
      </div>
    </main>
  );
}

export default function App() {
  useSimulation();
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Demo />} />
        <Route path="/dispatch" element={<main className="page"><Dispatch /></main>} />
        <Route path="/customer" element={<main className="page center"><PhoneFrame><CustomerApp /></PhoneFrame></main>} />
        <Route path="/courier" element={<main className="page center"><PhoneFrame><CourierApp /></PhoneFrame></main>} />
      </Routes>
      <footer className="foot">
        Routo demo · React, TypeScript, Vite, Leaflet, Zustand · routes from OpenStreetMap / OSRM · restaurants and orders are fictional ·{" "}
        <a href="https://khharutyunyan.dev" target="_blank" rel="noopener">Khachik Harutyunyan</a>
      </footer>
    </BrowserRouter>
  );
}
