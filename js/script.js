var TINY_LIVING = {
  now: new Date(),
  temperatureData: {
    'indoor_temp': [],
    'outdoor_temp': [],
    'target_temp': []
  }
}

function generate_date_range(first) {
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

function initialize_aws_credentials() {
  // Initialize the Amazon Cognito credentials provider
  AWS.config.region = 'us-east-1'; // Region
  AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'us-east-1:4d6a33d4-bbda-4a30-b3a2-8d9720fc6dd6',
  });
}

function c_to_f(c_value){
  var c_value_num = parseFloat(c_value, 10)
  return (c_value_num * 9/5) + 32
}

function query_dynamo_db(first) {
  $('#loader').addClass('active')
  var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
  dates = generate_date_range(first)
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
        TINY_LIVING.temperatureData['indoor_temp'].push({'x': new Date(parseFloat(element.collection_timestamp.S, 10) * 1e3), 'y': c_to_f(element.indoor_temp.N)})
        TINY_LIVING.temperatureData['outdoor_temp'].push({'x': new Date(parseFloat(element.collection_timestamp.S, 10) * 1e3), 'y': c_to_f(element.outdoor_temp.N)})
        TINY_LIVING.temperatureData['target_temp'].push({'x': new Date(parseFloat(element.collection_timestamp.S, 10) * 1e3), 'y': c_to_f(element.target_temp.N)})
      });
      console.log(TINY_LIVING.temperatureData)
      temperatureChart.data.datasets[0].data = TINY_LIVING.temperatureData['indoor_temp']
      temperatureChart.data.datasets[1].data = TINY_LIVING.temperatureData['outdoor_temp']
      temperatureChart.data.datasets[2].data = TINY_LIVING.temperatureData['target_temp']
      console.log(data.Items)
      temperatureChart.options.title.text = new Date().toDateString()
      temperatureChart.update()
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
          label: 'Indoor Temperature',
          data: [{}],
          backgroundColor: Chart.helpers.color('#4dc9f6').alpha(0.6).rgbString(),
      },
      {
          label: 'Outdoor Temperature',
          data: [{}],
          backgroundColor: Chart.helpers.color('#ff0000').alpha(1).rgbString(),
          borderColor: 'black'
      },
      {
          label: 'Target Temperature',
          data: [{}],
          backgroundColor: Chart.helpers.color('#7fff00').alpha(1).rgbString(),
          borderColor: 'black'
      }
    ]
  },
  options: {
    scales: {
      xAxes: [{
        type: 'time',
          time: {
            unit: 'hour',
          }
      }]
    },
    title: {
      display: true,
      text: ''
    }
  }
});
$(document).ready(function() {
  initialize_aws_credentials()
  query_dynamo_db(true)
  $('#refresh-button').on("click", function() {
    query_dynamo_db(false)
  });
});
