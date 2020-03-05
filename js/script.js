var TINY_LIVING = {
  DEFAULT_FONT_COLOR: 'navajowhite',
  now: new Date(),
  minisplitData: {
    'indoor_temp': [],
    'outdoor_temp': [],
    'target_temp': [],
    'power_state': []
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

function initAWSCredentials() {
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
  var totalDailySolarRadiation = 0
  if (target == 'mesonet') {
    var mesonetCollectionTime = temperatureChart.data.datasets[3].data.slice(-1)[0]['x']
    var latestAirTemp = Math.round(temperatureChart.data.datasets[3].data.slice(-1)[0]['y']) + String.fromCharCode(176) + ' F'
    var latestSolarRadiation = temperatureChart.data.datasets[4].data.slice(-1)[0]['y'] +  ' watts/meter^2'
    for (instantaneousRadiation in temperatureChart.data.datasets[4].data) {
      totalDailySolarRadiation += (instantaneousRadiation / 1e3) * (5/60)
    }
    $('#mesonetCollectionTime').html(mesonetCollectionTime)
    $('#airTemp').html(latestAirTemp)
    $('#solarRadiation').html(latestSolarRadiation)
    $('#totalDailySolarRadiation').html(Math.round(totalDailySolarRadiation * 100)/100 + ' kilowatt-Hours')
  }
  else {
    var minisplitCollectionTime = temperatureChart.data.datasets[0].data.slice(-1)[0]['x']
    var latestIndoorTemp = temperatureChart.data.datasets[0].data.slice(-1)[0]['y'] + String.fromCharCode(176) + ' F'
    var latestOutdoorTemp = temperatureChart.data.datasets[1].data.slice(-1)[0]['y'] + String.fromCharCode(176) + ' F'
    var latestTargetTemp = temperatureChart.data.datasets[2].data.slice(-1)[0]['y'] + String.fromCharCode(176) + ' F'
    var powerState = TINY_LIVING.minisplitData['power_state'].slice(-1)[0].BOOL
    var latestPowerState = powerState ? '<i class="icon checkmark"></i> On' : '<i class="icon close"></i> Off'
    var powerStateIcon =  powerState ? 'postive' : 'negative'
    $('#minisplitCollectionTime').html(minisplitCollectionTime)
    $('#indoorTemp').html(latestIndoorTemp)
    $('#outdoorTemp').html(latestOutdoorTemp)
    $('#targetTemp').html(powerState ? latestTargetTemp : 'None' )
    $('#powerState').attr('class', powerStateIcon)
    $('#powerState').html(latestPowerState)
 

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
        if (element.hasOwnProperty('power_state')) {
          TINY_LIVING.minisplitData['power_state'].push(element.power_state)
          if (element.power_state.BOOL) { 
            TINY_LIVING.minisplitData['target_temp'].push({'x': new Date(parseFloat(element.collection_timestamp.S, 10) * 1e3),
                                                           'y': cToF(element.target_temp.N)})
          }
        }
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
          backgroundColor: Chart.helpers.color('#cc0066').alpha(1).rgbString(),
          borderColor: 'white',
          borderWidth: 0.25,
          yAxisID: 'temperature'
      },
      {
          label: 'Target Temperature (TINY)',
          data: [{}],
          backgroundColor: Chart.helpers.color('#7fff00').alpha(1).rgbString(),
          borderColor: Chart.helpers.color('#7fff00').alpha(1).rgbString(),
          borderWidth: 3,
          pointStyle: 'line',
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
	  type: 'line',
          pointStyle: 'rectRounded'

      }
    ]
  },
  options: {
    plugins: {
      zoom: {
        zoom: {
          enabled: true,
          drag: true,
          mode: 'x'
        },
      }
    },
    legend: {
      labels: {
        fontColor: TINY_LIVING.DEFAULT_FONT_COLOR,
        fontSize: 14,
        usePointStyle: true
      }
    },
    scales: {
      xAxes: [{
        type: 'time',
        time: {
          unit: 'hour',
        },
        ticks: {
          fontColor: TINY_LIVING.DEFAULT_FONT_COLOR,
          fontSize: 14
        }
      }],
      yAxes: [{
        type: 'linear',
	display: true,
	position: 'left',
	id: 'temperature',
        ticks: {
          fontColor: TINY_LIVING.DEFAULT_FONT_COLOR,
          fontSize: 14
        },
        scaleLabel: {
          display: true,
          labelString: 'Temperature (deg F)',
          fontSize: 16,
          fontColor: TINY_LIVING.DEFAULT_FONT_COLOR
        }
      }, 
      {
        type: 'linear',
	display: true,
	position: 'right',
	id: 'solarRadiation',
        ticks: {
          fontColor: TINY_LIVING.DEFAULT_FONT_COLOR,
        },
        scaleLabel: {
          display: true,
          labelString: 'Solar Radiation (W/m^2)',
          fontSize: 16,
          fontColor: TINY_LIVING.DEFAULT_FONT_COLOR
        }
      }]
    },
    title: {
      display: true,
      text: '',
      fontSize: 18,
      fontColor: TINY_LIVING.DEFAULT_FONT_COLOR
    }
  }
});
$(document).ready(function() {
  initAWSCredentials()
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
