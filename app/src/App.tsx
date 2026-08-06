import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import LineOverview from "./screens/LineOverview";
import LineDetail from "./screens/LineDetail";
import StopSearch from "./screens/StopSearch";
import StopBoard from "./screens/StopBoard";
import MapView from "./screens/MapView";
import RoutePlanner from "./screens/RoutePlanner";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<LineOverview />} />
        <Route path="linie/:id" element={<LineDetail />} />
        <Route path="suche" element={<StopSearch />} />
        <Route path="haltestelle/:id" element={<StopBoard />} />
        <Route path="karte" element={<MapView />} />
        <Route path="verbindung" element={<RoutePlanner />} />
      </Route>
    </Routes>
  );
}
