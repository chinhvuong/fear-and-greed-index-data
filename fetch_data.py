import requests
import json
from datetime import datetime
import os

def fetch_fear_greed_data():
    # API endpoint
    url = "https://api.coinmarketcap.com/data-api/v3/fear-greed/chart"
    
    # Calculate timestamps (you can modify these as needed)
    end_timestamp = int(datetime.now().timestamp())
    start_timestamp = end_timestamp - (30 * 24 * 60 * 60)  # 30 days ago
    
    # Parameters
    params = {
        'start': start_timestamp,
        'end': end_timestamp
    }
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        
        # Save the data to data.json
        with open('data.json', 'w') as f:
            json.dump(response.json(), f, indent=2)
            
        print("Data successfully fetched and saved to data.json")
        
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data: {e}")
        exit(1)

if __name__ == "__main__":
    fetch_fear_greed_data() 