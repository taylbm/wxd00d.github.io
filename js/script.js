var TINY_LIVING = {
  now: new Date(),
  minisplitData: {
    'indoor_temp': [],
    'outdoor_temp': [],
    'target_temp': [],
  },
  mesonetData: {
    'air_temperature': [],
    'solar_radiation': []
  }
}

function GenerateDateRange(first) {
  var now = first ? TINY_LIVING.now : new Date()
  var beginDate = first ? new Date() : TINY_LIVING.now
  if (first) {
    beginDate.setDate(beginDate.getDate() -1)
  }
  console.log(beginDate)
  var isoDate = now.toISOString().split('T')[0]
  return {'now': now.getTime().toString(), 
          'beginDate': beginDate.getTime().toString(),
          'isoDate': isoDate
  }
}

function InitAWSCredentials() {
  // Initialize the Amazon Cognito credentials provider
  AWS.config.region = 'us-east-1'; // Region
  AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'us-east-1:4d6a33d4-bbda-4a30-b3a2-8d9720fc6dd6',
  });
}

function cToF(c_value){
  var c_value_num = parseFloat(c_value, 10)
  return (c_value_num * 9/5) + 32
}

function updateTextData(temperatureChart, target) {
  if (target == 'mesonet') {
    var mesonetCollectionTime = 'Mesonet Data Collected at: ' + temperatureChart.data.datasets[3].data.slice(-1)[0]['x']
    var latestAirTemp = 'Air Temp (deg F): ' + Math.round(temperatureChart.data.datasets[3].data.slice(-1)[0]['y'])
    var latestSolarRadiation = ', Solar Radiation (W/m^2): ' + temperatureChart.data.datasets[4].data.slice(-1)[0]['y']
    $('#latest-data-mesonet-time').html(latestAirTemp + latestSolarRadiation)
    $('#latest-data-mesonet').html(mesonetCollectionTime)
  }
  else {
    var minisplitCollectionTime = 'Mini Split Data Collected at: ' + temperatureChart.data.datasets[0].data.slice(-1)[0]['x']
    var latestIndoorTemp = 'Indoor Temp (deg F): ' + temperatureChart.data.datasets[0].data.slice(-1)[0]['y']
    var latestOutdoorTemp = ', Outdoor Temp (deg F): ' + temperatureChart.data.datasets[1].data.slice(-1)[0]['y']
    var latestTargetTemp = ', Target Temp (deg F): ' + temperatureChart.data.datasets[2].data.slice(-1)[0]['y']
    $('#latest-data-minisplit-time').html(minisplitCollectionTime)
    $('#latest-data-minisplit').html(latestIndoorTemp + latestOutdoorTemp + latestTargetTemp)
  }
}

function queryMinisplitTable(first) {
  $('#loader').addClass('active')
  var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
  dates = GenerateDateRange(first)
  var params = {
    ExpressionAttributeValues: {
      ':da': {S: dates['isoDate']},
      ':ge': {S: dates['beginDate']},
      ':le': {S: dates['now']}
    },
    KeyConditionExpression: 'collection_date = :da AND collection_timestamp BETWEEN :ge AND :le',
    TableName: 'tiny-living-mini-split'
  };
  ddb.query(params, function(err, data) {
    if (err) {
      console.log("Error", err);
    } 
    else {
      data.Items.forEach(function(element, index, array) {
        TINY_LIVING.minisplitData['indoor_temp'].push({'x': new Date(parseFloat(element.collection_timestamp.S, 10) * 1e3), 
                                                         'y': cToF(element.indoor_temp.N)})
        TINY_LIVING.minisplitData['outdoor_temp'].push({'x': new Date(parseFloat(element.collection_timestamp.S, 10) * 1e3),
                                                          'y': cToF(element.outdoor_temp.N)})
        TINY_LIVING.minisplitData['target_temp'].push({'x': new Date(parseFloat(element.collection_timestamp.S, 10) * 1e3),
                                                         'y': cToF(element.target_temp.N)})
      });
      console.log(TINY_LIVING.minisplitData)
      temperatureChart.data.datasets[0].data = TINY_LIVING.minisplitData['indoor_temp']
      temperatureChart.data.datasets[1].data = TINY_LIVING.minisplitData['outdoor_temp']
      temperatureChart.data.datasets[2].data = TINY_LIVING.minisplitData['target_temp']
      temperatureChart.update()
      updateTextData(temperatureChart, 'minisplit')
    }
    $('#loader').addClass('disabled')
    $('#loader').removeClass('active')
  });
}

