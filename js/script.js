var temperatureData = {
  'indoor_temp': [],
  'outdoor_temp': [],
  'target_temp': []
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

function query_dynamo_db() {
  var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
  var params = {
    ExpressionAttributeValues: {
     ':ge': {N: '1'}
    },
    FilterExpression: 'target_temp > :ge',
    TableName: 'tiny-living-mini-split-temperature'
  };
  ddb.scan(params, function(err, data) {
    if (err) {
      console.log("Error", err);
    } 
    else {
      data.Items.forEach(function(element, index, array) {
        temperatureData['indoor_temp'].push({'x': new Date(parseFloat(element.timestamp.N, 10) * 1e3), 'y': c_to_f(element.indoor_temp.N)})
        temperatureData['outdoor_temp'].push({'x': new Date(parseFloat(element.timestamp.N, 10) * 1e3), 'y': c_to_f(element.outdoor_temp.N)})
        temperatureData['target_temp'].push({'x': new Date(parseFloat(element.timestamp.N, 10) * 1e3), 'y': c_to_f(element.target_temp.N)})
      });
      console.log(temperatureData)
      temperatureChart.data.datasets[0].data = temperatureData['indoor_temp']
      temperatureChart.data.datasets[1].data = temperatureData['outdoor_temp']
      temperatureChart.data.datasets[2].data = temperatureData['target_temp']
      temperatureChart.update()
    }
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
    }
  }
});
$(document).ready(function() {
  initialize_aws_credentials()
  query_dynamo_db()
});
