const { exec } = require("child_process");
const fs = require("fs").promises;

const TIMESTAMP_FILE = "last_timestamp.txt";

async function getLastTimestamp() {
  try {
    const timestamp = await fs.readFile(TIMESTAMP_FILE, "utf8");
    return parseInt(timestamp.trim());
  } catch (err) {
    // If file doesn't exist, return timestamp from 30 days ago
    return Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
  }
}

async function saveLastTimestamp(timestamp) {
  await fs.writeFile(TIMESTAMP_FILE, timestamp.toString());
}

function execCurl(startTimestamp, endTimestamp) {
  const curlCommand = `curl 'https://api.coinmarketcap.com/data-api/v3/fear-greed/chart?start=${startTimestamp}&end=${endTimestamp}' \
    -H 'accept: application/json, text/plain, */*' \
    -H 'accept-language: en,vi;q=0.9' \
    -H 'cache-control: no-cache' \
    -H 'origin: https://coinmarketcap.com' \
    -H 'platform: web' \
    -H 'referer: https://coinmarketcap.com/' \
    -H 'sec-ch-ua: "Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"' \
    -H 'sec-ch-ua-mobile: ?1' \
    -H 'sec-ch-ua-platform: "Android"' \
    -H 'user-agent: Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'`;

  return new Promise((resolve, reject) => {
    exec(curlCommand, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        reject(new Error("Failed to parse JSON response"));
      }
    });
  });
}

async function fetchFearGreedData() {
  try {
    // Get timestamps
    const endTimestamp = Math.floor(Date.now() / 1000);
    const startTimestamp = await getLastTimestamp();

    // Only fetch if there's new data to get
    if (startTimestamp >= endTimestamp) {
      console.log("Data is already up to date");
      return;
    }

    // Fetch new data using curl
    const newData = await execCurl(startTimestamp, endTimestamp);
    if (!newData.data?.dataList) {
      console.log("No new data fetched", startTimestamp, endTimestamp);
      return;
    }

    // Read existing data
    let existingData = {};
    try {
      const fileContent = await fs.readFile("data.json", "utf8");
      existingData = JSON.parse(fileContent);
      //   console.log(
      //     "🚀 ~ file: fetch_data.js:68 ~ fetchFearGreedData ~ existingData:",
      //     existingData
      //   );
    } catch (err) {
      // If file doesn't exist or is invalid, start with empty structure
      existingData = {
        data: {
          dataList: [],
          dialConfig: [],
          historicalValues: {},
        },
        status: {},
      };
    }

    // Merge the data
    if (existingData.data?.dataList) {
      existingData.data.dataList = [
        ...existingData.data.dataList,
        ...newData.data.dataList,
      ];
    } else {
      existingData.data.dataList = newData.data.dataList;
    }

    // Update dialConfig and historicalValues with latest values
    existingData.data.dialConfig = newData.data.dialConfig;
    existingData.data.historicalValues = newData.data.historicalValues;
    existingData.status = newData.status;

    // Save the merged data
    await fs.writeFile("data.json", JSON.stringify(existingData, null, 2));

    // Save the last timestamp for next run
    if (newData.data.dataList.length > 0) {
      const lastTimestamp = parseInt(
        newData.data.dataList[newData.data.dataList.length - 1].timestamp
      );
      await saveLastTimestamp(lastTimestamp);
    }

    console.log("Data successfully updated and saved to data.json");
  } catch (error) {
    console.error("Error fetching/updating data:", error);
    process.exit(1);
  }
}

fetchFearGreedData();
