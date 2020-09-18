import os
import csv
import json
import time
import codecs
import urllib.request
from datetime import datetime, timedelta

from midea.client import client as midea_client
import boto3

with open('config.json', 'r') as jsfile:
    CONFIG = json.load(jsfile)

class QueryMiniSplit:
    def __init__(self):
        self.collection_datetime = None
        try:
            client = midea_client(CONFIG["API_KEY"], CONFIG["USER"], 
                                  CONFIG["PASS"])
            self.device = client.devices()[0]
        except:
            self.device = None
            
    def retrieve_minisplit_data(self):
        client = boto3.client('dynamodb')
        if client:
            if self.device:
                self.device.refresh()
                self.collection_datetime = datetime.now()
                self.collection_timestamp = time.time()
                date_str = time.strftime("%Y-%m-%d", time.gmtime(self.collection_timestamp))
                valid_minisplit_response = self.put_minisplit_data(client, date_str)
                if valid_minisplit_response:
                    return {'Sucess': True, 'Message':'Valid data received from minisplit'}
                else:
                    return {'Sucess': False, 'Message':'Invalid minisplit response'}
            return {'Sucess': False, 'Message':'Connection failed to minisplit interface'}
        return {'Sucess': False, 'Message':'Connection failed to AWS Dynamo DB'}

    def put_minisplit_data(self, client, date_str):
        ttl = self.collection_datetime + timedelta(days=365)
        print(self.device.operational_mode)
        print(self.device.operational_mode_enum)
        response = client.put_item(
                TableName='tiny-living-mini-split',
                Item={'collection_date': {"S": date_str},
                      'collection_timestamp': {"S": str(self.collection_timestamp)},
                      'outdoor_temp': {"N": str(self.device.outdoor_temperature)},
                      'indoor_temp': {"N": str(self.device.indoor_temperature)},
                      'target_temp': {"N": str(self.device.target_temperature)},
                      'power_state': {"BOOL": self.device.power_state},
                      'ttl': {"N": str(ttl.timestamp())}
                },
                ConditionExpression='attribute_not_exists(Id)'
        )
        return response

class MesonetData:
    def __init__(self):
        self.collection_datetime = None
        self.air_temperature = None
        self.solar_radiation = None
        
    def retrieve_mesonet_data(self):
        url = "https://mesonet.org/data/public/mesonet/current/5minute.obs.current.mdf"
        stream = urllib.request.urlopen(url)
        try:
            csv_file = csv.reader(codecs.iterdecode(stream, 'utf-8'), delimiter=' ')
            for line in csv_file:
                valid_items = [item for item in line if item]
                if len(valid_items) == 7:
                    base_datetime = datetime(int(valid_items[1]),
                                             int(valid_items[2]), int(valid_items[3]))
                if 'NRMN' in valid_items:
                    elapsed_minutes = int(valid_items[2])
                    self.collection_datetime = (base_datetime + timedelta(minutes=elapsed_minutes))
                    self.air_temperature = valid_items[4]
                    self.solar_radiation = valid_items[13]
            return True
        except:
            return False

    def put_mesonet_data(self):
        ttl = self.collection_datetime + timedelta(days=365)
        client = boto3.client('dynamodb')
        if client:
            response = client.put_item(
                    TableName='nrmn-mesonet-data',
                    Item={'collection_date': {"S": self.collection_datetime.strftime("%Y-%m-%d")},
                          'collection_timestamp': {"S": str(self.collection_datetime.timestamp())},
                          'air_temperature': {"N": str(self.air_temperature)},
                          'solar_radiation': {"N": str(self.solar_radiation)},
                          'ttl': {"N": str(ttl.timestamp())}
                    },
                    ConditionExpression='attribute_not_exists(Id)'
            )
            return response
        else:
            return False

class PWSData:
    def __init__(self):
        self.collection_datetime = None
        self.outdor_air_temperature = None
        self.outdoor_relative_humdiity = None
        self.base_url = CONFIG["WUNDERGROUND_BASE_URL"]
        self.station_id = CONFIG["STATION_ID"]
        self.api_key = CONFIG["WUNDERGROUND_API_KEY"]
        
    def retrieve_pws_data(self):
        url = f"{self.base_url}?stationId={self.station_id}&format=json&units=e&apiKey={self.api_key}"
        request = urllib.request.urlopen(url)
        try:
            data = json.load(request)
            print(data)
            observations = data.get("observations")[0]
            current_dt = datetime.utcfromtimestamp(observations.get("epoch"))
            self.collection_datetime = current_dt
            self.outdoor_air_temperature = observations.get("imperial").get("temp")
            self.outdoor_relative_humidity = observations.get("humidity")
            return True
        except:
            return False

    def put_pws_data(self):
        ttl = self.collection_datetime + timedelta(days=365)
        client = boto3.client('dynamodb')
        if client:
            response = client.put_item(
                    TableName='KCOLOVEL366-pws-data',
                    Item={'collection_date': {"S": self.collection_datetime.strftime("%Y-%m-%d")},
                          'collection_timestamp': {"S": str(self.collection_datetime.timestamp())},
                          'retrieval_timestamp': {"S": str(datetime.utcnow().timestamp())},
                          'outdoor_air_temperature': {"N": str(self.outdoor_air_temperature)},
                          'outdoor_relative_humidity': {"N": str(self.outdoor_relative_humidity)},
                          'ttl': {"N": str(ttl.timestamp())}
                    },
                    ConditionExpression='attribute_not_exists(Id)'
            )
            return response
        else:
            return False
    
def main(event, lambda_re):
    if event.get("QueryMiniSplit"):
        query = QueryMiniSplit()
        success = query.retrieve_minisplit_data()
    elif event.get("QueryMesonet"):
        mesonet_data = MesonetData()
        success = mesonet_data.retrieve_mesonet_data()
        if success:
            success = mesonet_data.put_mesonet_data()
    elif event.get("QueryPWS"):
        pws_data = PWSData()
        success = pws_data.retrieve_pws_data()
        if success:
            success = pws_data.put_pws_data()
    return {
        'statusCode': 200,
        'body': success
    }


