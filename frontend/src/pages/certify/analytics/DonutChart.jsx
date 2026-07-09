import { useEffect, useRef } from "react";
import { Chart } from "./chartSetup";

function DonutChart({ data = [0, 0, 0, 0, 0] }) {
  const ref = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    if (!chartRef.current) {
      chartRef.current = new Chart(ref.current, {
        type: "doughnut",
        data: {
          datasets: [
            {
              data,
              backgroundColor: [
                "#7C6FF7",
                "#F4A837",
                "#4899F7",
                "#2DC78D",
                "#F74242",
              ],
              borderWidth: 3,
              borderColor: "#fff",
              hoverOffset: 4,
            },
          ],
        },
        options: {
          cutout: "68%",
          plugins: { legend: { display: false } },
          responsive: true,
          maintainAspectRatio: true,
          animation: { duration: 0 },
        },
      });
    } else {
      chartRef.current.data.datasets[0].data = data;
      chartRef.current.update();
    }
    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [data]);

  return <canvas ref={ref} width={160} height={160} />;
}

export default DonutChart;
