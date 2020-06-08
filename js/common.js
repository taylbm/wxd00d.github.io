var TINY_LIVING = {
  temperatureChart: null,
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

function generateDateRange(first) {
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

function updateTextData(target) {
  var temperatureChart = TINY_LIVING.temperatureChart
  var totalDailySolarRadiation = 0
  if (target == 'mesonet') {
    var mesonetCollectionTime = temperatureChart.data.datasets[3].data.slice(-1)[0]['x']
    var latestAirTemp = Math.round(temperatureChart.data.datasets[3].data.slice(-1)[0]['y']) + String.fromCharCode(176) + ' F'
    var latestSolarRadiation = temperatureChart.data.datasets[4].data.slice(-1)[0]['y'] +  ' watts/meter^2'
    var radiationValues = Object.values(temperatureChart.data.datasets[4].data)
    for (const instantaneousRadiation of radiationValues) {
      totalDailySolarRadiation += (instantaneousRadiation['y'] / 1e3) * (5/60)
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
  var temperatureChart = TINY_LIVING.temperatureChart
  $('#loader').addClass('active')
  var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
  dates = generateDateRange(first)
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
        if (element.outdoor_temp.N > 130) {
          TINY_LIVING.minisplitData['outdoor_temp'].push({'x': new Date(parseFloat(element.collection_timestamp.S, 10) * 1e3),
                                                        'y': 'NaN'})
        }
        else {
          TINY_LIVING.minisplitData['outdoor_temp'].push({'x': new Date(parseFloat(element.collection_timestamp.S, 10) * 1e3),
                                                        'y': cToF(element.outdoor_temp.N)})
        }
        if (element.hasOwnProperty('power_state')) {
          TINY_LIVING.minisplitData['power_state'].push(element.power_state)
          if (element.power_state.BOOL) { 
            TINY_LIVING.minisplitData['target_temp'].push({'x': new Date(parseFloat(element.collection_timestamp.S, 10) * 1e3),
                                                           'y': cToF(element.target_temp.N)})
          }
          TINY_LIVING.temperatureChart.data.datasets[2].data = TINY_LIVING.minisplitData['target_temp']
        }
      });
      TINY_LIVING.temperatureChart.data.datasets[0].data = TINY_LIVING.minisplitData['indoor_temp']
      TINY_LIVING.temperatureChart.data.datasets[1].data = TINY_LIVING.minisplitData['outdoor_temp']
      TINY_LIVING.temperatureChart.update()
      updateTextData('minisplit')
    }
    $('#loader').addClass('disabled')
    $('#loader').removeClass('active')
  });
}

function queryMesonetTable(first) {
  $('#loader').addClass('active')
  var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
  dates = generateDateRange(first)
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
        var airTemp = element.air_temperature.N
        var solarRadiation = element.solar_radiation.N
        if (solarRadiation < 0) {
          TINY_LIVING.mesonetData['solar_radiation'].push({'x': new Date(parseFloat(element.collection_timestamp.S, 10) * 1e3),
                                                           'y': 'NaN'})
          TINY_LIVING.mesonetData['air_temperature'].push({'x': new Date(parseFloat(element.collection_timestamp.S, 10) * 1e3),
                                                           'y': 'NaN'})
        }
        else {
          TINY_LIVING.mesonetData['solar_radiation'].push({'x': new Date(parseFloat(element.collection_timestamp.S, 10) * 1e3),
                                                           'y': solarRadiation})
          TINY_LIVING.mesonetData['air_temperature'].push({'x': new Date(parseFloat(element.collection_timestamp.S, 10) * 1e3),
                                                           'y': cToF(airTemp)})
        }
      });
      TINY_LIVING.temperatureChart.data.datasets[3].data = TINY_LIVING.mesonetData['air_temperature']
      TINY_LIVING.temperatureChart.data.datasets[4].data = TINY_LIVING.mesonetData['solar_radiation']
      TINY_LIVING.temperatureChart.update()
      updateTextData('mesonet')
    }
    $('#loader').addClass('disabled')
    $('#loader').removeClass('active')
  });
}
$(document).ready(function() {
  ctx = $('#temperatureChart')
  TINY_LIVING.temperatureChart = new Chart(ctx, chartConfig);
  TINY_LIVING.temperatureChart.options.title.text = chartTitle;
  initAWSCredentials();
  queryMinisplitTable(true);
  queryMesonetTable(true);
  $('#refresh-button').on("click", function() {
    queryMinisplitTable(false);
    queryMesonetTable(false);
  });
  $('#reset-button').on("click", function() {
    TINY_LIVING.temperatureChart.resetZoom();
  });
  $('#date-selection').datepicker();
});