function queryMesonetTable(first) {
  $('#loader').addClass('active')
  var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
  dates = GenerateDateRange(first)
  var params = {
    ExpressionAttributeValues: {
      ':da': {S: dates['isoDate']},
      ':ge': {S: dates['beginDate']},
      ':le': {S: dates['now']}
    },
    KeyConditionExpression: 'collection_date = :da AND collection_timestamp BETWEEN :ge AND :le',
    TableName: 'nrmn-mesonet-data'
  };
  ddb.query(params, function(err, data) {
    if (err) {
      console.log("Error", err);
    } 
    else {
      data.Items.forEach(function(element, index, array) {
        TINY_LIVING.mesonetData['air_temperature'].push({'x': new Date(parseFloat(element.collection_timestamp.S, 10) * 1e3), 
                                                         'y': cToF(element.air_temperature.N)})
        TINY_LIVING.mesonetData['solar_radiation'].push({'x': new Date(parseFloat(element.collection_timestamp.S, 10) * 1e3),
                                                          'y': element.solar_radiation.N})
      });
      console.log(TINY_LIVING.mesonetData)
      temperatureChart.data.datasets[3].data = TINY_LIVING.mesonetData['air_temperature']
      temperatureChart.data.datasets[4].data = TINY_LIVING.mesonetData['solar_radiation']
      temperatureChart.update()
      updateTextData(temperatureChart, 'mesonet')
    }
    $('#loader').addClass('disabled')
    $('#loader').removeClass('active')
  });
}
ctx = $('#temperatureChart')
var temperatureChart = new Chart(ctx, {
  type: 'scatter',
  data: {
    datasets:
    [
      {
          label: 'Indoor Temperature (TINY)',
          data: [{}],
          backgroundColor: Chart.helpers.color('#4dc9f6').alpha(0.6).rgbString(),
          borderColor: 'white',
          borderWidth: 0.25,
          yAxisID: 'temperature'
      },
      {
          label: 'Outdoor Temperature (TINY)',
          data: [{}],
          backgroundColor: Chart.helpers.color('#ff7f7f').alpha(1).rgbString(),
          borderColor: 'white',
          borderWidth: 0.25,
          yAxisID: 'temperature'
      },
      {
          label: 'Target Temperature (TINY)',
          data: [{}],
          backgroundColor: Chart.helpers.color('#7fff00').alpha(1).rgbString(),
          borderColor: 'white',
          borderWidth: 0.25,
          yAxisID: 'temperature'

      },
      {
          label: 'Air Temperature (NRMN)',
          data: [{}],
          backgroundColor: Chart.helpers.color('#ff0000').alpha(1).rgbString(),
          borderColor: 'white',
          borderWidth: 0.25,
          yAxisID: 'temperature'
      },
      {
          label: 'Solar Radiation (NRMN)',
          data: [{}],
          backgroundColor: Chart.helpers.color('#ff7400').alpha(1).rgbString(),
          borderColor: 'white',
          borderWidth: 0.25,
          yAxisID: 'solarRadiation',
	  type: 'line'

      }
    ]
  },
  options: {
    plugins: {
      zoom: {
        zoom: {
          enabled: true,
          drag: true
        }
      }
    },
    legend: {
      labels: {
        fontColor: 'navajowhite',
        fontSize: 14
      }
    },
    scales: {
      xAxes: [{
        type: 'time',
        time: {
          unit: 'hour',
        },
        ticks: {
          fontColor: 'navajowhite',
          fontSize: 14
        }
      }],
      yAxes: [{
        type: 'linear',
	display: true,
	position: 'left',
	id: 'temperature',
        ticks: {
          fontColor: 'navajowhite',
          fontSize: 14
        },
        scaleLabel: {
          display: true,
          labelString: 'Temperature (deg F)',
          fontSize: 16,
          fontColor: 'navajowhite',
          fontFamily: 'sans-serif'
        }
      }, 
      {
        type: 'linear',
	display: true,
	position: 'right',
	id: 'solarRadiation',
        ticks: {
          fontColor: 'navajowhite'
        },
        scaleLabel: {
          display: true,
          labelString: 'Solar Radiation (W/m^2)',
          fontSize: 16,
          fontColor: 'navajowhite',
          fontFamily: 'sans-serif'
        }
      }]
    },
    title: {
      display: true,
      text: '',
      fontSize: 18,
      fontColor: 'navajowhite',
    }
  }
});
$(document).ready(function() {
  InitAWSCredentials()
  queryMinisplitTable(true)
  queryMesonetTable(true)
  $('#refresh-button').on("click", function() {
    queryMinisplitTable(false)
    queryMesonetTable(false)
  });
  $('#reset-button').on("click", function() {
    temperatureChart.resetZoom()
  });
  $('#temperatureChart').css("border", "1px solid navajowhite")
  temperatureChart.options.title.text = [new Date().toDateString(), 'Real-Time Tiny Living Mini-Split Temperatures (TINY)', 'OK Mesonet Data from Norman (NRMN)']
});
