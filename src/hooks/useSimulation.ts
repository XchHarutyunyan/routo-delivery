import { useEffect } from "react";
import { randomOrder, useSim } from "../store/sim";

/** Drives the simulation: frequent ticks plus background customer demand */
export function useSimulation() {
  useEffect(() => {
    // A few orders right away so the map isn't empty
    if (useSim.getState().orders.length === 0) {
      for (let i = 0; i < 4; i++) randomOrder();
    }
    const tick = setInterval(() => useSim.getState().tick(Date.now()), 250);
    const demand = setInterval(() => {
      const active = useSim.getState().orders.filter((o) => o.status !== "delivered" && !o.mine).length;
      if (active < 6) randomOrder();
    }, 6000);
    return () => {
      clearInterval(tick);
      clearInterval(demand);
    };
  }, []);
}
