var chartTitle = [new Date().toDateString(), 'Real-Time Tiny Living Mini-Split Temperatures (TINY)', 'OK Mesonet Data from Norman (NRMN)']
var chartConfig = {
    type: "scatter",
    data: {
    datasets:
    [
      {
           label: "Indoor Temperature (TINY)",
           data: [{}],
           backgroundColor: "rgba(77, 201, 246, 0.6)",
           borderColor: "white",
           borderWidth: 0.25,
           yAxisID: "temperature"
      },
      {
           label: "Outdoor Temperature (TINY)",
           data: [{}],
           backgroundColor: "rgb(204, 0, 102)",
           borderColor: "white",
           borderWidth: 0.25,
           yAxisID : "temperature"
      },
      {
           label: "Target Temperature (TINY)",
           data: [{}],
           backgroundColor: "rgb(127, 255, 0)",
           borderColor: "rgb(127, 255, 0)",
           borderWidth: 3,
           pointStyle: "line",
           yAxisID: "temperature"

      },
      {
           label: "Outdoor Temperature (KCOLOVEL366)",
           data: [{}],
           backgroundColor: "rgb(255, 0, 0)",
           borderColor: "white",
           borderWidth: 0.25,
           yAxisID: "temperature"
      },
      {
           label: "Outdoor Relative Humidity (KCOLOVEL366)",
           data: [{}],
           backgroundColor: "rgb(255, 116, 0)",
           borderColor: "white",
           borderWidth: 0.25,
           yAxisID: "relativeHumidity",
           type: "line",
           pointStyle: "rectRounded"

      }
    ]
  },
   options: {
     plugins: {
       zoom: {
         zoom: {
           enabled: true,
           drag: true,
           mode: "x"
        }
      }
    },
     legend: {
       labels: {
         fontColor: "navajowhite",
         fontSize: 14,
         usePointStyle: true
      }
    },
     scales: {
       xAxes: [{
         type: "time",
         time: {
           unit: "hour"
        },
         ticks: {
           fontColor: "navajowhite",
           fontSize: 14
        }
      }],
       yAxes: [{
         type: "linear",
         display: true,
         position: "left",
         id: "temperature",
         ticks: {
           fontColor: "navajowhite",
           fontSize: 14
        },
         scaleLabel: {
           display: true,
           labelString: "Temperature (deg F)",
           fontSize: 16,
           fontColor: "navajowhite"
        }
      },
      {
         type: "linear",
         display: true,
         position: "right",
         id: "relativeHumidity",
         ticks: {
          "fontColor": "navajowhite"
        },
         scaleLabel: {
           display: true,
           labelString: "Relative Humidity (%)",
           fontSize: 16,
           fontColor: "navajowhite"
        }
      }]
    },
     title: {
       display: true,
       text: "",
       fontSize: 18,
       fontColor: "navajowhite"
    }
  }
}
