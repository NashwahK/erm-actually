document.addEventListener("DOMContentLoaded", () => {
  const inaccuracyCtx = document.getElementById("inaccuracyChart").getContext("2d");
  const sourceCtx = document.getElementById("sourceChart").getContext("2d");

  const inaccuracyChart = new Chart(inaccuracyCtx, {
      type: 'bar',
      data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr'],
          datasets: [{
              label: 'Inaccuracies',
              data: [25, 40, 33, 26],
              backgroundColor: '#ffc107', // Updated to yellow
              borderRadius: 8
          }]
      },
      options: {
          plugins: {
              legend: { display: false },
              tooltip: {
                  backgroundColor: '#1f2937',
                  titleColor: '#f8fafc',
                  bodyColor: '#cbd5e1'
              }
          },
          scales: {
              y: {
                  ticks: { color: '#cbd5e1' },
                  grid: { color: '#334155' }
              },
              x: {
                  ticks: { color: '#cbd5e1' },
                  grid: { display: false }
              }
          }
      }
  });

  const sourceChart = new Chart(sourceCtx, {
      type: 'pie',
      data: {
          labels: ['example-news.com', 'buzzdata.co', 'rumorradar.ai'],
          datasets: [{
              data: [45, 30, 25],
              backgroundColor: ['#ffc107', '#fdd835', '#fbc02d'] // Updated to various shades of yellow
          }]
      },
      options: {
          plugins: {
              legend: {
                  labels: {
                      color: '#e2e8f0',
                      font: { size: 14 }
                  }
              },
              tooltip: {
                  backgroundColor: '#1f2937',
                  titleColor: '#f8fafc',
                  bodyColor: '#cbd5e1'
              }
          }
      }
  });

  const navLinks = document.querySelectorAll(".nav-link");
  const dashboardPanel = document.getElementById("dashboard-panel");
  const gamificationPanel = document.getElementById("gamification-panel");
  const heading = document.getElementById("main-heading");

  navLinks.forEach(link => {
      link.addEventListener("click", () => {
          document.querySelector(".nav-link.active")?.classList.remove("active");
          link.classList.add("active");

          const tab = link.dataset.tab;
          if (tab === "dashboard") {
              dashboardPanel.style.display = "block";
              gamificationPanel.style.display = "none";
              heading.textContent = "Dashboard";
          } else if (tab === "gamification") {
              dashboardPanel.style.display = "none";
              gamificationPanel.style.display = "block";
              heading.textContent = "Gamification";
          }
      });
  });
});